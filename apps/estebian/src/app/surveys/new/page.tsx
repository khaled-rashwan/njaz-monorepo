'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { Survey, Scale, DemographicField } from '@/lib/types';
import { saveSurvey, getScales, generateId } from '@/lib/storage';
import { getDashboardUrl, getCurrentUrl } from '@njaz/shared-auth';
import { ProgressSteps, ScaleCard, ScaleSelectorModal } from '@/components/SurveyBuilder';

export default function NewSurveyPage() {
    const { t, language: uiLanguage, direction } = useLanguage();
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [availableScales, setAvailableScales] = useState<Scale[]>([]);

    // Current step in the wizard
    const [currentStep, setCurrentStep] = useState(1);

    // Scale selector modal
    const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);

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

            // Restore draft if exists (after coming back from creating a scale)
            const draft = localStorage.getItem('surveyDraft');
            if (draft) {
                try {
                    const parsed = JSON.parse(draft);
                    if (parsed.surveyLanguage) setSurveyLanguage(parsed.surveyLanguage);
                    if (parsed.title) setTitle(parsed.title);
                    if (parsed.introduction) setIntroduction(parsed.introduction);
                    if (parsed.demographics) setDemographics(parsed.demographics);
                    if (parsed.selectedScaleIds) setSelectedScaleIds(parsed.selectedScaleIds);
                    if (parsed.currentStep) setCurrentStep(parsed.currentStep);
                    // Clear draft after restoring
                    localStorage.removeItem('surveyDraft');
                } catch { }
            }
        } catch {
            setUserId(null);
        } finally {
            setIsLoading(false);
        }
    }

    // Save draft to localStorage before navigating away
    function saveDraft() {
        const draft = {
            surveyLanguage,
            title,
            introduction,
            demographics,
            selectedScaleIds,
            currentStep,
        };
        localStorage.setItem('surveyDraft', JSON.stringify(draft));
    }

    // Get selected scales objects
    const selectedScales = availableScales.filter(s => selectedScaleIds.includes(s.id));

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

    function removeScale(scaleId: string) {
        setSelectedScaleIds(selectedScaleIds.filter(id => id !== scaleId));
    }

    // Clear selected scales when language changes
    useEffect(() => {
        setSelectedScaleIds([]);
    }, [surveyLanguage]);

    // Navigation
    function nextStep() {
        if (currentStep < 5) setCurrentStep(currentStep + 1);
    }

    function prevStep() {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    }

    function canProceed(): boolean {
        switch (currentStep) {
            case 1: return true; // Language always valid
            case 2: return title.trim().length > 0;
            case 3: return true; // Demographics optional
            case 4: return selectedScaleIds.length > 0;
            case 5: return true;
            default: return false;
        }
    }

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

    // Not authenticated
    if (!userId) {
        return (
            <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
                <SharedHeader currentApp="estebian" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />
                <main className="flex-1 pt-24 pb-8 px-4 flex items-center justify-center">
                    <FuturisticPanel glowColor="cyan" size="lg">
                        <div className="text-center py-12 px-6">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-cyan-500/10 flex items-center justify-center">
                                <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3">{t('Authentication Required', 'المصادقة مطلوبة')}</h2>
                            <p className="text-slate-400 mb-6">{t('Please sign in to create surveys.', 'يرجى تسجيل الدخول لإنشاء استبيانات.')}</p>
                            <a href={getDashboardUrl(getCurrentUrl())} className="futuristic-btn-primary inline-flex items-center gap-2">
                                {t('Sign In', 'تسجيل الدخول')}
                            </a>
                        </div>
                    </FuturisticPanel>
                </main>
                <SharedFooter direction={direction} t={t} />
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
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <Link href="/surveys" className="text-sm text-cyan-400 hover:text-cyan-300 mb-2 inline-block">
                                ← {t('Back to Surveys', 'العودة للاستبيانات')}
                            </Link>
                            <h1 className="text-3xl font-bold text-white">
                                {t('Create New Survey', 'إنشاء استبيان جديد')}
                            </h1>
                        </div>
                    </div>

                    {/* Progress Steps */}
                    <ProgressSteps
                        currentStep={currentStep}
                        onStepClick={setCurrentStep}
                        language={uiLanguage}
                    />

                    {/* Step Content */}
                    <div className="min-h-[400px]">
                        {/* Step 1: Language Selection */}
                        {currentStep === 1 && (
                            <div className="animate-fade-in">
                                <FuturisticPanel glowColor="purple" size="lg">
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                                            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                            </svg>
                                        </div>
                                        <h2 className="text-2xl font-bold text-white mb-2">
                                            {t('Choose Survey Language', 'اختر لغة الاستبيان')}
                                        </h2>
                                        <p className="text-slate-400 mb-8 max-w-md mx-auto">
                                            {t(
                                                'This determines the language of your survey content and which scales you can use.',
                                                'هذا يحدد لغة محتوى استبيانك والمقاييس التي يمكنك استخدامها.'
                                            )}
                                        </p>
                                        <div className="flex gap-6 justify-center">
                                            <button
                                                onClick={() => setSurveyLanguage('ar')}
                                                className={`w-40 py-6 px-4 rounded-2xl border-2 transition-all duration-300 ${surveyLanguage === 'ar'
                                                    ? 'bg-gradient-to-br from-purple-500/30 to-purple-600/20 border-purple-500 shadow-lg shadow-purple-500/20 scale-105'
                                                    : 'border-slate-600 hover:border-purple-500/50'
                                                    }`}
                                            >
                                                <span className="text-3xl font-bold text-white block mb-2">العربية</span>
                                                <span className="text-sm text-slate-400">Arabic</span>
                                            </button>
                                            <button
                                                onClick={() => setSurveyLanguage('en')}
                                                className={`w-40 py-6 px-4 rounded-2xl border-2 transition-all duration-300 ${surveyLanguage === 'en'
                                                    ? 'bg-gradient-to-br from-purple-500/30 to-purple-600/20 border-purple-500 shadow-lg shadow-purple-500/20 scale-105'
                                                    : 'border-slate-600 hover:border-purple-500/50'
                                                    }`}
                                            >
                                                <span className="text-3xl font-bold text-white block mb-2">English</span>
                                                <span className="text-sm text-slate-400">الإنجليزية</span>
                                            </button>
                                        </div>
                                    </div>
                                </FuturisticPanel>
                            </div>
                        )}

                        {/* Step 2: Survey Info */}
                        {currentStep === 2 && (
                            <div className="animate-fade-in">
                                <FuturisticPanel glowColor="cyan" size="lg">
                                    <div className="py-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                                                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">{t('Survey Information', 'معلومات الاستبيان')}</h2>
                                                <p className="text-sm text-slate-400">{t('Enter the basic details of your survey', 'أدخل التفاصيل الأساسية لاستبيانك')}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-sm text-slate-400 mb-2">
                                                    {t('Survey Title', 'عنوان الاستبيان')} *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value)}
                                                    className="futuristic-input text-lg"
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
                                                    className="futuristic-input min-h-[150px]"
                                                    placeholder={surveyLanguage === 'ar'
                                                        ? 'مرحباً بك في هذا الاستبيان. إجاباتك سرية ولن تستخدم إلا لأغراض البحث العلمي...'
                                                        : 'Welcome to this survey. Your responses are anonymous and will only be used for research purposes...'}
                                                    dir={isRtl ? 'rtl' : 'ltr'}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </FuturisticPanel>
                            </div>
                        )}

                        {/* Step 3: Demographics */}
                        {currentStep === 3 && (
                            <div className="animate-fade-in">
                                <FuturisticPanel glowColor="gold" size="lg">
                                    <div className="py-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                                    <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-white">{t('Demographic Questions', 'الأسئلة الديموغرافية')}</h2>
                                                    <p className="text-sm text-slate-400">{t('Collect participant information (optional)', 'اجمع معلومات المشاركين (اختياري)')}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Add Demographic Buttons */}
                                        <div className="flex gap-2 flex-wrap mb-6">
                                            <button onClick={() => addDemographic('text')} className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors text-sm">
                                                + {t('Text', 'نص')}
                                            </button>
                                            <button onClick={() => addDemographic('number')} className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors text-sm">
                                                + {t('Number', 'رقم')}
                                            </button>
                                            <button onClick={() => addDemographic('date')} className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors text-sm">
                                                + {t('Date', 'تاريخ')}
                                            </button>
                                            <button onClick={() => addDemographic('select')} className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors text-sm">
                                                + {t('Select', 'قائمة')}
                                            </button>
                                        </div>

                                        {demographics.length === 0 ? (
                                            <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl">
                                                <svg className="w-12 h-12 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                <p className="text-slate-500">{t('No demographic questions added yet', 'لم تتم إضافة أسئلة ديموغرافية بعد')}</p>
                                                <p className="text-sm text-slate-600 mt-1">{t('Click the buttons above to add questions', 'انقر على الأزرار أعلاه لإضافة أسئلة')}</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {demographics.map((field, index) => (
                                                    <div key={field.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
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
                                                            <button onClick={() => removeDemographic(field.id)} className="text-red-400 hover:text-red-300">
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                                            <div className="space-y-2 mb-3 ml-4">
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
                                                                            <button onClick={() => removeSelectOption(field.id, i)} className="text-red-400 hover:text-red-300 p-1">
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                                </svg>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                                <button onClick={() => addSelectOption(field.id)} className="text-xs text-cyan-400 hover:text-cyan-300">
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
                                                            <span className="text-sm text-slate-400">{t('Required', 'مطلوب')}</span>
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </FuturisticPanel>
                            </div>
                        )}

                        {/* Step 4: Scales - Visual Canvas */}
                        {currentStep === 4 && (
                            <div className="animate-fade-in">
                                {/* Survey Box with Scales */}
                                <div className="relative">
                                    {/* Main Survey Container */}
                                    <FuturisticPanel glowColor="cyan" size="lg">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                                                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">{title || t('Your Survey', 'استبيانك')}</h2>
                                                <p className="text-sm text-slate-400">{t('Add scales to your survey', 'أضف مقاييس إلى استبيانك')}</p>
                                            </div>
                                        </div>

                                        {/* Survey Info Summary */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 rounded-xl bg-slate-800/50">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-cyan-400">{surveyLanguage === 'ar' ? 'ع' : 'EN'}</p>
                                                <p className="text-xs text-slate-500">{t('Language', 'اللغة')}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-purple-400">{selectedScaleIds.length}</p>
                                                <p className="text-xs text-slate-500">{t('Scales', 'مقاييس')}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-amber-400">{demographics.length}</p>
                                                <p className="text-xs text-slate-500">{t('Demographics', 'ديموغرافية')}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-emerald-400">
                                                    {selectedScales.reduce((sum, s) => sum + s.dimensions.reduce((dSum, d) => dSum + d.statements.length, 0), 0)}
                                                </p>
                                                <p className="text-xs text-slate-500">{t('Questions', 'أسئلة')}</p>
                                            </div>
                                        </div>
                                    </FuturisticPanel>

                                    {/* Connection Line from Survey to Scales Area */}
                                    <div className="flex justify-center my-4">
                                        <div className="w-0.5 h-8 bg-gradient-to-b from-cyan-500 to-purple-500" />
                                    </div>

                                    {/* Add Scale Button */}
                                    <div className="flex justify-center mb-6">
                                        <button
                                            onClick={() => setIsScaleModalOpen(true)}
                                            className="group relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 
                                                       border-2 border-dashed border-emerald-500/50 hover:border-emerald-500
                                                       flex items-center justify-center transition-all duration-300
                                                       hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/20"
                                        >
                                            <svg className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            <span className="absolute -bottom-8 text-sm text-emerald-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                                {t('Add Scale', 'إضافة مقياس')}
                                            </span>
                                        </button>
                                    </div>

                                    {/* Connected Scales */}
                                    {selectedScales.length > 0 && (
                                        <div className="mt-8">
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                                {selectedScales.map((scale, index) => (
                                                    <ScaleCard
                                                        key={scale.id}
                                                        scale={scale}
                                                        onRemove={() => removeScale(scale.id)}
                                                        language={uiLanguage}
                                                        index={index}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Empty State */}
                                    {selectedScales.length === 0 && (
                                        <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl mt-4">
                                            <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            <p className="text-slate-500 mb-2">{t('No scales added yet', 'لم تتم إضافة مقاييس بعد')}</p>
                                            <p className="text-sm text-slate-600">{t('Click the + button above to add scales', 'انقر على زر + أعلاه لإضافة مقاييس')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 5: Review */}
                        {currentStep === 5 && (
                            <div className="animate-fade-in space-y-6">
                                <FuturisticPanel glowColor="pink" size="lg">
                                    <div className="py-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                                                <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">{t('Review Your Survey', 'مراجعة استبيانك')}</h2>
                                                <p className="text-sm text-slate-400">{t('Check everything before saving', 'تحقق من كل شيء قبل الحفظ')}</p>
                                            </div>
                                        </div>

                                        {/* Summary */}
                                        <div className="space-y-4">
                                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                                <p className="text-sm text-slate-500 mb-1">{t('Title', 'العنوان')}</p>
                                                <p className="text-lg text-white font-medium" dir={isRtl ? 'rtl' : 'ltr'}>{title || '-'}</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                                <p className="text-sm text-slate-500 mb-1">{t('Language', 'اللغة')}</p>
                                                <p className="text-lg text-white font-medium">{surveyLanguage === 'ar' ? 'العربية' : 'English'}</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                                <p className="text-sm text-slate-500 mb-1">{t('Scales', 'المقاييس')}</p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {selectedScales.map(s => (
                                                        <span key={s.id} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm" dir={s.language === 'ar' ? 'rtl' : 'ltr'}>
                                                            {s.title}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                                <p className="text-sm text-slate-500 mb-1">{t('Demographics', 'الديموغرافية')}</p>
                                                <p className="text-lg text-white font-medium">{demographics.length} {t('questions', 'أسئلة')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </FuturisticPanel>
                            </div>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between mt-8">
                        <button
                            onClick={prevStep}
                            disabled={currentStep === 1}
                            className={`px-6 py-3 rounded-xl flex items-center gap-2 transition-all ${currentStep === 1
                                ? 'opacity-50 cursor-not-allowed text-slate-500'
                                : 'futuristic-btn'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            {t('Previous', 'السابق')}
                        </button>

                        {currentStep < 5 ? (
                            <button
                                onClick={nextStep}
                                disabled={!canProceed()}
                                className={`px-6 py-3 rounded-xl flex items-center gap-2 transition-all ${canProceed()
                                    ? 'futuristic-btn-primary'
                                    : 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-500'
                                    }`}
                            >
                                {t('Next', 'التالي')}
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !canProceed()}
                                className="futuristic-btn-primary px-8 py-3 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {isSaving ? t('Saving...', 'جاري الحفظ...') : t('Create Survey', 'إنشاء الاستبيان')}
                            </button>
                        )}
                    </div>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />

            {/* Scale Selector Modal */}
            <ScaleSelectorModal
                isOpen={isScaleModalOpen}
                onClose={() => setIsScaleModalOpen(false)}
                availableScales={availableScales}
                selectedScaleIds={selectedScaleIds}
                onSelectScale={toggleScale}
                language={uiLanguage}
                surveyLanguage={surveyLanguage}
                t={t}
                onSaveDraft={saveDraft}
            />
        </div>
    );
}
