'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useEditorStore } from '@/store/editor-store';
import { LiteratureSurvey } from './LiteratureSurvey';
import { StatisticsPanel } from './StatisticsPanel';
import { FiguresLibrary } from './FiguresLibrary';

type LibraryTab = 'search' | 'library' | 'figures' | 'stats';

export function LiteratureLibrary({ projectId }: { projectId?: string }) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<LibraryTab>('search');
    const { document, literatureItems, removeLiteratureItem } = useEditorStore();
    const activeProjectId = projectId || document?.projectId || '';

    const tabs: { key: LibraryTab; label: string; labelAr: string }[] = [
        { key: 'search', label: 'Search', labelAr: 'بحث' },
        { key: 'library', label: `Library (${literatureItems.length})`, labelAr: `المكتبة (${literatureItems.length})` },
        { key: 'figures', label: 'Figures', labelAr: 'الأشكال' },
        { key: 'stats', label: 'Stats', labelAr: 'إحصائيات' },
    ];

    return (
        <div className="h-full flex flex-col">
            {/* Tab Bar */}
            <div className="flex items-center border-b border-slate-700/30 px-2 pt-2">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                            activeTab === tab.key
                                ? 'text-amber-400 bg-amber-500/10 border-b-2 border-amber-500'
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {t(tab.label, tab.labelAr)}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'search' && <LiteratureSurvey projectId={activeProjectId} />}

                {activeTab === 'library' && (
                    <div className="p-4 space-y-2">
                        {literatureItems.length > 0 ? (
                            literatureItems.map(item => (
                                <div key={item.id} className="futuristic-card p-3 group">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-medium text-white line-clamp-2">{item.title}</h4>
                                            <p className="text-[10px] text-slate-500 mt-0.5">
                                                {(item.authors as any[])?.map(a => a.name).join(', ').substring(0, 60) || 'Unknown'} ({item.year || 'n.d.'})
                                            </p>
                                            {item.tags && item.tags.length > 0 && (
                                                <div className="flex gap-1 mt-1">
                                                    {item.tags.map(tag => (
                                                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/70">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => removeLiteratureItem(item.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-all"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-slate-600 text-center py-4">
                                {t('No papers collected yet. Use the Search tab to find papers.', 'لا توجد أوراق محفوظة بعد. استخدم تبويب البحث للعثور على أوراق.')}
                            </p>
                        )}
                    </div>
                )}

                {activeTab === 'figures' && (
                    <div className="p-4 h-full overflow-y-auto">
                        <FiguresLibrary />
                    </div>
                )}

                {activeTab === 'stats' && <StatisticsPanel />}
            </div>
        </div>
    );
}
