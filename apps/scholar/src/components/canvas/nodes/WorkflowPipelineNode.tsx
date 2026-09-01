'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface WorkflowPipelineNodeProps {
    data: {
        label: string;
        pipelineVersion: 'V1' | 'V3';
        status: 'idle' | 'queued' | 'extracting' | 'success' | 'failed';
        confidenceAverage?: number;
        itemCount?: number;
        onExecute?: () => void;
        onDelete?: () => void;
    };
    selected: boolean;
}

function WorkflowPipelineNodeComponent({ data, selected }: WorkflowPipelineNodeProps) {
    const statusColors = {
        idle: 'bg-slate-700/50 text-slate-300 border-slate-600/50',
        queued: 'bg-blue-900/50 text-blue-300 border-blue-700/50 animate-pulse',
        extracting: 'bg-amber-900/50 text-amber-300 border-amber-700/50 animate-pulse',
        success: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50',
        failed: 'bg-red-950/70 text-red-300 border-red-700/50',
    };

    return (
        <div className={`p-4 rounded-xl border-2 transition-all w-64 bg-slate-900/90 backdrop-blur-md
            ${selected ? 'border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'border-slate-700/50 shadow-lg'}
        `}>
            {/* Input Handle (top) */}
            <Handle 
                type="target" 
                position={Position.Top} 
                className="w-3 h-3 border-2 border-slate-900 bg-slate-400 !-top-1.5" 
            />

            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-indigo-400 font-mono tracking-wider uppercase">
                    Workflow Pipeline Node
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full border ${statusColors[data.status] || statusColors.idle}`}>
                    {data.status.toUpperCase()}
                </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-inner border bg-slate-800 border-slate-700/50`}>
                    ⚙️
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{data.label}</h3>
                    <p className="text-[10px] text-slate-400">Version: {data.pipelineVersion}</p>
                </div>
            </div>

            {data.confidenceAverage !== undefined && data.status === 'success' && (
                <div className="mb-3 p-2 rounded bg-slate-800/60 border border-slate-700/30 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">Confidence Score:</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                        {Math.round(data.confidenceAverage * 100)}%
                    </span>
                </div>
            )}

            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onExecute?.();
                    }}
                    disabled={data.status === 'queued' || data.status === 'extracting'}
                    className="flex-1 text-[10px] font-semibold py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all text-center"
                >
                    {data.status === 'extracting' ? 'Extracting...' : 'Run Pipeline'}
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

export const WorkflowPipelineNode = memo(WorkflowPipelineNodeComponent);
