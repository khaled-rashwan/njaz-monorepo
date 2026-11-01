'use client';

import {
    Document, Paragraph, TextRun, Table, TableRow, TableCell,
    WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
    ImageRun, Math as DocxMath, Header, Footer, PageNumber
} from "docx";
import { ScholarBlock, ScholarDocument, ScholarLiteratureItem, BlockType } from '@/types';
import { resolveRef, toRoman } from './cross-reference';
import { latexToDocxMath } from './latex-to-omml';

/**
 * Parse text with inline [[ref:...]] and $...$ into a mix of TextRun and Math objects.
 * Returns (TextRun | DocxMath)[] — both are valid Paragraph children.
 */
export function parseTextToRuns(
    text: string,
    counterMap: Map<string, { type: BlockType; counter: number }>,
    language: 'en' | 'ar',
    options?: { color?: string, bold?: boolean }
): (TextRun | DocxMath)[] {
    if (!text) return [];

    const regex = /\[\[ref:[a-f0-9-,\s]+\]\]|\$[^\$]+\$/g;
    const runs: (TextRun | DocxMath)[] = [];
    let lastIndex = 0;
    let match;

    const defaultFont = language === 'ar' ? 'Arial' : 'Times New Roman';
    const defaultSize = 24;
    const defaultColor = options?.color || "000000";
    const defaultBold = options?.bold || false;

    while ((match = regex.exec(text)) !== null) {
        const index = match.index;
        const matchedStr = match[0];

        if (index > lastIndex) {
            runs.push(new TextRun({
                text: text.substring(lastIndex, index),
                rightToLeft: language === 'ar',
                font: defaultFont,
                size: defaultSize,
                color: defaultColor,
                bold: defaultBold,
            }));
        }

        if (matchedStr.startsWith('[[ref:')) {
            const refContent = matchedStr.slice(6, -2);
            const resolvedText = resolveRef(refContent, counterMap, language);
            runs.push(new TextRun({
                text: resolvedText,
                bold: true,
                color: "000000", // Black in document
                rightToLeft: language === 'ar',
                font: defaultFont,
                size: defaultSize,
            }));
        } else if (matchedStr.startsWith('$')) {
            // Convert inline LaTeX to native OMML math
            const latex = matchedStr.slice(1, -1);
            try {
                runs.push(latexToDocxMath(latex));
            } catch {
                // Fallback: render as italic Cambria Math text if parsing fails
                runs.push(new TextRun({
                    text: latex,
                    italics: true,
                    font: "Cambria Math",
                    rightToLeft: language === 'ar',
                    size: defaultSize,
                    color: "000000",
                }));
            }
        }

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        runs.push(new TextRun({
            text: text.substring(lastIndex),
            rightToLeft: language === 'ar',
            font: defaultFont,
            size: defaultSize,
            color: defaultColor,
            bold: defaultBold,
        }));
    }

    return runs;
}

