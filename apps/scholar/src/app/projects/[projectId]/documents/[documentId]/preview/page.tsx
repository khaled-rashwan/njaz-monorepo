'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEditorStore } from '@/store/editor-store';
import { useLanguage } from '@/components/LanguageContext';
import { buildCounterMap, resolveRef, calculateHeadingNumbers, filterBlocksForDocument } from '@/lib/cross-reference';
import { sortByOrder } from '@/lib/fractional-index';
import { BlockType } from '@/types';
import { JournalFormatId, EngineeringReviewMetadata } from '@/types/journal';
import {
    validateEngineeringReview,
    createInitialEngineeringReviewMetadata
} from '@/lib/journal-formats';
import { JournalMetadataModal } from '@/components/journal/JournalMetadataModal';
import { FormatSelectorDropdown } from '@/components/journal/FormatSelectorDropdown';

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
                <span className="w-10 flex-shrink-0 text-right text-slate-700 font-serif select-none text-[11pt] print:text-black">
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
            className="max-w-full max-h-[380px] object-contain border border-slate-200 p-1.5 bg-white rounded shadow-sm print:shadow-none print:border-slate-300 print:p-2"
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
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

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

    // Active Journal Format
    const activeFormatId: JournalFormatId = (doc?.metadata?.journalFormatting?.formatId as JournalFormatId) || 'engineering-review';
    const isEngineeringReview = activeFormatId === 'engineering-review';

    // Journal metadata & validation
    const journalMeta = useMemo(() => {
        if (!doc) return null;
        return (doc.metadata?.journalFormatting as EngineeringReviewMetadata) || createInitialEngineeringReviewMetadata(doc);
    }, [doc]);

    const validation = useMemo(() => {
        if (!doc) return { isValid: true, hasErrors: false, issues: [], wordCount: 0, keywordCount: 0, reviewerCount: 0 };
        return validateEngineeringReview(doc, journalMeta || undefined);
    }, [doc, journalMeta]);

    // Automatically prompt modal if critical author details are completely absent
    useEffect(() => {
        if (doc && isEngineeringReview && (!journalMeta?.authors || journalMeta.authors.length === 0)) {
            setIsConfigModalOpen(true);
        }
    }, [doc, isEngineeringReview, journalMeta]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-slate-800">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
                    <span className="text-sm font-medium">{t('Generating journal preview...', 'جاري تحضير معاينة المجلة...')}</span>
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

    // Helper to format text with clickable anchor links and LaTeX math
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
                        className="text-amber-800 hover:text-amber-900 underline font-medium mx-0.5 print:text-black print:no-underline"
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
                format: activeFormatId,
            });
            const blob = await Packer.toBlob(docObj);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${journalMeta?.paperTitle || doc.title || 'manuscript'}_${activeFormatId}.docx`;
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

    const correspondingAuthor = journalMeta?.authors?.find(a => a.isCorresponding) || journalMeta?.authors?.[0];

    // Engineering review numbering helper
    let erSectionCount = 1;
    let erSubsectionCounters: Record<number, number> = {};

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white print:p-0 flex flex-col font-serif" dir={direction}>
            {/* Top Bar for Action Buttons - Hidden in Print View */}
            <div className="w-full bg-slate-900 border-b border-slate-800 py-2.5 px-6 flex flex-wrap items-center justify-between text-white print:hidden z-30 sticky top-0 shadow-md gap-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push(`/projects/${projectId}/documents/${docId}`)}
                        className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors text-xs font-semibold flex items-center gap-1.5 text-slate-300 hover:text-white"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={direction === 'rtl' ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                        </svg>
                        {t('Back to Editor', 'العودة للمحرر')}
                    </button>

                    <div className="h-4 w-px bg-slate-700 hidden sm:block" />

                    {/* Format Selector */}
                    <FormatSelectorDropdown onOpenConfigModal={() => setIsConfigModalOpen(true)} />
                </div>

                <div className="flex items-center gap-2">
                    {/* Setup / Edit Journal Metadata Button */}
                    <button
                        onClick={() => setIsConfigModalOpen(true)}
                        className="px-3 py-1.5 border border-slate-700 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs transition-colors flex items-center gap-1.5 font-sans"
                        title={t('Edit Authors, Affiliations and Journal Details', 'تعديل المؤلفين والانتماءات وبيانات المجلة')}
                    >
                        <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>{t('Journal Metadata & Authors', 'بيانات المجلة والمؤلفين')}</span>
                        {!validation.isValid && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        )}
                    </button>

                    {/* DOCX Export Button */}
                    <button
                        disabled={isExporting}
                        onClick={handleSaveDocx}
                        className="px-3.5 py-1.5 border border-slate-700 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed font-sans font-medium"
                    >
                        {isExporting ? (
                            <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-100 rounded-full animate-spin" />
                        ) : (
                            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        )}
                        {t('Save as Word (.docx)', 'حفظ كـ Word (.docx)')}
                    </button>

                    {/* Print / Save PDF Button */}
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

            {/* Validation Notice Banner (when in Engineering Review format & info is missing) */}
            {isEngineeringReview && !validation.isValid && (
                <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 text-xs text-amber-300 flex items-center justify-between print:hidden">
                    <div className="flex items-center gap-2">
                        <span className="text-base">⚠️</span>
                        <span>
                            {t('Engineering Review format requires author and manuscript details:', 'يتطلب تنسيق Engineering Review بيانات إضافية للمؤلفين والمخطوطة:')}{' '}
                            <strong className="text-white">{validation.issues.map(i => i.message).join(' • ')}</strong>
                        </span>
                    </div>
                    <button
                        onClick={() => setIsConfigModalOpen(true)}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition-colors shadow-sm ml-4 whitespace-nowrap"
                    >
                        {t('Fill Missing Info', 'إكمال البيانات الناقصة')}
                    </button>
                </div>
            )}

            {/* Print Container: Exact Simulation of A4 Journal Page */}
            <div className="flex-1 flex justify-center py-8 print:py-0 print:bg-white relative">
                {isEngineeringReview ? (
                    /* ============================================================== */
                    /* ENGINEERING REVIEW OFFICIAL TEMPLATE LAYOUT                    */
                    /* ============================================================== */
                    <article
                        className="w-[210mm] min-h-[297mm] bg-white border border-slate-300 print:border-none shadow-xl print:shadow-none flex flex-col font-serif text-black relative"
                        style={{
                            paddingTop: '35mm',   // Official 3.5 cm top margin
                            paddingBottom: '20mm',// Official 2.0 cm bottom margin
                            paddingLeft: '20mm',  // Official 2.0 cm left margin
                            paddingRight: '20mm', // Official 2.0 cm right margin
                        }}
                    >
                        {/* Running First Page Header (positioned 2.3 cm from top) */}
                        <div className="border-b border-black pb-1 mb-6 flex items-end justify-between text-[9pt] font-serif text-black leading-tight">
                            <div>
                                <span className="font-bold">Engineering Review</span>
                                <span>, Vol. {journalMeta?.volume || '44'} ({journalMeta?.year || new Date().getFullYear()}) No. {journalMeta?.issue || '3'}</span>
                            </div>
                            <div>
                                <span>DOI: {journalMeta?.doi || '10.36978/ed.xxxx'}</span>
                            </div>
                        </div>

                        {/* Title: 16 pt, BOLD, CAPITAL LETTERS, Centered */}
                        <header className="mb-6 text-center">
                            <h1 className="text-[16pt] font-bold text-center text-black font-serif uppercase tracking-wide mb-4 leading-tight">
                                {journalMeta?.paperTitle || doc.title || t('TITLE OF THE PAPER', 'عنوان الورقة البحثية')}
                            </h1>

                            {/* Authors line: 11 pt, Bold, Centered */}
                            <div className="text-[11pt] font-bold text-center text-black font-serif mb-3 leading-relaxed">
                                {journalMeta?.authors && journalMeta.authors.length > 0 ? (
                                    journalMeta.authors.map((author, idx) => {
                                        const affNumbers = (author.affiliationIds || [])
                                            .map(id => journalMeta.affiliations.find(a => a.id === id)?.number)
                                            .filter(Boolean);
                                        const supParts = [affNumbers.join(','), author.isCorresponding ? '*' : ''].filter(Boolean).join(',');
                                        return (
                                            <span key={author.id || idx}>
                                                {idx > 0 && ' – '}
                                                <span>{author.name} {author.surname}</span>
                                                {supParts && <sup className="text-[8pt] font-bold ml-0.5">{supParts}</sup>}
                                            </span>
                                        );
                                    })
                                ) : (
                                    <span className="text-amber-800 italic underline cursor-pointer" onClick={() => setIsConfigModalOpen(true)}>
                                        [{t('Click here to set author names and affiliations', 'انقر هنا لتحديد أسماء المؤلفين والانتماءات')}]
                                    </span>
                                )}
                            </div>

                            {/* Affiliations: 10 pt, Centered */}
                            <div className="text-[10pt] text-center text-slate-800 font-serif mb-5 space-y-0.5">
                                {journalMeta?.affiliations && journalMeta.affiliations.length > 0 ? (
                                    journalMeta.affiliations.map((aff, idx) => {
                                        const fullAddr = aff.fullAddress || [aff.department, aff.faculty, aff.institution, aff.city, aff.country].filter(Boolean).join(', ');
                                        return (
                                            <p key={aff.id || idx}>
                                                <sup className="text-[8pt] mr-1">{aff.number}</sup>
                                                <span>{fullAddr}</span>
                                            </p>
                                        );
                                    })
                                ) : (
                                    <p className="text-slate-500 italic text-xs">
                                        [{t('Affiliations not yet configured', 'لم يتم إدخال الانتماءات بعد')}]
                                    </p>
                                )}
                            </div>

                            {/* ARTICLE INFO & ABSTRACT TABLE (Exact 2-column header box from ER template) */}
                            <div className="border-t border-b border-black py-3 my-5 font-serif text-black text-left">
                                <div className="grid grid-cols-12 gap-5 text-[10pt]">
                                    {/* Left Column (approx 3828 dxa / ~39% width) */}
                                    <div className="col-span-5 border-r border-slate-300 pr-3 space-y-2">
                                        <div>
                                            <span className="font-bold text-[10pt] block">ARTICLE INFO</span>
                                            <span className="text-[8pt] text-slate-500 italic">... filled by the publisher</span>
                                        </div>

                                        <div className="text-[9pt] space-y-0.5 pt-1">
                                            <span className="font-bold italic block">Article history:</span>
                                            <p>Received: {journalMeta?.articleHistory?.receivedDate || '—'}</p>
                                            <p>Received in revised form: {journalMeta?.articleHistory?.revisedDate || '—'}</p>
                                            <p>Accepted: {journalMeta?.articleHistory?.acceptedDate || '—'}</p>
                                        </div>

                                        <div className="text-[9pt] pt-1">
                                            <span className="font-bold italic block">Keywords: (max 6 keywords)</span>
                                            <div className="mt-1 space-y-0.5">
                                                {journalMeta?.keywords && journalMeta.keywords.length > 0 ? (
                                                    journalMeta.keywords.map((kw, i) => (
                                                        <div key={i} className="flex items-center gap-1.5 text-slate-800">
                                                            <span>•</span>
                                                            <span>{kw}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-500 italic text-[8pt]">[{t('No keywords', 'بدون كلمات مفتاحية')}]</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-[9pt] pt-1 text-slate-600">
                                            <span>DOI: {journalMeta?.doi || '10.36978/ed.xxxx'}</span>
                                        </div>
                                    </div>

                                    {/* Right Column (approx 5636 dxa / ~58% width) */}
                                    <div className="col-span-7 pl-1">
                                        <span className="font-bold italic block text-[10pt] mb-1.5">Abstract:</span>
                                        <p className="text-[10pt] leading-relaxed text-justify">
                                            {doc.abstract || (
                                                <span className="text-slate-500 italic">
                                                    {t('The abstract should not contain more than 250 words including objective, methods, procedures, experimental investigations as well as main outcomes and results. Do not cite references and do not use abbreviations in the abstract.', 'يجب ألا يتجاوز الملخص 250 كلمة متضمناً الأهداف والمنهجية والنتائج الرئيسية.')}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </header>

                        {/* Main Body: Single column, Times New Roman 11pt, text-indent 0.6cm */}
                        <main className="space-y-3 font-serif text-[11pt] text-black">
                            {sortedBlocks.map((block) => {
                                const content = block.content || {};

                                switch (block.type) {
                                    case 'HEADING': {
                                        const level = content.level || 1;
                                        const text = (content.text || '').trim();
                                        const isReferencesHeading = level === 1 && text.toLowerCase() === 'references';

                                        // Compute Arabic numeral prefix according to ER rules
                                        let headingPrefix = headingNumbers.get(block.id);
                                        if (!headingPrefix && !isReferencesHeading) {
                                            if (level === 1) {
                                                headingPrefix = `${erSectionCount}`;
                                                erSubsectionCounters[erSectionCount] = 1;
                                                erSectionCount++;
                                            } else if (level === 2) {
                                                const currentSec = erSectionCount - 1 > 0 ? erSectionCount - 1 : 1;
                                                const subIndex = erSubsectionCounters[currentSec] || 1;
                                                headingPrefix = `${currentSec}.${subIndex}`;
                                                erSubsectionCounters[currentSec] = subIndex + 1;
                                            }
                                        }

                                        const refBlocks = sortedBlocks.filter(b => b.type === 'REFERENCE');

                                        return (
                                            <div key={block.id} className="w-full">
                                                {level === 1 ? (
                                                    // Level 1: 12 pt bold, Arabic numeral
                                                    <h2 id={`block-${block.id}`} className="text-[12pt] font-bold text-black font-serif mt-6 mb-2">
                                                        {headingPrefix && !isReferencesHeading && <span className="mr-2 font-bold">{headingPrefix}</span>}
                                                        {text}
                                                    </h2>
                                                ) : (
                                                    // Level 2 / 3: 11 pt italic
                                                    <h3 id={`block-${block.id}`} className="text-[11pt] italic text-black font-serif mt-4 mb-2">
                                                        {headingPrefix && <span className="mr-2 not-italic font-normal">{headingPrefix}</span>}
                                                        {text}
                                                    </h3>
                                                )}

                                                {/* If References Heading, render IEEE formatted reference list */}
                                                {isReferencesHeading && !doc?.metadata?.referencesHidden && (
                                                    <div className="mt-3 space-y-2 font-serif text-[10pt]">
                                                        {refBlocks.map((refBlock, idx) => {
                                                            let refContent: any = refBlock.content;
                                                            if (typeof refContent === 'string') {
                                                                try { refContent = JSON.parse(refContent); } catch { refContent = {}; }
                                                            }
                                                            const linkedItem = literatureItems.find(item => item.id === refContent?.literatureItemId);
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
                                                                    .filter(name => name && name.toLowerCase() !== 'unknown');
                                                                return names.length > 0 ? names.join(', ') : 'Unknown Author';
                                                            })();

                                                            return (
                                                                <div key={refBlock.id} id={`block-${refBlock.id}`} className="flex items-start gap-2.5 my-1.5 leading-snug text-black">
                                                                    <span className="font-bold select-none w-7 flex-shrink-0 text-right">
                                                                        [{idx + 1}]
                                                                    </span>
                                                                    <div className="flex-1 text-left text-justify">
                                                                        <span>{formattedAuthors}, </span>
                                                                        <span>“{linkedItem.title},” </span>
                                                                        {linkedItem.journal && <span className="italic">{linkedItem.journal}, </span>}
                                                                        {linkedItem.year && <span>{linkedItem.year}. </span>}
                                                                        {linkedItem.doi && <span className="text-slate-800">doi: {linkedItem.doi}. </span>}
                                                                        {linkedItem.url && (
                                                                            <a
                                                                                href={linkedItem.url}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="text-blue-700 underline print:text-black print:no-underline break-all"
                                                                            >
                                                                                [Online]. Available: {linkedItem.url}
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

                                        if (listType === 'ordered') {
                                            return (
                                                <div key={block.id} id={`block-${block.id}`} className="my-1.5 flex items-start gap-2 text-black">
                                                    <span className="font-bold select-none w-5 text-right font-serif">•</span>
                                                    <p className="flex-1 text-[11pt] leading-normal text-justify">
                                                        {formatParagraphText(text)}
                                                    </p>
                                                </div>
                                            );
                                        }

                                        if (listType === 'unordered') {
                                            return (
                                                <div key={block.id} id={`block-${block.id}`} className="my-1.5 flex items-start gap-2 text-black">
                                                    <span className="select-none w-5 text-center">•</span>
                                                    <p className="flex-1 text-[11pt] leading-normal text-justify">
                                                        {formatParagraphText(text)}
                                                    </p>
                                                </div>
                                            );
                                        }

                                        // Standard body paragraph: 0.6cm first line indent
                                        return (
                                            <p
                                                key={block.id}
                                                id={`block-${block.id}`}
                                                className="my-1.5 text-[11pt] leading-normal text-justify text-black"
                                                style={{ textIndent: '0.6cm' }}
                                            >
                                                {formatParagraphText(text)}
                                            </p>
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
                                            <div key={block.id} id={`block-${block.id}`} className="my-5 w-full">
                                                {/* Caption ABOVE table for Engineering Review: Table 1. Caption */}
                                                {content.caption && (
                                                    <p className="text-center text-[11pt] italic font-serif text-black mb-1.5">
                                                        {t('Table', 'جدول')} {tableNumber}. {content.caption}
                                                    </p>
                                                )}
                                                <table className="min-w-full border-collapse border-t border-b border-black text-[10pt] font-serif mx-auto">
                                                    <thead>
                                                        <tr className="border-b border-black">
                                                            {headers.map((h: string, idx: number) => (
                                                                <th key={idx} className="px-3 py-1.5 text-left font-bold text-black border-none">
                                                                    {formatParagraphText(h)}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {rows.map((row: string[], rIdx: number) => (
                                                            <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50 print:bg-transparent' : ''}>
                                                                {row.map((cell: string, cIdx: number) => (
                                                                    <td key={cIdx} className="px-3 py-1 text-black border-none">
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
                                            <div key={block.id} id={`block-${block.id}`} className="my-5 flex flex-col items-center gap-1.5">
                                                {content.src || content.s3Key ? (
                                                    <PreviewFigureImage
                                                        src={content.src || ''}
                                                        s3Key={content.s3Key}
                                                        alt={content.alt || content.caption || 'Figure'}
                                                    />
                                                ) : (
                                                    <div className="w-64 h-36 bg-slate-50 border border-slate-300 border-dashed rounded flex items-center justify-center text-xs text-slate-400">
                                                        {t('(Figure placeholder)', '(مكان الصورة)')}
                                                    </div>
                                                )}
                                                {/* Caption BELOW figure for Engineering Review: Figure 1. Caption */}
                                                {content.caption && (
                                                    <figcaption className="text-center text-[11pt] italic font-serif text-black mt-1">
                                                        {t('Figure', 'شكل')} {figureNumber}. {content.caption}
                                                    </figcaption>
                                                )}
                                            </div>
                                        );
                                    }

                                    case 'CODE': {
                                        const code = content.code || '';
                                        return (
                                            <div key={block.id} id={`block-${block.id}`} className="my-3 w-full">
                                                <pre className="bg-slate-50 border border-slate-300 rounded p-3 font-mono text-[10pt] overflow-x-auto text-black leading-snug print:bg-white">
                                                    <code>{code}</code>
                                                </pre>
                                            </div>
                                        );
                                    }

                                    case 'DIVIDER':
                                        return <hr key={block.id} className="my-6 border-slate-300" />;

                                    case 'REFERENCE':
                                        return null;

                                    default:
                                        return null;
                                }
                            })}
                        </main>

                        {/* First Page Footnote for Corresponding Author */}
                        {correspondingAuthor && (
                            <footer className="mt-auto pt-6">
                                <div className="border-t border-slate-300 pt-2 text-[9pt] italic font-serif text-slate-800 flex items-center justify-between">
                                    <div>
                                        <span>* Corresponding author. E-mail address: {correspondingAuthor.email || 'author@university.edu'}</span>
                                        {correspondingAuthor.phone && <span>; Tel.: {correspondingAuthor.phone}</span>}
                                    </div>
                                    <div className="text-[9pt] font-mono not-italic text-slate-500">
                                        ER-{journalMeta?.volume || '44'}-3
                                    </div>
                                </div>
                            </footer>
                        )}
                    </article>
                ) : (
                    /* ============================================================== */
                    /* STANDARD ACADEMIC VIEW                                         */
                    /* ============================================================== */
                    <article className="w-[210mm] min-h-[297mm] bg-white border border-slate-200 print:border-none p-12 sm:p-16 md:p-20 shadow-lg print:shadow-none flex flex-col gap-6 leading-relaxed text-justify text-base print:text-[12pt] print:font-serif relative">
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
                        </header>

                        {/* Render Standard Document Content */}
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

                                        return (
                                            <div key={block.id} className="w-full">
                                                <Tag id={`block-${block.id}`} className={styleClass}>
                                                    {prefix && <span className="mr-2 text-black font-semibold font-mono">{prefix}</span>}
                                                    {text}
                                                </Tag>
                                            </div>
                                        );
                                    }

                                    case 'TEXT': {
                                        const text = content.text || '';
                                        return (
                                            <div key={block.id} id={`block-${block.id}`} className="my-2 text-slate-800 print:text-black">
                                                <p className="text-base">
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
                                                        {t('Table', 'جدول')} {tableNumber}: {content.caption}
                                                    </p>
                                                )}
                                                <table className="min-w-full border-collapse border border-slate-300 text-sm font-sans mx-auto">
                                                    <thead>
                                                        <tr className="bg-slate-100 border-b border-slate-300">
                                                            {headers.map((h: string, idx: number) => (
                                                                <th key={idx} className="border border-slate-300 px-4 py-2 text-left font-bold text-slate-900">
                                                                    {formatParagraphText(h)}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {rows.map((row: string[], rIdx: number) => (
                                                            <tr key={rIdx}>
                                                                {row.map((cell: string, cIdx: number) => (
                                                                    <td key={cIdx} className="border border-slate-300 px-4 py-2 text-slate-800">
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

                                    default:
                                        return null;
                                }
                            })}
                        </main>
                    </article>
                )}
            </div>

            {/* Journal Metadata Configuration Modal */}
            <JournalMetadataModal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                initialFormatId={activeFormatId}
            />
        </div>
    );
}
