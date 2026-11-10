import { describe, it, expect } from 'vitest';
import { parseBibTeX, parseRIS, parseDOIs } from './citation-parsers';

describe('parseBibTeX', () => {
    it('parses valid BibTeX entry with author, title, year and journal', () => {
        const bibtex = `
@article{vaswani2017attention,
  title={Attention Is All You Need},
  author={Vaswani, Ashish and Shazeer, Noam and Parmar, Niki},
  journal={Advances in Neural Information Processing Systems},
  year={2017},
  doi={10.5555/3295222.3295349}
}
        `;
        const results = parseBibTeX(bibtex);
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Attention Is All You Need');
        expect(results[0].authors).toEqual([
            { name: 'Vaswani, Ashish' },
            { name: 'Shazeer, Noam' },
            { name: 'Parmar, Niki' },
        ]);
        expect(results[0].year).toBe(2017);
        expect(results[0].journal).toBe('Advances in Neural Information Processing Systems');
        expect(results[0].doi).toBe('10.5555/3295222.3295349');
    });

    it('handles multiple records and skips entries without a title', () => {
        const raw = `
@misc{emptyEntry,
  author={Someone}
}
@book{book1,
  title={Clean Code},
  author={Robert C. Martin},
  year={2008}
}
        `;
        const results = parseBibTeX(raw);
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Clean Code');
        expect(results[0].year).toBe(2008);
    });
});

describe('parseRIS', () => {
    it('parses RIS format entries correctly', () => {
        const ris = `
TY  - JOUR
TI  - Deep Residual Learning for Image Recognition
AU  - He, Kaiming
AU  - Zhang, Xiangyu
PY  - 2016
JO  - CVPR
DO  - 10.1109/CVPR.2016.90
ER  -
        `;
        const results = parseRIS(ris);
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Deep Residual Learning for Image Recognition');
        expect(results[0].authors).toHaveLength(2);
        expect(results[0].authors[0].name).toBe('He, Kaiming');
        expect(results[0].year).toBe(2016);
        expect(results[0].journal).toBe('CVPR');
        expect(results[0].doi).toBe('10.1109/CVPR.2016.90');
    });
});

describe('parseDOIs', () => {
    it('extracts valid DOIs from free text lines', () => {
        const text = `
            Check out 10.1038/nature12373 for more info.
            Another paper is at https://doi.org/10.1145/3372278.3390678
            Invalid line here.
        `;
        const dois = parseDOIs(text);
        expect(dois).toEqual([
            '10.1038/nature12373',
            '10.1145/3372278.3390678'
        ]);
    });
});
