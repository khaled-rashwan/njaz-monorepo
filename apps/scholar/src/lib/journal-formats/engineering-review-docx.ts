'use client';

import {
    Document, Paragraph, TextRun, Table, TableRow, TableCell,
    WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
    ImageRun, Math as DocxMath, Header, Footer, PageNumber
} from "docx";
import { ScholarBlock, ScholarDocument, ScholarLiteratureItem, BlockType } from '@/types';
import { EngineeringReviewMetadata, AuthorInfo, AffiliationInfo } from '@/types/journal';
import { createInitialEngineeringReviewMetadata } from './engineering-review';
import { resolveRef } from '../cross-reference';
import { latexToDocxMath } from '../latex-to-omml';

/**
 * Parses text runs specifically for Engineering Review:
 * Uses Times New Roman 11pt, black, handles [[ref:...]] and $...$
 */
export function parseERTextToRuns(
    text: string,
    counterMap: Map<string, { type: BlockType; counter: number }>,
    language: 'en' | 'ar',
    options?: { size?: number; italic?: boolean; bold?: boolean }
): (TextRun | DocxMath)[] {
    if (!text) return [];

    const regex = /\[\[ref:[a-f0-9-,\s]+\]\]|\$[^\$]+\$/g;
    const runs: (TextRun | DocxMath)[] = [];
    let lastIndex = 0;
    let match;

    const font = 'Times New Roman';
    const size = options?.size ?? 22; // 11pt default
    const italics = options?.italic ?? false;
    const bold = options?.bold ?? false;

    while ((match = regex.exec(text)) !== null) {
        const index = match.index;
        const matchedStr = match[0];

        if (index > lastIndex) {
            runs.push(new TextRun({
                text: text.substring(lastIndex, index),
                font,
                size,
                italics,
                bold,
                color: "000000",
            }));
        }

        if (matchedStr.startsWith('[[ref:')) {
            const refContent = matchedStr.slice(6, -2);
            const resolvedText = resolveRef(refContent, counterMap, language);
            runs.push(new TextRun({
                text: resolvedText,
                bold: true,
                font,
                size,
                color: "000000",
            }));
        } else if (matchedStr.startsWith('$')) {
            const latex = matchedStr.slice(1, -1);
            try {
                runs.push(latexToDocxMath(latex));
            } catch {
                runs.push(new TextRun({
                    text: latex,
                    italics: true,
                    font: "Cambria Math",
                    size,
                    color: "000000",
                }));
            }
        }

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        runs.push(new TextRun({
            text: text.substring(lastIndex),
            font,
            size,
            italics,
            bold,
            color: "000000",
        }));
    }

    return runs;
}

/**
 * Builds the official Microsoft Word (.docx) document strictly matching
 * Engineering Review (University of Rijeka) template ER_instructions-OTH-OTH.docx.
 */
