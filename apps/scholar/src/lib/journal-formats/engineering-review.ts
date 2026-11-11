import {
    EngineeringReviewMetadata,
    JournalValidationResult,
    JournalValidationIssue,
    AuthorInfo,
    AffiliationInfo,
    ReviewerSuggestion
} from '@/types/journal';
import { ScholarDocument } from '@/types';

/**
 * Official specifications of Engineering Review (Faculty of Engineering & Civil Engineering, Univ. of Rijeka)
 * Source: Official template `ER_instructions-OTH-OTH.docx` & submission guidelines (engineeringreview.org)
 */
export const ENGINEERING_REVIEW_SPECS = {
    journalName: 'Engineering Review',
    publisher: 'Faculty of Engineering & Faculty of Civil Engineering, University of Rijeka, Croatia',
    issnPrint: '1330-9587',
    issnOnline: '1849-0433',
    guidelineUrl: 'https://engineeringreview.org/index.php/ER/about/submissions',
    pageSize: 'A4',
    margins: {
        topCm: 3.5,     // 1984 dxa
        bottomCm: 2.0,  // 1134 dxa
        leftCm: 2.0,    // 1134 dxa
        rightCm: 2.0,   // 1134 dxa
        headerCm: 2.3,  // 1304 dxa
    },
    typography: {
        fontFamily: 'Times New Roman',
        baseSizePt: 11,
        lineSpacing: 'single',
        columnLayout: 'single',
        firstLineIndentCm: 0.6, // 340 dxa
        title: {
            sizePt: 16,
            bold: true,
            uppercase: true,
            alignment: 'center',
            spacingAfterPt: 14,
        },
        authors: {
            sizePt: 11,
            bold: true,
            alignment: 'center',
            spacingAfterPt: 14,
        },
        affiliations: {
            sizePt: 10,
            regular: true,
            alignment: 'center',
            spacingAfterPt: 10,
        },
        heading1: {
            sizePt: 12,
            bold: true,
            spacingBeforePt: 11,
            spacingAfterPt: 5,
            numbering: 'arabic', // "1 Introduction"
        },
        heading2: {
            sizePt: 11,
            italic: true,
            spacingBeforePt: 11,
            spacingAfterPt: 5,
            numbering: 'hierarchical', // "1.1 Basic information"
        },
        equations: {
            alignment: 'center',
            labelAlignment: 'right', // (1)
        },
        figures: {
            captionPosition: 'bottom',
            captionStyle: '11pt italic',
            prefix: 'Figure', // "Figure 1. Caption"
        },
        tables: {
            captionPosition: 'top',
            captionStyle: '11pt italic',
            prefix: 'Table', // "Table 1. Caption"
        },
        references: {
            style: 'ieee', // [1], [2]
            heading: 'References',
        },
    },
    limits: {
        maxAbstractWords: 250,
        maxKeywords: 6,
        minPages: 6,
        minReviewers: 3,
    }
};

/**
 * Calculates approximate word count for abstract text
 */
export function countWords(text?: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Formats authors for display, e.g. "Name1 SURNAME1¹,* – Name2 SURNAME2²"
 */
export function formatAuthorList(authors: AuthorInfo[], affiliations: AffiliationInfo[]): string {
    if (!authors || authors.length === 0) return '';

    return authors.map((author) => {
        const namePart = `${author.name || ''} ${author.surname || ''}`.trim();
        
        // Find affiliation index numbers (1-based)
        const affNumbers = (author.affiliationIds || [])
            .map(id => {
                const found = affiliations.find(a => a.id === id);
                return found ? found.number : null;
            })
            .filter((n): n is number => n !== null);

        const affSup = affNumbers.length > 0 ? affNumbers.join(',') : '';
        const corrSup = author.isCorresponding ? '*' : '';
        const supCombined = [affSup, corrSup].filter(Boolean).join(',');

        return supCombined ? `${namePart}${toSuperscript(supCombined)}` : namePart;
    }).join(' – ');
}

/**
 * Unicode superscript converter for clean web rendering
 */
export function toSuperscript(str: string): string {
    const map: Record<string, string> = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
        ',': '‚', '*': '﹡', '–': '⁻'
    };
    return str.split('').map(c => map[c] || c).join('');
}

