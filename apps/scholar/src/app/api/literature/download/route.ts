import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

// pdf-parse is loaded natively by Node.js (not bundled by Webpack)
// thanks to serverExternalPackages in next.config.js
const pdfParse = require('pdf-parse');

async function parsePdf(pdfBuffer: Buffer): Promise<{ text: string }> {
    const mod = require('pdf-parse');
    // pdf-parse v2.x exposes PDFParse class
    if (mod && mod.PDFParse) {
        const parser = new mod.PDFParse({ data: pdfBuffer });
        const result = await parser.getText();
        return { text: result.text || '' };
    }
    // pdf-parse v1.x fallback (default export is a function)
    const parse = typeof mod === 'function' ? mod : (mod.default || mod);
    if (typeof parse === 'function') {
        const result = await parse(pdfBuffer);
        return { text: result.text || '' };
    }
    throw new Error('No PDF parsing function found in pdf-parse module');
}


export async function POST(req: NextRequest) {
    try {
        const { doi, title, url, projectId, paperId, sciHubCookie } = await req.json();
        
        if (!projectId || !paperId) {
            return NextResponse.json({ error: 'Missing projectId or paperId' }, { status: 400 });
        }

        // Define local directories
        const storageDir = path.join(process.cwd(), 'storage');
        const pdfsDir = path.join(storageDir, 'pdfs', projectId);
        const textsDir = path.join(storageDir, 'texts', projectId);

        // Ensure directories exist
        fs.mkdirSync(pdfsDir, { recursive: true });
        fs.mkdirSync(textsDir, { recursive: true });

        const pdfPath = path.join(pdfsDir, `${paperId.replace(/[^a-z0-9]/gi, '_')}.pdf`);
        const textPath = path.join(textsDir, `${paperId.replace(/[^a-z0-9]/gi, '_')}.txt`);

        let pdfBuffer: Buffer | null = null;

        // 0. Try direct IEEE Xplore PDF resolution if URL is provided
        let ieeeDirectUrl = '';
        if (url && url.includes('ieeexplore.ieee.org')) {
            const match = url.match(/arnumber=(\d+)/) || url.match(/\/document\/(\d+)/);
            if (match && match[1]) {
                ieeeDirectUrl = `https://ieeexplore.ieee.org/stampPDF/getPDF.jsp?tp=&arnumber=${match[1]}`;
            }
        }

        if (ieeeDirectUrl) {
            try {
                console.log(`[Download] Resolving IEEE direct PDF URL: ${ieeeDirectUrl}`);
                const pdfRes = await fetch(ieeeDirectUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });
                if (pdfRes.ok) {
                    const contentType = pdfRes.headers.get('content-type') || '';
                    if (contentType.includes('application/pdf')) {
                        pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
                    }
                }
            } catch (err) {
                console.warn('[Download] Direct IEEE PDF resolution failed, falling back:', err);
            }
        }

        // 1. Try to find OpenAccess PDF URL first (via OpenAlex)
        if (!pdfBuffer && doi) {
            try {
                console.log(`[Download] Querying OpenAlex for open access URL for DOI: ${doi}`);
                const openAlexRes = await fetch(`https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`, {
                    headers: { 'User-Agent': 'Scholar/1.0 (mailto:support@njaz.org)' }
                });
                if (openAlexRes.ok) {
                    const work = await openAlexRes.json();
                    let oaUrl = work.best_oa_location?.pdf_url || work.primary_location?.pdf_url || work.best_oa_location?.landing_page_url;
                    if (oaUrl) {
                        if (oaUrl.includes('ieeexplore.ieee.org')) {
                            const match = oaUrl.match(/arnumber=(\d+)/) || oaUrl.match(/\/document\/(\d+)/);
                            if (match && match[1]) {
                                oaUrl = `https://ieeexplore.ieee.org/stampPDF/getPDF.jsp?tp=&arnumber=${match[1]}`;
                            }
                        }
                        console.log(`[Download] Found OpenAccess PDF URL: ${oaUrl}`);
                        const pdfRes = await fetch(oaUrl, {
                            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                        });
                        if (pdfRes.ok) {
                            const contentType = pdfRes.headers.get('content-type') || '';
                            if (contentType.includes('application/pdf')) {
                                pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn('[Download] OpenAccess check failed:', err);
            }
        }

        // 2. Try Sci-Hub proxy resolver fallback
        if (!pdfBuffer && doi) {
            const sciHubMirrors = [
                'https://sci-hub.box',
                'https://sci-hub.se',
                'https://sci-hub.st',
                'https://sci-hub.ru'
            ];

            for (const mirror of sciHubMirrors) {
                try {
                    console.log(`[Download] Trying Sci-Hub mirror: ${mirror}/${doi}`);
                    const headers: Record<string, string> = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    };
                    if (sciHubCookie) {
                        headers['Cookie'] = sciHubCookie;
                    }

                    const sciHubPageRes = await fetch(`${mirror}/${doi}`, { headers });
                    
                    if (sciHubPageRes.ok) {
                        let html = await sciHubPageRes.text();
                        
                        if (html.includes('altcha-widget') || html.includes('التحقق من الروبوت')) {
                            console.log(`[Download] CAPTCHA detected on Sci-Hub mirror ${mirror}. Attempting auto-solve...`);
                            
                            const challengeIdMatch = html.match(/challengeurl\s*=\s*["']\/captcha\/challenge\/(\d+)["']/i) ||
                                                     html.match(/\/captcha\/challenge\/(\d+)/i);
                                                     
                            if (challengeIdMatch && challengeIdMatch[1]) {
                                const challengeId = challengeIdMatch[1];
                                console.log(`[Download] Found Altcha challenge ID: ${challengeId}. Fetching challenge JSON...`);
                                
                                const challengeRes = await fetch(`${mirror}/captcha/challenge/${challengeId}`);
                                if (challengeRes.ok) {
                                    const challengeData = await challengeRes.json();
                                    const { algorithm, challenge, salt, signature, maxnumber } = challengeData;
                                    
                                    console.log(`[Download] Solving Altcha challenge... difficulty limit: ${maxnumber || 1000000}`);
                                    let solvedNumber: number | null = null;
                                    const limit = maxnumber || 1000000;
                                    
                                    for (let i = 0; i <= limit; i++) {
                                        const hash = crypto.createHash('sha256').update(salt + i).digest('hex');
                                        if (hash === challenge) {
                                            solvedNumber = i;
                                            break;
                                        }
                                    }
                                    
                                    if (solvedNumber !== null) {
                                        console.log(`[Download] Altcha challenge solved! Nonce: ${solvedNumber}. Submitting solution...`);
                                        const solutionPayload = Buffer.from(JSON.stringify({
                                            algorithm,
                                            challenge,
                                            number: solvedNumber,
                                            salt,
                                            signature
                                        })).toString('base64');
                                        
                                        const solutionRes = await fetch(`${mirror}/captcha/solution/${challengeId}`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ captcha: solutionPayload })
                                        });
                                        
                                        if (solutionRes.ok) {
                                            const solutionResult = await solutionRes.json();
                                            if (solutionResult.success) {
                                                console.log(`[Download] Altcha verification successful! Fetching cookies...`);
                                                let newCookie = '';
                                                if (solutionRes.headers.getSetCookie) {
                                                    newCookie = solutionRes.headers.getSetCookie().join('; ');
                                                } else {
                                                    newCookie = solutionRes.headers.get('set-cookie') || '';
                                                }
                                                
                                                // Fetch page again with the solved cookie!
                                                console.log(`[Download] Fetching Sci-Hub page again with solved cookies: ${newCookie}`);
                                                const finalPageRes = await fetch(`${mirror}/${doi}`, {
                                                    headers: {
                                                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                                        'Cookie': newCookie
                                                    }
                                                });
                                                
                                                if (finalPageRes.ok) {
                                                    html = await finalPageRes.text();
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            
                            // If auto-solve failed and we don't have the pdfBuffer, fail
                            if (!html.includes('citation_pdf_url') && !html.includes('application/pdf')) {
                                throw new Error('CAPTCHA verification required. Open sci-hub.box, solve the robot check, and copy your browser cookie to the panel settings.');
                            }
                        }

                        const $ = cheerio.load(html);
                        let pdfLink = '';

                        // Target 1: The Citation Meta Tag (Most Reliable)
                        pdfLink = $('meta[name="citation_pdf_url"]').attr('content') || '';

                        // Target 2: The Object Data attribute (Fallback 1)
                        if (!pdfLink) {
                            pdfLink = $('div.pdf object').attr('data') || 
                                      $('object[type="application/pdf"]').attr('data') || '';
                        }

                        // Target 3: The Download Button / Link (Fallback 2)
                        if (!pdfLink) {
                            pdfLink = $('.download a').attr('href') || 
                                      $('#buttons a').attr('href') || 
                                      $('a[href*=".pdf"]').attr('href') || '';
                        }

                        if (pdfLink) {
                            pdfLink = pdfLink.replace(/&amp;/g, '&');
                            if (pdfLink.startsWith('//')) {
                                pdfLink = 'https:' + pdfLink;
                            } else if (pdfLink.startsWith('/')) {
                                pdfLink = mirror + pdfLink;
                            }
                            
                            console.log(`[Download] Resolved Sci-Hub PDF download link: ${pdfLink}`);
                            
                            const pdfHeaders: Record<string, string> = { 
                                'Referer': `${mirror}/${doi}`,
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
                            };
                            if (sciHubCookie) {
                                pdfHeaders['Cookie'] = sciHubCookie;
                            }

                            const pdfRes = await fetch(pdfLink, { headers: pdfHeaders });
                            if (pdfRes.ok) {
                                pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
                                break; // Found it!
                            }
                        }
                    }
                } catch (err) {
                    console.warn(`[Download] Sci-Hub mirror ${mirror} failed:`, err);
                    throw err; // bubble up captcha errors
                }
            }
        }

        // 3. Fallback: Try downloading directly from URL if it ends with .pdf
        if (!pdfBuffer && url && url.toLowerCase().endsWith('.pdf')) {
            try {
                console.log(`[Download] Fetching direct PDF URL: ${url}`);
                const pdfRes = await fetch(url);
                if (pdfRes.ok) {
                    pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
                }
            } catch (err) {
                console.warn('[Download] Direct URL fetch failed:', err);
            }
        }

        if (!pdfBuffer) {
            return NextResponse.json({ error: 'Could not resolve full-text PDF from OpenAccess or Sci-Hub' }, { status: 404 });
        }

        // Save PDF file
        fs.writeFileSync(pdfPath, pdfBuffer);

        // 4. Extract text from PDF
        console.log(`[Download] PDF successfully saved to: ${pdfPath}. Parsing text...`);
        const pdfData = await parsePdf(pdfBuffer);
        const extractedText = pdfData.text || '';

        // Save text file
        fs.writeFileSync(textPath, extractedText);
        console.log(`[Download] Text successfully saved to: ${textPath}. Length: ${extractedText.length}`);

        return NextResponse.json({
            success: true,
            pdfPath,
            textPath,
            textLength: extractedText.length
        });

    } catch (error: any) {
        console.error('[Download] Error occurred:', error);
        return NextResponse.json({ error: `Downloader failed: ${error.message || String(error)}` }, { status: 500 });
    }
}