export async function generateEngineeringReviewDocx({
    doc,
    sortedBlocks,
    literatureItems,
    counterMap,
    headingNumbers,
    language,
}: {
    doc: ScholarDocument;
    sortedBlocks: ScholarBlock[];
    literatureItems: ScholarLiteratureItem[];
    counterMap: Map<string, { type: BlockType; counter: number }>;
    headingNumbers: Map<string, string>;
    language: 'en' | 'ar';
}): Promise<Document> {
    const journalMeta = (doc.metadata?.journalFormatting as EngineeringReviewMetadata) || createInitialEngineeringReviewMetadata(doc);
    const authors: AuthorInfo[] = journalMeta.authors && journalMeta.authors.length > 0
        ? journalMeta.authors
        : [{ id: 'a1', name: 'Author', surname: 'Surname', affiliationIds: ['aff-1'], isCorresponding: true, email: 'author@domain.edu' }];
    
    const affiliations: AffiliationInfo[] = journalMeta.affiliations && journalMeta.affiliations.length > 0
        ? journalMeta.affiliations
        : [{ id: 'aff-1', number: 1, department: 'Department Name', faculty: 'Faculty Name', institution: 'University of Rijeka', fullAddress: 'Vukovarska 58, 51000 Rijeka, Croatia' }];

    const history = journalMeta.articleHistory || {};
    const keywords: string[] = journalMeta.keywords && journalMeta.keywords.length > 0
        ? journalMeta.keywords.slice(0, 6)
        : (doc.metadata?.keywords ? doc.metadata.keywords.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    const shortTitle = journalMeta.shortTitle || (doc.title || 'Research Paper').substring(0, 50);
    const paperTitle = (journalMeta.paperTitle || doc.title || 'TITLE OF THE PAPER').toUpperCase();
    const correspondingAuthor = authors.find(a => a.isCorresponding) || authors[0];

    const sections: any[] = [];

    // 1. Title: 16 pt, BOLD, CAPITAL LETTERS, Centered, 14 pt spacing after
    sections.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 280 }, // 14 pt after
            children: [
                new TextRun({
                    text: paperTitle,
                    bold: true,
                    size: 32, // 16 pt
                    font: 'Times New Roman',
                    color: "000000",
                })
            ]
        })
    );

    // 2. Authors line: 11 pt, Bold, Centered, 14 pt spacing after
    const authorRuns: TextRun[] = [];
    authors.forEach((author, i) => {
        const affNumbers = (author.affiliationIds || [])
            .map(id => affiliations.find(a => a.id === id)?.number)
            .filter((n): n is number => n !== undefined);
        const supParts = [
            affNumbers.length > 0 ? affNumbers.join(',') : '',
            author.isCorresponding ? '*' : ''
        ].filter(Boolean);
        const supStr = supParts.join(',');

        authorRuns.push(new TextRun({
            text: `${author.name || ''} ${author.surname || ''}`.trim(),
            bold: true,
            size: 22, // 11 pt
            font: 'Times New Roman',
            color: "000000",
        }));

        if (supStr) {
            authorRuns.push(new TextRun({
                text: supStr,
                superScript: true,
                bold: true,
                size: 16, // 8 pt
                font: 'Times New Roman',
                color: "000000",
            }));
        }

        if (i < authors.length - 1) {
            authorRuns.push(new TextRun({
                text: ' – ',
                bold: true,
                size: 22,
                font: 'Times New Roman',
                color: "000000",
            }));
        }
    });

    sections.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 280 }, // 14 pt after
            children: authorRuns,
        })
    );

    // 3. Affiliations: 10 pt regular, Centered, 10 pt spacing after
    affiliations.forEach((aff, i) => {
        const fullAddr = aff.fullAddress || [aff.department, aff.faculty, aff.institution, aff.city, aff.country].filter(Boolean).join(', ');
        sections.push(
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: i === affiliations.length - 1 ? 200 : 80 }, // 10 pt after last
                children: [
                    new TextRun({
                        text: `${aff.number}`,
                        superScript: true,
                        size: 16,
                        font: 'Times New Roman',
                        color: "000000",
                    }),
                    new TextRun({
                        text: ` ${fullAddr}`,
                        size: 20, // 10 pt
                        font: 'Times New Roman',
                        color: "000000",
                    })
                ]
            })
        );
    });

    // 4. ARTICLE INFO Header Table (Exact 2-column table from ER template)
    // Col widths: 3828 dxa (~6.75 cm), 283 dxa (~0.5 cm gap), 5636 dxa (~9.94 cm)
    const leftCellParagraphs: Paragraph[] = [
        new Paragraph({
            spacing: { before: 40, after: 60 },
            children: [
                new TextRun({
                    text: 'ARTICLE INFO',
                    bold: true,
                    size: 20, // 10 pt
                    font: 'Times New Roman',
                    color: "000000",
                }),
                new TextRun({
                    text: ' (filled by publisher)',
                    italics: true,
                    size: 16,
                    font: 'Times New Roman',
                    color: "64748b",
                })
            ]
        }),
        new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [
                new TextRun({
                    text: 'Article history:',
                    bold: true,
                    italics: true,
                    size: 20,
                    font: 'Times New Roman',
                    color: "000000",
                })
            ]
        }),
        new Paragraph({
            spacing: { before: 20, after: 20 },
            children: [
                new TextRun({
                    text: `Received: ${history.receivedDate || new Date().toLocaleDateString('en-GB')}`,
                    size: 18,
                    font: 'Times New Roman',
                    color: "000000",
                })
            ]
        }),
        new Paragraph({
            spacing: { before: 20, after: 20 },
            children: [
                new TextRun({
                    text: `Received in revised form: ${history.revisedDate || '—'}`,
                    size: 18,
                    font: 'Times New Roman',
                    color: "000000",
                })
            ]
        }),
        new Paragraph({
            spacing: { before: 20, after: 60 },
            children: [
                new TextRun({
                    text: `Accepted: ${history.acceptedDate || '—'}`,
                    size: 18,
                    font: 'Times New Roman',
                    color: "000000",
                })
            ]
        }),
        new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [
                new TextRun({
                    text: 'Keywords: (max 6 keywords)',
                    bold: true,
                    italics: true,
                    size: 20,
                    font: 'Times New Roman',
                    color: "000000",
                })
            ]
        }),
        ...keywords.map((kw: string) => new Paragraph({
            spacing: { before: 10, after: 10 },
            children: [
                new TextRun({
                    text: `• ${kw}`,
                    size: 18,
                    font: 'Times New Roman',
                    color: "000000",
                })
            ]
        })),
        new Paragraph({
            spacing: { before: 60, after: 40 },
            children: [
                new TextRun({
                    text: `DOI: ${journalMeta.doi || '10.36978/ed.xxxx'}`,
                    size: 18,
                    font: 'Times New Roman',
                    color: "000000",
                })
            ]
        })
    ];

    const rightCellParagraphs: Paragraph[] = [
        new Paragraph({
            spacing: { before: 40, after: 60 },
            children: [
                new TextRun({
                    text: 'Abstract:',
                    bold: true,
                    italics: true,
                    size: 20, // 10 pt
                    font: 'Times New Roman',
                    color: "000000",
                })
            ]
        }),
        new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 240, after: 80 },
            children: [
                new TextRun({
                    text: doc.abstract || 'The abstract should not contain more than 250 words including objective, methods, procedures, experimental investigations as well as main outcomes and results. Do not cite references and do not use abbreviations in the abstract.',
                    size: 20, // 10 pt
                    font: 'Times New Roman',
                    color: "000000",
                })
            ]
        })
    ];

    const articleInfoTable = new Table({
        width: { size: 9747, type: WidthType.DXA },
        alignment: AlignmentType.CENTER,
        borders: {
            top: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
            left: { style: BorderStyle.NONE, size: 0, color: "auto" },
            right: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 3828, type: WidthType.DXA },
                        margins: { top: 120, bottom: 120, left: 100, right: 100 },
                        children: leftCellParagraphs,
                    }),
                    new TableCell({
                        width: { size: 283, type: WidthType.DXA },
                        children: [new Paragraph({})],
                    }),
                    new TableCell({
                        width: { size: 5636, type: WidthType.DXA },
                        margins: { top: 120, bottom: 120, left: 100, right: 100 },
                        children: rightCellParagraphs,
                    }),
                ]
            })
        ]
    });

    sections.push(articleInfoTable);
    sections.push(new Paragraph({ spacing: { before: 240, after: 120 } })); // 12 pt spacing after table

    // 5. Render Blocks (Headings, Text with 0.6cm indent, Equations, Figures, Tables, References)
    let sectionCounter = 1;
    let subsectionCounters: Record<number, number> = {};

    for (const block of sortedBlocks) {
        const content = block.content || {};

        switch (block.type) {
            case 'HEADING': {
                const level = content.level || 1;
                const text = (content.text || '').trim();
                const isReferencesHeading = level === 1 && text.toLowerCase() === 'references';

                let headingPrefix = headingNumbers.get(block.id);
                // If no prefix was set in editor, enforce Engineering Review Arabic numeral format
                if (!headingPrefix) {
                    if (level === 1) {
                        headingPrefix = `${sectionCounter}`;
                        subsectionCounters[sectionCounter] = 1;
                        sectionCounter++;
                    } else if (level === 2) {
                        const currentSec = sectionCounter - 1 > 0 ? sectionCounter - 1 : 1;
                        const subIndex = subsectionCounters[currentSec] || 1;
                        headingPrefix = `${currentSec}.${subIndex}`;
                        subsectionCounters[currentSec] = subIndex + 1;
                    }
                }

                const fullHeadingText = headingPrefix && !isReferencesHeading
                    ? `${headingPrefix} ${text}`
                    : text;

                if (level === 1) {
                    // Level 1: 12 pt, bold, spacing before 11 pt (220 dxa), after 5 pt (100 dxa)
                    sections.push(
                        new Paragraph({
                            alignment: AlignmentType.LEFT,
                            spacing: { before: 220, after: 100 },
                            children: [
                                new TextRun({
                                    text: fullHeadingText,
                                    bold: true,
                                    size: 24, // 12 pt
                                    font: 'Times New Roman',
                                    color: "000000",
                                })
                            ]
                        })
                    );
                } else {
                    // Level 2 / 3: 11 pt, italic, spacing before 11 pt (220 dxa), after 5 pt (100 dxa)
                    sections.push(
                        new Paragraph({
                            alignment: AlignmentType.LEFT,
                            spacing: { before: 220, after: 100 },
                            children: [
                                new TextRun({
                                    text: fullHeadingText,
                                    italics: true,
                                    size: 22, // 11 pt
                                    font: 'Times New Roman',
                                    color: "000000",
                                })
                            ]
                        })
                    );
                }

                // If References heading, render IEEE formatted reference list
                if (isReferencesHeading && !doc?.metadata?.referencesHidden) {
                    const refBlocks = sortedBlocks.filter(b => b.type === 'REFERENCE');
                    refBlocks.forEach((refBlock, idx) => {
                        let refContent: any = refBlock.content;
                        if (typeof refContent === 'string') {
                            try { refContent = JSON.parse(refContent); } catch { refContent = {}; }
                        }
                        const linkedItem = literatureItems.find(item => item.id === refContent?.literatureItemId);
                        if (!linkedItem) return;

                        let authorsList: any[] = [];
                        const rawAuthors = linkedItem.authors;
                        if (typeof rawAuthors === 'string') {
                            try { authorsList = JSON.parse(rawAuthors); } catch { authorsList = []; }
                        } else if (Array.isArray(rawAuthors)) {
                            authorsList = rawAuthors;
                        }

                        const formattedAuthors = (() => {
                            const names = authorsList
                                .map(a => {
                                    if (typeof a === 'string') return a.trim();
                                    if (a && typeof a === 'object') return (a.name || '').trim();
                                    return '';
                                })
                                .filter(name => name && name.toLowerCase() !== 'unknown');
                            return names.length > 0 ? names.join(', ') : 'Unknown Author';
                        })();

                        let refStr = `${formattedAuthors}, “${linkedItem.title},”`;
                        if (linkedItem.journal) refStr += ` ${linkedItem.journal}`;
                        if (linkedItem.year) refStr += `, ${linkedItem.year}`;
                        if (linkedItem.doi) refStr += `, doi: ${linkedItem.doi}`;
                        refStr += '.';

                        sections.push(
                            new Paragraph({
                                alignment: AlignmentType.JUSTIFIED,
                                spacing: { before: 60, after: 60 },
                                indent: { left: 450, hanging: 450 },
                                children: [
                                    new TextRun({
                                        text: `[${idx + 1}] `,
                                        font: "Times New Roman",
                                        bold: true,
                                        size: 20, // 10 pt
                                    }),
                                    new TextRun({
                                        text: refStr,
                                        font: 'Times New Roman',
                                        size: 20, // 10 pt
                                    }),
                                    ...(linkedItem.url ? [
                                        new TextRun({
                                            text: ` [Online]. Available: ${linkedItem.url}`,
                                            font: 'Times New Roman',
                                            size: 18,
                                            color: '0000EE',
                                        })
                                    ] : [])
                                ]
                            })
                        );
                    });
                }
                break;
            }

            case 'TEXT': {
                const text = content.text || '';
                const listType = content.listType || 'none';

                if (listType === 'ordered') {
                    sections.push(
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            spacing: { line: 240, after: 80 },
                            indent: { left: 450, hanging: 250 },
                            children: parseERTextToRuns(text, counterMap, language),
                        })
                    );
                } else if (listType === 'unordered') {
                    sections.push(
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            spacing: { line: 240, after: 80 },
                            indent: { left: 450, hanging: 250 },
                            children: parseERTextToRuns(text, counterMap, language),
                        })
                    );
                } else {
                    // Standard Body Paragraph: Times New Roman 11pt, Justified, 0.6cm (340 dxa) first line indent
                    sections.push(
                        new Paragraph({
                            alignment: AlignmentType.JUSTIFIED,
                            spacing: { line: 240, after: 80 },
                            indent: { firstLine: 340 }, // 0.6 cm indentation
                            children: parseERTextToRuns(text, counterMap, language),
                        })
                    );
                }
                break;
            }

            case 'EQUATION': {
                const eqEntry = counterMap.get(block.id);
                const eqNumber = eqEntry ? eqEntry.counter : 1;
                const latexStr = content.latex || '';

                let mathRun: any;
                try {
                    mathRun = latexToDocxMath(latexStr);
                } catch {
                    mathRun = new TextRun({
                        text: latexStr,
                        italics: true,
                        font: "Cambria Math",
                        size: 22,
                    });
                }

                // Centered math with right-aligned (eqNumber)
                const eqTable = new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                        bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                        left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                        right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
                        insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    width: { size: 85, type: WidthType.PERCENTAGE },
                                    children: [
                                        new Paragraph({
                                            alignment: AlignmentType.CENTER,
                                            children: [mathRun],
                                        })
                                    ]
                                }),
                                new TableCell({
                                    width: { size: 15, type: WidthType.PERCENTAGE },
                                    children: [
                                        new Paragraph({
                                            alignment: AlignmentType.RIGHT,
                                            children: [
                                                new TextRun({
                                                    text: `(${eqNumber})`,
                                                    font: "Times New Roman",
                                                    size: 22,
                                                })
                                            ]
                                        })
                                    ]
                                }),
                            ]
                        })
                    ]
                });

                sections.push(new Paragraph({ spacing: { before: 100, after: 60 } }));
                sections.push(eqTable);
                sections.push(new Paragraph({ spacing: { before: 60, after: 100 } }));
                break;
            }

            case 'FIGURE': {
                const figEntry = counterMap.get(block.id);
                const figureNumber = figEntry ? figEntry.counter : 1;

                // Figure caption must be at the BOTTOM: "Figure 1. Caption" in 11pt italic
                let imgUrl = content.src || '';
                if (content.s3Key) {
                    try {
                        const { getUrl } = await import('aws-amplify/storage');
                        const res = await getUrl({ path: content.s3Key, options: { validateObjectExistence: false, expiresIn: 3600 } });
                        imgUrl = res.url.toString();
                    } catch (err) {
                        console.error("Failed to sign image for DOCX:", err);
                    }
                }

                if (imgUrl) {
                    try {
                        const imgRes = await fetch(imgUrl);
                        if (imgRes.ok) {
                            const buffer = await imgRes.arrayBuffer();
                            const imageRun = new ImageRun({
                                type: "png",
                                data: buffer,
                                transformation: { width: 420, height: 260 }
                            });
                            sections.push(
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    spacing: { before: 140, after: 80 },
                                    children: [imageRun],
                                })
                            );
                        }
                    } catch {
                        // Fallback placeholder
                    }
                }

                if (content.caption) {
                    sections.push(
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 80, after: 200 },
                            children: [
                                new TextRun({
                                    text: `Figure ${figureNumber}. ${content.caption}`,
                                    italics: true,
                                    size: 22, // 11 pt
                                    font: 'Times New Roman',
                                    color: "000000",
                                })
                            ]
                        })
                    );
                }
                break;
            }

            case 'TABLE': {
                const tblEntry = counterMap.get(block.id);
                const tableNumber = tblEntry ? tblEntry.counter : 1;
                const headers: string[] = content.headers || [];
                const rows: string[][] = content.rows || [];

                // Table caption must be at the TOP: "Table 1. Caption" in 11pt italic
                if (content.caption) {
                    sections.push(
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 200, after: 80 },
                            children: [
                                new TextRun({
                                    text: `Table ${tableNumber}. ${content.caption}`,
                                    italics: true,
                                    size: 22, // 11 pt
                                    font: 'Times New Roman',
                                    color: "000000",
                                })
                            ]
                        })
                    );
                }

                if (headers.length > 0) {
                    const tableRows = [
                        new TableRow({
                            tableHeader: true,
                            children: headers.map((h: string) => new TableCell({
                                margins: { top: 80, bottom: 80, left: 100, right: 100 },
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.LEFT,
                                        children: [
                                            new TextRun({
                                                text: h,
                                                bold: true,
                                                size: 20, // 10 pt
                                                font: 'Times New Roman',
                                            })
                                        ]
                                    })
                                ]
                            }))
                        }),
                        ...rows.map((row: string[], rIdx: number) => new TableRow({
                            children: row.map((cell: string) => new TableCell({
                                margins: { top: 60, bottom: 60, left: 100, right: 100 },
                                shading: rIdx % 2 === 1 ? { fill: "F8FAFC", type: ShadingType.CLEAR } : undefined,
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.LEFT,
                                        children: [
                                            new TextRun({
                                                text: cell,
                                                size: 20, // 10 pt
                                                font: 'Times New Roman',
                                            })
                                        ]
                                    })
                                ]
                            }))
                        }))
                    ];

                    sections.push(
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            alignment: AlignmentType.CENTER,
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
                                bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
                                left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                                right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                                insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
                                insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
                            },
                            rows: tableRows,
                        })
                    );
                    sections.push(new Paragraph({ spacing: { after: 180 } }));
                }
                break;
            }

            case 'CODE': {
                const code = content.code || '';
                sections.push(
                    new Paragraph({
                        spacing: { before: 120, after: 120 },
                        children: [
                            new TextRun({
                                text: code,
                                font: 'Consolas',
                                size: 18,
                            })
                        ]
                    })
                );
                break;
            }

            default:
                break;
        }
    }

    // 6. Assemble Document with exact Page Margins & Headers/Footers
    const firstPageHeader = new Header({
        children: [
            new Paragraph({
                alignment: AlignmentType.LEFT,
                border: {
                    bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" }
                },
                children: [
                    new TextRun({
                        text: `Engineering Review, Vol. ${journalMeta.volume || '44'} (${journalMeta.year || new Date().getFullYear().toString()}) No. ${journalMeta.issue || '3'}`,
                        font: 'Times New Roman',
                        size: 18,
                        bold: true,
                    }),
                    new TextRun({
                        text: `                                                   DOI: ${journalMeta.doi || '10.36978/ed.xxxx'}`,
                        font: 'Times New Roman',
                        size: 18,
                    })
                ]
            })
        ]
    });

    const defaultHeader = new Header({
        children: [
            new Paragraph({
                alignment: AlignmentType.LEFT,
                border: {
                    bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" }
                },
                children: [
                    new TextRun({
                        text: `${authors.map((a: AuthorInfo) => `${(a.name || '')[0]}. ${a.surname || ''}`).join(', ')}: ${shortTitle}`,
                        font: 'Times New Roman',
                        size: 18,
                        italics: true,
                    }),
                    new TextRun({
                        text: `                                                               `,
                        size: 18,
                    }),
                    new TextRun({
                        children: [PageNumber.CURRENT],
                        font: 'Times New Roman',
                        size: 18,
                    })
                ]
            })
        ]
    });

    const firstPageFooter = new Footer({
        children: [
            new Paragraph({
                alignment: AlignmentType.LEFT,
                border: {
                    top: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" }
                },
                children: [
                    new TextRun({
                        text: `* Corresponding author. E-mail address: ${correspondingAuthor.email || 'author@university.edu'}${correspondingAuthor.phone ? '; Tel.: ' + correspondingAuthor.phone : ''}`,
                        font: 'Times New Roman',
                        size: 18,
                        italics: true,
                    })
                ]
            })
        ]
    });

    const defaultFooter = new Footer({
        children: [
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({
                        children: [PageNumber.CURRENT],
                        font: 'Times New Roman',
                        size: 20,
                    })
                ]
            })
        ]
    });

    return new Document({
        sections: [{
            properties: {
                titlePage: true, // enables different first page header/footer
                page: {
                    margin: {
                        top: 1984,    // 3.5 cm
                        bottom: 1134, // 2.0 cm
                        left: 1134,   // 2.0 cm
                        right: 1134,  // 2.0 cm
                        header: 1304, // 2.3 cm
                    },
                    size: {
                        width: 11906,  // A4
                        height: 16838,
                    }
                }
            },
            headers: {
                first: firstPageHeader,
                default: defaultHeader,
            },
            footers: {
                first: firstPageFooter,
                default: defaultFooter,
            },
            children: sections,
        }]
    });
}
