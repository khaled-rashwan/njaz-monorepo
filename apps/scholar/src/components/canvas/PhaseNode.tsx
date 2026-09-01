import { Handle, Position } from '@xyflow/react';

export function PhaseNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <div className={`p-4 rounded-xl border-2 transition-all w-64 bg-slate-900/90 backdrop-blur-md
            ${selected ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]' : 'border-slate-700/50 shadow-lg'}
            ${data.isHidden ? 'opacity-40 blur-[1px]' : ''}
        `}>
            {data.hasInput && (
                <Handle 
                    type="target" 
                    position={Position.Top} 
                    className="w-3 h-3 border-2 border-slate-900 bg-slate-400 !-top-1.5" 
                />
            )}
            
            <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-inner border 
                    ${selected ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-slate-800 border-slate-700/50 text-slate-400'}
                `}>
                    {data.icon}
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white">{data.label}</h3>
                    <p className="text-[10px] text-amber-500/80 font-mono tracking-wider uppercase">{data.phase}</p>
                </div>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                {data.description}
            </p>

            {data.stats && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 flex gap-2">
                    {data.stats.map((stat: any, i: number) => (
                        <span key={i} className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700/50">
                            {stat}
                        </span>
                    ))}
                </div>
            )}
            
            {data.hasOutput && (
                <Handle 
                    type="source" 
                    id="bottom"
                    position={Position.Bottom} 
                    className="w-3 h-3 border-2 border-slate-900 bg-slate-400 !-bottom-1.5" 
                />
            )}

            {data.hasRightOutput && (
                <Handle 
                    type="source" 
                    id="right"
                    position={Position.Right} 
                    className="w-3 h-3 border-2 border-slate-900 bg-slate-400 !-right-1.5" 
                />
            )}
        </div>
    );
}
