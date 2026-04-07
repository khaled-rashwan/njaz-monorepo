'use client';

import { useLanguage } from '@/components/LanguageContext';
import type { IntakeFormData, WizardAction } from '@/lib/intake';

interface StepClientInfoProps {
    formData: IntakeFormData;
    dispatch: React.Dispatch<WizardAction>;
    isDescriptionOnly?: boolean;
}

export default function StepClientInfo({ formData, dispatch, isDescriptionOnly = false }: StepClientInfoProps) {
    const { t, direction } = useLanguage();

    const update = (field: keyof IntakeFormData, value: string) => {
        dispatch({ type: 'UPDATE_DATA', payload: { [field]: value } });
    };

    if (isDescriptionOnly) {
        return (
            <div className="wizard-step-enter">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {t('Project Vision', 'رؤية المشروع')}
                    </h2>
                    <p className="text-slate-400 text-sm">
                        {t(
                            'Tell us about your project goals and requirements.',
                            'أخبرنا عن أهداف ومتطلبات مشروعك.'
                        )}
                    </p>
                </div>

                <div className="space-y-4">
                    <label className="block text-slate-300 text-sm font-medium mb-2">
                        Project Description <span className="text-slate-500 mx-1">/</span> <span className="font-arabic">وصف المشروع</span> <span className="text-pink-400">*</span>
                    </label>
                    <textarea
                        value={formData.projectDescription}
                        onChange={(e) => update('projectDescription', e.target.value)}
                        className="futuristic-textarea"
                        placeholder={direction === 'rtl' 
                            ? 'أخبرنا عن أهداف مشروعك والجمهور المستهدف... / Tell us about your goals...' 
                            : 'Tell us about your goals, target audience, and requirements... / أخبرنا عن أهداف مشروعك...'}
                        dir="auto"
                        rows={6}
                        required
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="wizard-step-enter">
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Name */}
                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">
                            Full Name <span className="text-slate-500 mx-1">/</span> <span className="font-arabic">الاسم الكامل</span> <span className="text-pink-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.clientName}
                            onChange={(e) => update('clientName', e.target.value)}
                            className="futuristic-input"
                            placeholder={direction === 'rtl' ? 'أحمد محمد / Ahmed Mohamed' : 'Ahmed Mohamed / أحمد محمد'}
                            dir="auto"
                            required
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">
                            Email <span className="text-slate-500 mx-1">/</span> <span className="font-arabic">البريد الإلكتروني</span> <span className="text-pink-400">*</span>
                        </label>
                        <input
                            type="email"
                            value={formData.clientEmail}
                            onChange={(e) => update('clientEmail', e.target.value)}
                            className="futuristic-input"
                            placeholder="name@company.com"
                            dir="ltr"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Phone */}
                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">
                            Phone <span className="text-slate-500 mx-1">/</span> <span className="font-arabic">رقم الهاتف</span>
                        </label>
                        <input
                            type="tel"
                            value={formData.clientPhone}
                            onChange={(e) => update('clientPhone', e.target.value)}
                            className="futuristic-input"
                            placeholder="+20 1XX XXX XXXX"
                            dir="ltr"
                        />
                    </div>

                    {/* Company */}
                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">
                            Company <span className="text-slate-500 mx-1">/</span> <span className="font-arabic">الشركة</span>
                        </label>
                        <input
                            type="text"
                            value={formData.companyName}
                            onChange={(e) => update('companyName', e.target.value)}
                            className="futuristic-input"
                            placeholder={direction === 'rtl' ? 'اسم الشركة / Company Name' : 'Company Name / اسم الشركة'}
                            dir="auto"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
