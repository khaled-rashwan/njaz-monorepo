import { describe, it, expect } from 'vitest';
import { normalizeTitle, deduplicateReferences } from './deduplication';
import type { NormalizedReference } from './openalex';

const ref = (title: string, doi?: string) =>
    ({ title, doi } as unknown as NormalizedReference);

describe('normalizeTitle', () => {
    it('lowercases, strips punctuation and collapses whitespace', () => {
        expect(normalizeTitle('  Deep   Learning: A Review! ')).toBe('deep learning a review');
    });

    it('returns an empty string for empty input', () => {
        expect(normalizeTitle('')).toBe('');
    });
});

describe('deduplicateReferences', () => {
    it('removes duplicates by normalized title, keeping the first', () => {
        const a = ref('Attention Is All You Need');
        const b = ref('attention is all you need.');
        expect(deduplicateReferences([a, b])).toEqual([a]);
    });

    it('removes duplicates by case-insensitive DOI even if titles differ', () => {
        const a = ref('Title A', '10.1000/XYZ');
        const b = ref('Completely different', ' 10.1000/xyz ');
        expect(deduplicateReferences([a, b])).toEqual([a]);
    });

    it('keeps distinct references', () => {
        const refs = [ref('One', '10.1/a'), ref('Two', '10.1/b'), ref('Three')];
        expect(deduplicateReferences(refs)).toHaveLength(3);
    });
});
