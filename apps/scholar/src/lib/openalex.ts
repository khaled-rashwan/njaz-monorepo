export interface OpenAlexAuthor {
    author: {
        id: string;
        display_name: string;
    };
}

export interface OpenAlexWork {
    id: string;
    title: string;
    doi: string | null;
    publication_year: number;
    primary_location?: {
        source?: {
            display_name?: string;
        };
        landing_page_url?: string;
        pdf_url?: string;
    };
    abstract_inverted_index?: Record<string, number[]> | null;
    authorships?: OpenAlexAuthor[];
    cited_by_count?: number;
}

export interface OpenAlexResponse {
    meta: {
        count: number;
        db_response_time_ms: number;
        page: number;
        per_page: number;
    };
    results: OpenAlexWork[];
}

export interface NormalizedReference {
    externalId: string;
    title: string;
    authors: string[];
    year: number;
    journal: string;
    abstract: string;
    citationCount: number;
    doi: string;
    url: string;
    pdfUrl: string;
    source: 'openalex';
    fullMetadata: OpenAlexWork;
}

/**
 * Reconstructs the abstract string from OpenAlex's inverted index format
 */
export function reconstructAbstract(invertedIndex?: Record<string, number[]> | null): string {
    if (!invertedIndex) return '';
    
    let maxIndex = 0;
    for (const indices of Object.values(invertedIndex)) {
        for (const idx of indices) {
            if (idx > maxIndex) maxIndex = idx;
        }
    }
    
    const words: string[] = new Array(maxIndex + 1).fill('');
    for (const [word, indices] of Object.entries(invertedIndex)) {
        for (const idx of indices) {
            words[idx] = word;
        }
    }
    
    return words.join(' ');
}

/**
 * Maps an OpenAlex work to our unified NormalizedReference format
 */
export function mapOpenAlexWorkToNormalized(work: OpenAlexWork): NormalizedReference {
    const authors = work.authorships?.map(a => a.author?.display_name).filter(Boolean) || [];
    
    return {
        externalId: work.id,
        title: work.title || 'Untitled',
        authors: authors as string[],
        year: work.publication_year,
        journal: work.primary_location?.source?.display_name || '',
        abstract: reconstructAbstract(work.abstract_inverted_index),
        citationCount: work.cited_by_count || 0,
        doi: work.doi || '',
        url: work.primary_location?.landing_page_url || '',
        pdfUrl: work.primary_location?.pdf_url || '',
        source: 'openalex',
        fullMetadata: work,
    };
}

/**
 * Searches the OpenAlex API for scholarly works
 * @param query The search string
 * @param limit Max number of results (max 200)
 */
export async function searchOpenAlex(query: string, limit: number = 30): Promise<NormalizedReference[]> {
    if (!query.trim()) return [];
    
    const mailto = 'njaz.platform@gmail.com'; // Adding email puts us in the polite pool for faster response
    
    // Construct search URL
    const url = new URL('https://api.openalex.org/works');
    url.searchParams.append('search', query);
    url.searchParams.append('per-page', limit.toString());
    url.searchParams.append('mailto', mailto);
    
    // Optional: filter by recent works or specific types if needed
    // url.searchParams.append('filter', 'has_abstract:true');

    try {
        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`OpenAlex API error: ${response.statusText}`);
        }
        
        const data: OpenAlexResponse = await response.json();
        
        return data.results.map(mapOpenAlexWorkToNormalized);
    } catch (error) {
        console.error('Failed to search OpenAlex:', error);
        throw error;
    }
}
