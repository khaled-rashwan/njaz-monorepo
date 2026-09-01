'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface StatisticalAnalysisNodeProps {
    data: {
        label: string;
        datasetPath?: string;
        status?: 'idle' | 'running' | 'success' | 'failed';
        onExecute?: () => void;
        onDelete?: () => void;
    };
    selected: boolean;
}

function StatisticalAnalysisNodeComponent({ data, selected }: StatisticalAnalysisNodeProps) {
    const statusColors = {
        idle: 'bg-slate-700/50 text-slate-300 border-slate-600/50',
        running: 'bg-cyan-900/50 text-cyan-300 border-cyan-700/50 animate-pulse',
        success: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50',
        failed: 'bg-red-950/70 text-red-300 border-red-700/50',
    };

    return (
        <div className={`p-4 rounded-xl border-2 transition-all w-64 bg-slate-900/90 backdrop-blur-md
            ${selected ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'border-slate-700/50 shadow-lg'}
        `}>
            {/* Input Handle (top) */}
            <Handle 
                type="target" 
                position={Position.Top} 
                className="w-3 h-3 border-2 border-slate-900 bg-slate-400 !-top-1.5" 
            />

            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-cyan-400 font-mono tracking-wider uppercase">
                    Statistical Analysis
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full border ${statusColors[data.status || 'idle']}`}>
                    {(data.status || 'idle').toUpperCase()}
                </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-inner border bg-slate-800 border-slate-700/50`}>
                    🧮
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{data.label}</h3>
                    <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                        {data.datasetPath ? `Data: ${data.datasetPath.split('/').pop()}` : 'No active dataset'}
                    </p>
                </div>
            </div>

            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onExecute?.();
                    }}
                    disabled={data.status === 'running'}
                    className="flex-1 text-[10px] font-semibold py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white transition-all text-center"
                >
                    {data.status === 'running' ? 'Analyzing...' : 'Run Statistics'}
                </button>
                {data.onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            data.onDelete?.();
                        }}
                        className="p-1 px-2 text-[10px] font-semibold text-slate-400 hover:text-red-400 bg-slate-850 hover:bg-slate-800 rounded transition-all"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Output Handle (bottom) */}
            <Handle 
                type="source" 
                position={Position.Bottom} 
                className="w-3 h-3 border-2 border-slate-900 bg-slate-400 !-bottom-1.5" 
            />
        </div>
    );
}

export const StatisticalAnalysisNode = memo(StatisticalAnalysisNodeComponent);
