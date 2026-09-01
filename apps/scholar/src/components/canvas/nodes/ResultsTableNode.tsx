'use client';

import { memo, useState, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface ResultsTableNodeProps {
    data: {
        label: string;
        blockId: string;
        status: 'idle' | 'ready';
        columns?: string[];
        rows?: Record<string, string>[];
        summary?: string;
        onExportCsv?: () => void;
        onExportMarkdown?: () => void;
        onPushToDoc?: () => void;
        onDelete?: () => void;
    };
    selected: boolean;
}

function ResultsTableNodeComponent({ data, selected }: ResultsTableNodeProps) {
    const rowCount = data.rows?.length || 0;
    const colCount = data.columns?.length || 0;

    return (
        <div className={`p-4 rounded-xl border-2 transition-all w-80 bg-slate-900/90 backdrop-blur-md
            ${selected ? 'border-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.2)]' : 'border-slate-700/50 shadow-lg'}
        `}>
            <Handle 
                type="target" 
                position={Position.Top} 
                className="w-3 h-3 border-2 border-slate-900 bg-teal-400 !-top-1.5" 
            />

            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-teal-400 font-mono tracking-wider uppercase">
                    Results Table
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full border ${
                    rowCount > 0 
                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50' 
                        : 'bg-slate-700/50 text-slate-300 border-slate-600/50'
                }`}>
                    {rowCount > 0 ? `${rowCount} ROWS` : 'EMPTY'}
                </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-inner border bg-slate-800 border-slate-700/50">
                    📋
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{data.label}</h3>
                    <p className="text-[10px] text-slate-400">
                        {colCount > 0 ? `${colCount} columns × ${rowCount} rows` : 'Awaiting analysis results'}
                    </p>
                </div>
            </div>

            {/* Mini table preview */}
            {data.columns && data.columns.length > 0 && data.rows && data.rows.length > 0 && (
                <div className="mb-3 overflow-hidden rounded border border-slate-700/30">
                    <div className="overflow-x-auto max-h-24">
                        <table className="w-full text-[8px]">
                            <thead>
                                <tr className="bg-slate-800/80">
                                    {data.columns.slice(0, 4).map((col, i) => (
                                        <th key={i} className="px-1.5 py-1 text-left text-teal-400 font-semibold truncate max-w-[70px]">
                                            {col}
                                        </th>
                                    ))}
                                    {data.columns.length > 4 && (
                                        <th className="px-1.5 py-1 text-slate-500">+{data.columns.length - 4}</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {data.rows.slice(0, 3).map((row, i) => (
                                    <tr key={i} className="border-t border-slate-800/50">
                                        {data.columns!.slice(0, 4).map((col, j) => {
                                            const val = row[col];
                                            const displayVal = typeof val === 'object' && val !== null 
                                                ? JSON.stringify(val) 
                                                : String(val || '');
                                            return (
                                                <td key={j} className="px-1.5 py-0.5 text-slate-300 truncate max-w-[70px]" title={displayVal}>
                                                    {displayVal || '—'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                {data.rows.length > 3 && (
                                    <tr className="border-t border-slate-800/50">
                                        <td colSpan={Math.min(data.columns.length, 5)} className="px-1.5 py-0.5 text-slate-500 text-center italic">
                                            ...{data.rows.length - 3} more rows
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Summary */}
            {data.summary && (
                <div className="mb-3 p-2 rounded bg-slate-800/60 border border-slate-700/30">
                    <p className="text-[10px] text-slate-300 line-clamp-2">{data.summary}</p>
                </div>
            )}

            {/* Action buttons */}
            {rowCount > 0 && (
                <div className="flex gap-1.5 mt-3 pt-3 border-t border-slate-800">
                    <button
                        onClick={(e) => { e.stopPropagation(); data.onExportCsv?.(); }}
                        className="flex-1 text-[9px] font-semibold py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 transition-all text-center border border-slate-700/50"
                    >
                        📥 CSV
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); data.onExportMarkdown?.(); }}
                        className="flex-1 text-[9px] font-semibold py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 transition-all text-center border border-slate-700/50"
                    >
                        📄 Markdown
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); data.onPushToDoc?.(); }}
                        className="flex-1 text-[9px] font-semibold py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white transition-all text-center"
                    >
                        📝 Push
                    </button>
                </div>
            )}

            {data.onDelete && (
                <div className="flex justify-end mt-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); data.onDelete?.(); }}
                        className="p-1 px-2 text-[9px] font-semibold text-slate-500 hover:text-red-400 transition-all"
                    >
                        ✕ Remove
                    </button>
                </div>
            )}

            <Handle 
                type="source" 
                position={Position.Bottom} 
                className="w-3 h-3 border-2 border-slate-900 bg-teal-400 !-bottom-1.5" 
            />
        </div>
    );
}

export const ResultsTableNode = memo(ResultsTableNodeComponent);
