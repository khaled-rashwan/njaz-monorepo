'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEditorStore } from '@/store/editor-store';
import { useLanguage } from '@/components/LanguageContext';
import { buildCounterMap, resolveRef, calculateHeadingNumbers, filterBlocksForDocument, toRoman } from '@/lib/cross-reference';
import { sortByOrder } from '@/lib/fractional-index';
import { BlockType } from '@/types';

// Simple KaTeX Math Renderer
function StaticMath({ latex, displayMode, eqNumber }: { latex: string; displayMode: boolean; eqNumber: number }) {
    const [html, setHtml] = useState('');
    
    useEffect(() => {
        let isMounted = true;
        if (latex) {
            import('katex').then((katex) => {
                if (isMounted) {
                    const rendered = katex.default.renderToString(latex, {
                        displayMode,
                        throwOnError: false,
                        errorColor: '#dc2626',
                    });
                    setHtml(rendered);
                }
            }).catch(() => {
                if (isMounted) {
                    setHtml(`<span class="text-red-600">Failed to load math rendering engine</span>`);
                }
            });
        }
        return () => {
            isMounted = false;
        };
    }, [latex, displayMode]);

    return (
        <div className={`w-full my-4 flex items-center justify-between gap-4 ${displayMode ? 'py-2' : 'inline-block'}`}>
            {displayMode && <div className="w-10 flex-shrink-0" />}
            <div 
                className={`overflow-x-auto ${displayMode ? 'flex-1 text-center flex justify-center text-black font-serif' : 'inline-block'}`}
                dangerouslySetInnerHTML={{ __html: html || latex }}
            />
            {displayMode && (
                <span className="w-10 flex-shrink-0 text-right text-slate-500 font-mono select-none text-sm print:text-black">
                    ({eqNumber})
                </span>
            )}
        </div>
    );
}

// S3 Signed URL Image Preview helper
function PreviewFigureImage({ src, s3Key, alt }: { src: string; s3Key?: string; alt: string }) {
    const [resolvedSrc, setResolvedSrc] = useState(src);

    useEffect(() => {
        if (s3Key) {
            let active = true;
            import('aws-amplify/storage').then(({ getUrl }) => {
                getUrl({ path: s3Key, options: { validateObjectExistence: false, expiresIn: 3600 } })
                    .then(res => {
                        if (active) setResolvedSrc(res.url.toString());
                    })
                    .catch(err => {
                        console.error("Failed to sign preview image:", err);
                    });
            });
            return () => { active = false; };
        } else {
            setResolvedSrc(src);
        }
    }, [s3Key, src]);

    return (
        <img 
            src={resolvedSrc} 
            alt={alt} 
            className="max-w-full max-h-[380px] object-contain border border-slate-200 p-1.5 bg-white rounded shadow-sm print:shadow-none"
        />
    );
}

// Inline Math Parser helper
function InlineMath({ latex }: { latex: string }) {
    const [html, setHtml] = useState('');

    useEffect(() => {
        let isMounted = true;
        import('katex').then((katex) => {
            if (isMounted) {
                const rendered = katex.default.renderToString(latex, {
                    displayMode: false,
                    throwOnError: false,
                });
                setHtml(rendered);
            }
        }).catch(() => {});
        return () => {
            isMounted = false;
        };
    }, [latex]);

    return (
        <span 
            className="inline-block px-1 align-middle"
            dangerouslySetInnerHTML={{ __html: html || latex }}
        />
    );
}

