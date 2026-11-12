/**
 * Literature Search API Clients
 * 
 * Searches across OpenAlex, Semantic Scholar, and CrossRef.
 * All APIs are free and require no authentication for basic usage.
 */

import { LiteratureSearchResult } from '@/types';

export interface ParsedSearchQuery {
    original: string;
    isbn?: string;
    doi?: string;
    cleanQuery: string;
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
    const original = query.trim();
    if (!original) {
        return { original, cleanQuery: '' };
    }

    // Try to extract ISBN
    let isbn: string | undefined;
    const isbnRegex = /\b(?:97[89][-\s]*)?\d(?:[ -]*\d){8,12}[-\s]*[\dX]\b/gi;
    const potentialIsbns = original.match(isbnRegex) || [];
    for (const raw of potentialIsbns) {
        const cleaned = raw.replace(/[-\s]/g, '');
        if (cleaned.length === 10 || cleaned.length === 13) {
            isbn = cleaned;
            break;
        }
    }

    // Try to extract DOI
    let doi: string | undefined;
    const doiRegex = /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/gi;
    const doiMatch = original.match(doiRegex);
    if (doiMatch && doiMatch[0]) {
        doi = doiMatch[0];
    }

    // Clean query: if it is multiline, take the first non-empty line.
    let cleanQuery = original;
    if (original.includes('\n')) {
        const lines = original.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0);
        
        // Find the first line that doesn't start with metadata labels
        const nonLabelLine = lines.find(l => {
            const lower = l.toLowerCase();
            return !lower.startsWith('isbn') && 
                   !lower.startsWith('author:') && 
                   !lower.startsWith('edition:') && 
                   !lower.startsWith('binding:') && 
                   !lower.startsWith('publisher:') && 
                   !lower.startsWith('published:') &&
                   !lower.startsWith('doi:');
        });
        
        if (nonLabelLine) {
            cleanQuery = nonLabelLine;
        } else if (lines[0]) {
            cleanQuery = lines[0];
        }
    }

    // Strip out standard label prefixes
    cleanQuery = cleanQuery.replace(/^(title|query|search|doi|isbn)[:\s-]*/i, '').trim();

    return {
        original,
        isbn,
        doi,
        cleanQuery
    };
}

// ============================================================
// OPENALEX
// ============================================

export async function searchOpenAlex(
    query: string, 
    limit = 10, 
    startYear?: number, 
    endYear?: number,
    isOa?: boolean,
    publisher?: string
): Promise<LiteratureSearchResult[]> {
    try {
        const parsed = parseSearchQuery(query);
        const searchVal = parsed.isbn || parsed.doi || parsed.cleanQuery || query;
        if (!searchVal.trim()) return [];

        let filterStr = '';
        const filters: string[] = [];

        if (startYear || endYear) {
            const start = startYear || 1800;
            const end = endYear || new Date().getFullYear();
            filters.push(`publication_year:${start}-${end}`);
        }

        if (isOa) {
            filters.push('is_oa:true');
        }

        if (filters.length > 0) {
            filterStr = `&filter=${filters.join(',')}`;
        }

        const url = `https://api.openalex.org/works?search=${encodeURIComponent(searchVal)}${filterStr}&per_page=${limit}&select=id,title,authorships,publication_year,primary_location,cited_by_count,doi,abstract_inverted_index,biblio`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Scholar/1.0 (mailto:support@njaz.org)' },
        });
        if (!res.ok) throw new Error(`OpenAlex: ${res.status}`);
        const data = await res.json();

        let results = (data.results || []).map((work: any) => ({
            source: 'openalex' as const,
            externalId: work.id || '',
            title: work.title || 'Untitled',
            authors: (work.authorships || []).map((a: any) => ({
                name: a.author?.display_name || 'Unknown',
            })),
            year: work.publication_year,
            journal: work.primary_location?.source?.display_name || undefined,
            abstract: reconstructAbstract(work.abstract_inverted_index),
            citationCount: work.cited_by_count,
            doi: work.doi?.replace('https://doi.org/', '') || undefined,
            url: work.doi || work.id,
            rawData: work,
        }));

        if (publisher) {
            const queryPub = publisher.toLowerCase();
            results = results.filter((item: any) => {
                const workPub = item.rawData?.primary_location?.source?.publisher || '';
                const displaySource = item.journal || '';
                const doiVal = item.doi || '';
                return workPub.toLowerCase().includes(queryPub) || 
                       displaySource.toLowerCase().includes(queryPub) ||
                       (queryPub === 'ieee' && (doiVal.includes('10.1109') || displaySource.toLowerCase().includes('ieee')));
            });
        }

        return results;
    } catch (error) {
        console.error('OpenAlex search failed:', error);
        return [];
    }
}

