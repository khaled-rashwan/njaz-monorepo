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
    onSuccess: (reportId: string) => void;
}

type ModalStep = 'confirm' | 'requesting' | 'polling' | 'success';

export default function ReportGenerationModal({
    isOpen,
    onClose,
    survey,
    reportType,
    onSuccess,
}: ReportGenerationModalProps) {
    const { t, direction } = useLanguage();
    const [step, setStep] = useState<ModalStep>('confirm');
    const [isError, setIsError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [currentStatus, setCurrentStatus] = useState<ReportStatus>('pending_payment');
    const [reportId, setReportId] = useState<string | null>(null);
    
    const pollingInterval = useRef<NodeJS.Timeout | null>(null);

    // Dynamic titles
    const reportTitles = {
        demographic: t('Demographic Report', 'تقرير ديموغرافي'),
        scale: t('Scale Analysis', 'تحليل المقاييس'),
        comprehensive: t('Comprehensive Report', 'تقرير شامل'),
    };

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
            const result = await requestReport(survey.id, reportType);
            
            setReportId(result.reportId);
            setCurrentStatus(result.status as ReportStatus);
            
            if (result.paymentUrl) {
                // If there's a real payment, we'd redirect or show iframe
                // For now, we assume bypass is active or we just start polling
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
            case 'generating_pdf': return t('Preparing PDF Document...', 'جاري تجهيز ملف PDF...');
            case 'completed': return t('Generation Complete!', 'اكتمل الإنشاء!');
            default: return t('Processing...', 'جاري المعالجة...');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md">
                <FuturisticPanel glowColor={isError ? 'pink' : (step === 'success' ? 'green' : 'cyan')} size="lg">
                    <div className="p-6 text-center" dir={direction}>
                        {!isError && step === 'confirm' && (
                            <>
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/10 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">
                                    {t('Generate Report', 'إنشاء تقرير')}
                                </h3>
                                <p className="text-slate-400 mb-6">
                                    {t('You are about to generate a', 'أنت على وشك إنشاء')} {' '}
                                    <span className="text-cyan-400 font-bold">{reportTitles[reportType]}</span> {' '}
                                    {t('for', 'لـ')} {' '}
                                    <span className="text-white italic">"{survey.title}"</span>.
                                </p>
                                
                                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 mb-6 text-left">
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
