import { describe, it, expect } from 'vitest';
import { parseLatexTokens } from './latex-to-omml';
import { Paragraph, Math as DocxMath, Document, Packer } from 'docx';
import JSZip from 'jszip';

async function toXml(latex: string): Promise<string> {
    const parsed = parseLatexTokens(latex);
    const p = new Paragraph({ children: [new DocxMath({ children: parsed })] });
    const doc = new Document({ sections: [{ children: [p] }] });
    const b64 = await Packer.toBase64String(doc);
    const zip = await new JSZip().loadAsync(Buffer.from(b64, 'base64'));
    const docXml = await zip.file('word/document.xml')?.async('text') || '';
    const start = docXml.indexOf('<m:oMath>');
    const end = docXml.indexOf('</m:oMath>');
    return docXml.substring(start, end + 10);
}

describe('latex-to-omml', () => {
    it('converts \\dot{P}_{req} without empty box placeholders', async () => {
        const xml = await toXml('\\dot{P}_{req}');
        expect(xml).toContain('<m:acc>');
        expect(xml).toContain('<m:chr m:val="̇"/>');
        expect(xml).toContain('<m:sSub>');
        expect(xml).toContain('<m:t>req</m:t>');
        expect(xml).not.toContain('<m:e><m:r><m:t/></m:r></m:e>');
    });

    it('renders \\text{ such that } with preserved whitespace', async () => {
        const xml = await toXml('\\text{ such that }');
        expect(xml).toContain('such that');
    });

    it('handles \\middle| correctly', async () => {
        const xml = await toXml('\\middle|');
        expect(xml).toContain('<m:t>|</m:t>');
        expect(xml).not.toContain('middle');
    });
});
