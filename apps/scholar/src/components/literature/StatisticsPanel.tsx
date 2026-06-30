'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useEditorStore } from '@/store/editor-store';

export function StatisticsPanel() {
    const { t } = useLanguage();
    const { literatureItems } = useEditorStore();

    const stats = useMemo(() => {
        if (literatureItems.length === 0) return null;

        // Year distribution
        const yearCounts: Record<number, number> = {};
        let totalCitations = 0;
        const journalCounts: Record<string, number> = {};
        const authorCounts: Record<string, number> = {};

        for (const item of literatureItems) {
            if (item.year) {
                yearCounts[item.year] = (yearCounts[item.year] || 0) + 1;
            }
            if (item.citationCount) {
                totalCitations += item.citationCount;
            }
            if (item.journal) {
                journalCounts[item.journal] = (journalCounts[item.journal] || 0) + 1;
            }
            if (item.authors && Array.isArray(item.authors)) {
                for (const author of item.authors as any[]) {
                    if (author.name) {
                        authorCounts[author.name] = (authorCounts[author.name] || 0) + 1;
                    }
                }
            }
        }

        const sortedYears = Object.entries(yearCounts)
            .map(([year, count]) => ({ year: parseInt(year), count }))
            .sort((a, b) => a.year - b.year);

        const topJournals = Object.entries(journalCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const topAuthors = Object.entries(authorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        const avgCitations = literatureItems.length > 0
            ? Math.round(totalCitations / literatureItems.length)
            : 0;

        return { yearCounts: sortedYears, topJournals, topAuthors, totalCitations, avgCitations };
    }, [literatureItems]);

    if (!stats || literatureItems.length === 0) {
        return (
            <div className="p-4 text-center py-8">
                <p className="text-xs text-slate-600">
                    {t('Collect papers to see bibliometric statistics.', 'اجمع أوراقاً لرؤية الإحصائيات البيبلومترية.')}
                </p>
            </div>
        );
    }

    const maxYearCount = Math.max(...stats.yearCounts.map(y => y.count));
    const maxJournalCount = stats.topJournals.length > 0 ? stats.topJournals[0][1] : 1;

    return (
        <div className="p-4 space-y-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500/70">
                {t('Bibliometric Analysis', 'تحليل ببليومتري')}
            </h3>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-2">
                <StatBox label={t('Papers', 'أوراق')} value={literatureItems.length} />
                <StatBox label={t('Total Citations', 'إجمالي الاقتباسات')} value={stats.totalCitations.toLocaleString()} />
                <StatBox label={t('Avg Citations', 'متوسط الاقتباسات')} value={stats.avgCitations} />
                <StatBox label={t('Journals', 'مجلات')} value={stats.topJournals.length} />
            </div>

            {/* Year Distribution */}
            {stats.yearCounts.length > 0 && (
                <div>
                    <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        {t('Publication Years', 'سنوات النشر')}
                    </h4>
                    <div className="space-y-1">
                        {stats.yearCounts.map(({ year, count }) => (
                            <div key={year} className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 w-8 text-right font-mono">{year}</span>
                                <div className="flex-1 h-3 bg-slate-800/30 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-500/50 to-amber-400/30 rounded-full transition-all"
                                        style={{ width: `${(count / maxYearCount) * 100}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-slate-600 w-4">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Journals */}
            {stats.topJournals.length > 0 && (
                <div>
                    <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        {t('Top Journals', 'أهم المجلات')}
                    </h4>
                    <div className="space-y-1.5">
                        {stats.topJournals.map(([journal, count]) => (
                            <div key={journal} className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-slate-400 truncate">{journal}</p>
                                    <div className="h-1.5 bg-slate-800/30 rounded-full overflow-hidden mt-0.5">
                                        <div
                                            className="h-full bg-gradient-to-r from-cyan-500/50 to-cyan-400/30 rounded-full"
                                            style={{ width: `${(count / maxJournalCount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="text-[10px] text-slate-600 flex-shrink-0">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Authors */}
            {stats.topAuthors.length > 0 && (
                <div>
                    <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        {t('Frequent Authors', 'المؤلفون المتكررون')}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                        {stats.topAuthors.map(([author, count]) => (
                            <span
                                key={author}
                                className="text-[10px] px-2 py-1 rounded-full border border-slate-700/30
                                           text-slate-400 bg-slate-800/20"
                            >
                                {author.split(' ').pop()} <span className="text-amber-400/60">({count})</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="p-2.5 rounded-lg bg-slate-800/20 border border-slate-700/20">
            <div className="text-lg font-bold text-amber-400">{value}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
        </div>
    );
}