export async function generateDocx({
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
    const isArabic = language === 'ar';
    const align = isArabic ? AlignmentType.RIGHT : AlignmentType.LEFT;

    const numberingConfig = {
        config: [
            {
                reference: "ordered-list",
                levels: [
                    {
                        level: 0,
                        format: "decimal" as const,
                        text: "%1.",
                        alignment: isArabic ? "right" as const : "left" as const,
                    },
                ],
            },
        ],
    };

    const sections: any[] = [];

    // Title
    sections.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: isArabic,
            spacing: { before: 240, after: 240 },
            children: [
                new TextRun({
                    text: doc.title || (isArabic ? 'ورقة بحثية غير معنونة' : 'Untitled Research Paper'),
                    bold: true,
                    size: 40,
                    font: isArabic ? 'Arial' : 'Times New Roman',
                    color: "000000",
                })
            ]
        })
    );

    // Abstract
    if (doc.abstract) {
        sections.push(
            new Paragraph({
                alignment: align,
                bidirectional: isArabic,
                spacing: { before: 240, after: 120 },
                children: [
                    new TextRun({
                        text: isArabic ? 'الملخص: ' : 'Abstract: ',
                        bold: true,
                        size: 24,
                        font: isArabic ? 'Arial' : 'Times New Roman',
                        color: "000000",
                    }),
                    new TextRun({
                        text: doc.abstract,
                        italics: true,
                        size: 24,
                        font: isArabic ? 'Arial' : 'Times New Roman',
                        color: "000000",
                    })
                ]
            })
        );
    }

    if (doc.metadata?.keywords) {
        sections.push(
            new Paragraph({
                alignment: align,
                bidirectional: isArabic,
                spacing: { after: 240 },
                children: [
                    new TextRun({
                        text: isArabic ? 'الكلمات المفتاحية: ' : 'Keywords: ',
                        bold: true,
                        size: 24,
                        font: isArabic ? 'Arial' : 'Times New Roman',
                        color: "000000",
                    }),
                    new TextRun({
                        text: doc.metadata.keywords,
                        size: 24,
                        font: isArabic ? 'Arial' : 'Times New Roman',
                        color: "000000",
                    })
                ]
            })
        );
    }

    // Process blocks
    for (const block of sortedBlocks) {
        const content = block.content || {};

        switch (block.type) {
            case 'HEADING': {
                const level = content.level || 2;
                const text = content.text || '';
                const prefix = headingNumbers.get(block.id);
                const fullText = prefix ? `${prefix} ${text}` : text;

                let headingLevel: any = HeadingLevel.HEADING_2;
                if (level === 1) headingLevel = HeadingLevel.HEADING_1;
                else if (level >= 3) headingLevel = HeadingLevel.HEADING_3;

                sections.push(
                    new Paragraph({
                        heading: headingLevel,
                        alignment: align,
                        bidirectional: isArabic,
                        children: [
                            new TextRun({
                                text: fullText,
                                bold: true,
                                font: isArabic ? 'Arial' : 'Times New Roman',
                                rightToLeft: isArabic,
                                color: "000000",
                            })
                        ]
                    })
                );

                const isReferencesHeading = level === 1 && (text || '').trim().toLowerCase() === 'references';
                const referencesHidden = !!doc?.metadata?.referencesHidden;
                if (isReferencesHeading && !referencesHidden) {
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
                                .filter(name => name && name.toLowerCase() !== 'unknown' && name.toLowerCase() !== 'unknown author');
                            if (names.length === 0) return 'Unknown Author';
                            return names.join(', ');
                        })();

                        let refStr = `${formattedAuthors}, "${linkedItem.title}"`;
                        if (linkedItem.journal) refStr += `, ${linkedItem.journal}`;
                        if (linkedItem.year) refStr += ` (${linkedItem.year})`;
                        refStr += `.`;

                        const runs = [
                            new TextRun({
                                text: `[${idx + 1}] `,
                                bold: true,
                                font: "Consolas",
                                size: 24,
                            }),
                            new TextRun({
                                text: refStr,
                                font: isArabic ? 'Arial' : 'Times New Roman',
                                size: 24,
                                rightToLeft: isArabic,
                            })
                        ];

                        if (linkedItem.url) {
                            runs.push(new TextRun({
                                text: ` ${linkedItem.url}`,
                                font: 'Times New Roman',
                                size: 20,
                                color: '0000EE',
                                underline: {},
                            }));
                        }

                        sections.push(
                            new Paragraph({
                                alignment: AlignmentType.LEFT,
                                bidirectional: isArabic,
                                spacing: { before: 80, after: 80 },
                                indent: { left: 720, hanging: 720 },
                                children: runs,
                            })
                        );
                    });
                }
                break;
            }

            case 'TEXT': {
                const listType = content.listType || 'none';
                const text = content.text || '';

                if (listType === 'ordered') {
                    sections.push(
                        new Paragraph({
                            alignment: align,
                            bidirectional: isArabic,
                            numbering: {
                                reference: "ordered-list",
                                level: 0,
                            },
                            children: parseTextToRuns(text, counterMap, language),
                        })
                    );
                } else if (listType === 'unordered') {
                    sections.push(
                        new Paragraph({
                            alignment: align,
                            bidirectional: isArabic,
                            bullet: {
                                level: 0,
                            },
                            children: parseTextToRuns(text, counterMap, language),
                        })
                    );
                } else {
                    sections.push(
                        new Paragraph({
                            alignment: align,
                            bidirectional: isArabic,
                            children: parseTextToRuns(text, counterMap, language),
                        })
                    );
                }
                break;
            }

            case 'EQUATION': {
                const eqEntry = counterMap.get(block.id);
                const eqNumber = eqEntry ? eqEntry.counter : 1;
                const latexStr = content.latex || '';

                let eqChildren: any[];
                try {
                    eqChildren = [
                        latexToDocxMath(latexStr),
                        new TextRun({
                            text: `   (${eqNumber})`,
                            font: "Consolas",
                            size: 24,
                            color: "000000",
                        })
                    ];
                } catch {
                    // Fallback: render as italic text if OMML conversion fails
                    eqChildren = [
                        new TextRun({
                            text: latexStr,
                            italics: true,
                            font: "Cambria Math",
                            size: 24,
                            color: "000000",
                        }),
                        new TextRun({
                            text: `   (${eqNumber})`,
                            font: "Consolas",
                            size: 24,
                            color: "000000",
                        })
                    ];
                }

                sections.push(
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        bidirectional: isArabic,
                        spacing: { before: 120, after: 120 },
                        children: eqChildren,
                    })
                );
                break;
            }

            case 'TABLE': {
                const tblEntry = counterMap.get(block.id);
                const tableNumber = tblEntry ? tblEntry.counter : 1;
                const headers = content.headers || [];
                const rows = content.rows || [];

                if (content.caption) {
                    sections.push(
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            bidirectional: isArabic,
                            spacing: { before: 120, after: 60 },
                            children: [
                                new TextRun({
                                    text: `${isArabic ? 'جدول' : 'Table'} ${toRoman(tableNumber)}: ${content.caption}`,
                                    bold: true,
                                    italics: true,
                                    size: 18,
                                    font: isArabic ? 'Arial' : 'Calibri',
                                })
                            ]
                        })
                    );
                }

                const cellBorders = {
                    top: { style: BorderStyle.SINGLE, size: 4, color: "94a3b8" },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: "94a3b8" },
                    left: { style: BorderStyle.SINGLE, size: 4, color: "94a3b8" },
                    right: { style: BorderStyle.SINGLE, size: 4, color: "94a3b8" },
                };
                const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

                const headerRow = new TableRow({
                    tableHeader: true,
                    children: headers.map((h: string) => new TableCell({
                        borders: {
                            ...cellBorders,
                            bottom: { style: BorderStyle.SINGLE, size: 8, color: "475569" }
                        },
                        shading: { fill: "1e293b", type: ShadingType.SOLID, color: "1e293b" },
                        width: { size: Math.floor(100 / (headers.length || 1)), type: WidthType.PERCENTAGE },
                        margins: cellMargins,
                        children: [new Paragraph({
                            alignment: AlignmentType.CENTER,
                            bidirectional: isArabic,
                            children: parseTextToRuns(h, counterMap, language, { color: "ffffff", bold: true }),
                        })],
                    })),
                });

                const dataRows = rows.map((row: string[]) => new TableRow({
                    children: row.map((cell: string) => new TableCell({
                        borders: cellBorders,
                        width: { size: Math.floor(100 / (row.length || 1)), type: WidthType.PERCENTAGE },
                        margins: cellMargins,
                        children: [new Paragraph({
                            alignment: align,
                            bidirectional: isArabic,
                            children: parseTextToRuns(cell, counterMap, language),
                        })],
                    })),
                }));

                sections.push(
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        alignment: AlignmentType.CENTER,
                        visuallyRightToLeft: isArabic,
                        rows: [headerRow, ...dataRows],
                    }),
                    new Paragraph({ spacing: { after: 120 } })
                );
                break;
            }

            case 'FIGURE': {
                const figEntry = counterMap.get(block.id);
                const figureNumber = figEntry ? figEntry.counter : 1;

                let imageRun: ImageRun | null = null;
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

                            // Read actual image dimensions to preserve aspect ratio
                            const MAX_WIDTH = 450; // max width in points for page
                            let imgWidth = MAX_WIDTH;
                            let imgHeight = 300; // default fallback

                            try {
                                const uint8 = new Uint8Array(buffer);
                                const dims = readImageDimensions(uint8);
                                if (dims) {
                                    const { width: natW, height: natH } = dims;
                                    // Scale to fit within MAX_WIDTH while preserving aspect ratio
                                    if (natW > 0 && natH > 0) {
                                        const scale = Math.min(MAX_WIDTH / natW, 1);
                                        imgWidth = Math.round(natW * scale);
                                        imgHeight = Math.round(natH * scale);
                                    }
                                }
                            } catch {
                                // If dimension reading fails, use defaults
                            }

                            // Detect image type from buffer signature
                            const sig = new Uint8Array(buffer.slice(0, 8));
                            let imgType: "png" | "jpg" | "gif" | "bmp" = "png";
                            if (sig[0] === 0xFF && sig[1] === 0xD8) imgType = "jpg";
                            else if (sig[0] === 0x47 && sig[1] === 0x49 && sig[2] === 0x46) imgType = "gif";
                            else if (sig[0] === 0x42 && sig[1] === 0x4D) imgType = "bmp";

                            imageRun = new ImageRun({
                                type: imgType,
                                data: buffer,
                                transformation: {
                                    width: imgWidth,
                                    height: imgHeight,
                                }
                            });
                        }
                    } catch (err) {
                        console.error("Failed to fetch image buffer for DOCX:", err);
                    }
                }

                if (imageRun) {
                    sections.push(
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            alignment: AlignmentType.CENTER,
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
                                bottom: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
                                left: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
                                right: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            margins: { top: 120, bottom: 120, left: 120, right: 120 },
                                            children: [
                                                new Paragraph({
                                                    alignment: AlignmentType.CENTER,
                                                    children: [imageRun],
                                                })
                                            ],
                                        })
                                    ]
                                })
                            ]
                        })
                    );
                } else {
                    sections.push(
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            bidirectional: isArabic,
                            children: [
                                new TextRun({
                                    text: isArabic ? '(صورة غير متوفرة)' : '(Image not available)',
                                    italics: true,
                                    size: 18,
                                    font: isArabic ? 'Arial' : 'Calibri',
                                    color: 'ef4444',
                                })
                            ]
                        })
                    );
                }

                if (content.caption) {
                    sections.push(
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            bidirectional: isArabic,
                            spacing: { before: 60, after: 120 },
                            children: [
                                new TextRun({
                                    text: `${isArabic ? 'شكل' : 'Figure'} ${figureNumber}: ${content.caption}`,
                                    bold: true,
                                    italics: true,
                                    size: 20,
                                    font: isArabic ? 'Arial' : 'Times New Roman',
                                })
                            ]
                        })
                    );
                }
                break;
            }

            case 'CODE': {
                const code = content.code || '';
                const codeLines = code.split('\n');

                sections.push(
                    new Paragraph({
                        shading: {
                            fill: "f8fafc",
                        },
                        border: {
                            top: { style: BorderStyle.SINGLE, size: 4, color: "e2e8f0" },
                            bottom: { style: BorderStyle.SINGLE, size: 4, color: "e2e8f0" },
                            left: { style: BorderStyle.SINGLE, size: 4, color: "e2e8f0" },
                            right: { style: BorderStyle.SINGLE, size: 4, color: "e2e8f0" },
                        },
                        spacing: { before: 120, after: 120 },
                        children: codeLines.map((line: string, idx: number) => {
                            return new TextRun({
                                text: line,
                                font: "Consolas",
                                size: 18,
                                break: idx > 0 ? 1 : undefined,
                            });
                        }),
                    })
                );
                break;
            }

            case 'DIVIDER': {
                sections.push(
                    new Paragraph({
                        border: {
                            bottom: { style: BorderStyle.SINGLE, size: 6, color: "cbd5e1", space: 12 },
                        },
                        spacing: { before: 120, after: 120 },
                        children: [],
                    })
                );
                break;
            }

            case 'AI_PROMPT': {
                if (content.generatedText) {
                    sections.push(
                        new Paragraph({
                            alignment: align,
                            bidirectional: isArabic,
                            spacing: { before: 120, after: 120 },
                            children: [
                                new TextRun({
                                    text: content.generatedText,
                                    italics: true,
                                    font: isArabic ? 'Arial' : 'Calibri',
                                    size: 22,
                                    color: "475569",
                                })
                            ]
                        })
                    );
                }
                break;
            }
        }
    }

    const stylesConfig = {
        default: {
            heading1: {
                run: {
                    bold: true,
                    font: isArabic ? 'Arial' : 'Times New Roman',
                    size: 32,
                    color: "000000",
                    rightToLeft: isArabic,
                },
                paragraph: {
                    alignment: align,
                    bidirectional: isArabic,
                    spacing: { before: 240, after: 120 },
                    border: {
                        bottom: { style: BorderStyle.SINGLE, size: 6, color: "cbd5e1", space: 12 },
                    }
                }
            },
            heading2: {
                run: {
                    bold: true,
                    font: isArabic ? 'Arial' : 'Times New Roman',
                    size: 28,
                    color: "000000",
                    rightToLeft: isArabic,
                },
                paragraph: {
                    alignment: align,
                    bidirectional: isArabic,
                    spacing: { before: 240, after: 80 },
                }
            },
            heading3: {
                run: {
                    bold: true,
                    font: isArabic ? 'Arial' : 'Times New Roman',
                    size: 26,
                    color: "000000",
                    rightToLeft: isArabic,
                },
                paragraph: {
                    alignment: align,
                    bidirectional: isArabic,
                    spacing: { before: 180, after: 60 },
                }
            },
        },
        paragraphStyles: [
            {
                id: "Normal",
                name: "Normal",
                paragraph: {
                    alignment: align,
                    bidirectional: isArabic,
                    spacing: { after: 120, line: 360 },
                },
                run: {
                    font: isArabic ? 'Arial' : 'Times New Roman',
                    size: 24,
                    color: "000000",
                    rightToLeft: isArabic,
                }
            }
        ]
    };

    return new Document({
        numbering: numberingConfig,
        styles: stylesConfig,
        sections: [{
            properties: {
                page: {
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
                },
                titlePage: true,
            },
            headers: {
                default: new Header({
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                                new TextRun({
                                    text: doc.title || (isArabic ? 'ورقة بحثية غير معنونة' : 'Untitled Research Paper'),
                                    italics: true,
                                    size: 20,
                                    color: "64748b",
                                    font: isArabic ? 'Arial' : 'Times New Roman',
                                    rightToLeft: isArabic,
                                })
                            ]
                        })
                    ]
                })
            },
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({
                                    text: isArabic ? "صفحة " : "Page ",
                                    size: 20,
                                    font: isArabic ? 'Arial' : 'Times New Roman',
                                    rightToLeft: isArabic,
                                }),
                                new TextRun({
                                    children: [PageNumber.CURRENT],
                                    size: 20,
                                    font: isArabic ? 'Arial' : 'Times New Roman',
                                }),
                                new TextRun({
                                    text: isArabic ? " من " : " of ",
                                    size: 20,
                                    font: isArabic ? 'Arial' : 'Times New Roman',
                                    rightToLeft: isArabic,
                                }),
                                new TextRun({
                                    children: [PageNumber.TOTAL_PAGES],
                                    size: 20,
                                    font: isArabic ? 'Arial' : 'Times New Roman',
                                })
                            ]
                        })
                    ]
                })
            },
            children: sections,
        }],
    });
}