/**
 * Formats a single affiliation line according to the journal template:
 * "Department Name, Faculty Name, University Name, Address"
 * Combines all structured fields (department, faculty, institution, and address/country)
 * so that adding an address does NOT overwrite the department or university.
 */
export function formatAffiliationText(aff: AffiliationInfo): string {
    if (!aff) return '';

    const parts: string[] = [];

    if (aff.department?.trim()) {
        parts.push(aff.department.trim());
    }

    if (aff.faculty?.trim()) {
        parts.push(aff.faculty.trim());
    }

    if (aff.institution?.trim()) {
        parts.push(aff.institution.trim());
    }

    // Address part can come from address, city, country, or legacy fullAddress field
    const addressCandidate = (aff.address || aff.fullAddress || [aff.city, aff.country].filter(Boolean).join(', '))?.trim();

    if (addressCandidate) {
        // If the addressCandidate is not already an exact duplicate of a previous part, append it
        const alreadyIncluded = parts.some(p => p.toLowerCase() === addressCandidate.toLowerCase());
        if (!alreadyIncluded) {
            // Also avoid duplicate substrings if user already typed the institution in the address box
            const isFullDuplication = parts.length > 0 && addressCandidate.toLowerCase().includes(parts[parts.length - 1].toLowerCase());
            if (!isFullDuplication) {
                parts.push(addressCandidate);
            }
        }
    }

    // If neither department, faculty, nor institution was provided, fallback to the address candidate
    if (parts.length === 0) {
        return (aff.fullAddress || aff.address || aff.institution || '').trim();
    }

    return parts.join(', ');
}

/**
 * Validates document metadata against Engineering Review journal requirements
 */
export function validateEngineeringReview(
    doc: ScholarDocument,
    meta?: Partial<EngineeringReviewMetadata>
): JournalValidationResult {
    const issues: JournalValidationIssue[] = [];
    const journalMeta = meta || doc.metadata?.journalFormatting as EngineeringReviewMetadata | undefined;

    const abstractText = doc.abstract || '';
    const wordCount = countWords(abstractText);
    const keywords = journalMeta?.keywords || parseKeywords(doc.metadata?.keywords);
    const keywordCount = keywords.length;
    const authors = journalMeta?.authors || [];
    const affiliations = journalMeta?.affiliations || [];
    const reviewers = journalMeta?.suggestedReviewers || [];

    // 1. Author check
    if (authors.length === 0) {
        issues.push({
            field: 'authors',
            message: 'At least one author must be specified (with Given Name and Surname).',
            severity: 'error',
        });
    } else {
        const corresponding = authors.find(a => a.isCorresponding);
        if (!corresponding) {
            issues.push({
                field: 'correspondingAuthor',
                message: 'A corresponding author must be designated with an asterisk (*).',
                severity: 'warning',
            });
        } else if (!corresponding.email) {
            issues.push({
                field: 'correspondingEmail',
                message: 'The corresponding author must provide an institutional e-mail address.',
                severity: 'error',
            });
        }
    }

    // 2. Affiliation check
    if (affiliations.length === 0) {
        issues.push({
            field: 'affiliations',
            message: 'At least one affiliation (Department, Faculty, University, Address) is required.',
            severity: 'error',
        });
    }

    // 3. Abstract check
    if (!abstractText.trim()) {
        issues.push({
            field: 'abstract',
            message: 'Abstract is required (objective, methods, procedures, and main outcomes).',
            severity: 'error',
        });
    } else if (wordCount > ENGINEERING_REVIEW_SPECS.limits.maxAbstractWords) {
        issues.push({
            field: 'abstractLength',
            message: `Abstract contains ${wordCount} words (maximum allowed is 250 words).`,
            severity: 'warning',
        });
    }

    // 4. Keywords check
    if (keywordCount === 0) {
        issues.push({
            field: 'keywords',
            message: 'Keywords are required (up to 6 keywords).',
            severity: 'warning',
        });
    } else if (keywordCount > ENGINEERING_REVIEW_SPECS.limits.maxKeywords) {
        issues.push({
            field: 'keywordsLength',
            message: `Too many keywords: ${keywordCount} provided (maximum allowed is 6).`,
            severity: 'warning',
        });
    }

    // 5. Reviewer suggestions check (journal submission requirement)
    if (reviewers.length < ENGINEERING_REVIEW_SPECS.limits.minReviewers) {
        issues.push({
            field: 'reviewers',
            message: `Engineering Review submission checklist requires at least 3 suggested independent reviewers (${reviewers.length}/3 provided).`,
            severity: 'info',
        });
    }

    const hasErrors = issues.some(i => i.severity === 'error');

    return {
        isValid: !hasErrors,
        hasErrors,
        issues,
        wordCount,
        keywordCount,
        reviewerCount: reviewers.length,
    };
}

