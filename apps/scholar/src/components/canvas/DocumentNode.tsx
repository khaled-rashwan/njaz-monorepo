import { Handle, Position } from '@xyflow/react';
import { useLanguage } from '@/components/LanguageContext';
import Link from 'next/link';

export function DocumentNode({ data, selected }: { data: any; selected: boolean }) {
    const { t, direction } = useLanguage();
    const docId = data.documentId;
    const projectId = data.projectId;

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (confirm(t('Are you sure you want to delete this document?', 'هل أنت متأكد من حذف هذا المستند؟'))) {
            data.onDelete?.(docId);
        }
    };

    return (
        <div className={`p-4 rounded-xl border-2 transition-all w-64 bg-slate-900/95 backdrop-blur-md relative
            ${selected 
                ? 'border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.25)] scale-[1.02]' 
                : 'border-indigo-950/60 hover:border-indigo-800/80 hover:shadow-indigo-950/50 shadow-xl'
            }
        `}>
            {/* Input Handle for Sections to Connect */}
            <Handle 
                type="target" 
                position={Position.Top} 
                className="w-3.5 h-3.5 border-2 border-slate-950 bg-indigo-400 !-top-1.75 transition-colors hover:bg-indigo-300" 
            />

            {/* Output Handle for connections to downstream nodes */}
            <Handle 
                type="source" 
                position={Position.Bottom} 
                className="w-3.5 h-3.5 border-2 border-slate-950 bg-indigo-400 !-bottom-1.75 transition-colors hover:bg-indigo-300" 
            />
            
            {/* Delete button */}
            {!data.isMaster && (
                <button
                    onClick={handleDelete}
                    className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-red-500/90 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow border border-red-400/20"
                    title={t('Delete Document', 'حذف المستند')}
                >
                    ✕
                </button>
            )}

            <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-inner border transition-colors
                    ${selected 
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' 
                        : 'bg-slate-800 border-slate-700/50 text-indigo-500'
                    }
                `}>
                    📄
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate" title={data.label}>
                        {data.label}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-indigo-400 font-mono tracking-wider uppercase font-semibold">
                            {data.isMaster ? t('MASTER PAPERS', 'المستند الرئيسي') : t('PAPER VIEW', 'ورقة بحثية')}
                        </span>
                        <span className="text-[8px] bg-slate-800 text-slate-400 px-1 rounded-sm border border-slate-700/50">
                            {data.status || 'draft'}
                        </span>
                    </div>
                </div>
            </div>
            
            {data.abstract ? (
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-3 italic">
                    {data.abstract}
                </p>
            ) : (
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    {t('No abstract defined yet.', 'لم يتم تحديد ملخص بعد.')}
                </p>
            )}

            {/* Quick Actions */}
            <div className="mt-2 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                <div className="text-[10px] text-slate-500 font-mono">
                    {data.sectionsCount || 0} {t('sections connected', 'أقسام متصلة')}
                </div>
            </div>
        </div>
    );
}