/**
 * Read natural image dimensions from binary data.
 * Supports PNG, JPEG, GIF, and BMP formats.
 */
function readImageDimensions(data: Uint8Array): { width: number; height: number } | null {
    if (data.length < 24) return null;

    // PNG: bytes 0-7 are signature, IHDR chunk starts at 8
    // Width at offset 16 (4 bytes big-endian), Height at offset 20 (4 bytes big-endian)
    if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) {
        const width = (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19];
        const height = (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23];
        return { width, height };
    }

    // GIF: bytes 0-2 are 'GIF', width at 6-7 (little-endian), height at 8-9 (little-endian)
    if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
        const width = data[6] | (data[7] << 8);
        const height = data[8] | (data[9] << 8);
        return { width, height };
    }

    // BMP: bytes 0-1 are 'BM', width at 18-21 (little-endian), height at 22-25 (little-endian)
    if (data[0] === 0x42 && data[1] === 0x4D) {
        const width = data[18] | (data[19] << 8) | (data[20] << 16) | (data[21] << 24);
        const height = Math.abs(data[22] | (data[23] << 8) | (data[24] << 16) | (data[25] << 24));
        return { width, height };
    }

    // JPEG: SOI marker (FF D8), then scan for SOFn markers to find dimensions
    if (data[0] === 0xFF && data[1] === 0xD8) {
        let offset = 2;
        while (offset < data.length - 9) {
            if (data[offset] !== 0xFF) { offset++; continue; }
            const marker = data[offset + 1];

            // SOF0-SOF3, SOF5-SOF7, SOF9-SOF11, SOF13-SOF15 contain dimensions
            if (
                (marker >= 0xC0 && marker <= 0xC3) ||
                (marker >= 0xC5 && marker <= 0xC7) ||
                (marker >= 0xC9 && marker <= 0xCB) ||
                (marker >= 0xCD && marker <= 0xCF)
            ) {
                const height = (data[offset + 5] << 8) | data[offset + 6];
                const width = (data[offset + 7] << 8) | data[offset + 8];
                return { width, height };
            }

            // Skip to next marker using segment length
            const segLength = (data[offset + 2] << 8) | data[offset + 3];
            offset += 2 + segLength;
        }
    }

    return null;
}