/**
 * Parses raw keywords string or array
 */
function parseKeywords(raw: any): string[] {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        return raw.split(/[,;\n]/).map(k => k.trim()).filter(Boolean);
    }
    return [];
}

/**
 * Creates intelligent default Engineering Review metadata from an existing ScholarDocument
 */
export function createInitialEngineeringReviewMetadata(
    doc: ScholarDocument
): EngineeringReviewMetadata {
    const existing = doc.metadata?.journalFormatting as EngineeringReviewMetadata | undefined;
    if (existing && existing.formatId === 'engineering-review') {
        return existing;
    }

    // Default dates
    const today = new Date();
    const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    // Derive keywords from existing metadata
    const existingKeywords = parseKeywords(doc.metadata?.keywords);
    const keywords = existingKeywords.length > 0
        ? existingKeywords.slice(0, 6)
        : ['Mechanical engineering', 'Finite element analysis', 'Experimental validation'];

    // Derive authors if none exists
    const defaultAuthorName = doc.owner || 'Author';
    const defaultAuthors: AuthorInfo[] = [
        {
            id: 'author-1',
            name: defaultAuthorName.split(' ')[0] || 'Firstname',
            surname: defaultAuthorName.split(' ').slice(1).join(' ') || 'Surname',
            affiliationIds: ['aff-1'],
            isCorresponding: true,
            email: 'author@university.edu',
            phone: '+385 (0)51 651 444',
        }
    ];

    const defaultAffiliations: AffiliationInfo[] = [
        {
            id: 'aff-1',
            number: 1,
            department: 'Department of Mechanical Engineering',
            faculty: 'Faculty of Engineering',
            institution: 'University of Rijeka',
            city: 'Rijeka',
            country: 'Croatia',
            address: 'Vukovarska 58, 51000 Rijeka, Croatia',
            fullAddress: 'Vukovarska 58, 51000 Rijeka, Croatia'
        }
    ];

    const defaultReviewers: ReviewerSuggestion[] = [
        {
            id: 'rev-1',
            name: 'Prof. Dr. Reviewer One',
            affiliation: 'Department of Mechanical Engineering, University of Zagreb',
            email: 'reviewer1@fsb.hr',
            fieldsOfExpertise: 'Materials, Structural Mechanics'
        },
        {
            id: 'rev-2',
            name: 'Assoc. Prof. Reviewer Two',
            affiliation: 'Faculty of Civil Engineering, University of Split',
            email: 'reviewer2@gradst.hr',
            fieldsOfExpertise: 'Finite Element Method, Dynamics'
        },
        {
            id: 'rev-3',
            name: 'Dr. Reviewer Three',
            affiliation: 'Faculty of Mechanical Engineering and Naval Architecture',
            email: 'reviewer3@fsb.unizg.hr',
            fieldsOfExpertise: 'Manufacturing, Materials Testing'
        }
    ];

    return {
        formatId: 'engineering-review',
        paperTitle: doc.title || '',
        shortTitle: (doc.title || 'Research Paper').substring(0, 50),
        articleCategory: 'Original scientific paper',
        authors: defaultAuthors,
        affiliations: defaultAffiliations,
        articleHistory: {
            receivedDate: formatDate(today),
            revisedDate: '',
            acceptedDate: '',
        },
        keywords,
        doi: '10.36978/ed.xxxx',
        volume: '44',
        issue: '3',
        year: `${today.getFullYear()}`,
        pages: '1-10',
        suggestedReviewers: defaultReviewers,
    };
}
