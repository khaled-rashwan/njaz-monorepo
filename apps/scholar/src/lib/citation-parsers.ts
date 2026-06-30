import { BlockType } from '@/types';

export interface ParsedCitation {
    title: string;
    authors: { name: string; affiliation?: string }[];
    year?: number;
    journal?: string;
    abstract?: string;
    doi?: string;
    url?: string;
    externalId?: string;
}

/**
 * Parses raw BibTeX text into structured citations.
 */
export function parseBibTeX(text: string): ParsedCitation[] {
    const entries: ParsedCitation[] = [];
    // Split by '@' to find individual records, skip the first if empty
    const records = text.split(/(?=@\w+\s*\{)/g);

    for (const record of records) {
        if (!record.trim()) continue;

        // Extract title
        const titleMatch = record.match(/title\s*=\s*[\{"]\s*([\s\S]*?)\s*[\}"]/i);
        if (!titleMatch) continue; // No title, not a valid reference entry

        const title = cleanBraces(titleMatch[1]);

        // Extract author
        const authorMatch = record.match(/author\s*=\s*[\{"]\s*([\s\S]*?)\s*[\}"]/i);
        const authors: { name: string }[] = [];
        if (authorMatch) {
            const rawAuthors = cleanBraces(authorMatch[1]);
            // BibTeX separates authors by ' and '
            rawAuthors.split(/\s+and\s+/i).forEach(a => {
                const name = a.trim();
                if (name) {
                    authors.push({ name });
                }
            });
        }

        // Extract year
        const yearMatch = record.match(/year\s*=\s*[\{"]?\s*(\d{4})\s*[\}"]?/i);
        const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

        // Extract journal or publisher or booktitle
        const journalMatch = record.match(/(journal|booktitle|publisher)\s*=\s*[\{"]\s*([\s\S]*?)\s*[\}"]/i);
        const journal = journalMatch ? cleanBraces(journalMatch[2]) : undefined;

        // Extract DOI
        const doiMatch = record.match(/doi\s*=\s*[\{"]\s*([\s\S]*?)\s*[\}"]/i) || record.match(/doi\s*=\s*[\{"]?\s*(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)\s*[\}"]?/i);
        const doi = doiMatch ? cleanBraces(doiMatch[1]) : undefined;

        // Extract URL
        const urlMatch = record.match(/url\s*=\s*[\{"]\s*([\s\S]*?)\s*[\}"]/i);
        const url = urlMatch ? cleanBraces(urlMatch[1]) : undefined;

        // Extract Abstract
        const abstractMatch = record.match(/abstract\s*=\s*[\{"]\s*([\s\S]*?)\s*[\}"]/i);
        const abstract = abstractMatch ? cleanBraces(abstractMatch[1]) : undefined;

        entries.push({
            title,
            authors,
            year,
            journal,
            doi,
            url,
            abstract,
            externalId: doi || title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50),
        });
    }

    return entries;
}

/**
 * Parses raw RIS text into structured citations.
 */
export function parseRIS(text: string): ParsedCitation[] {
    const entries: ParsedCitation[] = [];
    // RIS records are separated by ER - tag
    const records = text.split(/ER\s*-\s*\r?\n/g);

    for (const record of records) {
        if (!record.trim()) continue;

        let title = '';
        const authors: { name: string }[] = [];
        let year: number | undefined;
        let journal = '';
        let doi: string | undefined;
        let url: string | undefined;
        let abstract = '';

        const lines = record.split(/\r?\n/);
        for (const line of lines) {
            const match = line.match(/^([A-Z0-9]{2})\s*-\s*(.*)$/);
            if (!match) continue;

            const tag = match[1];
            const val = match[2].trim();

            switch (tag) {
                case 'TI':
                case 'T1':
                    title = val;
                    break;
                case 'AU':
                    authors.push({ name: val });
                    break;
                case 'PY':
                    const yearMatch = val.match(/^(\d{4})/);
                    if (yearMatch) {
                        year = parseInt(yearMatch[1], 10);
                    }
                    break;
                case 'JO':
                case 'JF':
                case 'T2':
                case 'PB':
                    if (!journal) journal = val;
                    break;
                case 'DO':
                    doi = val;
                    break;
                case 'UR':
                    url = val;
                    break;
                case 'AB':
                case 'N2':
                    abstract = val;
                    break;
            }
        }

        if (title) {
            entries.push({
                title,
                authors,
                year,
                journal: journal || undefined,
                doi,
                url,
                abstract: abstract || undefined,
                externalId: doi || title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50),
            });
        }
    }

    return entries;
}

/**
 * Extracts DOI candidates from a list of strings.
 */
export function parseDOIs(text: string): string[] {
    const lines = text.split(/[\r\n,;]+/);
    const dois: string[] = [];
    const doiPattern = /(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i;

    for (const line of lines) {
        const match = line.match(doiPattern);
        if (match) {
            dois.push(match[1].trim());
        }
    }

    return dois;
}

function cleanBraces(str: string): string {
    return str.replace(/[\{\}]/g, '').replace(/\s+/g, ' ').trim();
}

export interface TextCitationQuery {
    rawText: string;
    parsedTitle?: string;
    parsedAuthors?: string[];
    parsedYear?: number;
    parsedDoi?: string;
}

/**
 * Splits plain-text bibliography references by bracketed numbering or lines.
 */
export function parseTextCitations(text: string): TextCitationQuery[] {
    const blocks: string[] = [];
    
    // Split by bracketed numbers like [21] or [22]
    // Regex matches [digits] or digits. at the beginning of a line or block
    const parts = text.split(/(?:^|\r?\n)\s*(?:\[\d+\]|\d+\.)\s*/g);
    
    parts.forEach(part => {
        const trimmed = part.trim();
        if (trimmed) {
            blocks.push(trimmed);
        }
    });

    // Fallback: split by double newlines if no numbering matches
    if (blocks.length <= 1 && parts.length <= 1) {
        text.split(/\r?\n\s*\r?\n/).forEach(block => {
            const trimmed = block.trim();
            if (trimmed) {
                blocks.push(trimmed);
            }
        });
    }

    const doiPattern = /(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i;

    return blocks.map(block => {
        // Try to extract title inside double quotes
        const titleMatch = block.match(/["“]([^"”]+)["”]/);
        let parsedTitle = titleMatch ? titleMatch[1].replace(/[,.]$/, '').trim() : undefined;
        
        if (!parsedTitle) {
            // Fallback: split by comma or period and take the longest segment that doesn't look like authors or publishers
            const segments = block.split(/[.,]/).map(s => s.trim()).filter(Boolean);
            if (segments.length > 1) {
                const candidates = segments.filter(s => {
                    const clean = s.toLowerCase();
                    const hasYear = /\b(19\d{2}|20\d{2})\b/.test(clean);
                    const isEdition = /\b\d+(st|nd|rd|th)?\s*(ed\.|edition)\b/.test(clean);
                    const isPublisher = /\b(mcgraw|education|press|springer|elsevier|wiley|academic|mit|publishers?)\b/.test(clean);
                    const hasInitials = /\b[a-z]\b/i.test(clean);
                    
                    return !hasYear && !isEdition && !isPublisher && !hasInitials;
                });
                
                if (candidates.length > 0) {
                    candidates.sort((a, b) => b.length - a.length);
                    parsedTitle = candidates[0];
                }
            }
        }

        // Try to extract year (4 digit number from 1900 to 2099)
        const yearMatch = block.match(/\b(19\d{2}|20\d{2})\b/);
        const parsedYear = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

        // Try to parse authors: authors are usually listed before the title.
        // E.g. "Y. Liu, X. Chen, B. Li, H. Li and Y. Ye,"
        let parsedAuthors: string[] = [];
        if (titleMatch && titleMatch.index !== undefined) {
            const beforeTitle = block.substring(0, titleMatch.index).trim();
            if (beforeTitle) {
                // Split by comma or "and"
                const cleanedNames = beforeTitle.replace(/,?\s+and\s+/gi, ', ').split(',');
                parsedAuthors = cleanedNames.map(n => n.trim()).filter(n => n.length > 2 && !/^\d+$/.test(n));
            }
        }

        // Try to extract DOI from within the block
        const doiMatch = block.match(doiPattern);
        const parsedDoi = doiMatch ? doiMatch[1].trim() : undefined;

        return {
            rawText: block,
            parsedTitle,
            parsedYear,
            parsedAuthors: parsedAuthors.length > 0 ? parsedAuthors : undefined,
            parsedDoi,
        };
    });
}

export function cleanRawCitation(text: string): string {
    let clean = text;
    clean = clean.replace(/\b(19\d{2}|20\d{2})\b/g, '');
    clean = clean.replace(/[\[\(]\s*[\]\)]/g, '');
    clean = clean.replace(/\bpp?\.?\s*\d+[-–]\d+\b/gi, '');
    clean = clean.replace(/\b\d+(st|nd|rd|th)?\s*(ed\.|edition)\b/gi, '');
    
    const noiseWords = [
        'mcgraw-hill', 'mcgraw hill', 'education', 'new york', 'ny', 'london', 
        'springer', 'elsevier', 'wiley', 'academic press', 'mit press', 'inc\\.', 'publishers?'
    ];
    for (const word of noiseWords) {
        const regex = new RegExp('\\b' + word + '\\b', 'gi');
        clean = clean.replace(regex, '');
    }
    
    clean = clean.replace(/[.,:;]+/g, ' ');
    clean = clean.replace(/\s+/g, ' ').trim();
    return clean;
}
