'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useEditorStore } from '@/store/editor-store';
import {
    JournalFormatId,
    AuthorInfo,
    AffiliationInfo,
    ReviewerSuggestion,
    EngineeringReviewMetadata
} from '@/types/journal';
import {
    AVAILABLE_JOURNAL_FORMATS,
    validateEngineeringReview,
    createInitialEngineeringReviewMetadata,
    ENGINEERING_REVIEW_SPECS,
    countWords,
    formatAffiliationText
} from '@/lib/journal-formats';

interface JournalMetadataModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialFormatId?: JournalFormatId;
}

export function JournalMetadataModal({ isOpen, onClose, initialFormatId }: JournalMetadataModalProps) {
    const { t, direction } = useLanguage();
    const { document: doc, updateJournalMetadata, updateDocumentAbstract, updateDocumentKeywords } = useEditorStore();

    // Active tab: 'format' | 'authors' | 'article' | 'reviewers'
    const [activeTab, setActiveTab] = useState<'format' | 'authors' | 'article' | 'reviewers'>('format');

    // Local form state
    const [selectedFormatId, setSelectedFormatId] = useState<JournalFormatId>('engineering-review');
    const [paperTitle, setPaperTitle] = useState('');
    const [shortTitle, setShortTitle] = useState('');
    const [articleCategory, setArticleCategory] = useState<EngineeringReviewMetadata['articleCategory']>('Original scientific paper');
    const [authors, setAuthors] = useState<AuthorInfo[]>([]);
    const [affiliations, setAffiliations] = useState<AffiliationInfo[]>([]);
    const [receivedDate, setReceivedDate] = useState('');
    const [revisedDate, setRevisedDate] = useState('');
    const [acceptedDate, setAcceptedDate] = useState('');
    const [keywordsList, setKeywordsList] = useState<string[]>([]);
    const [keywordInput, setKeywordInput] = useState('');
    const [abstractText, setAbstractText] = useState('');
    const [reviewers, setReviewers] = useState<ReviewerSuggestion[]>([]);

    // Initialize state when modal opens or document changes
    useEffect(() => {
        if (!isOpen || !doc) return;

        const existing = (doc.metadata?.journalFormatting as EngineeringReviewMetadata) || createInitialEngineeringReviewMetadata(doc);

        setSelectedFormatId(initialFormatId || existing.formatId || 'engineering-review');
        setPaperTitle(existing.paperTitle || doc.title || '');
        setShortTitle(existing.shortTitle || (doc.title || '').substring(0, 50));
        setArticleCategory(existing.articleCategory || 'Original scientific paper');
        setAuthors(existing.authors && existing.authors.length > 0 ? existing.authors : [
            {
                id: 'auth-1',
                name: 'Author',
                surname: 'Name',
                affiliationIds: ['aff-1'],
                isCorresponding: true,
                email: 'author@university.edu',
                phone: '+385 (0)51 651 444',
            }
        ]);
        setAffiliations(existing.affiliations && existing.affiliations.length > 0 ? existing.affiliations : [
            {
                id: 'aff-1',
                number: 1,
                department: 'Department of Mechanical Engineering',
                faculty: 'Faculty of Engineering',
                institution: 'University of Rijeka',
                city: 'Rijeka',
                country: 'Croatia',
                fullAddress: 'Vukovarska 58, 51000 Rijeka, Croatia'
            }
        ]);
        setReceivedDate(existing.articleHistory?.receivedDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
        setRevisedDate(existing.articleHistory?.revisedDate || '');
        setAcceptedDate(existing.articleHistory?.acceptedDate || '');
        
        const kw = existing.keywords && existing.keywords.length > 0
            ? existing.keywords
            : (doc.metadata?.keywords ? doc.metadata.keywords.split(/[,;\n]/).map((k: string) => k.trim()).filter(Boolean) : []);
        setKeywordsList(kw.slice(0, 6));

        setAbstractText(doc.abstract || '');
        setReviewers(existing.suggestedReviewers || [
            { id: 'rev-1', name: '', affiliation: '', email: '', fieldsOfExpertise: '' },
            { id: 'rev-2', name: '', affiliation: '', email: '', fieldsOfExpertise: '' },
            { id: 'rev-3', name: '', affiliation: '', email: '', fieldsOfExpertise: '' },
        ]);
    }, [isOpen, doc, initialFormatId]);

    if (!isOpen || !doc) return null;

    // Current metadata validation
    const currentValidation = validateEngineeringReview(
        { ...doc, abstract: abstractText },
        {
            formatId: 'engineering-review',
            authors,
            affiliations,
            keywords: keywordsList,
            suggestedReviewers: reviewers.filter(r => r.name.trim() && r.email.trim()),
        }
    );

    const handleSave = () => {
        const metadataPayload: EngineeringReviewMetadata = {
            formatId: 'engineering-review',
            paperTitle: paperTitle.trim() || doc.title,
            shortTitle: shortTitle.trim() || doc.title.substring(0, 50),
            articleCategory,
            authors,
            affiliations,
            articleHistory: {
                receivedDate: receivedDate.trim() || undefined,
                revisedDate: revisedDate.trim() || undefined,
                acceptedDate: acceptedDate.trim() || undefined,
            },
            keywords: keywordsList,
            doi: '10.36978/ed.xxxx',
            volume: '44',
            issue: '3',
            year: `${new Date().getFullYear()}`,
            pages: '1-10',
            suggestedReviewers: reviewers.filter(r => r.name.trim()),
        };

        updateJournalMetadata(metadataPayload);
        if (abstractText !== doc.abstract) {
            updateDocumentAbstract(abstractText);
        }
        if (keywordsList.length > 0) {
            updateDocumentKeywords(keywordsList.join(', '));
        }

        onClose();
    };

    // Keyword operations
    const handleAddKeyword = () => {
        const trimmed = keywordInput.trim();
        if (!trimmed) return;
        if (keywordsList.length >= 6) {
            alert(t('Maximum of 6 keywords allowed by Engineering Review.', 'الحد الأقصى المسموح به في المجلة هو 6 كلمات مفتاحية.'));
            return;
        }
        if (!keywordsList.includes(trimmed)) {
            setKeywordsList([...keywordsList, trimmed]);
        }
        setKeywordInput('');
    };

    const handleRemoveKeyword = (index: number) => {
        setKeywordsList(keywordsList.filter((_, i) => i !== index));
    };

    // Author operations
    const handleAddAuthor = () => {
        const newId = `auth-${Date.now()}`;
        const firstAffId = affiliations[0]?.id || 'aff-1';
        setAuthors([
            ...authors,
            {
                id: newId,
                name: '',
                surname: '',
                affiliationIds: [firstAffId],
                isCorresponding: authors.length === 0,
                email: '',
                phone: '',
            }
        ]);
    };

    const handleRemoveAuthor = (index: number) => {
        if (authors.length <= 1) {
            alert(t('At least one author is required.', 'يجب تحديد مؤلف واحد على الأقل.'));
            return;
        }
        setAuthors(authors.filter((_, i) => i !== index));
    };

    const handleUpdateAuthor = (index: number, updates: Partial<AuthorInfo>) => {
        const next = [...authors];
        next[index] = { ...next[index], ...updates };

        // If setting this author as corresponding, uncheck others
        if (updates.isCorresponding) {
            next.forEach((a, i) => {
                if (i !== index) a.isCorresponding = false;
            });
        }
        setAuthors(next);
    };

    // Affiliation operations
    const handleAddAffiliation = () => {
        const newNum = affiliations.length + 1;
        const newId = `aff-${Date.now()}`;
        setAffiliations([
            ...affiliations,
            {
                id: newId,
                number: newNum,
                department: '',
                faculty: '',
                institution: '',
                city: '',
                country: '',
                address: '',
                fullAddress: '',
            }
        ]);
    };

    const handleRemoveAffiliation = (index: number) => {
        if (affiliations.length <= 1) {
            alert(t('At least one affiliation is required.', 'يجب تحديد انتماء واحد على الأقل.'));
            return;
        }
        const removedId = affiliations[index].id;
        const remaining = affiliations.filter((_, i) => i !== index).map((aff, i) => ({
            ...aff,
            number: i + 1,
        }));
        setAffiliations(remaining);

        // Remove removedId from authors
        setAuthors(authors.map(a => ({
            ...a,
            affiliationIds: a.affiliationIds.filter(id => id !== removedId),
        })));
    };

    const handleUpdateAffiliation = (index: number, updates: Partial<AffiliationInfo>) => {
        const next = [...affiliations];
        next[index] = { ...next[index], ...updates };
        setAffiliations(next);
    };

    // Export reviewers list as a text file for submission
    const handleExportReviewers = () => {
        const validReviewers = reviewers.filter(r => r.name.trim());
        if (validReviewers.length < 3) {
            alert(t('Engineering Review requires at least 3 suggested reviewers.', 'تتطلب المجلة 3 مراجعين مقترحين على الأقل.'));
        }
        const text = [
            `SUGGESTED REVIEWERS FOR MANUSCRIPT: "${paperTitle || doc.title}"`,
            `Target Journal: Engineering Review (University of Rijeka)`,
            `Generated: ${new Date().toLocaleDateString()}`,
            '------------------------------------------------------------',
            ...validReviewers.map((rev, idx) => (
                `[${idx + 1}] ${rev.name}\n` +
                `    Affiliation: ${rev.affiliation || 'N/A'}\n` +
                `    E-mail: ${rev.email || 'N/A'}\n` +
                (rev.fieldsOfExpertise ? `    Expertise: ${rev.fieldsOfExpertise}\n` : '')
            )),
            '------------------------------------------------------------'
        ].join('\n\n');

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reviewers_${(paperTitle || 'Manuscript').substring(0, 20)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in" dir={direction}>
            <div
                className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl"
                style={{
                    background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(11, 15, 26, 0.99) 100%)',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 50px rgba(245, 158, 11, 0.08)',
                }}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg shadow-inner">
                            ER
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-white">
                                    {t('Journal Format & Manuscript Setup', 'تنسيق المجلة وإعداد المخطوطة')}
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                                    {t('Engineering Review Ready', 'جاهز لـ Engineering Review')}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                {t('Tailor your paper precisely to the University of Rijeka Engineering Review official template.', 'اضبط بحثك بدقة ليطابق القالب الرسمي لمجلة Engineering Review.')}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Validation Status Strip */}
                <div className={`px-6 py-2.5 text-xs flex items-center justify-between border-b ${
                    currentValidation.isValid
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                }`}>
                    <div className="flex items-center gap-2">
                        {currentValidation.isValid ? (
                            <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        )}
                        <span>
                            {currentValidation.isValid
                                ? t('All mandatory journal criteria satisfied! Ready for Word, PDF & Web export.', 'جميع معايير المجلة مستوفاة! جاهز للتصدير كـ Word و PDF و ويب.')
                                : t(`Information needed: ${currentValidation.issues.map(i => i.message).join(' | ')}`, `معلومات مطلوبة: ${currentValidation.issues.map(i => i.message).join(' | ')}`)}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px] text-slate-300">
                        <span>{authors.length} {t('Authors', 'مؤلفين')}</span>
                        <span>•</span>
                        <span>{keywordsList.length}/6 {t('Keywords', 'كلمات')}</span>
                        <span>•</span>
                        <span className={currentValidation.wordCount > 250 ? 'text-amber-400 font-bold' : ''}>
                            {currentValidation.wordCount}/250 {t('words', 'كلمة')}
                        </span>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-800 bg-slate-900/40 px-6 gap-2">
                    {[
                        { id: 'format' as const, label: t('Format Selection', 'اختيار التنسيق'), icon: '📐' },
                        { id: 'authors' as const, label: t('Authors & Affiliations', 'المؤلفون والانتماءات'), icon: '👥', badge: authors.length },
                        { id: 'article' as const, label: t('Article Info & Abstract', 'بيانات المقال والملخص'), icon: '📝' },
                        { id: 'reviewers' as const, label: t('Suggested Reviewers (3)', 'المراجعون المقترحون'), icon: '⚖️', badge: reviewers.filter(r => r.name.trim()).length },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                                activeTab === tab.id
                                    ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                            {tab.badge !== undefined && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200">
                    {/* TAB 1: FORMAT SELECTION */}
                    {activeTab === 'format' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                    {t('Available Journal & Publication Formats', 'تنسيقات المجلات والنشر المتاحة')}
                                </h3>
                                <span className="text-xs text-slate-400">
                                    {t('Select target journal to apply exact typographical guidelines', 'اختر المجلة المستهدفة لتطبيق القواعد الطباعية الدقيقة')}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {AVAILABLE_JOURNAL_FORMATS.map(fmt => {
                                    const isSelected = selectedFormatId === fmt.id;
                                    return (
                                        <div
                                            key={fmt.id}
                                            onClick={() => {
                                                if (fmt.isEnabled) setSelectedFormatId(fmt.id);
                                            }}
                                            className={`p-4 rounded-xl border transition-all relative ${
                                                fmt.isEnabled
                                                    ? isSelected
                                                        ? 'border-amber-500/80 bg-amber-500/10 shadow-lg shadow-amber-500/5 cursor-pointer ring-1 ring-amber-500/40'
                                                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/40 cursor-pointer'
                                                    : 'border-slate-800/50 bg-slate-900/20 opacity-60 cursor-not-allowed'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div>
                                                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                                        {fmt.name}
                                                        {isSelected && (
                                                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                                        )}
                                                    </h4>
                                                    <span className="text-[11px] text-slate-400 block">{fmt.publisher}</span>
                                                </div>

                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                    fmt.isEnabled
                                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                                                }`}>
                                                    {fmt.badge}
                                                </span>
                                            </div>

                                            <p className="text-xs text-slate-300 leading-relaxed mb-3">
                                                {fmt.description}
                                            </p>

                                            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/60">
                                                <span className="text-slate-400">
                                                    {t('Citation style:', 'نمط الاقتباس:')} <span className="text-white font-mono uppercase">{fmt.citationStyle}</span>
                                                </span>

                                                {fmt.guidelineUrl ? (
                                                    <a
                                                        href={fmt.guidelineUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-amber-400 hover:underline flex items-center gap-1"
                                                    >
                                                        {t('Author Guidelines ↗', 'إرشادات المؤلفين ↗')}
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 italic">
                                                        {fmt.disabledReason}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-300 space-y-2">
                                <h4 className="font-bold text-amber-400 flex items-center gap-2">
                                    <span>ℹ️</span> {t('Engineering Review Guidelines Highlights:', 'أهم معايير مجلة Engineering Review:')}
                                </h4>
                                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
                                    <li>{t('Manuscript format: Microsoft Word (.docx), single column, Times New Roman 11pt, single line spacing.', 'تنسيق المخطوطة: Microsoft Word (.docx)، عمود مفرد، Times New Roman 11pt، تباعد أسطر مفرد.')}</li>
                                    <li>{t('Page Margins: Top 3.5 cm (header at 2.3 cm), Bottom 2.0 cm, Left 2.0 cm, Right 2.0 cm on A4 paper.', 'الهوامش: أعلى 3.5 سم (الترويسة عند 2.3 سم)، أسفل 2.0 سم، يسار 2.0 سم، يمين 2.0 سم على ورق A4.')}</li>
                                    <li>{t('Title: 16 pt bold, capital letters, centered.', 'العنوان: 16 pt عريض، أحرف كبيرة (CAPITAL)، محاذاة للوسط.')}</li>
                                    <li>{t('Article Info Header: 2-column table with history dates & up to 6 keywords on the left, and abstract (<= 250 words) on the right.', 'ترويسة بيانات المقال: جدول بعمودين، التواريخ والكلمات المفتاحية على اليسار، والملخص (250 كلمة كحد أقصى) على اليمين.')}</li>
                                    <li>{t('References: Strictly IEEE citation format [1], [2] arranged in order of appearance.', 'المراجع: نمط IEEE حصراً [1]، [2] مرتبة حسب ظهورها.')}</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: AUTHORS & AFFILIATIONS */}
                    {activeTab === 'authors' && (
                        <div className="space-y-6">
                            {/* Authors Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                        <span>👥</span> {t('Authors List', 'قائمة المؤلفين')}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={handleAddAuthor}
                                        className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                    >
                                        + {t('Add Author', 'إضافة مؤلف')}
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {authors.map((author, idx) => (
                                        <div
                                            key={author.id}
                                            className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 text-xs font-bold flex items-center justify-center">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-xs font-bold text-white">
                                                        {author.name || author.surname ? `${author.name} ${author.surname}` : t('New Author', 'مؤلف جديد')}
                                                    </span>
                                                    {author.isCorresponding && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                                            * {t('Corresponding Author', 'المؤلف المسؤول للمراسلة')}
                                                        </span>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAuthor(idx)}
                                                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10"
                                                >
                                                    {t('Remove', 'حذف')}
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                <div>
                                                    <label className="block text-slate-400 text-[11px] mb-1">
                                                        {t('Given Name', 'الاسم الأول')} <span className="text-amber-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={author.name}
                                                        onChange={(e) => handleUpdateAuthor(idx, { name: e.target.value })}
                                                        placeholder="Firstname"
                                                        className="futuristic-input text-xs w-full"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-slate-400 text-[11px] mb-1">
                                                        {t('Surname (Family Name)', 'اسم العائلة')} <span className="text-amber-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={author.surname}
                                                        onChange={(e) => handleUpdateAuthor(idx, { surname: e.target.value })}
                                                        placeholder="SURNAME"
                                                        className="futuristic-input text-xs w-full"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-slate-400 text-[11px] mb-1">
                                                        {t('E-mail Address', 'البريد الإلكتروني')} {author.isCorresponding && <span className="text-amber-500">*</span>}
                                                    </label>
                                                    <input
                                                        type="email"
                                                        value={author.email || ''}
                                                        onChange={(e) => handleUpdateAuthor(idx, { email: e.target.value })}
                                                        placeholder="author@university.edu"
                                                        className="futuristic-input text-xs w-full"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-slate-400 text-[11px] mb-1">
                                                        {t('Telephone / Mobile', 'رقم الهاتف')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={author.phone || ''}
                                                        onChange={(e) => handleUpdateAuthor(idx, { phone: e.target.value })}
                                                        placeholder="+385 51 651 444"
                                                        className="futuristic-input text-xs w-full"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800 text-xs">
                                                {/* Affiliation assignment */}
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400 text-[11px]">{t('Affiliations:', 'الانتماءات المؤسسية:')}</span>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {affiliations.map(aff => {
                                                            const isChecked = (author.affiliationIds || []).includes(aff.id);
                                                            return (
                                                                <button
                                                                    key={aff.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const current = author.affiliationIds || [];
                                                                        const next = isChecked
                                                                            ? current.filter(id => id !== aff.id)
                                                                            : [...current, aff.id];
                                                                        handleUpdateAuthor(idx, { affiliationIds: next });
                                                                    }}
                                                                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                                                                        isChecked
                                                                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                                                                            : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                                                                    }`}
                                                                >
                                                                    {aff.number}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Corresponding checkbox */}
                                                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!author.isCorresponding}
                                                        onChange={(e) => handleUpdateAuthor(idx, { isCorresponding: e.target.checked })}
                                                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-800"
                                                    />
                                                    <span className="text-[11px] font-medium">{t('Set as Corresponding Author (*)', 'تعيين كمؤلف مسؤول للمراسلة (*)')}</span>
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Affiliations Section */}
                            <div className="space-y-3 pt-4 border-t border-slate-800">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                        <span>🏛️</span> {t('Affiliations List', 'قائمة المؤسسات / الانتماءات')}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={handleAddAffiliation}
                                        className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                    >
                                        + {t('Add Affiliation', 'إضافة انتماء')}
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {affiliations.map((aff, idx) => (
                                        <div
                                            key={aff.id}
                                            className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center font-mono">
                                                    {aff.number}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAffiliation(idx)}
                                                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10"
                                                >
                                                    {t('Remove', 'حذف')}
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                                <div>
                                                    <label className="block text-slate-400 text-[11px] mb-1">
                                                        {t('Department Name', 'اسم القسم')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={aff.department || ''}
                                                        onChange={(e) => handleUpdateAffiliation(idx, { department: e.target.value })}
                                                        placeholder="Department of Mechanical Engineering"
                                                        className="futuristic-input text-xs w-full"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-slate-400 text-[11px] mb-1">
                                                        {t('Faculty / School Name', 'اسم الكلية')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={aff.faculty || ''}
                                                        onChange={(e) => handleUpdateAffiliation(idx, { faculty: e.target.value })}
                                                        placeholder="Faculty of Engineering"
                                                        className="futuristic-input text-xs w-full"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-slate-400 text-[11px] mb-1">
                                                        {t('University / Institution', 'اسم الجامعة أو المركز')} <span className="text-amber-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={aff.institution}
                                                        onChange={(e) => handleUpdateAffiliation(idx, { institution: e.target.value })}
                                                        placeholder="University of Rijeka"
                                                        className="futuristic-input text-xs w-full"
                                                    />
                                                </div>

                                                <div className="md:col-span-3">
                                                    <label className="block text-slate-400 text-[11px] mb-1">
                                                        {t('Postal Address & Country', 'العنوان البريدي والدولة')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={aff.address || aff.fullAddress || ''}
                                                        onChange={(e) => handleUpdateAffiliation(idx, { address: e.target.value, fullAddress: e.target.value })}
                                                        placeholder="e.g., Cairo, Egypt"
                                                        className="futuristic-input text-xs w-full"
                                                    />
                                                </div>

                                                {/* Live Formatted Line Preview */}
                                                <div className="md:col-span-3">
                                                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] flex items-center gap-2">
                                                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                                            {aff.number}
                                                        </span>
                                                        <span className="text-slate-400 font-medium whitespace-nowrap text-[10px] uppercase tracking-wider">{t('Formatted Output:', 'السطر النهائي في البحث:')}</span>
                                                        <span className="text-amber-200 font-serif italic truncate">
                                                            {formatAffiliationText(aff) || t('(Please fill in institution and address details)', '(يرجى إدخال اسم المؤسسة والعنوان)')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: ARTICLE INFO & ABSTRACT */}
                    {activeTab === 'article' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <label className="block text-slate-400 text-[11px] mb-1">
                                        {t('Paper Title', 'عنوان الورقة البحثية')} <span className="text-amber-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={paperTitle}
                                        onChange={(e) => setPaperTitle(e.target.value)}
                                        placeholder="Full paper title"
                                        className="futuristic-input text-xs w-full font-bold"
                                    />
                                    <span className="text-[10px] text-slate-500 mt-1 block">
                                        {t('Will be formatted in 16 pt BOLD CAPITAL letters automatically.', 'سيتم تنسيقه تلقائياً بخط 16 pt عريض وأحرف كبيرة.')}
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-[11px] mb-1">
                                        {t('Short Title (for Running Header, max 50 chars)', 'عنوان مختصر للترويسة (أقل من 50 حرفاً)')}
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={60}
                                        value={shortTitle}
                                        onChange={(e) => setShortTitle(e.target.value)}
                                        placeholder="Brief running title"
                                        className="futuristic-input text-xs w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-[11px] mb-1">
                                        {t('Article Category', 'تصنيف المقال في المجلة')}
                                    </label>
                                    <select
                                        value={articleCategory}
                                        onChange={(e) => setArticleCategory(e.target.value as any)}
                                        className="futuristic-input text-xs w-full bg-slate-800"
                                    >
                                        <option value="Original scientific paper">{t('Original scientific paper', 'بحث علمي أصيل (Original scientific paper)')}</option>
                                        <option value="Preliminary communication">{t('Preliminary communication', 'مراسلة أولية (Preliminary communication)')}</option>
                                        <option value="Subject review">{t('Subject review', 'مراجعة موضوعية (Subject review)')}</option>
                                        <option value="Professional paper">{t('Professional paper', 'ورقة مهنية (Professional paper)')}</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-slate-400 text-[11px] mb-1">
                                            {t('Received Date', 'تاريخ الاستلام')}
                                        </label>
                                        <input
                                            type="text"
                                            value={receivedDate}
                                            onChange={(e) => setReceivedDate(e.target.value)}
                                            placeholder="DD Month YYYY"
                                            className="futuristic-input text-xs w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 text-[11px] mb-1">
                                            {t('Revised Date', 'تاريخ المراجعة')}
                                        </label>
                                        <input
                                            type="text"
                                            value={revisedDate}
                                            onChange={(e) => setRevisedDate(e.target.value)}
                                            placeholder="Optional"
                                            className="futuristic-input text-xs w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-400 text-[11px] mb-1">
                                            {t('Accepted Date', 'تاريخ القبول')}
                                        </label>
                                        <input
                                            type="text"
                                            value={acceptedDate}
                                            onChange={(e) => setAcceptedDate(e.target.value)}
                                            placeholder="Optional"
                                            className="futuristic-input text-xs w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Keywords */}
                            <div className="space-y-2 pt-2 border-t border-slate-800">
                                <div className="flex items-center justify-between">
                                    <label className="block text-slate-300 text-xs font-semibold">
                                        {t('Keywords (Max 6 keywords required by journal)', 'الكلمات المفتاحية (6 كحد أقصى تفرضه المجلة)')}
                                    </label>
                                    <span className={`text-xs font-mono ${keywordsList.length > 6 ? 'text-red-400' : 'text-slate-400'}`}>
                                        {keywordsList.length} / 6
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={keywordInput}
                                        onChange={(e) => setKeywordInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddKeyword();
                                            }
                                        }}
                                        placeholder={t('Type keyword and press Add or Enter...', 'اكتب كلمة مفتاحية واضغط إضافة...')}
                                        className="futuristic-input text-xs flex-1"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddKeyword}
                                        disabled={!keywordInput.trim() || keywordsList.length >= 6}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs disabled:opacity-40"
                                    >
                                        {t('Add', 'إضافة')}
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {keywordsList.map((kw, idx) => (
                                        <span
                                            key={idx}
                                            className="px-2.5 py-1 rounded-full text-xs bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5"
                                        >
                                            <span>{kw}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveKeyword(idx)}
                                                className="hover:text-red-400 text-slate-500"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                    {keywordsList.length === 0 && (
                                        <span className="text-xs text-slate-500 italic">
                                            {t('No keywords added yet.', 'لم يتم إضافة كلمات مفتاحية بعد.')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Abstract */}
                            <div className="space-y-2 pt-2 border-t border-slate-800">
                                <div className="flex items-center justify-between">
                                    <label className="block text-slate-300 text-xs font-semibold">
                                        {t('Abstract (Max 250 words, no citations, no abbreviations)', 'الملخص (أقل من 250 كلمة، بدون مراجع أو اختصارات)')}
                                    </label>
                                    <span className={`text-xs font-mono font-bold ${
                                        currentValidation.wordCount > 250 ? 'text-red-400 animate-pulse' : 'text-slate-400'
                                    }`}>
                                        {currentValidation.wordCount} / 250 {t('words', 'كلمة')}
                                    </span>
                                </div>

                                <textarea
                                    value={abstractText}
                                    onChange={(e) => setAbstractText(e.target.value)}
                                    placeholder={t('The abstract should not contain more than 250 words including objective, methods, procedures, experimental investigations as well as main outcomes and results...', 'يجب ألا يتجاوز الملخص 250 كلمة متضمناً الأهداف والمنهجية والنتائج الرئيسية...')}
                                    rows={5}
                                    className={`futuristic-input text-xs w-full leading-relaxed ${
                                        currentValidation.wordCount > 250 ? 'border-red-500/50' : ''
                                    }`}
                                />
                                {currentValidation.wordCount > 250 && (
                                    <p className="text-xs text-red-400">
                                        ⚠️ {t('The abstract exceeds the 250-word journal limit. Please condense it prior to submission.', 'الملخص يتجاوز حد الـ 250 كلمة المحدد من قبل المجلة. يرجى اختصاره قبل الإرسال.')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: REVIEWERS (JOURNAL REQUIREMENT) */}
                    {activeTab === 'reviewers' && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start justify-between gap-4">
                                <div>
                                    <h4 className="font-bold text-amber-300 mb-1">
                                        {t('Journal Submission Requirement: 3 Peer Reviewers File', 'متطلب إرسال المجلة: ملف اقتراح 3 مراجعين أقران')}
                                    </h4>
                                    <p className="text-slate-300 text-[11px] leading-relaxed">
                                        {t('Engineering Review checklist states: "A file containing the names and contact of at least three possible reviewers, complete with their contacts and affiliations, must be submitted."', 'تنص شروط المجلة على وجوب إرفاق ملف مستقل يحتوي على أسماء وتفاصيل اتصال ومؤسسات 3 مراجعين أقران محتملين على الأقل.')}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleExportReviewers}
                                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs whitespace-nowrap shadow flex items-center gap-1.5"
                                >
                                    <span>💾</span>
                                    {t('Export Reviewers .txt', 'تصدير ملف المراجعين .txt')}
                                </button>
                            </div>

                            <div className="space-y-3">
                                {reviewers.map((rev, idx) => (
                                    <div
                                        key={rev.id || idx}
                                        className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 text-xs font-bold flex items-center justify-center font-mono">
                                                {idx + 1}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {t('Potential Independent Reviewer', 'مراجع مستقل مقترح')} #{idx + 1}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                            <div>
                                                <label className="block text-slate-400 text-[11px] mb-1">
                                                    {t('Full Name & Academic Title', 'الاسم الكامل واللقب الأكاديمي')} <span className="text-amber-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={rev.name}
                                                    onChange={(e) => {
                                                        const next = [...reviewers];
                                                        next[idx] = { ...next[idx], name: e.target.value };
                                                        setReviewers(next);
                                                    }}
                                                    placeholder="Prof. Dr. Jane Smith"
                                                    className="futuristic-input text-xs w-full"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-slate-400 text-[11px] mb-1">
                                                    {t('Institutional Affiliation', 'المؤسسة الأكاديمية / الجامعة')} <span className="text-amber-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={rev.affiliation}
                                                    onChange={(e) => {
                                                        const next = [...reviewers];
                                                        next[idx] = { ...next[idx], affiliation: e.target.value };
                                                        setReviewers(next);
                                                    }}
                                                    placeholder="University of Zagreb"
                                                    className="futuristic-input text-xs w-full"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-slate-400 text-[11px] mb-1">
                                                    {t('E-mail Address', 'البريد الإلكتروني')} <span className="text-amber-500">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    value={rev.email}
                                                    onChange={(e) => {
                                                        const next = [...reviewers];
                                                        next[idx] = { ...next[idx], email: e.target.value };
                                                        setReviewers(next);
                                                    }}
                                                    placeholder="reviewer@domain.edu"
                                                    className="futuristic-input text-xs w-full"
                                                />
                                            </div>

                                            <div className="sm:col-span-3">
                                                <label className="block text-slate-400 text-[11px] mb-1">
                                                    {t('Fields of Expertise / Keywords', 'مجال التخصص والخبرة')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={rev.fieldsOfExpertise || ''}
                                                    onChange={(e) => {
                                                        const next = [...reviewers];
                                                        next[idx] = { ...next[idx], fieldsOfExpertise: e.target.value };
                                                        setReviewers(next);
                                                    }}
                                                    placeholder="Mechanical design, Composite materials, Finite Element Analysis"
                                                    className="futuristic-input text-xs w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/80">
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>{t('Selected format:', 'التنسيق المحدد:')}</span>
                        <span className="font-bold text-amber-400">
                            {AVAILABLE_JOURNAL_FORMATS.find(f => f.id === selectedFormatId)?.name || selectedFormatId}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="futuristic-btn-ghost text-xs"
                        >
                            {t('Cancel', 'إلغاء')}
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="futuristic-btn-primary text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {t('Save & Apply Journal Format', 'حفظ وتطبيق تنسيق المجلة')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
