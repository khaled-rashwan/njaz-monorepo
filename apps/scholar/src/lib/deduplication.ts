import { NormalizedReference } from './openalex';

/**
 * Normalizes a paper title for deduplication comparison.
 * Lowercases, removes special characters, and normalizes whitespace.
 */
export function normalizeTitle(title: string): string {
    if (!title) return '';
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Deduplicates an array of references based on normalized title or DOI.
 * Keeps the first occurrence of any duplicate.
 */
export function deduplicateReferences(references: NormalizedReference[]): NormalizedReference[] {
    const uniqueTitles = new Set<string>();
    const uniqueDois = new Set<string>();
    const uniqueReferences: NormalizedReference[] = [];

    for (const ref of references) {
        const normTitle = normalizeTitle(ref.title);
        const doi = ref.doi ? ref.doi.toLowerCase().trim() : null;
        
        let isDuplicate = false;

        if (normTitle && uniqueTitles.has(normTitle)) {
            isDuplicate = true;
        }

        if (doi && uniqueDois.has(doi)) {
            isDuplicate = true;
        }

        if (!isDuplicate) {
            if (normTitle) uniqueTitles.add(normTitle);
            if (doi) uniqueDois.add(doi);
            uniqueReferences.push(ref);
        }
    }

    return uniqueReferences;
}
