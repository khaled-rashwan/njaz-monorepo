'use client';

import { useEditorStore } from '@/store/editor-store';
import { useLanguage } from '@/components/LanguageContext';
import { BlockType } from '@/types';
import { buildCounterMap, resolveRef } from '@/lib/cross-reference';

export function InspectorPanel() {
    const { t } = useLanguage();
    const { blocks, focusedBlockId, inspectorOpen, toggleInspector, document: doc, setHeadingStyle } = useEditorStore();
    const focusedBlock = blocks.find(b => b.id === focusedBlockId);

    if (!inspectorOpen) {
        return (
            <button
                onClick={toggleInspector}
                className="fixed right-0 top-1/2 -translate-y-1/2 z-30 p-2 rounded-l-lg
                           bg-slate-800/90 border border-slate-700/50 border-r-0
                           text-slate-400 hover:text-amber-400 transition-colors"
                title={t('Open Inspector', 'فتح المحقق')}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>
        );
    }

    const counterMap = buildCounterMap(blocks);

    const renderDocumentSettings = () => {
        const headingStyles = doc?.metadata?.headingStyles || {};
        return (
            <div className="space-y-3 p-4 bg-amber-500/[0.02] border-b border-amber-500/10">
                <h4 className="text-xs font-semibold text-amber-500/70 uppercase tracking-wider">
                    {t('Document Settings', 'إعدادات المستند')}
                </h4>
                <div className="space-y-2">
                    <span className="text-[11px] text-slate-500 font-medium block">
                        {t('Heading Levels Styling', 'تنسيق مستويات العناوين')}
                    </span>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {[1, 2, 3, 4, 5, 6].map((level) => (
                            <div key={level} className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-slate-400 font-mono">H{level}</span>
                                <select
                                    value={headingStyles[level] || 'none'}
                                    onChange={(e) => useEditorStore.getState().setHeadingLevelStyle(level, e.target.value)}
                                    className="bg-slate-800/90 border border-slate-700/50 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-amber-500/50 transition-colors w-40"
                                >
                                    <option value="none">{t('Plain (None)', 'عادي')}</option>
                                    <option value="numeric">{t('Numeric (1, 2...)', 'رقمي')}</option>
                                    <option value="hierarchical">{t('Hierarchical (1.1...)', 'هرمي متداخل')}</option>
                                    <option value="alpha-upper">{t('Alpha Upper (A, B...)', 'أبجدي كبير')}</option>
                                    <option value="alpha-lower">{t('Alpha Lower (a, b...)', 'أبجدي صغير')}</option>
                                    <option value="roman-upper">{t('Roman Upper (I, II...)', 'روماني كبير')}</option>
                                    <option value="roman-lower">{t('Roman Lower (i, ii...)', 'روماني صغير')}</option>
                                    <option value="bullet">{t('Bullet (•)', 'نقطة')}</option>
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="inspector-panel w-72 flex-shrink-0 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-amber-500/10">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500/70">
                    {t('Inspector', 'المحقق')}
                </h3>
                <button
                    onClick={toggleInspector}
                    className="p-1 rounded hover:bg-slate-700/50 text-slate-500 hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Document Settings is always at the top of the inspector */}
            {renderDocumentSettings()}

            {focusedBlock ? (
                <div className="p-4 space-y-4">
                    {/* Block Info */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {t('Block Info', 'معلومات البلوك')}
                        </h4>
                        <div className="space-y-1.5">
                            <InfoRow label={t('Type', 'النوع')} value={focusedBlock.type} />
                            <InfoRow label={t('ID', 'المعرف')} value={focusedBlock.id.substring(0, 8) + '...'} mono />
                            <InfoRow label={t('Order', 'الترتيب')} value={focusedBlock.orderIndex.toFixed(4)} />
                            {focusedBlock.parentId && (
                                <InfoRow label={t('Parent', 'الأصل')} value={focusedBlock.parentId.substring(0, 8) + '...'} mono />
                            )}
                        </div>
                    </div>

                    {/* Text block options */}
                    {focusedBlock.type === 'TEXT' && (
                        <div className="space-y-2.5 pt-4 border-t border-slate-700/30">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {t('List Formatting', 'تنسيق القائمة')}
                            </h4>
                            <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-700/40 bg-slate-800/40 p-0.5">
                                {(['none', 'unordered', 'ordered'] as const).map((style) => {
                                    const isActive = (focusedBlock.content as any)?.listType === style || 
                                                     (style === 'none' && !(focusedBlock.content as any)?.listType);
                                    const labels = {
                                        none: t('Plain', 'عادي'),
                                        unordered: t('Bullet', 'نقطة'),
                                        ordered: t('Number', 'رقمي'),
                                    };
                                    return (
                                        <button
                                            key={style}
                                            onClick={() => {
                                                useEditorStore.getState().updateBlockContent(focusedBlock.id, {
                                                    ...focusedBlock.content,
                                                    listType: style,
                                                });
                                            }}
                                            className={`py-1 rounded-md text-[11px] font-medium transition-colors text-center ${
                                                isActive
                                                    ? 'bg-amber-500/15 text-amber-400 font-semibold'
                                                    : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                        >
                                            {labels[style]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Cross-Reference Counter */}
                    {counterMap.has(focusedBlock.id) && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {t('Cross-Reference', 'الإحالة المرجعية')}
                            </h4>
                            <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                                <span className="text-sm text-emerald-400 font-medium">
                                    {resolveRef(focusedBlock.id, counterMap)}
                                </span>
                                <p className="text-xs text-slate-500 mt-1">
                                    {t('Use', 'استخدم')} <code className="text-amber-400/70 bg-slate-800/50 px-1 rounded text-[10px]">
                                        {'[[ref:' + focusedBlock.id + ']]'}
                                    </code> {t('to reference', 'للإشارة')}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Metadata (raw JSON) */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {t('Metadata', 'البيانات الوصفية')}
                        </h4>
                        <pre className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 text-xs font-mono text-slate-400 overflow-x-auto max-h-48 overflow-y-auto">
                            {JSON.stringify(focusedBlock.metadata || {}, null, 2)}
                        </pre>
                    </div>

                    {/* AI Lineage */}
                    {focusedBlock.metadata?.ai && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-purple-400/70 uppercase tracking-wider">
                                {t('AI Lineage', 'سلسلة الذكاء الاصطناعي')}
                            </h4>
                            <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/15 space-y-2">
                                <div>
                                    <span className="text-[10px] text-slate-500 uppercase">{t('Prompt', 'الأمر')}</span>
                                    <p className="text-xs text-purple-300 mt-0.5">{focusedBlock.metadata.ai.prompt}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 uppercase">{t('Model', 'النموذج')}</span>
                                    <p className="text-xs text-slate-400 mt-0.5">{focusedBlock.metadata.ai.model || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Content Editor (JSON) */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {t('Content (JSON)', 'المحتوى (JSON)')}
                        </h4>
                        <textarea
                            defaultValue={JSON.stringify(focusedBlock.content || {}, null, 2)}
                            key={focusedBlock.id + '-' + JSON.stringify(focusedBlock.content || {})}
                            onChange={(e) => {
                                try {
                                    const parsed = JSON.parse(e.target.value);
                                    useEditorStore.getState().updateBlockContent(focusedBlock.id, parsed);
                                } catch (err) {
                                    // Silent catch for invalid JSON while typing
                                }
                            }}
                            rows={8}
                            className="w-full p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 text-xs font-mono text-slate-300 outline-none resize-y"
                        />
                    </div>
                </div>
            ) : (
                <div className="p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                    </div>
                    <p className="text-sm text-slate-500">
                        {t('Select a block to inspect its metadata, cross-references, and AI lineage.', 'اختر بلوكاً لفحص بياناته الوصفية والإحالات المرجعية وسلسلة الذكاء الاصطناعي.')}
                    </p>
                </div>
            )}
        </div>
    );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{label}</span>
            <span className={`text-xs ${mono ? 'font-mono text-amber-400/60' : 'text-slate-300'}`}>
                {value}
            </span>
        </div>
    );
}
