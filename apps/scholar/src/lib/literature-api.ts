/**
 * Literature Search API Clients
 * 
 * Searches across OpenAlex, Semantic Scholar, and CrossRef.
 * All APIs are free and require no authentication for basic usage.
 */

import { LiteratureSearchResult } from '@/types';

// ============================================
// OPENALEX
// ============================================

export async function searchOpenAlex(query: string, limit = 10): Promise<LiteratureSearchResult[]> {
    try {
        const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${limit}&select=id,title,authorships,publication_year,primary_location,cited_by_count,doi,abstract_inverted_index`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Scholar/1.0 (mailto:support@njaz.org)' },
        });
        if (!res.ok) throw new Error(`OpenAlex: ${res.status}`);
        const data = await res.json();

        return (data.results || []).map((work: any) => ({
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

export async function searchSemanticScholar(query: string, limit = 10): Promise<LiteratureSearchResult[]> {
    try {
        const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=paperId,title,abstract,authors,year,citationCount,journal,externalIds,url`;
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

export async function searchCrossRef(query: string, limit = 10): Promise<LiteratureSearchResult[]> {
    try {
        const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}`;
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
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];
    
    // Strip common prefixes like 'isbn:', 'isbn ', 'isbn-'
    let parsedQuery = cleanQuery.replace(/^(isbn[:\s-]*)/i, '').trim();
    const cleanNum = parsedQuery.replace(/[- ]/g, '');
    const isISBN = /^(97[89])?\d{9}(\d|X)$/i.test(cleanNum);
    const queryParam = isISBN ? `isbn:${cleanNum}` : cleanQuery;

    let books: LiteratureSearchResult[] = [];
    
    // Try Google Books API first
    try {
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryParam)}&maxResults=${limit}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
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
        } else if (res.status === 429) {
            console.warn("Google Books API rate limited (429). Falling back to Open Library API.");
        }
    } catch (error) {
        console.error('Google Books search failed:', error);
    }

    // Fallback: Query Open Library API if Google Books failed or returned empty results
    if (books.length === 0) {
        try {
            const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanQuery)}&limit=${limit}&fields=key,title,author_name,first_publish_year,publisher,isbn,seed`;
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
    sources: ('openalex' | 'semantic_scholar' | 'crossref' | 'isbn_books')[] = ['openalex', 'semantic_scholar', 'crossref', 'isbn_books'],
    limit = 10
): Promise<LiteratureSearchResult[]> {
    try {
        const url = `/api/literature/search?query=${encodeURIComponent(query)}&sources=${sources.join(',')}&limit=${limit}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Search API Proxy: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error('Unified search via API proxy failed, falling back client-side:', error);
        const promises = sources.map(source => {
            switch (source) {
                case 'openalex': return searchOpenAlex(query, limit);
                case 'semantic_scholar': return searchSemanticScholar(query, limit);
                case 'crossref': return searchCrossRef(query, limit);
                case 'isbn_books': return searchGoogleBooks(query, limit);
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

        return deduped.sort((a, b) => {
            const scoreA = calculateRelevanceScore(a.title, query);
            const scoreB = calculateRelevanceScore(b.title, query);
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