function reconstructAbstract(invertedIndex: Record<string, number[]> | null): string | undefined {
    if (!invertedIndex) return undefined;
    const words: [string, number][] = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
        for (const pos of positions) {
            words.push([word, pos]);
        }
    }
    words.sort((a, b) => a[1] - b[1]);
    return words.map(w => w[0]).join(' ');
}

// ============================================
// SEMANTIC SCHOLAR
// ============================================

export async function searchSemanticScholar(query: string, limit = 10, startYear?: number, endYear?: number): Promise<LiteratureSearchResult[]> {
    try {
        const parsed = parseSearchQuery(query);
        const searchVal = parsed.isbn || parsed.doi || parsed.cleanQuery || query;
        if (!searchVal.trim()) return [];

        let yearParam = '';
        if (startYear || endYear) {
            const start = startYear || '';
            const end = endYear || '';
            yearParam = `&year=${start}-${end}`;
        }
        const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(searchVal)}${yearParam}&limit=${limit}&fields=paperId,title,abstract,authors,year,citationCount,journal,externalIds,url,isOpenAccess,openAccessPdf`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Semantic Scholar: ${res.status}`);
        const data = await res.json();

        return (data.data || []).map((paper: any) => ({
            source: 'semantic_scholar' as const,
            externalId: paper.paperId || '',
            title: paper.title || 'Untitled',
            authors: (paper.authors || []).map((a: any) => ({ name: a.name || 'Unknown' })),
            year: paper.year,
            journal: paper.journal?.name || undefined,
            abstract: paper.abstract || undefined,
            citationCount: paper.citationCount,
            doi: paper.externalIds?.DOI || undefined,
            url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
            rawData: paper,
        }));
    } catch (error) {
        console.error('Semantic Scholar search failed:', error);
        return [];
    }
}

// ============================================
// CROSSREF
// ============================================

export async function searchCrossRef(query: string, limit = 10, startYear?: number, endYear?: number): Promise<LiteratureSearchResult[]> {
    try {
        const parsed = parseSearchQuery(query);
        const searchVal = parsed.isbn || parsed.doi || parsed.cleanQuery || query;
        if (!searchVal.trim()) return [];

        let filterStr = '';
        if (startYear || endYear) {
            const start = startYear || 1800;
            const end = endYear || new Date().getFullYear();
            filterStr = `&filter=from-pub-date:${start}-01-01,until-pub-date:${end}-12-31`;
        }
        const url = `https://api.crossref.org/works?query=${encodeURIComponent(searchVal)}&rows=${limit}${filterStr}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Scholar/1.0 (mailto:support@njaz.org)' },
        });
        if (!res.ok) throw new Error(`CrossRef: ${res.status}`);
        const data = await res.json();

        return (data.message?.items || []).map((item: any) => ({
            source: 'crossref' as const,
            externalId: item.DOI || '',
            title: Array.isArray(item.title) ? item.title[0] : item.title || 'Untitled',
            authors: (item.author || []).map((a: any) => ({
                name: `${a.given || ''} ${a.family || ''}`.trim() || 'Unknown',
            })),
            year: item['published-print']?.['date-parts']?.[0]?.[0] || undefined,
            journal: Array.isArray(item['container-title']) ? item['container-title'][0] : item['container-title'] || undefined,
            abstract: item.abstract?.replace(/<[^>]*>/g, '') || undefined,
            citationCount: item['is-referenced-by-count'],
            doi: item.DOI,
            url: item.URL || `https://doi.org/${item.DOI}`,
            rawData: item,
        }));
    } catch (error) {
        console.error('CrossRef search failed:', error);
        return [];
    }
}

// ============================================
// GOOGLE BOOKS / ISBN SEARCH
// ============================================

