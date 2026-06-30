'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';

interface CreateDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (title: string, abstract?: string) => void;
    isCreating: boolean;
}

export function CreateDocumentModal({ isOpen, onClose, onCreate, isCreating }: CreateDocumentModalProps) {
    const { t, direction } = useLanguage();
    const [title, setTitle] = useState('');
    const [abstract, setAbstract] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        onCreate(title.trim(), abstract.trim() || undefined);
        setTitle('');
        setAbstract('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div
                className="relative w-full max-w-lg rounded-xl overflow-hidden animate-fade-in"
                style={{
                    background: 'linear-gradient(180deg, rgba(20, 28, 45, 0.98) 0%, rgba(10, 14, 26, 0.99) 100%)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(245, 158, 11, 0.08)',
                }}
                dir={direction}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-amber-500/10">
                    <h2 className="text-lg font-bold text-white">
                        {t('New Research Document', 'مستند بحثي جديد')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            {t('Document Title', 'عنوان المستند')} <span className="text-amber-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('e.g., Effects of Climate Change on Marine Biodiversity', 'مثال: تأثير التغير المناخي على التنوع البيولوجي البحري')}
                            className="futuristic-input text-sm"
                            dir={direction}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            {t('Abstract (optional)', 'الملخص (اختياري)')}
                        </label>
                        <textarea
                            value={abstract}
                            onChange={(e) => setAbstract(e.target.value)}
                            placeholder={t('Brief summary of your research...', 'ملخص موجز لبحثك...')}
                            className="futuristic-input text-sm min-h-[100px] resize-y"
                            dir={direction}
                            rows={4}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="futuristic-btn-ghost text-sm"
                        >
                            {t('Cancel', 'إلغاء')}
                        </button>
                        <button
                            type="submit"
                            disabled={!title.trim() || isCreating}
                            className="futuristic-btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isCreating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-slate-800/30 border-t-slate-800 rounded-full animate-spin" />
                                    {t('Creating...', 'جارٍ الإنشاء...')}
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    {t('Create Document', 'إنشاء المستند')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
