'use client';

import React from 'react';

interface SurveyCardProps {
    id: string;
    title: string;
    titleAr?: string;
    responses: number;
    isPublished: boolean;
    lastUpdate: string;
    language: 'ar' | 'en';
    onEdit: (id: string) => void;
    onResults: (id: string) => void;
    onCopyLink: (id: string) => void;
    onDelete: (id: string) => void;
}

export const SurveyCard: React.FC<SurveyCardProps> = ({
    id,
    title,
    titleAr,
    responses,
    isPublished,
    lastUpdate,
    language,
    onEdit,
    onResults,
    onCopyLink,
    onDelete,
}) => {
    return (
        <div className="relative group">
            {/* Background Glow Decor */}
            <div className="absolute -inset-1 bg-gradient-to-r from-stitch-primary/50 to-cyan-600/50 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative glass-card rounded-xl overflow-hidden flex flex-col">
                {/* Card Image/Header */}
                <div className="h-40 w-full relative bg-center bg-cover"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCHsNTaIQFbH46L9TSiJWlXQ59nyPnowzmYkfGOCzq98dBcI03o-oP_APaG8-14t8k3iEilLWyvtXRWHONmj-EroJ0w2DRpsGoNsYrvrlE9KcLQAnET27BqbEAuczVBsnRtrsz6X7e-K_gBSxevUzsD8mvSodrqclfYjU3R74mvSAmfNxmNi08hd1Y1HHMvSBgkVK_EVlNCzKETDjt2fkH3LnmxCU8g4lOleF1zgR1G1-KhUP6ZWwOeXL1eX8q7TBCklvVmkN1Ce4fw')" }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#191022] to-transparent"></div>
                    <div className="absolute top-4 left-4">
                        {isPublished ? (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-[#0bda73]/20 border border-[#0bda73]/40 rounded-full text-[#0bda73] text-[10px] font-bold uppercase status-glow">
                                <span className="size-1.5 rounded-full bg-[#0bda73] animate-pulse"></span>
                                Published
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-yellow-400 text-[10px] font-bold uppercase">
                                <span className="size-1.5 rounded-full bg-yellow-400"></span>
                                Draft
                            </span>
                        )}
                    </div>
                </div>
                {/* Card Content */}
                <div className="p-5 flex flex-col gap-6">
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white leading-snug" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                            {title}
                        </h3>
                        {titleAr && (
                            <h3 className="text-xl font-bold text-stitch-primary/90 leading-snug" dir="rtl">
                                {titleAr}
                            </h3>
                        )}
                    </div>
                    {/* Metrics */}
                    <div className="flex items-center justify-between border-y border-white/5 py-4">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-stitch-primary/10 flex items-center justify-center border border-stitch-primary/20">
                                <span className="material-symbols-outlined text-stitch-primary text-xl">groups</span>
                            </div>
                            <div>
                                <p className="text-xs text-white/50">Total Responses</p>
                                <p className="text-lg font-bold">{responses.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <p className="text-[10px] text-white/40 uppercase tracking-tighter">Last Update</p>
                            <p className="text-xs font-medium text-white/80">{lastUpdate}</p>
                        </div>
                    </div>
                    {/* Action Bar */}
                    <div className="grid grid-cols-4 gap-2">
                        <button
                            onClick={() => onEdit(id)}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-stitch-primary/10 transition-colors group/btn"
                        >
                            <div className="size-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover/btn:border-stitch-primary/50">
                                <span className="material-symbols-outlined text-white/70 group-hover/btn:text-stitch-primary transition-colors">edit</span>
                            </div>
                            <span className="text-[10px] font-medium text-white/50 group-hover/btn:text-white">Edit</span>
                        </button>
                        <button
                            onClick={() => onResults(id)}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-stitch-primary/10 transition-colors group/btn"
                        >
                            <div className="size-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover/btn:border-stitch-primary/50">
                                <span className="material-symbols-outlined text-white/70 group-hover/btn:text-stitch-primary transition-colors">monitoring</span>
                            </div>
                            <span className="text-[10px] font-medium text-white/50 group-hover/btn:text-white">Results</span>
                        </button>
                        <button
                            onClick={() => onCopyLink(id)}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-stitch-primary/10 transition-colors group/btn"
                        >
                            <div className="size-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover/btn:border-stitch-primary/50">
                                <span className="material-symbols-outlined text-white/70 group-hover/btn:text-stitch-primary transition-colors">content_copy</span>
                            </div>
                            <span className="text-[10px] font-medium text-white/50 group-hover/btn:text-white">Link</span>
                        </button>
                        <button
                            onClick={() => onDelete(id)}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-red-500/10 transition-colors group/btn"
                        >
                            <div className="size-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover/btn:border-red-500/50">
                                <span className="material-symbols-outlined text-white/70 group-hover/btn:text-red-500 transition-colors">delete</span>
                            </div>
                            <span className="text-[10px] font-medium text-white/50 group-hover/btn:text-white">Delete</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
