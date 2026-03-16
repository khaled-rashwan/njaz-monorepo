'use client';

import React from 'react';
import { Scale } from '@/lib/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ScaleCardProps {
    scale: Scale;
    onRemove: () => void;
    language: 'ar' | 'en';
    index: number;
}

export default function ScaleCard({ scale, onRemove, language, index }: ScaleCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: scale.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 1,
    };

    const totalStatements = scale.statements.length;
    const isRtl = scale.language === 'ar';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative group animate-fade-in"
        >
            {/* Connection Line from top */}
            <div className="absolute left-1/2 -top-6 w-0.5 h-6 bg-gradient-to-b from-purple-500/50 to-purple-500 -translate-x-1/2" />

            {/* Connection Dot */}
            <div className="absolute left-1/2 -top-2 w-3 h-3 rounded-full bg-purple-500 -translate-x-1/2 shadow-lg shadow-purple-500/50" />

            {/* Card */}
            <div className={`
                relative p-4 rounded-xl 
                bg-gradient-to-br from-slate-800/80 to-slate-900/80
                border border-purple-500/30 
                hover:border-purple-500/60
                shadow-lg shadow-purple-500/10
                hover:shadow-purple-500/20
                transition-all duration-300
                ${isDragging ? 'scale-105 shadow-2xl shadow-purple-500/30' : 'group-hover:scale-[1.02]'}
            `}>
                {/* Glow Effect */}
                <div className="absolute inset-0 rounded-xl bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Drag Handle - Always visible for discoverability */}
                <button
                    {...attributes}
                    {...listeners}
                    className="absolute top-2 left-2 p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 
                               hover:text-cyan-300 hover:bg-cyan-500/30 cursor-grab active:cursor-grabbing
                               transition-all touch-none border border-cyan-500/30"
                    title={language === 'ar' ? 'اسحب لإعادة الترتيب' : 'Drag to reorder'}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                </button>

                {/* Remove Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-500 
                               flex items-center justify-center text-white opacity-0 group-hover:opacity-100
                               transition-all duration-200 shadow-lg z-10"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Scale Icon */}
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3 mt-2">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                </div>

                {/* Order Badge */}
                <div className="absolute top-2 right-8 w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-cyan-400">{index + 1}</span>
                </div>

                {/* Scale Title */}
                <h4
                    className="font-bold text-white text-sm mb-1 line-clamp-2"
                    dir={isRtl ? 'rtl' : 'ltr'}
                >
                    {scale.title}
                </h4>

                {/* Scale Info */}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        {scale.dimensions.length}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        {totalStatements}
                    </span>
                </div>

                {/* Language Badge */}
                <div className={`absolute top-2 ${isRtl ? 'left-10' : 'right-8'}`}>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${scale.language === 'ar'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-orange-500/20 text-orange-400'
                        }`}>
                        {scale.language === 'ar' ? 'ع' : 'EN'}
                    </span>
                </div>
            </div>
        </div>
    );
}
