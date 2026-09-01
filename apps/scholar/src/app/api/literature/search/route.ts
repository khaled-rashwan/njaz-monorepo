import { NextRequest, NextResponse } from 'next/server';
import { searchOpenAlex, searchSemanticScholar, searchCrossRef, searchGoogleBooks, searchIEEEXplore, parseSearchQuery, searchFigshare } from '@/lib/literature-api';
import { ServerlessSearchManager } from '@/lib/serverless-search-manager';
import { LiteratureSearchResult } from '@/types';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const sourcesParam = searchParams.get('sources');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const startYear = searchParams.get('startYear') ? parseInt(searchParams.get('startYear')!, 10) : undefined;
    const endYear = searchParams.get('endYear') ? parseInt(searchParams.get('endYear')!, 10) : undefined;
    const isOa = searchParams.get('isOa') === 'true';
    const publisher = searchParams.get('publisher') || '';

    if (!query.trim()) {
        return NextResponse.json([]);
    }

    const sources = sourcesParam 
        ? (sourcesParam.split(',') as ('openalex' | 'semantic_scholar' | 'crossref' | 'isbn_books' | 'ieee_xplore' | 'figshare')[])
        : ['openalex', 'semantic_scholar', 'crossref', 'isbn_books', 'ieee_xplore', 'figshare'];

    const cacheKey = `search:${Buffer.from(query.trim().toLowerCase()).toString('base64')}:${sources.sort().join(',')}:${limit}:${startYear || ''}:${endYear || ''}:${isOa}:${publisher}`;

    // 1. Try Cache First
    const cachedData = await ServerlessSearchManager.getCache(cacheKey);
    if (cachedData) {
        return new NextResponse(JSON.stringify(cachedData), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
            },
        });
    }

    // 2. Query each source with Rate Limiting & Circuit Breakers
    const promises = sources.map(async (source) => {
        // Check Circuit Breaker
        const circuitStatus = await ServerlessSearchManager.checkCircuit(source);
        if (circuitStatus === 'OPEN') {
            console.warn(`[API Proxy] Circuit is OPEN for ${source}. Bypassing direct query.`);
            return getFallbackForSource(source, query, limit);
        }

        // Check Rate Limiter (5 requests/sec, max 10 bucket size)
        const isAllowed = await ServerlessSearchManager.checkRateLimit(source, 10, 5);
        if (!isAllowed) {
            console.warn(`[API Proxy] Rate limit exceeded for ${source}. Bypassing to fallback.`);
            await ServerlessSearchManager.recordFailure(source);
            return getFallbackForSource(source, query, limit);
        }

        try {
            let data: LiteratureSearchResult[] = [];
            switch (source) {
                case 'openalex':
                    data = await searchOpenAlex(query, limit, startYear, endYear, isOa, publisher);
                    break;
                case 'semantic_scholar':
                    data = await searchSemanticScholar(query, limit, startYear, endYear);
                    break;
                case 'crossref':
                    data = await searchCrossRef(query, limit, startYear, endYear);
                    break;
                case 'isbn_books':
                    data = await searchGoogleBooks(query, limit);
                    break;
                case 'ieee_xplore':
                    data = await searchIEEEXplore(query, limit, startYear, endYear, isOa);
                    break;
                case 'figshare':
                    data = await searchFigshare(query, limit);
                    break;
            }
            
            await ServerlessSearchManager.recordSuccess(source);
            return data;
        } catch (error) {
            console.error(`[API Proxy] Query failed for ${source}:`, error);
            await ServerlessSearchManager.recordFailure(source);
            return getFallbackForSource(source, query, limit);
        }
    });

    const results = await Promise.allSettled(promises);
    const allItems: LiteratureSearchResult[] = [];

    for (const result of results) {
        if (result.status === 'fulfilled') {
            allItems.push(...result.value);
        }
    }

    if (publisher && publisher.toLowerCase().includes('ieee') && !sources.includes('ieee_xplore')) {
        try {
            console.log('[Search Route] Direct publisher filter set to IEEE. Querying IEEE Xplore directly.');
            const ieeeResults = await searchIEEEXplore(query, limit, startYear, endYear, isOa);
            console.log(`[Search Route] IEEE Xplore returned ${ieeeResults.length} records.`);
            allItems.unshift(...ieeeResults);
        } catch (ieeeErr) {
            console.error('[Search Route] IEEE Xplore query failed:', ieeeErr);
        }
    }

    // Deduplicate by DOI
    const seen = new Map<string, LiteratureSearchResult>();
    const deduped: LiteratureSearchResult[] = [];

    for (const item of allItems) {
        if (item.doi) {
            const key = item.doi.toLowerCase();
            if (!seen.has(key)) {
                seen.set(key, item);
                deduped.push(item);
            }
        } else {
            deduped.push(item);
        }
    }

    const parsed = parseSearchQuery(query);
    const searchTarget = parsed.cleanQuery || query;

    const sorted = deduped.sort((a, b) => {
        const scoreA = calculateRelevanceScore(a.title, searchTarget);
        const scoreB = calculateRelevanceScore(b.title, searchTarget);
        if (Math.abs(scoreA - scoreB) > 0.01) {
            return scoreB - scoreA;
        }
        return (b.citationCount || 0) - (a.citationCount || 0);
    });

    let finalResults = sorted;

    if (isOa) {
        finalResults = finalResults.filter(item => {
            if (item.source === 'openalex') return true; // OpenAlex results are already OA-only since we queried with is_oa:true
            const raw = item.rawData || {};
            const semanticOa = raw.openAccessPdf?.url || raw.isOpenAccess === true;
            const crossrefOa = raw.link?.some((l: any) => l['content-type'] === 'application/pdf');
            const isIEEEAccess = item.journal?.toLowerCase().includes('ieee access') || 
                                 item.doi?.toLowerCase().includes('10.1109/access');
            const hasPdfUrl = item.url?.includes('.pdf') || raw.link?.some((l: any) => l.url?.includes('.pdf'));
            return !!(semanticOa || crossrefOa || isIEEEAccess || hasPdfUrl);
        });
    }

    if (publisher) {
        const queryPub = publisher.toLowerCase();
        finalResults = finalResults.filter(item => {
            const workPub = item.rawData?.primary_location?.source?.publisher || '';
            const displaySource = item.journal || '';
            const doiVal = item.doi || '';
            return workPub.toLowerCase().includes(queryPub) || 
                   displaySource.toLowerCase().includes(queryPub) ||
                   (queryPub === 'ieee' && (doiVal.includes('10.1109') || displaySource.toLowerCase().includes('ieee')));
        });
    }

    // Save to Cache
    await ServerlessSearchManager.setCache(cacheKey, finalResults);

    return new NextResponse(JSON.stringify(finalResults), {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
    });
}

