export type JournalFormatId =
    | 'engineering-review'
    | 'ieee-transactions'
    | 'springer-lncs'
    | 'acm-conference'
    | 'elsevier-standard'
    | 'standard';

export interface AuthorInfo {
    id: string;
    name: string;        // First/given name
    surname: string;     // Last/family name
    affiliationIds: string[]; // Reference to AffiliationInfo.id
    isCorresponding?: boolean;
    email?: string;
    phone?: string;
    postalAddress?: string;
}

export interface AffiliationInfo {
    id: string;
    number: number;      // 1, 2, 3...
    department?: string;
    faculty?: string;
    institution: string; // University or Institute Name
    city?: string;
    country?: string;
    fullAddress?: string; // Formatted "Department Name, Faculty Name, University Name, Address"
}

export interface ReviewerSuggestion {
    id: string;
    name: string;
    affiliation: string;
    email: string;
    fieldsOfExpertise?: string;
}

export interface EngineeringReviewMetadata {
    formatId: 'engineering-review';
    paperTitle?: string;
    shortTitle?: string; // Max ~50-60 chars for running header
    articleCategory?: 'Original scientific paper' | 'Preliminary communication' | 'Subject review' | 'Professional paper';
    authors: AuthorInfo[];
    affiliations: AffiliationInfo[];
    articleHistory?: {
        receivedDate?: string;
        revisedDate?: string;
        acceptedDate?: string;
    };
    keywords: string[]; // Max 6 keywords as required by journal
    doi?: string;
    volume?: string;
    issue?: string;
    year?: string;
    pages?: string;
    suggestedReviewers?: ReviewerSuggestion[]; // Minimum 3 required by submission checklist
}

export interface JournalFormatOption {
    id: JournalFormatId;
    name: string;
    publisher: string;
    description: string;
    citationStyle: 'ieee' | 'apa' | 'chicago' | 'harvard';
    isEnabled: boolean; // only engineering-review is enabled initially; others disabled for future
    disabledReason?: string;
    badge?: string;
    guidelineUrl?: string;
}

export interface JournalValidationIssue {
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
}

export interface JournalValidationResult {
    isValid: boolean;
    hasErrors: boolean;
    issues: JournalValidationIssue[];
    wordCount: number;
    keywordCount: number;
    reviewerCount: number;
}
