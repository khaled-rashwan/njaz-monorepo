'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { Survey, Scale, DemographicField } from '@/lib/types';
import { saveSurvey, getScales, generateId } from '@/lib/storage';

export default function NewSurveyPage() {
    const { t, language: uiLanguage, direction } = useLanguage();
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [availableScales, setAvailableScales] = useState<Scale[]>([]);

    // Survey language (separate from UI)
    const [surveyLanguage, setSurveyLanguage] = useState<'ar' | 'en'>('ar');

    // Survey form state
    const [title, setTitle] = useState('');
    const [introduction, setIntroduction] = useState('');
    const [demographics, setDemographics] = useState<DemographicField[]>([]);
    const [selectedScaleIds, setSelectedScaleIds] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const user = await getCurrentUser();
            setUserId(user.username);

            // Get all available scales
            const scales = getScales();
            const publicScales = scales.filter(s => s.isPublic || s.createdBy === user.username);
            setAvailableScales(publicScales);
        } catch {
            window.location.href = 'https://dashboard.njaz.org';
        } finally {
            setIsLoading(false);
        }
    }

    // Filter scales by survey language
    const matchingScales = availableScales.filter(s => s.language === surveyLanguage);

    function addDemographic(type: DemographicField['type']) {
        const newField: DemographicField = {
            id: generateId(),
            type,
            label: '',
            required: false,
            options: type === 'select' ? [''] : undefined
        };
        setDemographics([...demographics, newField]);
    }

    function updateDemographic(id: string, field: keyof DemographicField, value: any) {
        setDemographics(demographics.map(d =>
            d.id === id ? { ...d, [field]: value } : d
        ));
    }

    function removeDemographic(id: string) {
        setDemographics(demographics.filter(d => d.id !== id));
    }

    function addSelectOption(fieldId: string) {
        setDemographics(demographics.map(d =>
            d.id === fieldId && d.options
                ? { ...d, options: [...d.options, ''] }
                : d
        ));
    }

    function updateSelectOption(fieldId: string, index: number, value: string) {
        setDemographics(demographics.map(d =>
            d.id === fieldId && d.options
                ? { ...d, options: d.options.map((opt, i) => i === index ? value : opt) }
                : d
        ));
    }

    function removeSelectOption(fieldId: string, index: number) {
        setDemographics(demographics.map(d =>
            d.id === fieldId && d.options && d.options.length > 1
                ? { ...d, options: d.options.filter((_, i) => i !== index) }
                : d
        ));
    }

    function toggleScale(scaleId: string) {
        if (selectedScaleIds.includes(scaleId)) {
            setSelectedScaleIds(selectedScaleIds.filter(id => id !== scaleId));
        } else {
            setSelectedScaleIds([...selectedScaleIds, scaleId]);
        }
    }

    // Clear selected scales when language changes
    useEffect(() => {
        setSelectedScaleIds([]);
    }, [surveyLanguage]);

    async function handleSave() {
        if (!userId || !title || selectedScaleIds.length === 0) {
            alert(t('Please fill in title and select at least one scale',
                'يرجى ملء العنوان واختيار مقياس واحد على الأقل'));
            return;
        }

        setIsSaving(true);
        try {
            const survey: Survey = {
                id: generateId(),
                language: surveyLanguage,
                title,
                introduction,
                createdBy: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isPublished: false,
                demographics,
                scaleIds: selectedScaleIds
            };

            saveSurvey(survey);
            router.push('/surveys');
        } catch (error) {
            console.error('Error saving survey:', error);
            alert(t('Error saving survey', 'خطأ في حفظ الاستبيان'));
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

    const isRtl = surveyLanguage === 'ar';

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
                            <Link href="/surveys" className="text-sm text-cyan-400 hover:text-cyan-300 mb-2 inline-block">
                                ← {t('Back to Surveys', 'العودة للاستبيانات')}
                            </Link>
                            <h1 className="text-3xl font-bold text-white">
                                {t('Create New Survey', 'إنشاء استبيان جديد')}
                            </h1>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="futuristic-btn-primary"
                        >
                            {isSaving ? t('Saving...', 'جاري الحفظ...') : t('Save Survey', 'حفظ الاستبيان')}
                        </button>
                    </div>

                    {/* Language Selection */}
                    <FuturisticPanel glowColor="purple" size="md" className="mb-6">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {t('Survey Language', 'لغة الاستبيان')}
                        </h2>
                        <p className="text-sm text-slate-400 mb-4">
                            {t('Choose the language for this survey. Only scales in the same language will be available.',
                                'اختر لغة هذا الاستبيان. ستظهر فقط المقاييس بنفس اللغة.')}
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setSurveyLanguage('ar')}
                                className={`flex-1 py-3 px-4 rounded-lg border transition-all ${surveyLanguage === 'ar'
                                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                        : 'border-slate-600 text-slate-400 hover:border-slate-500'
                                    }`}
                            >
                                <span className="text-lg font-bold">العربية</span>
                                <span className="block text-sm opacity-70">Arabic</span>
                            </button>
                            <button
                                onClick={() => setSurveyLanguage('en')}
                                className={`flex-1 py-3 px-4 rounded-lg border transition-all ${surveyLanguage === 'en'
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
                                    {t('Survey Title', 'عنوان الاستبيان')} *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="futuristic-input"
                                    placeholder={surveyLanguage === 'ar' ? 'استبيان الدراسة البحثية' : 'Research Study Survey'}
                                    dir={isRtl ? 'rtl' : 'ltr'}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">
                                    {t('Introduction', 'المقدمة')}
                                </label>
                                <textarea
                                    value={introduction}
                                    onChange={(e) => setIntroduction(e.target.value)}
                                    className="futuristic-input min-h-[100px]"
                                    placeholder={surveyLanguage === 'ar'
                                        ? 'مرحباً بك في هذا الاستبيان. إجاباتك سرية...'
                                        : 'Welcome to this survey. Your responses are anonymous...'}
                                    dir={isRtl ? 'rtl' : 'ltr'}
                                />
                            </div>
                        </div>
                    </FuturisticPanel>

                    {/* Demographic Questions */}
                    <FuturisticPanel glowColor="gold" size="md" className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">
                                {t('Demographic Questions', 'الأسئلة الديموغرافية')}
                            </h2>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => addDemographic('text')}
                                    className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1 px-2 py-1 rounded border border-cyan-500/30 hover:border-cyan-500/50"
                                >
                                    + {t('Text', 'نص')}
                                </button>
                                <button
                                    onClick={() => addDemographic('number')}
                                    className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1 px-2 py-1 rounded border border-cyan-500/30 hover:border-cyan-500/50"
                                >
                                    + {t('Number', 'رقم')}
                                </button>
                                <button
                                    onClick={() => addDemographic('date')}
                                    className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1 px-2 py-1 rounded border border-cyan-500/30 hover:border-cyan-500/50"
                                >
                                    + {t('Date', 'تاريخ')}
                                </button>
                                <button
                                    onClick={() => addDemographic('select')}
                                    className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1 px-2 py-1 rounded border border-cyan-500/30 hover:border-cyan-500/50"
                                >
                                    + {t('Select', 'قائمة')}
                                </button>
                            </div>
                        </div>

                        {demographics.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">
                                {t('No demographic questions. Add questions to collect participant information.',
                                    'لا توجد أسئلة ديموغرافية. أضف أسئلة لجمع معلومات المشاركين.')}
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {demographics.map((field, index) => (
                                    <div key={field.id} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500">#{index + 1}</span>
                                                <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400">
                                                    {field.type === 'text' && t('Text', 'نص')}
                                                    {field.type === 'number' && t('Number', 'رقم')}
                                                    {field.type === 'date' && t('Date', 'تاريخ')}
                                                    {field.type === 'select' && t('Select', 'قائمة')}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => removeDemographic(field.id)}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => updateDemographic(field.id, 'label', e.target.value)}
                                            className="futuristic-input text-sm mb-3"
                                            placeholder={surveyLanguage === 'ar' ? 'تسمية السؤال' : 'Question label'}
                                            dir={isRtl ? 'rtl' : 'ltr'}
                                        />
                                        {field.type === 'select' && field.options && (
                                            <div className="mr-4 space-y-2 mb-3">
                                                <p className="text-xs text-slate-500">{t('Options:', 'الخيارات:')}</p>
                                                {field.options.map((opt, i) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={(e) => updateSelectOption(field.id, i, e.target.value)}
                                                            className="futuristic-input text-sm flex-1"
                                                            placeholder={`${t('Option', 'خيار')} ${i + 1}`}
                                                            dir={isRtl ? 'rtl' : 'ltr'}
                                                        />
                                                        {field.options!.length > 1 && (
                                                            <button
                                                                onClick={() => removeSelectOption(field.id, i)}
                                                                className="text-red-400 hover:text-red-300 p-1"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => addSelectOption(field.id)}
                                                    className="text-xs text-cyan-400 hover:text-cyan-300"
                                                >
                                                    + {t('Add Option', 'إضافة خيار')}
                                                </button>
                                            </div>
                                        )}
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(e) => updateDemographic(field.id, 'required', e.target.checked)}
                                                className="w-4 h-4 rounded bg-slate-700"
                                            />
                                            <span className="text-sm text-slate-400">
                                                {t('Required', 'مطلوب')}
                                            </span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </FuturisticPanel>

                    {/* Scale Selection */}
                    <FuturisticPanel glowColor="green" size="md" className="mb-6">
                        <h2 className="text-xl font-bold text-white mb-2">
                            {t('Select Scales', 'اختيار المقاييس')} *
                        </h2>
                        <p className="text-sm text-slate-400 mb-4">
                            {t('Choose one or more scales to include. Only scales in the selected language are shown.',
                                'اختر مقياساً واحداً أو أكثر. تظهر فقط المقاييس باللغة المحددة.')}
                        </p>

                        {matchingScales.length === 0 ? (
                            <div className="text-center py-6">
                                <p className="text-slate-400 mb-4">
                                    {t(`No ${surveyLanguage === 'ar' ? 'Arabic' : 'English'} scales available. Create a scale first.`,
                                        `لا توجد مقاييس ${surveyLanguage === 'ar' ? 'عربية' : 'إنجليزية'} متاحة. أنشئ مقياساً أولاً.`)}
                                </p>
                                <Link href="/scales/new" className="futuristic-btn">
                                    {t('Create Scale', 'إنشاء مقياس')}
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {matchingScales.map(scale => (
                                    <div
                                        key={scale.id}
                                        onClick={() => toggleScale(scale.id)}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedScaleIds.includes(scale.id)
                                                ? 'bg-green-500/10 border-green-500/50'
                                                : 'bg-slate-800/30 border-slate-700 hover:border-slate-500'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${selectedScaleIds.includes(scale.id)
                                                    ? 'border-green-400 bg-green-400'
                                                    : 'border-slate-500'
                                                }`}>
                                                {selectedScaleIds.includes(scale.id) && (
                                                    <svg className="w-3 h-3 text-slate-900" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-white" dir={scale.language === 'ar' ? 'rtl' : 'ltr'}>
                                                    {scale.title}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {scale.dimensions.length} {t('dimensions', 'أبعاد')} •
                                                    {scale.dimensions.reduce((sum, d) => sum + d.statements.length, 0)} {t('statements', 'عبارات')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </FuturisticPanel>

                    {/* Save Button */}
                    <div className="flex justify-end gap-4">
                        <Link href="/surveys" className="futuristic-btn">
                            {t('Cancel', 'إلغاء')}
                        </Link>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="futuristic-btn-primary"
                        >
                            {isSaving ? t('Saving...', 'جاري الحفظ...') : t('Save Survey', 'حفظ الاستبيان')}
                        </button>
                    </div>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