async function getFallbackForSource(
    source: string,
    query: string,
    limit: number
): Promise<LiteratureSearchResult[]> {
    try {
        if (source === 'isbn_books') {
            const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}&fields=key,title,author_name,first_publish_year,publisher,isbn`;
            const res = await fetch(olUrl);
            if (res.ok) {
                const data = await res.json();
                return (data.docs || []).map((doc: any) => ({
                    source: 'isbn_books' as const,
                    externalId: doc.key || '',
                    title: doc.title || 'Untitled Book',
                    authors: (doc.author_name || []).map((name: string) => ({ name })),
                    year: doc.first_publish_year,
                    journal: Array.isArray(doc.publisher) ? doc.publisher[0] : doc.publisher,
                    doi: Array.isArray(doc.isbn) ? doc.isbn[0] : undefined,
                    url: `https://openlibrary.org${doc.key}`,
                }));
            }
        } else {
            return await searchOpenAlex(query, limit);
        }
    } catch (e) {
        console.error(`Fallback failed for ${source}:`, e);
    }
    return [];
}

function calculateRelevanceScore(title: string, query: string): number {
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    
    if (cleanTitle === cleanQuery) return 10000;
    if (cleanTitle.startsWith(cleanQuery)) return 5000;
    if (cleanTitle.includes(cleanQuery)) return 2000;
    
    const queryWords = cleanQuery.split(/\s+/).filter(Boolean);
    const titleWords = new Set(cleanTitle.split(/\s+/).filter(Boolean));
    let matchingWords = 0;
    for (const word of queryWords) {
        if (titleWords.has(word)) matchingWords++;
    }
    
    if (queryWords.length > 0) {
        return (matchingWords / queryWords.length) * 1000;
    }
    return 0;
}
