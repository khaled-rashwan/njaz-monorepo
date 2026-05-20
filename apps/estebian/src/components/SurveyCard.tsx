'use client';

import React from 'react';
import { useLanguage } from './LanguageContext';

interface SurveyCardProps {
    id: string;
    title: string;
    titleAr?: string;
    responses: number;
    isPublished: boolean;
    lastUpdate: string;
    language: 'ar' | 'en';
    onEdit: (id: string) => void;
    onResults: (id: string) => void;
    onReports: (id: string) => void;
    onCopyLink: (id: string) => void;
    onDelete: (id: string) => void;
}

export const SurveyCard: React.FC<SurveyCardProps> = ({
    id,
    title,
    titleAr,
    responses,
    isPublished,
    lastUpdate,
    language,
    onEdit,
    onResults,
    onReports,
    onCopyLink,
    onDelete,
}) => {
    const { t, direction } = useLanguage();
    const isRtl = direction === 'rtl';

    return (
        <div className="relative group">
            {/* Subtle Outer Glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition duration-500"></div>
            
            <div className="relative glass-card border border-white/5 hover:border-cyan-500/30 rounded-xl overflow-hidden transition-all duration-300">
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Left: Info & Status */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            {isPublished ? (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-bold text-emerald-400 uppercase">
                                    <span className="size-1 rounded-full bg-emerald-500 animate-pulse"></span>
                                    {t('Published', 'منشور')}
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] font-bold text-amber-400 uppercase">
                                    <span className="size-1 rounded-full bg-amber-500"></span>
                                    {t('Draft', 'مسودة')}
                                </span>
                            )}
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{t('Last Update', 'آخر تحديث')}: {lastUpdate}</span>
                        </div>
                        
                        <h3 className="text-lg font-bold text-white truncate" dir={isRtl ? 'rtl' : 'ltr'}>
                            {title}
                        </h3>
                        {titleAr && titleAr !== title && (
                            <h4 className="text-sm text-slate-400 truncate" dir="rtl">
                                {titleAr}
                            </h4>
                        )}
                    </div>

                    {/* Middle: Metrics */}
                    <div className="flex items-center gap-6 px-4 md:border-x border-white/5">
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 uppercase mb-0.5">{t('Responses', 'الاستجابات')}</p>
                            <p className="text-xl font-black text-cyan-400">{responses.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1">
                        <ActionButton 
                            icon="edit" 
                            label={t('Edit', 'تعديل')} 
                            onClick={() => onEdit(id)} 
                            color="hover:text-cyan-400"
                        />
                        <ActionButton 
                            icon="monitoring" 
                            label={t('Results', 'النتائج')} 
                            onClick={() => onResults(id)} 
                            color="hover:text-purple-400"
                        />
                        <ActionButton 
                            icon="analytics" 
                            label={t('Reports', 'التقارير')} 
                            onClick={() => onReports(id)} 
                            color="hover:text-emerald-400"
                        />
                        <ActionButton 
                            icon="content_copy" 
                            label={t('Link', 'الرابط')} 
                            onClick={() => onCopyLink(id)} 
                            color="hover:text-blue-400"
                        />
                        <div className="w-px h-8 bg-white/5 mx-1" />
                        <ActionButton 
                            icon="delete" 
                            label={t('Delete', 'حذف')} 
                            onClick={() => onDelete(id)} 
                            color="hover:text-red-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ActionButtonProps {
    icon: string;
    label: string;
    onClick: () => void;
    color: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onClick, color }) => (
    <button
        onClick={onClick}
        className={`group/btn flex flex-col items-center justify-center p-2 rounded-lg hover:bg-white/5 transition-all duration-200 min-w-[56px] ${color}`}
        title={label}
    >
        <span className="material-symbols-outlined text-xl text-slate-400 group-hover/btn:scale-110 transition-transform">
            {icon}
        </span>
        <span className="text-[9px] font-medium text-slate-500 group-hover/btn:text-current mt-0.5">
            {label}
        </span>
    </button>
);

