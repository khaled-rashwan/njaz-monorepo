'use client';

import { ScholarDocument } from '@/types';
import { useLanguage } from '@/components/LanguageContext';

interface DocumentCardProps {
    document: ScholarDocument;
    onOpen: (id: string) => void;
    onDelete: (id: string) => void;
}

const STATUS_CONFIG = {
    draft: {
        en: 'Draft', ar: 'مسودة',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        icon: '✏️',
    },
    review: {
        en: 'In Review', ar: 'قيد المراجعة',
        color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        icon: '👁️',
    },
    published: {
        en: 'Published', ar: 'منشور',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        icon: '✅',
    },
};

export function DocumentCard({ document, onOpen, onDelete }: DocumentCardProps) {
    const { t } = useLanguage();
    const status = document.status || 'draft';
    const config = STATUS_CONFIG[status];

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <div
            className="futuristic-card group cursor-pointer p-5 flex flex-col gap-3 hover:scale-[1.01] transition-transform"
            onClick={() => onOpen(document.id)}
        >
            {/* Status Badge */}
            <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${config.color}`}>
                    {config.icon} {t(config.en, config.ar)}
                </span>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(document.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg
                               hover:bg-red-500/10 text-slate-500 hover:text-red-400"
                    title={t('Delete', 'حذف')}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-2">
                {document.title || t('Untitled Document', 'مستند بدون عنوان')}
            </h3>

            {/* Abstract Preview */}
            {document.abstract && (
                <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                    {document.abstract}
                </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-700/50">
                <span className="text-xs text-slate-500">
                    {document.updatedAt
                        ? `${t('Updated', 'تحديث')} ${formatDate(document.updatedAt)}`
                        : formatDate(document.createdAt)}
                </span>
                <div className="flex items-center gap-1 text-amber-500/60 group-hover:text-amber-400 transition-colors">
                    <span className="text-xs font-medium">{t('Open', 'فتح')}</span>
                    <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
