'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface SimulationNodeProps {
    data: {
        label: string;
        status?: 'idle' | 'running' | 'success' | 'failed';
        snapshotDelta?: number;
        averageDelta?: number;
        onExecute?: () => void;
        onDelete?: () => void;
        parameters?: {
            timescale?: number;
            assetConfig?: string;
        };
    };
    selected: boolean;
}

function SimulationNodeComponent({ data, selected }: SimulationNodeProps) {
    const statusColors = {
        idle: 'bg-slate-700/50 text-slate-300 border-slate-600/50',
        running: 'bg-amber-900/50 text-amber-300 border-amber-700/50 animate-pulse',
        success: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50',
        failed: 'bg-red-950/70 text-red-300 border-red-700/50',
    };

    return (
        <div className={`p-4 rounded-xl border-2 transition-all w-64 bg-slate-900/90 backdrop-blur-md
            ${selected ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'border-slate-700/50 shadow-lg'}
        `}>
            {/* Input Handle (top) */}
            <Handle 
                type="target" 
                position={Position.Top} 
                className="w-3 h-3 border-2 border-slate-900 bg-slate-400 !-top-1.5" 
            />

            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-amber-400 font-mono tracking-wider uppercase">
                    Simulation Solver
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full border ${statusColors[data.status || 'idle']}`}>
                    {(data.status || 'idle').toUpperCase()}
                </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-inner border bg-slate-800 border-slate-700/50`}>
                    ⚡
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{data.label}</h3>
                    <p className="text-[10px] text-slate-400">
                        {data.parameters?.assetConfig || 'BESS'} ({data.parameters?.timescale || 1}m resolution)
                    </p>
                </div>
            </div>

            {data.snapshotDelta !== undefined && data.status === 'success' && (
                <div className="mb-3 space-y-1 p-2 rounded bg-slate-800/60 border border-slate-700/30">
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">Max Delta (Anomaly):</span>
                        <span className="font-mono font-bold text-amber-400">{data.snapshotDelta}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">Avg Trajectory Delta:</span>
                        <span className="font-mono font-bold text-slate-350">{data.averageDelta}%</span>
                    </div>
                </div>
            )}

            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onExecute?.();
                    }}
                    disabled={data.status === 'running'}
                    className="flex-1 text-[10px] font-semibold py-1.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white transition-all text-center"
                >
                    {data.status === 'running' ? 'Simulating...' : 'Run Simulation'}
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
        </div>
    );
}

export const SimulationNode = memo(SimulationNodeComponent);
