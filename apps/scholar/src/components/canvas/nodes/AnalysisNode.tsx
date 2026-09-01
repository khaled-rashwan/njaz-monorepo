'use client';

import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';

interface AnalysisNodeProps {
    data: {
        label: string;
        blockId: string;
        status: 'idle' | 'analyzing' | 'success' | 'failed';
        prompt?: string;
        papersCount?: number;
        resultSummary?: string;
        errorMessage?: string;
        onAnalyze?: () => void;
        onDelete?: () => void;
    };
    selected: boolean;
}

function AnalysisNodeComponent({ data, selected }: AnalysisNodeProps) {
    const statusConfig = {
        idle: { color: 'bg-slate-700/50 text-slate-300 border-slate-600/50', label: 'IDLE' },
        analyzing: { color: 'bg-violet-900/50 text-violet-300 border-violet-700/50 animate-pulse', label: 'ANALYZING' },
        success: { color: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50', label: 'COMPLETE' },
        failed: { color: 'bg-red-950/70 text-red-300 border-red-700/50', label: 'FAILED' },
    };

    const status = statusConfig[data.status] || statusConfig.idle;

    return (
        <div className={`p-4 rounded-xl border-2 transition-all w-72 bg-slate-900/90 backdrop-blur-md
            ${selected ? 'border-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.2)]' : 'border-slate-700/50 shadow-lg'}
        `}>
            <Handle 
                type="target" 
                position={Position.Top} 
                className="w-3 h-3 border-2 border-slate-900 bg-violet-400 !-top-1.5" 
            />

            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-violet-400 font-mono tracking-wider uppercase">
                    LLM Analysis
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full border ${status.color}`}>
                    {status.label}
                </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-inner border bg-slate-800 border-slate-700/50">
                    🤖
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{data.label}</h3>
                    <p className="text-[10px] text-slate-400">
                        {data.papersCount ? `${data.papersCount} papers` : 'Prompt → Classify → Table'}
                    </p>
                </div>
            </div>

            {/* Prompt preview */}
            {data.prompt && (
                <div className="mb-3 p-2 rounded bg-slate-800/60 border border-slate-700/30">
                    <span className="text-[9px] text-slate-500 block mb-1">PROMPT</span>
                    <p className="text-[10px] text-violet-200 line-clamp-3 italic">{data.prompt}</p>
                </div>
            )}

            {/* Success summary */}
            {data.status === 'success' && data.resultSummary && (
                <div className="mb-3 p-2 rounded bg-emerald-950/30 border border-emerald-800/30">
                    <span className="text-[9px] text-emerald-500 block mb-1">RESULT</span>
                    <p className="text-[10px] text-emerald-200 line-clamp-2">{data.resultSummary}</p>
                </div>
            )}

            {/* Error message */}
            {data.status === 'failed' && data.errorMessage && (
                <div className="mb-3 p-2 rounded bg-red-950/40 border border-red-800/30">
                    <p className="text-[10px] text-red-300 line-clamp-2">{data.errorMessage}</p>
                </div>
            )}

            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onAnalyze?.();
                    }}
                    disabled={data.status === 'analyzing'}
                    className="flex-1 text-[10px] font-semibold py-1.5 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white transition-all text-center"
                >
                    {data.status === 'analyzing' ? 'Analyzing...' : data.status === 'success' ? 'Re-analyze' : 'Run Analysis'}
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

            <Handle 
                type="source" 
                position={Position.Bottom} 
                className="w-3 h-3 border-2 border-slate-900 bg-violet-400 !-bottom-1.5" 
            />
        </div>
    );
}

export const AnalysisNode = memo(AnalysisNodeComponent);