export async function searchGoogleBooks(query: string, limit = 10): Promise<LiteratureSearchResult[]> {
    const parsed = parseSearchQuery(query);
    if (!parsed.cleanQuery && !parsed.isbn) return [];

    let queryParam = parsed.isbn ? `isbn:${parsed.isbn}` : parsed.cleanQuery;
    let books: LiteratureSearchResult[] = [];
    
    // Try Google Books API first
    try {
        let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryParam)}&maxResults=${limit}`;
        let res = await fetch(url);
        let data: any = null;
        if (res.ok) {
            data = await res.json();
            if ((!data.items || data.items.length === 0) && parsed.isbn && parsed.cleanQuery) {
                // Fallback to title query if ISBN query returned no results
                queryParam = parsed.cleanQuery;
                url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryParam)}&maxResults=${limit}`;
                res = await fetch(url);
                if (res.ok) {
                    data = await res.json();
                }
            }
        } else if (res.status === 429) {
            console.warn("Google Books API rate limited (429). Falling back to Open Library API.");
        }

        if (data && data.items) {
            books = (data.items || []).map((item: any) => {
                const info = item.volumeInfo || {};
                const isbn13 = (info.industryIdentifiers || []).find((id: any) => id.type === 'ISBN_13')?.identifier;
                const isbn10 = (info.industryIdentifiers || []).find((id: any) => id.type === 'ISBN_10')?.identifier;
                const isbn = isbn13 || isbn10 || (info.industryIdentifiers || [])[0]?.identifier;

                const yearStr = info.publishedDate ? info.publishedDate.substring(0, 4) : undefined;
                const year = yearStr ? parseInt(yearStr) : undefined;

                return {
                    source: 'isbn_books' as const,
                    externalId: item.id || '',
                    title: info.title || 'Untitled Book',
                    authors: (info.authors || []).map((name: string) => ({ name })),
                    year: year,
                    journal: info.publisher || undefined,
                    abstract: info.description || undefined,
                    citationCount: 0,
                    doi: isbn || undefined,
                    url: info.infoLink || `https://books.google.com/books?id=${item.id}`,
                    rawData: item,
                };
            });
        }
    } catch (error) {
        console.error('Google Books search failed:', error);
    }

    // Fallback: Query Open Library API if Google Books failed or returned empty results
    if (books.length === 0) {
        try {
            const fallbackQuery = parsed.isbn || parsed.cleanQuery;
            const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(fallbackQuery)}&limit=${limit}&fields=key,title,author_name,first_publish_year,publisher,isbn,seed`;
            const res = await fetch(olUrl);
            if (res.ok) {
                const data = await res.json();
                books = (data.docs || []).map((doc: any) => {
                    const isbn = Array.isArray(doc.isbn) ? doc.isbn[0] : undefined;
                    const authorNames = Array.isArray(doc.author_name) ? doc.author_name : [];
                    return {
                        source: 'isbn_books' as const,
                        externalId: doc.key || '',
                        title: doc.title || 'Untitled Book',
                        authors: authorNames.map((name: string) => ({ name })),
                        year: doc.first_publish_year || undefined,
                        journal: Array.isArray(doc.publisher) ? doc.publisher[0] : doc.publisher || undefined,
                        abstract: doc.seed ? `Open Library Key: ${doc.key}` : undefined,
                        citationCount: 0,
                        doi: isbn || undefined,
                        url: `https://openlibrary.org${doc.key}`,
                        rawData: doc,
                    };
                });
            }
        } catch (olError) {
            console.error('Open Library search failed:', olError);
        }
    }

    return books;
}

// ============================================
// UNIFIED SEARCH
// ============================================

