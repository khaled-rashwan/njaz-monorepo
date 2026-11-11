import { JournalFormatOption, JournalFormatId } from '@/types/journal';

export * from './engineering-review';

/**
 * Journal Formats Registry
 * Highlights Engineering Review as the currently active official format,
 * with other major publisher formats disabled for future expansion.
 */
export const AVAILABLE_JOURNAL_FORMATS: JournalFormatOption[] = [
    {
        id: 'engineering-review',
        name: 'Engineering Review',
        publisher: 'University of Rijeka (Faculties of Engineering & Civil Engineering)',
        description: 'Official template format: Single column, Times New Roman 11pt, 3.5cm top margin, 2-column Article Info header, and IEEE citations.',
        citationStyle: 'ieee',
        isEnabled: true,
        badge: 'Official Template',
        guidelineUrl: 'https://engineeringreview.org/index.php/ER/about/submissions',
    },
    {
        id: 'ieee-transactions',
        name: 'IEEE Transactions',
        publisher: 'IEEE',
        description: 'Two-column standard IEEE journal layout with IEEE numeric references.',
        citationStyle: 'ieee',
        isEnabled: false,
        disabledReason: 'Planned for upcoming release',
        badge: 'Coming Soon',
    },
    {
        id: 'springer-lncs',
        name: 'Springer LNCS',
        publisher: 'Springer Nature',
        description: 'Lecture Notes in Computer Science single-column book format.',
        citationStyle: 'ieee',
        isEnabled: false,
        disabledReason: 'Planned for upcoming release',
        badge: 'Coming Soon',
    },
    {
        id: 'acm-conference',
        name: 'ACM Conference (acmart)',
        publisher: 'Association for Computing Machinery',
        description: 'Standard ACM primary two-column conference proceeding format.',
        citationStyle: 'ieee',
        isEnabled: false,
        disabledReason: 'Planned for upcoming release',
        badge: 'Coming Soon',
    },
    {
        id: 'elsevier-standard',
        name: 'Elsevier Standard (CAS / CAS-DC)',
        publisher: 'Elsevier',
        description: 'Complex Article Service double/single column journal format.',
        citationStyle: 'apa',
        isEnabled: false,
        disabledReason: 'Planned for upcoming release',
        badge: 'Coming Soon',
    },
    {
        id: 'standard',
        name: 'Standard Academic Draft',
        publisher: 'Scholar Default',
        description: 'Clean generic A4 academic manuscript view without journal-specific headers.',
        citationStyle: 'ieee',
        isEnabled: true,
        badge: 'Default Draft',
    },
];

export function getJournalFormatOption(id: JournalFormatId): JournalFormatOption | undefined {
    return AVAILABLE_JOURNAL_FORMATS.find(f => f.id === id);
}