export default function DocumentPreviewPage() {
    const params = useParams();
    const router = useRouter();
    const docId = params.documentId as string;
    const projectId = params.projectId as string;
    const { t, language, direction } = useLanguage();
    const [isExporting, setIsExporting] = useState(false);
    
    const {
        document: doc,
        blocks,
        literatureItems,
        isLoading,
        error,
        loadDocument,
    } = useEditorStore();

    useEffect(() => {
        if (docId) {
            loadDocument(docId);
        }
    }, [docId, loadDocument]);

    // Compute sorted blocks & metadata counters
    const filteredBlocks = useMemo(() => filterBlocksForDocument(blocks, doc), [blocks, doc]);
    const sortedBlocks = useMemo(() => sortByOrder(filteredBlocks), [filteredBlocks]);
    const counterMap = useMemo(() => buildCounterMap(filteredBlocks), [filteredBlocks]);
    const headingStyles = doc?.metadata?.headingStyles || {};
    const headingNumbers = useMemo(() => calculateHeadingNumbers(filteredBlocks, headingStyles), [filteredBlocks, headingStyles]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-slate-800">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
                    <span className="text-sm font-medium">{t('Generating preview...', 'جاري تحضير المعاينة...')}</span>
                </div>
            </div>
        );
    }

    if (error || !doc) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-slate-800 p-6">
                <div className="text-center max-w-md border border-slate-200 p-8 rounded-lg shadow-sm">
                    <h2 className="text-xl font-bold text-red-600 mb-2">{t('Error Loading Preview', 'خطأ في تحميل المعاينة')}</h2>
                    <p className="text-sm text-slate-600 mb-4">{error || t('Document not found', 'المستند غير موجود')}</p>
                    <button 
                        onClick={() => router.push(`/projects/${projectId}/documents/${docId}`)} 
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-sm transition-colors"
                    >
                        {t('Back to Editor', 'العودة للمحرر')}
                    </button>
                </div>
            </div>
        );
    }

    // Helper to format text with clickable anchor links
    const formatParagraphText = (text: string) => {
        if (!text) return null;

        const REF_PATTERN = /\[\[ref:([a-f0-9-,\s]+)\]\]/g;
        const MATH_PATTERN = /\$([^\$]+)\$/g;

        const refParts = [];
        let lastIndex = 0;
        let match;
        const pattern = new RegExp(REF_PATTERN.source, 'g');

        while ((match = pattern.exec(text)) !== null) {
            const index = match.index;
            const blockId = match[1];

            if (index > lastIndex) {
                refParts.push({ type: 'text', content: text.substring(lastIndex, index) });
            }

            refParts.push({ type: 'ref', content: blockId });
            lastIndex = pattern.lastIndex;
        }

        if (lastIndex < text.length) {
            refParts.push({ type: 'text', content: text.substring(lastIndex) });
        }
        if (refParts.length === 0) {
            refParts.push({ type: 'text', content: text });
        }

        const finalParts: React.ReactNode[] = [];
        
        refParts.forEach((part, partIdx) => {
            if (part.type === 'ref') {
                const resolvedText = resolveRef(part.content, counterMap, language);
                const firstId = part.content.split(',')[0].trim();
                finalParts.push(
                    <a
                        key={`ref-${part.content}-${partIdx}`}
                        href={`#block-${firstId}`}
                        className="text-amber-700 hover:text-amber-800 underline font-semibold mx-0.5 print:text-black print:no-underline"
                    >
                        {resolvedText}
                    </a>
                );
            } else {
                const segment = part.content;
                let segmentIndex = 0;
                let mathMatch;
                const mPattern = new RegExp(MATH_PATTERN.source, 'g');

                while ((mathMatch = mPattern.exec(segment)) !== null) {
                    const idx = mathMatch.index;
                    const latex = mathMatch[1];

                    if (idx > segmentIndex) {
                        finalParts.push(segment.substring(segmentIndex, idx));
                    }

                    finalParts.push(
                        <InlineMath key={`math-${latex}-${partIdx}-${idx}`} latex={latex} />
                    );
                    segmentIndex = mPattern.lastIndex;
                }

                if (segmentIndex < segment.length) {
                    finalParts.push(segment.substring(segmentIndex));
                }
            }
        });

        return finalParts;
    };


    const handleSaveDocx = async () => {
        setIsExporting(true);
        try {
            const { generateDocx } = await import('@/lib/docx-export');
            const { Packer } = await import('docx');
            const docObj = await generateDocx({
                doc,
                sortedBlocks,
                literatureItems,
                counterMap,
                headingNumbers,
                language,
            });
            const blob = await Packer.toBlob(docObj);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${doc.title || 'document'}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to export Word document:", err);
            alert("Failed to export Word document.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 print:bg-white print:p-0 flex flex-col font-serif" dir={direction}>
            {/* Top Bar for Action Buttons - Hidden in Print View */}
            <div className="w-full bg-slate-900 border-b border-slate-800 py-3 px-6 flex items-center justify-between text-white print:hidden z-30 sticky top-0 shadow-md">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push(`/projects/${projectId}/documents/${docId}`)}
                        className="px-3.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors text-xs font-semibold flex items-center gap-1.5 text-slate-300 hover:text-white"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={direction === 'rtl' ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                        </svg>
                        {t('Back to Editor', 'العودة للمحرر')}
                    </button>
                    <span className="text-xs text-slate-400 font-sans">
                        {t('Academic Print View', 'معاينة الطباعة الأكاديمية')}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        disabled={isExporting}
                        onClick={handleSaveDocx}
                        className="px-4 py-1.5 border border-slate-750 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                    >
                        {isExporting ? (
                            <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-100 rounded-full animate-spin" />
                        ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        )}
                        {t('Save as Word (.docx)', 'حفظ كـ Word (.docx)')}
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow font-sans"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        {t('Print / Save PDF', 'طباعة / حفظ PDF')}
                    </button>
                </div>
            </div>

            {/* Print Container: Styles simulate A4 page */}
            <div className="flex-1 flex justify-center py-8 print:py-0">
                <article className="w-[210mm] min-h-[297mm] bg-white border border-slate-200 print:border-none p-12 sm:p-16 md:p-20 shadow-lg print:shadow-none flex flex-col gap-6 leading-relaxed text-justify text-base">
                    
                    {/* Title */}
                    <header className="mb-8 text-center">
                        <h1 className="text-3xl font-extrabold text-black font-sans leading-tight mb-4">
                            {doc.title || t('Untitled Research Paper', 'ورقة بحثية غير معنونة')}
                        </h1>
                        
                        {doc.abstract && (
                            <div className="my-6 max-w-2xl mx-auto border-t border-b border-slate-200 py-4 px-2 text-slate-700 italic text-sm print:text-black">
                                <span className="font-bold font-sans uppercase tracking-wider block text-xs mb-1 not-italic text-black">
                                    {t('Abstract', 'الملخص')}
                                </span>
                                {doc.abstract}
                                {doc.metadata?.keywords && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 not-italic text-xs font-sans text-slate-800 print:text-black">
                                        <span className="font-bold">{t('Keywords: ', 'الكلمات المفتاحية: ')}</span>
                                        {doc.metadata.keywords}
                                    </div>
                                )}
                            </div>
                        )}
                        {!doc.abstract && doc.metadata?.keywords && (
                            <div className="my-4 max-w-2xl mx-auto text-xs font-sans text-slate-800 print:text-black text-center">
                                <span className="font-bold">{t('Keywords: ', 'الكلمات المفتاحية: ')}</span>
                                {doc.metadata.keywords}
                            </div>
                        )}
                    </header>

                    {/* Render Document Content */}
                    <main className="space-y-4">
                        {sortedBlocks.map((block) => {
                            const content = block.content || {};

                            switch (block.type) {
                                case 'HEADING': {
                                    const level = content.level || 2;
                                    const text = content.text || '';
                                    const prefix = headingNumbers.get(block.id);
                                    
                                    const Tag = `h${Math.min(Math.max(level, 1), 6)}` as keyof JSX.IntrinsicElements;
                                    const styleClass = level === 1 
                                        ? 'text-2xl font-extrabold mt-8 mb-4 border-b border-slate-100 pb-1 font-sans text-black' 
                                        : level === 2 
                                            ? 'text-xl font-bold mt-6 mb-3 font-sans text-black' 
                                            : 'text-lg font-bold mt-4 mb-2 font-sans text-black';

                                    const isReferencesHeading = level === 1 && (text || '').trim().toLowerCase() === 'references';
                                    const referencesHidden = !!doc?.metadata?.referencesHidden;
                                    const refBlocks = sortedBlocks.filter(b => b.type === 'REFERENCE');

                                    return (
                                        <div key={block.id} className="w-full">
                                            <Tag id={`block-${block.id}`} className={styleClass}>
                                                {prefix && <span className="mr-2 text-black font-semibold font-mono">{prefix}</span>}
                                                {text}
                                            </Tag>
                                            {isReferencesHeading && !referencesHidden && (
                                                <div className="mt-4 pl-4 space-y-3 border-l-2 border-slate-200">
                                                    {refBlocks.map((refBlock, idx) => {
                                                        const linkedItem = literatureItems.find(item => item.id === refBlock.content?.literatureItemId);
                                                        if (!linkedItem) return null;

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

                                                        return (
                                                            <div key={refBlock.id} id={`block-${refBlock.id}`} className="flex items-start gap-3 my-2 text-[14px] text-slate-800 print:text-black leading-relaxed font-sans">
                                                                <span className="font-mono font-bold select-none text-slate-900 w-8 flex-shrink-0 text-right">
                                                                    [{idx + 1}]
                                                                </span>
                                                                <div className="flex-1 text-left">
                                                                    <span>{formattedAuthors}, </span>
                                                                    <span className="font-semibold">"{linkedItem.title}"</span>
                                                                    {linkedItem.journal && <span>, {linkedItem.journal}</span>}
                                                                    {linkedItem.year && <span> ({linkedItem.year})</span>}
                                                                    <span>.</span>
                                                                    {linkedItem.url && (
                                                                        <a 
                                                                            href={linkedItem.url} 
                                                                            target="_blank" 
                                                                            rel="noreferrer"
                                                                            className="ml-2 text-blue-600 underline print:text-black print:no-underline break-all text-xs"
                                                                        >
                                                                            {linkedItem.url}
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                case 'TEXT': {
                                    const listType = content.listType || 'none';
                                    const text = content.text || '';

                                    return (
                                        <div key={block.id} id={`block-${block.id}`} className="my-2 flex items-start gap-2 text-slate-800 print:text-black">
                                            {listType === 'ordered' && (
                                                <span className="font-bold select-none text-slate-900 w-5 text-right font-mono">
                                                    •
                                                </span>
                                            )}
                                            {listType === 'unordered' && (
                                                <span className="select-none text-slate-900 w-5 text-center">
                                                    •
                                                </span>
                                            )}
                                            <p className="flex-1 text-[15px]">
                                                {formatParagraphText(text)}
                                            </p>
                                        </div>
                                    );
                                }

                                case 'EQUATION': {
                                    const eqEntry = counterMap.get(block.id);
                                    const eqNumber = eqEntry ? eqEntry.counter : 1;
                                    return (
                                        <StaticMath
                                            key={block.id}
                                            latex={content.latex || ''}
                                            displayMode={content.displayMode !== false}
                                            eqNumber={eqNumber}
                                        />
                                    );
                                }

                                case 'TABLE': {
                                    const tblEntry = counterMap.get(block.id);
                                    const tableNumber = tblEntry ? tblEntry.counter : 1;
                                    const headers = content.headers || [];
                                    const rows = content.rows || [];

                                    return (
                                        <div key={block.id} id={`block-${block.id}`} className="my-6 w-full overflow-x-auto">
                                            {content.caption && (
                                                <p className="text-center text-xs font-semibold text-slate-800 mb-2 italic print:text-black font-sans">
                                                    {t('Table', 'جدول')} {toRoman(tableNumber)}: {content.caption}
                                                </p>
                                            )}
                                            <table className="min-w-full border-collapse border border-slate-300 text-sm font-sans mx-auto">
                                                <thead>
                                                    <tr className="bg-slate-100/80 border-b border-slate-300">
                                                        {headers.map((h: string, idx: number) => (
                                                            <th key={idx} className="border border-slate-350 px-4 py-2.5 text-left font-bold text-slate-950 print:text-black">
                                                                {formatParagraphText(h)}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map((row: string[], rIdx: number) => (
                                                        <tr key={rIdx} className="hover:bg-slate-50/50">
                                                            {row.map((cell: string, cIdx: number) => (
                                                                <td key={cIdx} className="border border-slate-300 px-4 py-2 text-slate-850 print:text-black">
                                                                    {formatParagraphText(cell)}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                }

                                case 'FIGURE': {
                                    const figEntry = counterMap.get(block.id);
                                    const figureNumber = figEntry ? figEntry.counter : 1;

                                    return (
                                        <div key={block.id} id={`block-${block.id}`} className="my-6 flex flex-col items-center gap-2">
                                            {content.src || content.s3Key ? (
                                                <PreviewFigureImage
                                                    src={content.src || ''}
                                                    s3Key={content.s3Key}
                                                    alt={content.alt || content.caption || 'Figure'}
                                                />
                                            ) : (
                                                <div className="w-64 h-36 bg-slate-50 border border-slate-200 border-dashed rounded flex items-center justify-center text-xs text-slate-400">
                                                    {t('(Figure placeholder)', '(مكان الصورة)')}
                                                </div>
                                            )}
                                            {content.caption && (
                                                <figcaption className="text-center text-xs font-semibold text-slate-800 italic mt-1 print:text-black font-sans">
                                                    {t('Figure', 'شكل')} {figureNumber}: {content.caption}
                                                </figcaption>
                                            )}
                                        </div>
                                    );
                                }

                                case 'CODE': {
                                    const code = content.code || '';
                                    return (
                                        <div key={block.id} id={`block-${block.id}`} className="my-4 w-full">
                                            <pre className="bg-slate-50 border border-slate-200 rounded p-4 font-mono text-[13px] overflow-x-auto text-slate-800 leading-normal print:bg-white print:border-slate-350 print:text-black">
                                                <code>{code}</code>
                                            </pre>
                                        </div>
                                    );
                                }

                                case 'REFERENCE': {
                                    return null;
                                }

                                case 'DIVIDER':
                                    return <hr key={block.id} className="my-6 border-slate-200 print:border-slate-300" />;

                                case 'AI_PROMPT':
                                    if (content.generatedText) {
                                        return (
                                            <div key={block.id} className="my-2 p-3 bg-slate-50 border border-slate-150 rounded text-slate-800 text-[15px] italic leading-relaxed whitespace-pre-wrap print:bg-white print:border-none print:p-0">
                                                {content.generatedText}
                                            </div>
                                        );
                                    }
                                    return null;

                                default:
                                    return null;
                            }
                        })}
                    </main>
                </article>
            </div>
        </div>
    );
}
