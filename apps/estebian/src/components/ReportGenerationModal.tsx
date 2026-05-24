'use client';

import { useState, useEffect, useRef } from 'react';
import { FuturisticPanel } from '@njaz/ui-components';
import { useLanguage } from '@/components/LanguageContext';
import { Survey, ReportStatus } from '@/lib/types';
import { requestReport, getReportById } from '@/lib/storage';

interface ReportGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    survey: Survey;
    reportType: 'demographic' | 'scale' | 'comprehensive';
    existingReportId?: string | null;
    onSuccess: (reportId: string) => void;
}

type ModalStep = 'confirm' | 'requesting' | 'polling' | 'success';

interface EfaConfig {
    selectedScaleId: string;
    factorMethod: 'fixed' | 'eigenvalue';
    factorCount: number;
    eigenvalueThreshold: number;
    rotation: 'none' | 'varimax';
}

export default function ReportGenerationModal({
    isOpen,
    onClose,
    survey,
    reportType,
    existingReportId,
    onSuccess,
}: ReportGenerationModalProps) {
    const { t, direction } = useLanguage();
    const [step, setStep] = useState<ModalStep>('confirm');
    const [isError, setIsError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [currentStatus, setCurrentStatus] = useState<ReportStatus>('pending_payment');
    const [reportId, setReportId] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [efaConfig, setEfaConfig] = useState<EfaConfig>({
        selectedScaleId: '',
        factorMethod: 'fixed',
        factorCount: 3,
        eigenvalueThreshold: 1.0,
        rotation: 'varimax',
    });
    const [mediationConfig, setMediationConfig] = useState({
        independentScaleId: '',
        mediatorScaleId: '',
        dependentScaleId: '',
    });
    
    const pollingInterval = useRef<NodeJS.Timeout | null>(null);

    // Dynamic titles
    const reportTitles = {
        demographic: t('Demographic Report', 'تقرير ديموغرافي'),
        scale: t('Scale Analysis', 'تحليل المقاييس'),
        comprehensive: t('Comprehensive Report', 'تقرير شامل'),
    };

    // Auto-initialize defaults if scales available
    useEffect(() => {
        if (survey.scaleSnapshots && survey.scaleSnapshots.length > 0 && !efaConfig.selectedScaleId) {
            const firstScale = survey.scaleSnapshots[0];
            const defaultCount = firstScale.dimensions?.length || 3;
            setEfaConfig(c => ({
                ...c,
                selectedScaleId: firstScale.id || '',
                factorCount: defaultCount,
            }));
        }
        if (survey.scaleIds && survey.scaleIds.length >= 3 && !mediationConfig.independentScaleId) {
            setMediationConfig({
                independentScaleId: survey.scaleIds[0],
                mediatorScaleId: survey.scaleIds[1],
                dependentScaleId: survey.scaleIds[2],
            });
        }
    }, [survey]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollingInterval.current) clearInterval(pollingInterval.current);
        };
    }, []);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        try {
            setStep('requesting');
            setIsError(false);
            
            // 1. Call backend to initiate
            const result = await requestReport(
                survey.id, 
                reportType, 
                existingReportId || undefined,
                { efaConfig, mediationConfig }
            );
            
            setReportId(result.reportId);
            setCurrentStatus(result.status as ReportStatus);
            
            if (result.paymentUrl) {
                window.open(result.paymentUrl, '_blank');
            }
            
            // 2. Start Polling
            setStep('polling');
            startPolling(result.reportId);

        } catch (error: any) {
            console.error('Failed to initiate report:', error);
            setIsError(true);
            setErrorMessage(error.message || 'Failed to start report generation.');
        }
    };

    const startPolling = (rid: string) => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        
        pollingInterval.current = setInterval(async () => {
            try {
                const report = await getReportById(rid);
                if (!report) return;
                
                setCurrentStatus(report.status);
                
                if (report.status === 'completed') {
                    if (pollingInterval.current) clearInterval(pollingInterval.current);
                    setStep('success');
                    setTimeout(() => {
                        onSuccess(rid);
                    }, 1500);
                } else if (report.status === 'payment_failed' || report.status === 'computation_failed') {
                    if (pollingInterval.current) clearInterval(pollingInterval.current);
                    setIsError(true);
                    setErrorMessage(report.errorMessage || t('An error occurred during processing.', 'حدث خطأ أثناء المعالجة.'));
                }
            } catch (err) {
                console.warn('Polling error:', err);
            }
        }, 3000); // Poll every 3 seconds
    };

    const getStatusMessage = () => {
        switch (currentStatus) {
            case 'pending_payment': return t('Awaiting Payment...', 'في انتظار الدفع...');
            case 'payment_processing': return t('Verifying Payment...', 'جاري التحقق من الدفع...');
            case 'payment_verified': return t('Payment Confirmed ✓', 'تم تأكيد الدفع ✓');
            case 'computing': return t('Analyzing Data...', 'جاري تحليل البيانات...');
            case 'generating_pdf': return t('Preparing Word Document...', 'جاري تجهيز مستند Word...');
            case 'completed': return t('Generation Complete!', 'اكتمل الإنشاء!');
            default: return t('Processing...', 'جاري المعالجة...');
        }
    };

    const showEfaOptions = reportType === 'scale' || reportType === 'comprehensive';
    const showMediationOptions = (reportType === 'scale' || reportType === 'comprehensive') && (survey.scaleIds?.length || 0) >= 3;

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-lg max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <FuturisticPanel glowColor={isError ? 'pink' : (step === 'success' ? 'green' : 'cyan')} size="lg">
                    <div className="p-6 text-center max-h-[85vh] overflow-y-auto custom-scrollbar" dir={direction}>
                        {!isError && step === 'confirm' && (
                            <>
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/10 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">
                                    {existingReportId ? t('Regenerate Report', 'إعادة إنشاء التقرير') : t('Generate Report', 'إنشاء تقرير')}
                                </h3>
                                <p className="text-slate-400 mb-4">
                                    {existingReportId 
                                        ? t('You are about to regenerate the', 'أنت على وشك إعادة إنشاء')
                                        : t('You are about to generate a', 'أنت على وشك إنشاء')} {' '}
                                    <span className="text-cyan-400 font-bold">{reportTitles[reportType]}</span> {' '}
                                    {t('for', 'لـ')} {' '}
                                    <span className="text-white italic">"{survey.title}"</span>.
                                </p>
                                
                                {/* Advanced Configuration */}
                                {(showEfaOptions || showMediationOptions) && (
                                    <div className="mb-5 text-start">
                                        <button
                                            type="button"
                                            onClick={() => setShowAdvanced(!showAdvanced)}
                                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                                                showAdvanced 
                                                    ? 'bg-slate-900/60 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.15)] text-cyan-400' 
                                                    : 'bg-slate-900/20 border-slate-800 hover:border-slate-750 text-slate-300 hover:text-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className={`p-1.5 rounded-md transition-colors ${showAdvanced ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-bold block">{t('Advanced Analysis Settings', 'إعدادات التحليل المتقدمة')}</span>
                                                    <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                                                        {t('Customize Factor Extraction & Mediation Paths', 'تخصيص استخلاص العوامل ومسارات الوساطة')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!showAdvanced && (
                                                    <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                                                        {t('Default', 'تلقائي')}
                                                    </span>
                                                )}
                                                <svg 
                                                    className={`w-4 h-4 transition-transform duration-250 ${
                                                        direction === 'rtl'
                                                            ? (showAdvanced ? 'rotate-90 text-cyan-400' : 'rotate-180 text-slate-500')
                                                            : (showAdvanced ? 'rotate-90 text-cyan-400' : 'rotate-0 text-slate-500')
                                                    }`} 
                                                    fill="none" 
                                                    stroke="currentColor" 
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </button>

                                        {showAdvanced && (
                                            <div className="mt-3 p-4 rounded-lg bg-slate-850/80 border border-slate-700/60 text-start space-y-6 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                {/* EFA Configuration */}
                                                {showEfaOptions && (
                                                    <div className="space-y-4">
                                                        <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{t('Factor Analysis (EFA/CFA)', 'التحليل العاملي')}</h4>
                                                        
                                                        {/* Selected Scale for EFA/CFA */}
                                                        <div>
                                                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                                                                {t('Target Scale for Analysis', 'المقياس المستهدف للتحليل')}
                                                            </label>
                                                            <select 
                                                                value={efaConfig.selectedScaleId}
                                                                onChange={(e) => {
                                                                    const scaleId = e.target.value;
                                                                    const selectedScale = survey.scaleSnapshots?.find(s => s.id === scaleId);
                                                                    const defaultCount = selectedScale?.dimensions?.length || 3;
                                                                    setEfaConfig(c => ({ 
                                                                        ...c, 
                                                                        selectedScaleId: scaleId,
                                                                        factorCount: defaultCount
                                                                    }));
                                                                }}
                                                                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-600 text-white text-sm focus:border-cyan-500 focus:outline-none"
                                                            >
                                                                {survey.scaleSnapshots?.map((s: any) => (
                                                                    <option key={s.id} value={s.id}>{s.title}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        
                                                        {/* Rotation Method */}
                                                        <div>
                                                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                                                                {t('Rotation Method', 'طريقة التدوير')}
                                                            </label>
                                                            <div className="flex gap-2">
                                                                {(['varimax', 'none'] as const).map(rot => (
                                                                    <button
                                                                        key={rot}
                                                                        onClick={() => setEfaConfig(c => ({ ...c, rotation: rot }))}
                                                                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                                                            efaConfig.rotation === rot
                                                                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                                                                : 'bg-slate-700/50 text-slate-400 border border-slate-600 hover:bg-slate-700'
                                                                        }`}
                                                                    >
                                                                        {rot === 'varimax' ? 'Varimax' : t('None', 'بدون')}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Factor Extraction Method */}
                                                        <div>
                                                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                                                                {t('Factor Extraction', 'استخلاص العوامل')}
                                                            </label>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => setEfaConfig(c => ({ ...c, factorMethod: 'fixed' }))}
                                                                    className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                                                        efaConfig.factorMethod === 'fixed'
                                                                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                                                            : 'bg-slate-700/50 text-slate-400 border border-slate-600 hover:bg-slate-700'
                                                                    }`}
                                                                >
                                                                    {t('Fixed Count', 'عدد ثابت')}
                                                                </button>
                                                                <button
                                                                    onClick={() => setEfaConfig(c => ({ ...c, factorMethod: 'eigenvalue' }))}
                                                                    className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                                                        efaConfig.factorMethod === 'eigenvalue'
                                                                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                                                            : 'bg-slate-700/50 text-slate-400 border border-slate-600 hover:bg-slate-700'
                                                                    }`}
                                                                >
                                                                    {t('Eigenvalue ≥', 'القيمة الذاتية ≥')}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Factor Count / Eigenvalue Threshold */}
                                                        {efaConfig.factorMethod === 'fixed' ? (
                                                            <div>
                                                                <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                                                                    {t('Number of Factors', 'عدد العوامل')}
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    max={10}
                                                                    value={efaConfig.factorCount}
                                                                    onChange={e => setEfaConfig(c => ({ ...c, factorCount: parseInt(e.target.value) || 3 }))}
                                                                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-600 text-white text-sm focus:border-cyan-500 focus:outline-none"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                                                                    {t('Eigenvalue Threshold', 'حد القيمة الذاتية')}
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min={0.1}
                                                                    max={5}
                                                                    step={0.1}
                                                                    value={efaConfig.eigenvalueThreshold}
                                                                    onChange={e => setEfaConfig(c => ({ ...c, eigenvalueThreshold: parseFloat(e.target.value) || 1.0 }))}
                                                                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-600 text-white text-sm focus:border-cyan-500 focus:outline-none"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Mediation Configuration */}
                                                {showMediationOptions && (
                                                    <div className="space-y-4 pt-4 border-t border-slate-700">
                                                        <h4 className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">{t('Mediation Analysis (Sobel)', 'تحليل الوساطة (سوبل)')}</h4>
                                                        
                                                        {/* IV Selection */}
                                                        <div>
                                                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                                                                {t('Independent Variable (IV)', 'المتغير المستقل')}
                                                            </label>
                                                            <select 
                                                                value={mediationConfig.independentScaleId}
                                                                onChange={(e) => setMediationConfig(c => ({ ...c, independentScaleId: e.target.value }))}
                                                                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-600 text-white text-sm focus:border-cyan-500 focus:outline-none"
                                                            >
                                                                {survey.scaleSnapshots?.map((s: any) => (
                                                                    <option key={s.id} value={s.id}>{s.title}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {/* Mediator Selection */}
                                                        <div>
                                                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                                                                {t('Mediator Variable (M)', 'الوسيط')}
                                                            </label>
                                                            <select 
                                                                value={mediationConfig.mediatorScaleId}
                                                                onChange={(e) => setMediationConfig(c => ({ ...c, mediatorScaleId: e.target.value }))}
                                                                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-600 text-white text-sm focus:border-cyan-500 focus:outline-none"
                                                            >
                                                                {survey.scaleSnapshots?.map((s: any) => (
                                                                    <option key={s.id} value={s.id}>{s.title}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {/* DV Selection */}
                                                        <div>
                                                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                                                                {t('Dependent Variable (DV)', 'المتغير التابع')}
                                                            </label>
                                                            <select 
                                                                value={mediationConfig.dependentScaleId}
                                                                onChange={(e) => setMediationConfig(c => ({ ...c, dependentScaleId: e.target.value }))}
                                                                className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-600 text-white text-sm focus:border-cyan-500 focus:outline-none"
                                                            >
                                                                {survey.scaleSnapshots?.map((s: any) => (
                                                                    <option key={s.id} value={s.id}>{s.title}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 mb-6 text-start">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-slate-400">{t('Price:', 'السعر:')}</span>
                                        <span className="text-white font-bold">$10.00</span>
                                    </div>
                                    <div className="text-xs text-amber-400">
                                        {t('Note: Payment is currently bypassed for testing.', 'ملاحظة: يتم تجاوز الدفع حالياً لأغراض الاختبار.')}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button 
                                        onClick={onClose}
                                        className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                                    >
                                        {t('Cancel', 'إلغاء')}
                                    </button>
                                    <button 
                                        onClick={handleConfirm}
                                        className="flex-1 futuristic-btn-primary py-2"
                                    >
                                        {t('Confirm & Proceed', 'تأكيد ومتابعة')}
                                    </button>
                                </div>
                            </>
                        )}

                        {!isError && step === 'requesting' && (
                            <div className="py-8">
                                <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-6" />
                                <h3 className="text-xl font-bold text-white mb-2">
                                    {t('Connecting to Server...', 'جاري الاتصال بالخادم...')}
                                </h3>
                            </div>
                        )}

                        {!isError && step === 'polling' && (
                            <div className="py-8">
                                <div className="w-16 h-16 mx-auto mb-6 relative">
                                    <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full animate-pulse" />
                                    <div className="absolute inset-0 border-t-4 border-cyan-500 rounded-full animate-spin" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">
                                    {getStatusMessage()}
                                </h3>
                                <p className="text-slate-400 text-sm">
                                    {t('Orchestrating cloud resources for your report.', 'جاري تنسيق موارد السحابة لتقريرك.')}
                                </p>
                                
                                {/* Status Progress Tracker */}
                                <div className="mt-8 flex justify-between px-4">
                                    {['payment_verified', 'computing', 'completed'].map((s, idx) => {
                                        const isDone = currentStatus === 'completed' || 
                                                     (s === 'payment_verified' && ['payment_verified', 'computing'].includes(currentStatus)) ||
                                                     (s === 'computing' && currentStatus === 'computing');
                                        return (
                                            <div key={s} className="flex flex-col items-center">
                                                <div className={`w-3 h-3 rounded-full ${isDone ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-slate-700'}`} />
                                                <div className="w-[1px] h-4 bg-slate-800" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {!isError && step === 'success' && (
                            <div className="py-8 animate-bounce-in">
                                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">
                                    {t('Success!', 'تم بنجاح!')}
                                </h3>
                                <p className="text-slate-400">
                                    {t('Your report has been generated successfully.', 'تم إنشاء تقريرك بنجاح.')}
                                </p>
                            </div>
                        )}

                        {isError && (
                            <div className="py-8">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{t('Error', 'خطأ')}</h3>
                                <p className="text-slate-400 mb-6 text-sm">{errorMessage}</p>
                                <button 
                                    onClick={onClose}
                                    className="futuristic-btn px-8"
                                >
                                    {t('Close', 'إغلاق')}
                                </button>
                            </div>
                        )}
                    </div>
                </FuturisticPanel>
            </div>
        </div>
    );
}
