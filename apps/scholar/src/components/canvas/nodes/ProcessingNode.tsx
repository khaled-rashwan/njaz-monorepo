'use client';

import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';

interface ProcessingNodeProps {
    data: {
        label: string;
        blockId: string;
        status: 'idle' | 'processing' | 'success' | 'failed';
        totalPapers?: number;
        processedPapers?: number;
        duplicatesRemoved?: number;
        textsExtracted?: number;
        errorMessage?: string;
        onProcess?: () => void;
        onDelete?: () => void;
    };
    selected: boolean;
}

function ProcessingNodeComponent({ data, selected }: ProcessingNodeProps) {
    const statusConfig = {
        idle: { color: 'bg-slate-700/50 text-slate-300 border-slate-600/50', label: 'IDLE' },
        processing: { color: 'bg-cyan-900/50 text-cyan-300 border-cyan-700/50 animate-pulse', label: 'PROCESSING' },
        success: { color: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50', label: 'COMPLETE' },
        failed: { color: 'bg-red-950/70 text-red-300 border-red-700/50', label: 'FAILED' },
    };

    const status = statusConfig[data.status] || statusConfig.idle;
    const progress = data.totalPapers ? Math.round(((data.processedPapers || 0) / data.totalPapers) * 100) : 0;

    return (
        <div className={`p-4 rounded-xl border-2 transition-all w-72 bg-slate-900/90 backdrop-blur-md
            ${selected ? 'border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'border-slate-700/50 shadow-lg'}
        `}>
            <Handle 
                type="target" 
                position={Position.Top} 
                className="w-3 h-3 border-2 border-slate-900 bg-cyan-400 !-top-1.5" 
            />

            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-cyan-400 font-mono tracking-wider uppercase">
                    Processing Pipeline
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full border ${status.color}`}>
                    {status.label}
                </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-inner border bg-slate-800 border-slate-700/50">
                    🔄
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{data.label}</h3>
                    <p className="text-[10px] text-slate-400">Dedup → Extract → Clean</p>
                </div>
            </div>

            {/* Progress bar */}
            {data.status === 'processing' && data.totalPapers && (
                <div className="mb-3">
                    <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                        <span>Processing papers...</span>
                        <span>{data.processedPapers || 0}/{data.totalPapers}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Results summary */}
            {data.status === 'success' && (
                <div className="mb-3 space-y-1">
                    <div className="flex justify-between p-1.5 rounded bg-slate-800/60 border border-slate-700/30">
                        <span className="text-[10px] text-slate-400">Papers processed</span>
                        <span className="text-[10px] font-mono font-bold text-cyan-400">{data.processedPapers || 0}</span>
                    </div>
                    {(data.duplicatesRemoved ?? 0) > 0 && (
                        <div className="flex justify-between p-1.5 rounded bg-slate-800/60 border border-slate-700/30">
                            <span className="text-[10px] text-slate-400">Duplicates removed</span>
                            <span className="text-[10px] font-mono font-bold text-amber-400">{data.duplicatesRemoved}</span>
                        </div>
                    )}
                    <div className="flex justify-between p-1.5 rounded bg-slate-800/60 border border-slate-700/30">
                        <span className="text-[10px] text-slate-400">Texts extracted</span>
                        <span className="text-[10px] font-mono font-bold text-emerald-400">{data.textsExtracted || 0}</span>
                    </div>
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
                        data.onProcess?.();
                    }}
                    disabled={data.status === 'processing'}
                    className="flex-1 text-[10px] font-semibold py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white transition-all text-center"
                >
                    {data.status === 'processing' ? 'Processing...' : data.status === 'success' ? 'Re-process' : 'Process Papers'}
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
                className="w-3 h-3 border-2 border-slate-900 bg-cyan-400 !-bottom-1.5" 
            />
        </div>
    );
}

export const ProcessingNode = memo(ProcessingNodeComponent);
