'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Survey, Scale, SurveyResponse, Statement, ScaleOption } from '@/lib/types';
import { getPublishedSurveyById, getScaleById, saveResponse, generateId } from '@/lib/storage';

type Step = 'intro' | 'demographics' | 'scales' | 'complete';

interface FlattenedStatement {
    id: string;
    text: string;
    isReversed: boolean;
    dimensionId: string;
    scaleId: string;
    options: ScaleOption[];
}

export default function RespondPage() {
    const params = useParams();
    const surveyId = params.surveyId as string;

    const [survey, setSurvey] = useState<Survey | null>(null);
    const [allStatements, setAllStatements] = useState<FlattenedStatement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [step, setStep] = useState<Step>('intro');
    const [currentStatementIndex, setCurrentStatementIndex] = useState(0);
    const [demographicAnswers, setDemographicAnswers] = useState<Record<string, any>>({});
    const [scaleAnswers, setScaleAnswers] = useState<Record<string, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Language from survey (single language)
    const language = survey?.language || 'ar';
    const direction = language === 'ar' ? 'rtl' : 'ltr';

    useEffect(() => {
        loadSurvey();
    }, [surveyId]);

    function t(en: string, ar: string) {
        return language === 'ar' ? ar : en;
    }

    async function loadSurvey() {
        try {
            const surveyData = await getPublishedSurveyById(surveyId);
            if (!surveyData) {
                setError(language === 'ar'
                    ? 'الاستبيان غير موجود أو غير منشور'
                    : 'Survey not found or not published');
                setIsLoading(false);
                return;
            }

            setSurvey(surveyData);

            let surveyScales: Scale[] = [];

            // Use snapshots if available, otherwise fetch scales
            if (surveyData.scaleSnapshots) {
                surveyScales = surveyData.scaleSnapshots;
            } else {
                const fetched = await Promise.all(
                    surveyData.scaleIds.map(id => getScaleById(id, 'apiKey'))
                );
                surveyScales = fetched.filter((s): s is Scale => s !== null);
            }

            // Flatten all statements from all scales
            const flattened: FlattenedStatement[] = [];
            surveyScales.forEach(scale => {
                (scale.statements || []).forEach(st => {
                    flattened.push({
                        ...st,
                        scaleId: scale.id,
                        options: scale.options || []
                    });
                });
            });

            setAllStatements(flattened);

        } catch (err) {
            console.error('Error loading survey:', err);
            setError('Error loading survey');
        } finally {
            setIsLoading(false);
        }
    }

    function updateDemographic(fieldId: string, value: any) {
        setDemographicAnswers({ ...demographicAnswers, [fieldId]: value });
    }

    function updateScaleAnswer(statementId: string, value: number) {
        const newAnswers = { ...scaleAnswers, [statementId]: value };
        setScaleAnswers(newAnswers);

        // Auto-advance after selection to improve UX for one-by-one mode
        // Small delay to let the user see their selection
        setTimeout(() => {
            // Need to handle state carefully in timeout
            // If we are at the end, submit. Otherwise advance.
            if (currentStatementIndex < allStatements.length - 1) {
                setCurrentStatementIndex(prev => prev + 1);
            } else {
                // For the last question, we don't auto-submit to avoid accidental submissions
                // But we could if desired. Usually users prefer checking the last one.
            }
        }, 300);
    }

    function nextStep() {
        if (step === 'intro') {
            if (survey?.demographics.length) {
                setStep('demographics');
            } else if (allStatements.length > 0) {
                setStep('scales');
            } else {
                submitResponse();
            }
        } else if (step === 'demographics') {
            // Validate required fields
            const missing = survey?.demographics.filter(d => d.required && !demographicAnswers[d.id]);
            if (missing && missing.length > 0) {
                alert(t('Please fill in all required fields', 'يرجى ملء جميع الحقول المطلوبة'));
                return;
            }
            if (allStatements.length > 0) {
                setStep('scales');
            } else {
                submitResponse();
            }
        } else if (step === 'scales') {
            const currentST = allStatements[currentStatementIndex];
            if (!currentST) return;

            if (scaleAnswers[currentST.id] === undefined) {
                alert(t('Please answer the current question', 'يرجى الإجابة على السؤال الحالي'));
                return;
            }

            if (currentStatementIndex < allStatements.length - 1) {
                setCurrentStatementIndex(currentStatementIndex + 1);
            } else {
                submitResponse();
            }
        }
    }

    function prevStep() {
        if (step === 'demographics') {
            setStep('intro');
        } else if (step === 'scales') {
            if (currentStatementIndex > 0) {
                setCurrentStatementIndex(currentStatementIndex - 1);
            } else if (survey?.demographics.length) {
                setStep('demographics');
            } else {
                setStep('intro');
            }
        }
    }

    async function submitResponse() {
        setIsSubmitting(true);
        try {
            if (!survey) return;

            const response: SurveyResponse = {
                id: generateId(),
                surveyId,
                submittedAt: new Date().toISOString(),
                demographics: demographicAnswers,
                answers: scaleAnswers
            };

            await saveResponse(response);
            setStep('complete');
        } catch (error) {
            console.error('Error submitting response:', error);
            alert(t('Error submitting response', 'خطأ في إرسال الاستجابة'));
        } finally {
            setIsSubmitting(false);
        }
    }

    function calculateProgress(): number {
        if (!survey) return 0;

        const totalSteps = (survey.demographics.length > 0 ? 1 : 0) + allStatements.length;
        if (totalSteps === 0) return 0;

        let completedSteps = 0;

        if (step === 'demographics') completedSteps = 0;
        else if (step === 'scales') completedSteps = (survey.demographics.length > 0 ? 1 : 0) + currentStatementIndex;
        else if (step === 'complete') completedSteps = totalSteps;

        return Math.round((completedSteps / totalSteps) * 100);
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">جاري التحميل... / Loading...</p>
                </div>
            </div>
        );
    }

    if (error || !survey) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800" dir={direction}>
                <div className="text-center max-w-md px-4">
                    <svg className="w-20 h-20 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h1 className="text-xl font-bold text-white mb-2">
                        {language === 'ar' ? 'الاستبيان غير متاح' : 'Survey Not Available'}
                    </h1>
                    <p className="text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

    const currentST = allStatements[currentStatementIndex];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800" dir={direction}>
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-700">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/images/estebian.png" alt="Estebian" className="w-8 h-8" />
                        <span className="text-sm font-medium text-white truncate max-w-[200px]">
                            {survey.title}
                        </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${language === 'ar' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
                        }`}>
                        {language === 'ar' ? 'عربي' : 'EN'}
                    </span>
                </div>
                {/* Progress Bar */}
                <div className="h-1 bg-slate-800">
                    <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${calculateProgress()}%` }}
                    />
                </div>
            </header>

            {/* Content */}
            <main className="pt-20 pb-24 px-4 overflow-x-hidden">
                <div className="max-w-3xl mx-auto">
                    {/* Intro Step */}
                    {step === 'intro' && (
                        <div className="animate-fade-in">
                            <div className="text-center py-12">
                                <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
                                    {survey.title}
                                </h1>
                                {survey.introduction && (
                                    <p className="text-slate-300 whitespace-pre-wrap max-w-xl mx-auto">
                                        {survey.introduction}
                                    </p>
                                )}
                            </div>
                            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-8">
                                <div className="flex items-start gap-3">
                                    <svg className="w-6 h-6 text-cyan-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    <div>
                                        <h4 className="font-medium text-cyan-400 mb-1">
                                            {t('Privacy Notice', 'إشعار الخصوصية')}
                                        </h4>
                                        <p className="text-sm text-cyan-200/70">
                                            {t('Your responses are completely anonymous. No personal identifying information is collected.',
                                                'إجاباتك سرية تماماً. لا يتم جمع أي معلومات تعريف شخصية.')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={nextStep}
                                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-lg hover:from-cyan-400 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/20"
                            >
                                {t('Start Survey', 'ابدأ الاستبيان')}
                            </button>
                        </div>
                    )}

                    {/* Demographics Step */}
                    {step === 'demographics' && (
                        <div className="animate-fade-in">
                            <h2 className="text-xl font-bold text-white mb-6">
                                {t('About You', 'معلومات عنك')}
                            </h2>
                            <div className="space-y-6">
                                {survey.demographics.map(field => (
                                    <div key={field.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
                                        <label className="block mb-2">
                                            <span className="text-white font-medium">
                                                {field.label}
                                            </span>
                                            {field.required && <span className="text-red-400 mx-1">*</span>}
                                        </label>
                                        {field.type === 'text' && (
                                            <input
                                                type="text"
                                                value={demographicAnswers[field.id] || ''}
                                                onChange={(e) => updateDemographic(field.id, e.target.value)}
                                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
                                            />
                                        )}
                                        {field.type === 'number' && (
                                            <input
                                                type="number"
                                                value={demographicAnswers[field.id] || ''}
                                                onChange={(e) => updateDemographic(field.id, e.target.value)}
                                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
                                            />
                                        )}
                                        {field.type === 'date' && (
                                            <input
                                                type="date"
                                                value={demographicAnswers[field.id] || ''}
                                                onChange={(e) => updateDemographic(field.id, e.target.value)}
                                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
                                            />
                                        )}
                                        {field.type === 'select' && field.options && (
                                            <select
                                                value={demographicAnswers[field.id] || ''}
                                                onChange={(e) => updateDemographic(field.id, e.target.value)}
                                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none transition-colors"
                                            >
                                                <option value="">{t('Select...', 'اختر...')}</option>
                                                {field.options.filter(opt => opt.trim()).map((opt, i) => (
                                                    <option key={i} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Scales Step - ONE BY ONE */}
                    {step === 'scales' && currentST && (
                        <div key={currentST.id} className="animate-fade-in py-8">
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-cyan-400 font-bold tracking-wider">
                                    {t('Item', 'الفقرة')} {currentStatementIndex + 1} / {allStatements.length}
                                </span>
                            </div>

                            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700/30 shadow-xl">
                                <p className="text-white text-xl md:text-2xl font-medium leading-relaxed mb-12 text-center">
                                    {currentST.text}
                                </p>

                                <div className="space-y-4 max-w-md mx-auto">
                                    {currentST.options.map(option => {
                                        // Score calculation
                                        const scoreValue = currentST.isReversed
                                            ? (currentST.options.length + 1 - option.value)
                                            : option.value;

                                        const isSelected = scaleAnswers[currentST.id] === scoreValue;

                                        return (
                                            <button
                                                key={option.id}
                                                onClick={() => updateScaleAnswer(currentST.id, scoreValue)}
                                                className={`w-full px-6 py-4 rounded-xl text-lg font-bold transition-all duration-200 border-2 ${isSelected
                                                    ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/20'
                                                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
                                                    }`}
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Complete Step */}
                    {step === 'complete' && (
                        <div className="animate-fade-in text-center py-12">
                            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                                <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-4">
                                {t('Thank You!', 'شكراً لك!')}
                            </h1>
                            <p className="text-slate-300 text-lg mb-8">
                                {t('Your response has been submitted successfully.',
                                    'تم إرسال استجابتك بنجاح.')}
                            </p>
                            <p className="text-sm text-slate-500 italic">
                                {t('You may close this window safely.',
                                    'يمكنك إغلاق هذه النافذة بأمان.')}
                            </p>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer Navigation */}
            {step !== 'intro' && step !== 'complete' && (
                <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur border-t border-slate-700 py-4">
                    <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
                        <button
                            onClick={prevStep}
                            className="px-6 py-3 text-slate-400 hover:text-white transition-colors font-medium flex items-center gap-2"
                        >
                            <svg className={`w-5 h-5 ${direction === 'rtl' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            {t('Back', 'رجوع')}
                        </button>

                        {/* Only show Next for demographics step, as scales step has auto-advance */}
                        {step === 'demographics' && (
                            <button
                                onClick={nextStep}
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-500/10"
                            >
                                {t('Next', 'التالي')}
                            </button>
                        )}

                        {/* For scales step, if user wants to change answer without selecting (manual advance) */}
                        {step === 'scales' && (
                            <button
                                onClick={nextStep}
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-all border border-slate-700"
                            >
                                {currentStatementIndex === allStatements.length - 1
                                    ? (isSubmitting ? t('Submitting...', 'جاري الإرسال...') : t('Submit', 'إرسال'))
                                    : t('Next', 'التالي')
                                }
                            </button>
                        )}
                    </div>
                </footer>
            )}

            <style jsx global>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.98) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>
        </div>
    );
}
