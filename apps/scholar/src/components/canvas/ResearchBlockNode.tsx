'use client';

import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { ResearchBlockType } from '@/types';

interface ResearchBlockNodeData {
  label: string;
  blockType: ResearchBlockType;
  blockId: string;
  projectId: string;
  contentPreview?: string;
  itemCount?: number;
  onDelete?: (id: string) => void;
  onPush?: (blockId: string) => void;
  [key: string]: unknown;
}

const BLOCK_CONFIG: Record<ResearchBlockType, {
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
  glowColor: string;
  description: string;
}> = {
  'reference-collection': {
    icon: '📁',
    color: 'text-indigo-300',
    borderColor: 'border-indigo-500/40',
    bgColor: 'bg-indigo-950/60',
    glowColor: 'shadow-indigo-500/20',
    description: 'Curated subset of library papers for analytical pipelines',
  },
  'literature-search': {
    icon: '🔍',
    color: 'text-sky-300',
    borderColor: 'border-sky-500/40',
    bgColor: 'bg-sky-950/60',
    glowColor: 'shadow-sky-500/20',
    description: 'Search databases and collect references for the library',
  },
  'literature-survey': {
    icon: '📝',
    color: 'text-emerald-300',
    borderColor: 'border-emerald-500/40',
    bgColor: 'bg-emerald-950/60',
    glowColor: 'shadow-emerald-500/20',
    description: '(Legacy) Literature Survey Desk',
  },
  'dataset': {
    icon: '📊',
    color: 'text-amber-300',
    borderColor: 'border-amber-500/40',
    bgColor: 'bg-amber-950/60',
    glowColor: 'shadow-amber-500/20',
    description: 'Uploaded or pasted research data',
  },
  'analysis-result': {
    icon: '🧮',
    color: 'text-cyan-300',
    borderColor: 'border-cyan-500/40',
    bgColor: 'bg-cyan-950/60',
    glowColor: 'shadow-cyan-500/20',
    description: 'Statistical analysis output',
  },
  'notes': {
    icon: '💡',
    color: 'text-purple-300',
    borderColor: 'border-purple-500/40',
    bgColor: 'bg-purple-950/60',
    glowColor: 'shadow-purple-500/20',
    description: 'Free-form research notes',
  },
  'workflow-pipeline': {
    icon: '⚙️',
    color: 'text-indigo-400',
    borderColor: 'border-indigo-500/40',
    bgColor: 'bg-indigo-950/60',
    glowColor: 'shadow-indigo-500/20',
    description: 'Literature Survey Pipeline Agent',
  },
  'statistical-analysis': {
    icon: '🧮',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/40',
    bgColor: 'bg-cyan-950/60',
    glowColor: 'shadow-cyan-500/20',
    description: 'Statistical Data Aggregator Engine',
  },
  'simulation-engine': {
    icon: '⚡',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    bgColor: 'bg-amber-950/60',
    glowColor: 'shadow-amber-500/20',
    description: 'Trajectory Ramp Violation Simulation',
  },
  'processing-pipeline': {
    icon: '🔄',
    color: 'text-cyan-300',
    borderColor: 'border-cyan-500/40',
    bgColor: 'bg-cyan-950/60',
    glowColor: 'shadow-cyan-500/20',
    description: 'Deduplicate and extract text from papers',
  },
  'llm-analysis': {
    icon: '🤖',
    color: 'text-violet-300',
    borderColor: 'border-violet-500/40',
    bgColor: 'bg-violet-950/60',
    glowColor: 'shadow-violet-500/20',
    description: 'LLM-powered classification and analysis',
  },
  'results-table': {
    icon: '📋',
    color: 'text-teal-300',
    borderColor: 'border-teal-500/40',
    bgColor: 'bg-teal-950/60',
    glowColor: 'shadow-teal-500/20',
    description: 'Structured results table with export',
  },
};

function ResearchBlockNodeComponent({ data }: { data: ResearchBlockNodeData }) {
  const config = BLOCK_CONFIG[data.blockType] || BLOCK_CONFIG['notes'];
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div
      className={`
        relative rounded-xl border ${config.borderColor} ${config.bgColor}
        backdrop-blur-md shadow-lg ${config.glowColor}
        w-[240px] transition-all duration-300 hover:scale-[1.02]
        hover:shadow-xl group
        ${data.isHidden ? 'opacity-40 blur-[1px]' : ''}
      `}
    >
      {/* Input Handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-slate-500 !border-2 !border-slate-400 hover:!bg-white transition-colors"
      />

      {/* Output Handle (right) — for connecting to section nodes */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-slate-500 !border-2 !border-slate-400 hover:!bg-white transition-colors"
      />

      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-lg flex-shrink-0">{config.icon}</span>
          <div className="min-w-0 flex-1">
            <h3 className={`text-xs font-bold ${config.color} truncate`}>
              {data.label}
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-medium">
              {data.blockType.replace('-', ' ')}
            </p>
          </div>
        </div>

        {/* Delete trigger */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (showDeleteConfirm) {
              data.onDelete?.(data.blockId);
              setShowDeleteConfirm(false);
            } else {
              setShowDeleteConfirm(true);
              setTimeout(() => setShowDeleteConfirm(false), 3000);
            }
          }}
          className={`
            flex-shrink-0 p-1 rounded-md text-xs transition-all
            ${showDeleteConfirm 
              ? 'bg-red-500/20 text-red-400 opacity-100' 
              : 'text-slate-400 hover:text-red-400 opacity-60 hover:opacity-100 hover:bg-slate-800/50'}
          `}
          title={showDeleteConfirm ? 'Click again to confirm' : 'Delete block'}
        >
          {showDeleteConfirm ? '✕' : '🗑'}
        </button>
      </div>

      {/* Content Preview */}
      <div className="px-3 pb-2">
        {data.itemCount !== undefined && (
          <div className={`text-xs ${config.color} font-semibold`}>
            {data.itemCount} {data.itemCount === 1 ? 'item' : 'items'}
          </div>
        )}
        {data.contentPreview && (
          <p className="text-[11px] text-slate-400 line-clamp-3 mt-1 leading-relaxed">
            {data.contentPreview}
          </p>
        )}
        {!data.contentPreview && !data.itemCount && (
          <p className="text-[11px] text-slate-600 italic mt-1">
            {config.description}
          </p>
        )}
      </div>

      {/* Push to Section button */}
      <div className="px-3 pb-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onPush?.(data.blockId);
          }}
          className={`
            w-full text-[11px] font-semibold py-1.5 rounded-lg
            border ${config.borderColor} ${config.bgColor}
            ${config.color} hover:brightness-125
            transition-all duration-200
            flex items-center justify-center gap-1.5
          `}
        >
          <span>Push to Section</span>
          <span className="text-[10px]">→</span>
        </button>
      </div>
    </div>
  );
}

export const ResearchBlockNode = memo(ResearchBlockNodeComponent);
