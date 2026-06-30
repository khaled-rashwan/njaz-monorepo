import { NextRequest, NextResponse } from 'next/server';
import { searchOpenAlex, searchSemanticScholar, searchCrossRef, searchGoogleBooks } from '@/lib/literature-api';
import { ServerlessSearchManager } from '@/lib/serverless-search-manager';
import { LiteratureSearchResult } from '@/types';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const sourcesParam = searchParams.get('sources');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!query.trim()) {
        return NextResponse.json([]);
    }

    const sources = sourcesParam 
        ? (sourcesParam.split(',') as ('openalex' | 'semantic_scholar' | 'crossref' | 'isbn_books')[])
        : ['openalex', 'semantic_scholar', 'crossref', 'isbn_books'];

    const cacheKey = `search:${Buffer.from(query.trim().toLowerCase()).toString('base64')}:${sources.sort().join(',')}:${limit}`;

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
                    data = await searchOpenAlex(query, limit);
                    break;
                case 'semantic_scholar':
                    data = await searchSemanticScholar(query, limit);
                    break;
                case 'crossref':
                    data = await searchCrossRef(query, limit);
                    break;
                case 'isbn_books':
                    data = await searchGoogleBooks(query, limit);
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

    const sorted = deduped.sort((a, b) => {
        const scoreA = calculateRelevanceScore(a.title, query);
        const scoreB = calculateRelevanceScore(b.title, query);
        if (Math.abs(scoreA - scoreB) > 0.01) {
            return scoreB - scoreA;
        }
        return (b.citationCount || 0) - (a.citationCount || 0);
    });

    // Save to Cache
    await ServerlessSearchManager.setCache(cacheKey, sorted);

    return new NextResponse(JSON.stringify(sorted), {
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
