import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// pdf-parse is loaded natively by Node.js (not bundled by Webpack)
// thanks to serverExternalPackages in next.config.js
const pdfParse = require('pdf-parse');

async function parsePdf(pdfBuffer: Buffer): Promise<{ text: string }> {
    const mod = require('pdf-parse');
    if (mod && mod.PDFParse) {
        const parser = new mod.PDFParse({ data: pdfBuffer });
        const result = await parser.getText();
        return { text: result.text || '' };
    }
    const parse = typeof mod === 'function' ? mod : (mod.default || mod);
    if (typeof parse === 'function') {
        const result = await parse(pdfBuffer);
        return { text: result.text || '' };
    }
    throw new Error('No PDF parsing function found in pdf-parse module');
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const projectId = formData.get('projectId') as string;
        const paperId = formData.get('paperId') as string;

        if (!file || !projectId || !paperId) {
            return NextResponse.json({ error: 'Missing file, projectId, or paperId' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const storageDir = path.join(process.cwd(), 'storage');
        const pdfsDir = path.join(storageDir, 'pdfs', projectId);
        const textsDir = path.join(storageDir, 'texts', projectId);

        fs.mkdirSync(pdfsDir, { recursive: true });
        fs.mkdirSync(textsDir, { recursive: true });

        const isPdf = file.name.toLowerCase().endsWith('.pdf');
        
        let extractedText = '';

        if (isPdf) {
            const pdfPath = path.join(pdfsDir, `${paperId.replace(/[^a-z0-9]/gi, '_')}.pdf`);
            fs.writeFileSync(pdfPath, buffer);
            
            // Extract text
            const pdfData = await parsePdf(buffer);
            extractedText = pdfData.text || '';
        } else {
            extractedText = buffer.toString('utf-8');
        }

        const textPath = path.join(textsDir, `${paperId.replace(/[^a-z0-9]/gi, '_')}.txt`);
        fs.writeFileSync(textPath, extractedText);

        return NextResponse.json({
            success: true,
            textLength: extractedText.length
        });
    } catch (error: any) {
        console.error('[Upload] Error occurred:', error);
        return NextResponse.json({ error: `Upload failed: ${error.message || String(error)}` }, { status: 500 });
    }
}
