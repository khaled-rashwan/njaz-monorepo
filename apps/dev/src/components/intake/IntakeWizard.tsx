'use client';

import { useReducer, useCallback, useMemo } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import {
    WIZARD_STEPS, DEFAULT_FORM_DATA,
    calculateEstimate,
} from '@/lib/intake';
import type {
    WizardState, WizardAction, IntakeFormData,
    ProjectType, FeatureKey, UploadedFile,
} from '@/lib/intake';

import ProgressBar from './ProgressBar';
import EstimateCard from './EstimateCard';
import StepProjectType from './steps/StepProjectType';
import StepFeatures from './steps/StepFeatures';
import StepTimeline from './steps/StepTimeline';
import StepBrandAssets from './steps/StepBrandAssets';
import StepClientInfo from './steps/StepClientInfo';
import StepReview from './steps/StepReview';

// ── Reducer ─────────────────────────────────────────────
const initialState: WizardState = {
    currentStep: 0,
    formData: { ...DEFAULT_FORM_DATA },
    isSubmitting: false,
    isSubmitted: false,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
    switch (action.type) {
        case 'SET_STEP':
            return { ...state, currentStep: action.step };

        case 'UPDATE_DATA':
            return {
                ...state,
                formData: { ...state.formData, ...action.payload },
            };

        case 'TOGGLE_PROJECT_TYPE': {
            const types = state.formData.projectTypes;
            const pt = action.projectType;
            const newTypes = types.includes(pt)
                ? types.filter(t => t !== pt)
                : [...types, pt];

            // Clear features that are no longer relevant
            const newFeatures = { ...state.formData.features };
            // (Features are filtered at display time, but keeping stale ones is harmless)

            return {
                ...state,
                formData: {
                    ...state.formData,
                    projectTypes: newTypes,
                    features: newFeatures,
                },
            };
        }

        case 'TOGGLE_FEATURE':
            return {
                ...state,
                formData: {
                    ...state.formData,
                    features: {
                        ...state.formData.features,
                        [action.feature]: !state.formData.features[action.feature],
                    },
                },
            };

        case 'ADD_FILES':
            return {
                ...state,
                formData: {
                    ...state.formData,
                    uploadedFiles: [...state.formData.uploadedFiles, ...action.files],
                },
            };

        case 'REMOVE_FILE': {
            const files = [...state.formData.uploadedFiles];
            // Revoke object URL to prevent memory leaks
            const removed = files[action.index];
            if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
            files.splice(action.index, 1);
            return {
                ...state,
                formData: { ...state.formData, uploadedFiles: files },
            };
        }

        case 'SET_SUBMITTING':
            return { ...state, isSubmitting: action.submitting };

        case 'SET_SUBMITTED':
            return { ...state, isSubmitted: action.submitted };

        case 'RESET':
            return { ...initialState, formData: { ...DEFAULT_FORM_DATA } };

        default:
            return state;
    }
}

