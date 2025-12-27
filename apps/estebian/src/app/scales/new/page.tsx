'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { Scale, Dimension, Statement, ScaleOption, getDefaultOptions } from '@/lib/types';
import { saveScale, generateId } from '@/lib/storage';
import { getDashboardUrl, getCurrentUrl } from '@njaz/shared-auth';

export default function NewScalePage() {
    const { t, language: uiLanguage, direction } = useLanguage();
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Scale language (separate from UI language)
    const [scaleLanguage, setScaleLanguage] = useState<'ar' | 'en'>('ar');

    // Scale form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);
    const [options, setOptions] = useState<ScaleOption[]>(getDefaultOptions('ar'));

    useEffect(() => {
        checkAuth();
    }, []);

    // Update default options when language changes
    useEffect(() => {
        setOptions(getDefaultOptions(scaleLanguage));
    }, [scaleLanguage]);

    async function checkAuth() {
        try {
            const user = await getCurrentUser();
            setUserId(user.username);
        } catch {
            // User not authenticated - that's okay
            setUserId(null);
        } finally {
            setIsLoading(false);
        }
    }

    function addOption() {
        const newOption: ScaleOption = {
            id: generateId(),
            label: '',
            value: options.length + 1
        };
        setOptions([...options, newOption]);
    }

    function removeOption(id: string) {
        if (options.length <= 2) {
            alert(t('Minimum 2 options required', 'يجب وجود خيارين على الأقل'));
            return;
        }
        const newOptions = options.filter(o => o.id !== id);
        // Re-assign values
        setOptions(newOptions.map((o, i) => ({ ...o, value: i + 1 })));
    }

    function updateOption(id: string, field: keyof ScaleOption, value: any) {
        setOptions(options.map(o =>
            o.id === id ? { ...o, [field]: value } : o
        ));
    }

    function addDimension() {
        const newDimension: Dimension = {
            id: generateId(),
            name: '',
            statements: []
        };
        setDimensions([...dimensions, newDimension]);
    }

    function updateDimension(id: string, field: keyof Dimension, value: any) {
        setDimensions(dimensions.map(d =>
            d.id === id ? { ...d, [field]: value } : d
        ));
    }

    function removeDimension(id: string) {
        setDimensions(dimensions.filter(d => d.id !== id));
    }

    function addStatement(dimensionId: string) {
        const newStatement: Statement = {
            id: generateId(),
            text: '',
            isReversed: false
        };
        setDimensions(dimensions.map(d =>
            d.id === dimensionId
                ? { ...d, statements: [...d.statements, newStatement] }
                : d
        ));
    }

    function updateStatement(dimensionId: string, statementId: string, field: keyof Statement, value: any) {
        setDimensions(dimensions.map(d =>
            d.id === dimensionId
                ? {
                    ...d,
                    statements: d.statements.map(s =>
                        s.id === statementId ? { ...s, [field]: value } : s
                    )
                }
                : d
        ));
    }

    function removeStatement(dimensionId: string, statementId: string) {
        setDimensions(dimensions.map(d =>
            d.id === dimensionId
                ? { ...d, statements: d.statements.filter(s => s.id !== statementId) }
                : d
        ));
    }

    async function handleSave() {
        if (!userId || !title || dimensions.length === 0) {
            alert(t('Please fill in title and add at least one dimension', 'يرجى ملء العنوان وإضافة بُعد واحد على الأقل'));
            return;
        }

        // Validate options
        if (options.some(o => !o.label.trim())) {
            alert(t('Please fill in all option labels', 'يرجى ملء جميع تسميات الخيارات'));
            return;
        }

        setIsSaving(true);
        try {
            const scale: Scale = {
                id: generateId(),
                language: scaleLanguage,
                title,
                description,
                createdBy: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isPublic,
                dimensions,
                options
            };

            saveScale(scale);
            router.push('/scales');
        } catch (error) {
            console.error('Error saving scale:', error);
            alert(t('Error saving scale', 'خطأ في حفظ المقياس'));
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center futuristic-bg">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">{t('Loading...', 'جاري التحميل...')}</p>
                </div>
            </div>
        );
    }

    const isRtl = scaleLanguage === 'ar';

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader
                currentApp="estebian"
                showLanguageSwitcher={true}
                LanguageSwitcher={LanguageSwitcher}
            />

            <main className="flex-1 pt-24 pb-8 px-4 md:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <Link href="/scales" className="text-sm text-cyan-400 hover:text-cyan-300 mb-2 inline-block">
                                ← {t('Back to Library', 'العودة للمكتبة')}
                            </Link>
                            <h1 className="text-3xl font-bold text-white">
                                {t('Create New Scale', 'إنشاء مقياس جديد')}
                            </h1>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="futuristic-btn-primary"
                        >
                            {isSaving ? t('Saving...', 'جاري الحفظ...') : t('Save Scale', 'حفظ المقياس')}
                        </button>
                    </div>

                    {/* Language Selection */}
                    <FuturisticPanel glowColor="purple" size="md" className="mb-6">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {t('Scale Language', 'لغة المقياس')}
                        </h2>
                        <p className="text-sm text-slate-400 mb-4">
                            {t('Choose the language for this scale. All content will be in this language.',
                                'اختر لغة هذا المقياس. كل المحتوى سيكون بهذه اللغة.')}
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setScaleLanguage('ar')}
                                className={`flex-1 py-3 px-4 rounded-lg border transition-all ${scaleLanguage === 'ar'
                                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                                    }`}
                            >
                                <span className="text-lg font-bold">العربية</span>
                                <span className="block text-sm opacity-70">Arabic</span>
                            </button>
                            <button
                                onClick={() => setScaleLanguage('en')}
                                className={`flex-1 py-3 px-4 rounded-lg border transition-all ${scaleLanguage === 'en'
                                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                                    }`}
                            >
                                <span className="text-lg font-bold">English</span>
                                <span className="block text-sm opacity-70">الإنجليزية</span>
                            </button>
                        </div>
                    </FuturisticPanel>

                    {/* Basic Info */}
                    <FuturisticPanel glowColor="cyan" size="md" className="mb-6">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {t('Basic Information', 'المعلومات الأساسية')}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">
                                    {t('Scale Title', 'عنوان المقياس')} *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="futuristic-input"
                                    placeholder={scaleLanguage === 'ar' ? 'مقياس تقييم القلق' : 'Anxiety Assessment Scale'}
                                    dir={isRtl ? 'rtl' : 'ltr'}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">
                                    {t('Description', 'الوصف')}
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="futuristic-input min-h-[80px]"
                                    placeholder={scaleLanguage === 'ar' ? 'وصف المقياس وأهدافه...' : 'Description of the scale and its objectives...'}
                                    dir={isRtl ? 'rtl' : 'ltr'}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isPublic}
                                        onChange={(e) => setIsPublic(e.target.checked)}
                                        className="w-5 h-5 rounded bg-slate-700 border-cyan-500/30 text-cyan-500 focus:ring-cyan-500"
                                    />
                                    <span className="text-white">
                                        {t('Make this scale public', 'اجعل هذا المقياس عاماً')}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </FuturisticPanel>

                    {/* Response Options */}
                    <FuturisticPanel glowColor="gold" size="md" className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {t('Response Options', 'خيارات الاستجابة')}
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    {t('Define the multiple choice options (e.g., Likert scale)',
                                        'حدد خيارات الاختيار المتعدد (مثل: مقياس ليكرت)')}
                                </p>
                            </div>
                            <button
                                onClick={addOption}
                                className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                {t('Add Option', 'إضافة خيار')}
                            </button>
                        </div>
                        <div className="space-y-3">
                            {options.map((option, index) => (
                                <div key={option.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50">
                                    <span className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                                        {option.value}
                                    </span>
                                    <input
                                        type="text"
                                        value={option.label}
                                        onChange={(e) => updateOption(option.id, 'label', e.target.value)}
                                        className="futuristic-input flex-1"
                                        placeholder={scaleLanguage === 'ar' ? 'تسمية الخيار' : 'Option label'}
                                        dir={isRtl ? 'rtl' : 'ltr'}
                                    />
                                    <button
                                        onClick={() => removeOption(option.id)}
                                        className="text-red-400 hover:text-red-300 p-1"
                                        title={t('Remove option', 'حذف الخيار')}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </FuturisticPanel>

                    {/* Dimensions */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">
                                {t('Dimensions & Statements', 'الأبعاد والعبارات')}
                            </h2>
                            <button
                                onClick={addDimension}
                                className="futuristic-btn inline-flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                {t('Add Dimension', 'إضافة بُعد')}
                            </button>
                        </div>

                        {dimensions.length === 0 ? (
                            <FuturisticPanel glowColor="cyan" size="md">
                                <div className="text-center py-8">
                                    <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <p className="text-slate-400 mb-4">
                                        {t('No dimensions yet. Add your first dimension to start building the scale.',
                                            'لا توجد أبعاد بعد. أضف بُعدك الأول لبدء بناء المقياس.')}
                                    </p>
                                    <button
                                        onClick={addDimension}
                                        className="futuristic-btn-primary inline-flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        {t('Add First Dimension', 'إضافة أول بُعد')}
                                    </button>
                                </div>
                            </FuturisticPanel>
                        ) : (
                            <div className="space-y-6">
                                {dimensions.map((dimension, dimIndex) => (
                                    <FuturisticPanel key={dimension.id} glowColor="green" size="md">
                                        <div className="flex items-start justify-between mb-4">
                                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                                                {t('Dimension', 'البُعد')} {dimIndex + 1}
                                            </span>
                                            <button
                                                onClick={() => removeDimension(dimension.id)}
                                                className="text-red-400 hover:text-red-300 p-1"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Dimension Name */}
                                        <div className="mb-4">
                                            <label className="block text-sm text-slate-400 mb-2">
                                                {t('Dimension Name', 'اسم البُعد')}
                                            </label>
                                            <input
                                                type="text"
                                                value={dimension.name}
                                                onChange={(e) => updateDimension(dimension.id, 'name', e.target.value)}
                                                className="futuristic-input"
                                                placeholder={scaleLanguage === 'ar' ? 'مثال: الأعراض الجسدية' : 'e.g., Physical Symptoms'}
                                                dir={isRtl ? 'rtl' : 'ltr'}
                                            />
                                        </div>

                                        {/* Statements */}
                                        <div className="border-t border-slate-700 pt-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-medium text-white">
                                                    {t('Statements', 'العبارات')} ({dimension.statements.length})
                                                </h4>
                                                <button
                                                    onClick={() => addStatement(dimension.id)}
                                                    className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                    </svg>
                                                    {t('Add Statement', 'إضافة عبارة')}
                                                </button>
                                            </div>

                                            {dimension.statements.length === 0 ? (
                                                <p className="text-sm text-slate-500 text-center py-4">
                                                    {t('No statements. Click "Add Statement" to add items.',
                                                        'لا توجد عبارات. اضغط "إضافة عبارة" لإضافة بنود.')}
                                                </p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {dimension.statements.map((statement, stIndex) => (
                                                        <div key={statement.id} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                                                            <div className="flex items-start gap-3">
                                                                <span className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-400 mt-2">
                                                                    {stIndex + 1}
                                                                </span>
                                                                <div className="flex-1">
                                                                    <textarea
                                                                        value={statement.text}
                                                                        onChange={(e) => updateStatement(dimension.id, statement.id, 'text', e.target.value)}
                                                                        className="futuristic-input text-sm w-full min-h-[60px]"
                                                                        placeholder={scaleLanguage === 'ar'
                                                                            ? 'أشعر بالتوتر في المواقف الاجتماعية'
                                                                            : 'I feel nervous in social situations'}
                                                                        dir={isRtl ? 'rtl' : 'ltr'}
                                                                    />
                                                                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={statement.isReversed}
                                                                            onChange={(e) => updateStatement(dimension.id, statement.id, 'isReversed', e.target.checked)}
                                                                            className="w-4 h-4 rounded bg-slate-700"
                                                                        />
                                                                        <span className={`text-xs ${statement.isReversed ? 'text-amber-400' : 'text-slate-500'}`}>
                                                                            {t('Reversed scoring (opposite meaning)', 'درجات عكسية (معنى معاكس)')}
                                                                        </span>
                                                                    </label>
                                                                </div>
                                                                <button
                                                                    onClick={() => removeStatement(dimension.id, statement.id)}
                                                                    className="text-red-400 hover:text-red-300 p-1"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </FuturisticPanel>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end gap-4">
                        <Link href="/scales" className="futuristic-btn">
                            {t('Cancel', 'إلغاء')}
                        </Link>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="futuristic-btn-primary"
                        >
                            {isSaving ? t('Saving...', 'جاري الحفظ...') : t('Save Scale', 'حفظ المقياس')}
                        </button>
                    </div>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
