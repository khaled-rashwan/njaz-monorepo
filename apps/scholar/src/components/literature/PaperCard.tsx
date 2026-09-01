'use client';

import { LiteratureSearchResult } from '@/types';
import { useLanguage } from '@/components/LanguageContext';

interface PaperCardProps {
    paper: LiteratureSearchResult;
    onCollect?: (paper: LiteratureSearchResult) => void;
    isCollected?: boolean;
    compact?: boolean;
}

const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
    openalex: { label: 'OpenAlex', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    semantic_scholar: { label: 'S2', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    crossref: { label: 'CrossRef', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
    ieee_xplore: { label: 'IEEE Xplore', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    isbn_books: { label: 'Books', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
    figshare: { label: 'Figshare', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
    manual: { label: 'Manual', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
};

export function PaperCard({ paper, onCollect, isCollected, compact }: PaperCardProps) {
    const { t } = useLanguage();
    const badge = SOURCE_BADGES[paper.source] || SOURCE_BADGES.manual;

    return (
        <div className={`futuristic-card p-4 ${compact ? 'p-3' : 'p-4'} transition-all`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    {/* Source badge + Year */}
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.color}`}>
                            {badge.label}
                        </span>
                        {paper.year && (
                            <span className="text-xs text-slate-500">{paper.year}</span>
                        )}
                        {paper.citationCount !== undefined && paper.citationCount > 0 && (
                            <span className="text-xs text-amber-400/60 flex items-center gap-0.5">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                                {paper.citationCount.toLocaleString()}
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h4 className={`font-semibold text-white ${compact ? 'text-sm line-clamp-1' : 'text-sm line-clamp-2'} leading-snug`}>
                        {paper.title}
                    </h4>

                    {/* Authors */}
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        {paper.authors.map(a => a.name).join(', ') || 'Unknown authors'}
                    </p>

                    {/* Journal */}
                    {paper.journal && (
                        <p className="text-xs text-amber-400/50 italic mt-0.5 line-clamp-1">{paper.journal}</p>
                    )}

                    {/* Abstract preview */}
                    {!compact && paper.abstract && (
                        <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                            {paper.abstract}
                        </p>
                    )}
                </div>

                {/* Collect button */}
                {onCollect && (
                    <button
                        onClick={() => onCollect(paper)}
                        disabled={isCollected}
                        className={`flex-shrink-0 p-2 rounded-lg transition-all ${
                            isCollected
                                ? 'bg-emerald-500/15 text-emerald-400 cursor-default'
                                : 'hover:bg-amber-500/10 text-slate-500 hover:text-amber-400'
                        }`}
                        title={isCollected ? t('Already collected', 'تمت الإضافة') : t('Add to library', 'أضف للمكتبة')}
                    >
                        {isCollected ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        )}
                    </button>
                )}
            </div>

            {/* DOI / ISBN link */}
            {paper.doi && (
                <div className="mt-2 pt-2 border-t border-slate-700/30">
                    <a
                        href={paper.doi.startsWith('10.') ? `https://doi.org/${paper.doi}` : `https://isbnsearch.org/isbn/${paper.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-slate-600 hover:text-amber-400 transition-colors font-mono"
                    >
                        {paper.doi.startsWith('10.') ? 'DOI' : 'ISBN'}: {paper.doi}
                    </a>
                </div>
            )}
        </div>
    );
}