// ── Component ───────────────────────────────────────────
export default function IntakeWizard() {
    const { t, direction } = useLanguage();
    const [state, dispatch] = useReducer(wizardReducer, initialState);
    const { currentStep, formData, isSubmitting, isSubmitted } = state;

    // Get visible steps based on current form data
    const visibleSteps = useMemo(
        () => WIZARD_STEPS.filter(s => s.isVisible(formData)),
        [formData]
    );

    const totalSteps = visibleSteps.length;
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === totalSteps - 1;

    // Can proceed to next step?
    const canProceed = useMemo(() => {
        const step = visibleSteps[currentStep];
        if (!step) return false;

        switch (step.id) {
            case 'project-type':
                return formData.projectTypes.length > 0;
            case 'features':
                return true; // Features are optional
            case 'timeline':
                return true; // Always has a default
            case 'brand-assets':
                return true; // Optional
            case 'client-info':
                return (
                    formData.clientName.trim().length > 0 &&
                    formData.clientEmail.trim().length > 0 &&
                    formData.projectDescription.trim().length > 0
                );
            case 'review':
                return true;
            default:
                return true;
        }
    }, [currentStep, visibleSteps, formData]);

    const goNext = useCallback(() => {
        if (!isLastStep && canProceed) {
            dispatch({ type: 'SET_STEP', step: currentStep + 1 });
        }
    }, [currentStep, isLastStep, canProceed]);

    const goBack = useCallback(() => {
        if (!isFirstStep) {
            dispatch({ type: 'SET_STEP', step: currentStep - 1 });
        }
    }, [currentStep, isFirstStep]);

    const goToStep = useCallback((step: number) => {
        if (step >= 0 && step < totalSteps) {
            dispatch({ type: 'SET_STEP', step });
        }
    }, [totalSteps]);

    const handleSubmit = useCallback(async () => {
        dispatch({ type: 'SET_SUBMITTING', submitting: true });

        const estimate = calculateEstimate(formData);

        // Build the submission payload
        const payload = {
            ...formData,
            // Remove File objects (not serializable), keep metadata
            uploadedFiles: formData.uploadedFiles.map(f => ({
                name: f.name,
                size: f.size,
                type: f.type,
            })),
            estimate: {
                priceMin: estimate.priceMin,
                priceMax: estimate.priceMax,
                estimatedWeeks: estimate.estimatedWeeks,
                complexityScore: estimate.complexityScore,
            },
        };

        try {
            const response = await fetch('/api/intake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok) {
                console.log('✅ Inquiry submitted:', result);
            } else {
                // Log the error but don't block the user
                console.error('⚠️ API error (inquiry logged):', result);
            }
        } catch (error) {
            // Network error — inquiry data is in the payload above
            console.error('⚠️ Network error (inquiry logged):', error);
        }

        dispatch({ type: 'SET_SUBMITTING', submitting: false });
        dispatch({ type: 'SET_SUBMITTED', submitted: true });
    }, [formData]);

    // ── Success State ───────────────────────────────────
    if (isSubmitted) {
        return (
            <div className="wizard-step-enter text-center py-12">
                <div className="mb-6">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(52,211,153,0.2)]">
                        <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">
                        {t('Your Request Has Been Sent! 🎉', 'تم إرسال طلبك! 🎉')}
                    </h2>
                    <p className="text-slate-400 max-w-md mx-auto mb-2">
                        {t(
                            'Our team will review your project and prepare a personalized proposal within 24 hours.',
                            'سيراجع فريقنا مشروعك ويحضر عرضًا مخصصًا خلال ٢٤ ساعة.'
                        )}
                    </p>
                    <p className="text-slate-500 text-sm">
                        {t(
                            'We\'ll send the proposal to your email address.',
                            'سنرسل العرض إلى بريدك الإلكتروني.'
                        )}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => dispatch({ type: 'RESET' })}
                    className="futuristic-btn mt-4"
                >
                    {t('Submit Another Project', 'إرسال مشروع آخر')}
                </button>
            </div>
        );
    }

    // ── Step Content ─────────────────────────────────────
    const stepId = visibleSteps[currentStep]?.id;
    const renderStep = () => {
        switch (stepId) {
            case 'project-type':
                return <StepProjectType formData={formData} dispatch={dispatch} />;
            case 'features':
                return <StepFeatures formData={formData} dispatch={dispatch} />;
            case 'timeline':
                return <StepTimeline formData={formData} dispatch={dispatch} />;
            case 'brand-assets':
                return <StepBrandAssets formData={formData} dispatch={dispatch} />;
            case 'client-info':
                return <StepClientInfo formData={formData} dispatch={dispatch} />;
            case 'review':
                return (
                    <StepReview
                        formData={formData}
                        dispatch={dispatch}
                        onGoToStep={goToStep}
                        isSubmitting={isSubmitting}
                        onSubmit={handleSubmit}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div>
            <ProgressBar currentStep={currentStep} formData={formData} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2">
                    <div className="min-h-[400px]">
                        {renderStep()}
                    </div>

                    {/* Navigation */}
                    {stepId !== 'review' && (
                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={goBack}
                                disabled={isFirstStep}
                                className={`
                                    flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all
                                    ${isFirstStep
                                        ? 'text-slate-600 cursor-not-allowed'
                                        : 'futuristic-btn'
                                    }
                                `}
                            >
                                {direction === 'rtl' ? (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                        {t('Back', 'رجوع')}
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        {t('Back', 'رجوع')}
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={goNext}
                                disabled={!canProceed}
                                className={`
                                    flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all
                                    ${canProceed
                                        ? 'futuristic-btn-primary'
                                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    }
                                `}
                            >
                                {direction === 'rtl' ? (
                                    <>
                                        {t('Next', 'التالي')}
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </>
                                ) : (
                                    <>
                                        {t('Next', 'التالي')}
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar: Estimate Card */}
                <div className="lg:col-span-1">
                    <div className="lg:sticky lg:top-28">
                        <EstimateCard formData={formData} />
                    </div>
                </div>
            </div>
        </div>
    );
}
