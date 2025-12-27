'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scale } from '@/lib/types';

interface ScaleSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableScales: Scale[];
    selectedScaleIds: string[];
    onSelectScale: (scaleId: string) => void;
    language: 'ar' | 'en';
    surveyLanguage: 'ar' | 'en';
    t: (en: string, ar: string) => string;
    onSaveDraft?: () => void; // Save draft before navigating away
}

export default function ScaleSelectorModal({
    isOpen,
    onClose,
    availableScales,
    selectedScaleIds,
    onSelectScale,
    language,
    surveyLanguage,
    t,
    onSaveDraft,
}: ScaleSelectorModalProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const isRtl = language === 'ar';

    if (!isOpen) return null;

    // Filter scales by survey language and search query
    const filteredScales = availableScales
        .filter(s => s.language === surveyLanguage)
        .filter(s =>
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const handleScaleClick = (scaleId: string) => {
        onSelectScale(scaleId);
    };

    const handleCreateNewScale = () => {
        if (onSaveDraft) {
            onSaveDraft();
        }
        router.push('/scales/new?returnTo=survey');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`
                    relative w-full max-w-2xl max-h-[80vh] 
                    bg-gradient-to-br from-slate-800 to-slate-900
                    rounded-2xl border border-purple-500/30
                    shadow-2xl shadow-purple-500/20
                    overflow-hidden
                    animate-fade-in
                `}
                dir={isRtl ? 'rtl' : 'ltr'}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-700/50">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            {t('Add Scale', 'إضافة مقياس')}
                        </h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('Search scales...', 'البحث في المقاييس...')}
                            className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[50vh]">
                    {filteredScales.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
                                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-slate-400 mb-4">
                                {t(
                                    `No ${surveyLanguage === 'ar' ? 'Arabic' : 'English'} scales found`,
                                    `لا توجد مقاييس ${surveyLanguage === 'ar' ? 'عربية' : 'إنجليزية'}`
                                )}
                            </p>
                            <button
                                onClick={handleCreateNewScale}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                {t('Create New Scale', 'إنشاء مقياس جديد')}
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredScales.map(scale => {
                                const isSelected = selectedScaleIds.includes(scale.id);
                                const totalStatements = scale.dimensions.reduce((sum, d) => sum + d.statements.length, 0);

                                return (
                                    <button
                                        key={scale.id}
                                        onClick={() => handleScaleClick(scale.id)}
                                        className={`
                                            p-4 rounded-xl border text-left transition-all duration-200
                                            ${isSelected
                                                ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/20'
                                                : 'bg-slate-700/30 border-slate-600 hover:border-purple-500/50 hover:bg-slate-700/50'
                                            }
                                        `}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Checkbox */}
                                            <div className={`
                                                w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5
                                                flex items-center justify-center transition-colors
                                                ${isSelected
                                                    ? 'bg-purple-500 border-purple-500'
                                                    : 'border-slate-500'
                                                }
                                            `}>
                                                {isSelected && (
                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4
                                                    className="font-bold text-white mb-1 line-clamp-1"
                                                    dir={scale.language === 'ar' ? 'rtl' : 'ltr'}
                                                >
                                                    {scale.title}
                                                </h4>
                                                {scale.description && (
                                                    <p
                                                        className="text-sm text-slate-400 line-clamp-2 mb-2"
                                                        dir={scale.language === 'ar' ? 'rtl' : 'ltr'}
                                                    >
                                                        {scale.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span>{scale.dimensions.length} {t('dimensions', 'أبعاد')}</span>
                                                    <span>•</span>
                                                    <span>{totalStatements} {t('statements', 'عبارات')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700/50 flex items-center justify-between">
                    <button
                        onClick={handleCreateNewScale}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {t('Create New Scale', 'إنشاء مقياس جديد')}
                    </button>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-400">
                            {selectedScaleIds.length} {t('selected', 'محدد')}
                        </span>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium transition-colors"
                        >
                            {t('Done', 'تم')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
