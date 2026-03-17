'use client';

import { useLanguage } from '@/components/LanguageContext';
import type { IntakeFormData, WizardAction } from '@/lib/intake';

interface StepClientInfoProps {
    formData: IntakeFormData;
    dispatch: React.Dispatch<WizardAction>;
}

export default function StepClientInfo({ formData, dispatch }: StepClientInfoProps) {
    const { t, direction } = useLanguage();

    const update = (field: keyof IntakeFormData, value: string) => {
        dispatch({ type: 'UPDATE_DATA', payload: { [field]: value } });
    };

    return (
        <div className="wizard-step-enter">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                    {t('Tell us about yourself', 'أخبرنا عنك')}
                </h2>
                <p className="text-slate-400 text-sm">
                    {t(
                        'We\'ll use this information to prepare your personalized proposal.',
                        'سنستخدم هذه المعلومات لإعداد عرضك المخصص.'
                    )}
                </p>
            </div>

            <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Name */}
                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">
                            {t('Full Name', 'الاسم الكامل')} <span className="text-pink-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.clientName}
                            onChange={(e) => update('clientName', e.target.value)}
                            className="futuristic-input"
                            placeholder={t('John Doe', 'أحمد محمد')}
                            dir={direction}
                            required
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">
                            {t('Email Address', 'البريد الإلكتروني')} <span className="text-pink-400">*</span>
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
                            {t('Phone Number', 'رقم الهاتف')}
                        </label>
                        <input
                            type="tel"
                            value={formData.clientPhone}
                            onChange={(e) => update('clientPhone', e.target.value)}
                            className="futuristic-input"
                            placeholder="+966 5XX XXX XXXX"
                            dir="ltr"
                        />
                    </div>

                    {/* Company */}
                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">
                            {t('Company / Organization', 'الشركة / المؤسسة')}
                        </label>
                        <input
                            type="text"
                            value={formData.companyName}
                            onChange={(e) => update('companyName', e.target.value)}
                            className="futuristic-input"
                            placeholder={t('Acme Corp', 'شركة أكمي')}
                            dir={direction}
                        />
                    </div>
                </div>

                {/* Project Description */}
                <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">
                        {t('Project Description', 'وصف المشروع')} <span className="text-pink-400">*</span>
                    </label>
                    <textarea
                        value={formData.projectDescription}
                        onChange={(e) => update('projectDescription', e.target.value)}
                        className="futuristic-textarea"
                        placeholder={t(
                            'Tell us about your project goals, target audience, and any specific requirements or ideas you have...',
                            'أخبرنا عن أهداف مشروعك والجمهور المستهدف وأي متطلبات أو أفكار محددة لديك...'
                        )}
                        dir={direction}
                        rows={5}
                        required
                    />
                </div>
            </div>
        </div>
    );
}