export async function searchAllSources(
    query: string,
    sources: ('openalex' | 'semantic_scholar' | 'crossref' | 'isbn_books' | 'ieee_xplore' | 'figshare')[] = ['openalex', 'semantic_scholar', 'crossref', 'isbn_books', 'ieee_xplore', 'figshare'],
    limit = 10,
    startYear?: number,
    endYear?: number,
    isOa?: boolean,
    publisher?: string
): Promise<LiteratureSearchResult[]> {
    try {
        let filters = '';
        if (startYear) filters += `&startYear=${startYear}`;
        if (endYear) filters += `&endYear=${endYear}`;
        if (isOa) filters += `&isOa=true`;
        if (publisher) filters += `&publisher=${encodeURIComponent(publisher)}`;
        
        const url = `/api/literature/search?query=${encodeURIComponent(query)}&sources=${sources.join(',')}&limit=${limit}${filters}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Search API Proxy: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error('Unified search via API proxy failed, falling back client-side:', error);
        const promises = sources.map(source => {
            switch (source) {
                case 'openalex': return searchOpenAlex(query, limit, startYear, endYear, isOa, publisher);
                case 'semantic_scholar': return searchSemanticScholar(query, limit, startYear, endYear);
                case 'crossref': return searchCrossRef(query, limit, startYear, endYear);
                case 'isbn_books': return searchGoogleBooks(query, limit);
                case 'ieee_xplore': return searchIEEEXplore(query, limit, startYear, endYear, isOa);
                case 'figshare': return searchFigshare(query, limit);
            }
        });

        const results = await Promise.allSettled(promises);
        const allItems: LiteratureSearchResult[] = [];

        for (const result of results) {
            if (result.status === 'fulfilled') {
                allItems.push(...result.value);
            }
        }

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
        return deduped.sort((a, b) => {
            const scoreA = calculateRelevanceScore(a.title, searchTarget);
            const scoreB = calculateRelevanceScore(b.title, searchTarget);
            if (Math.abs(scoreA - scoreB) > 0.01) {
                return scoreB - scoreA;
            }
            return (b.citationCount || 0) - (a.citationCount || 0);
        });
    }
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

export async function searchIEEEXplore(
    query: string, 
    limit = 10, 
    startYear?: number, 
    endYear?: number, 
    isOa?: boolean
): Promise<LiteratureSearchResult[]> {
    try {
        const parsed = parseSearchQuery(query);
        const searchVal = parsed.doi || parsed.cleanQuery || query;
        if (!searchVal.trim()) return [];

        const url = 'https://ieeexplore.ieee.org/rest/search';
        const ranges: string[] = [];
        if (startYear || endYear) {
            const start = startYear || 1800;
            const end = endYear || new Date().getFullYear();
            ranges.push(`${start}_${end}_Year`);
        }

        const payload: any = {
            queryText: searchVal,
            rowsPerPage: String(limit),
        };
        if (ranges.length > 0) {
            payload.ranges = ranges;
        }
        if (isOa) {
            payload.openAccess = true;
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': `https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=${encodeURIComponent(query)}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`IEEE Xplore Search: ${res.status}`);
        const data = await res.json();

        return (data.records || []).map((record: any) => {
            const artNum = record.articleNumber || record.doi?.split('/').pop() || '';
            return {
                source: 'ieee_xplore' as const,
                externalId: artNum,
                title: record.articleTitle || 'Untitled',
                authors: (record.authors || []).map((a: any) => ({
                    name: a.preferredName || 'Unknown',
                })),
                year: parseInt(record.publicationYear || '0', 10) || undefined,
                journal: record.publicationTitle || undefined,
                abstract: record.abstract || undefined,
                citationCount: record.citationCount || 0,
                doi: record.doi || undefined,
                url: record.pdfLink ? `https://ieeexplore.ieee.org${record.pdfLink}` : `https://ieeexplore.ieee.org/document/${artNum}/`,
                rawData: record,
            };
        });
    } catch (error) {
        console.error('IEEE Xplore search failed:', error);
        return [];
    }
}

// ============================================
// FIGSHARE
// ============================================

export async function searchFigshare(query: string, limit = 10): Promise<LiteratureSearchResult[]> {
    try {
        const parsed = parseSearchQuery(query);
        const searchVal = parsed.doi || parsed.cleanQuery || query;
        if (!searchVal.trim()) return [];

        const url = 'https://api.figshare.com/v2/articles/search';
        const payload: any = {
            search_for: searchVal,
            limit: limit
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`Figshare Search: ${res.status}`);
        const data = await res.json();
        const items = data || [];

        // Concurrently fetch full details for each article to get authors and description
        const detailedItems = await Promise.all(
            items.map(async (item: any) => {
                try {
                    const detailRes = await fetch(`https://api.figshare.com/v2/articles/${item.id}`);
                    if (detailRes.ok) {
                        const detailData = await detailRes.json();
                        return { ...item, ...detailData };
                    }
                } catch (e) {
                    console.error(`Failed to fetch details for Figshare article ${item.id}:`, e);
                }
                return item;
            })
        );

        return detailedItems.map((item: any) => {
            const year = item.published_date ? new Date(item.published_date).getFullYear() : undefined;
            const cleanDesc = item.description ? item.description.replace(/<[^>]*>/g, '').trim() : undefined;
            return {
                source: 'figshare' as const,
                externalId: String(item.id || ''),
                title: item.title || 'Untitled',
                authors: (item.authors || []).map((a: any) => ({
                    name: a.full_name || a.name || 'Unknown',
                })),
                year: isNaN(year as any) ? undefined : year,
                journal: item.defined_type_name || undefined,
                abstract: cleanDesc || item.abstract || undefined,
                citationCount: 0,
                doi: item.doi || undefined,
                url: item.url_public_html || `https://figshare.com/articles/_/${item.id}`,
                rawData: item,
            };
        });
    } catch (error) {
        console.error('Figshare search failed:', error);
        return [];
    }
}
