'use client';

import { ReactNode } from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    icon: string;
    color: 'cyan' | 'gold' | 'purple' | 'pink' | 'blue';
}

const colorStyles = {
    cyan: {
        gradient: 'from-cyan-500/20 to-blue-500/20',
        border: 'border-cyan-500/30',
        text: 'text-cyan-400',
        glow: 'shadow-cyan-500/20',
    },
    gold: {
        gradient: 'from-amber-500/20 to-orange-500/20',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        glow: 'shadow-amber-500/20',
    },
    purple: {
        gradient: 'from-purple-500/20 to-pink-500/20',
        border: 'border-purple-500/30',
        text: 'text-purple-400',
        glow: 'shadow-purple-500/20',
    },
    pink: {
        gradient: 'from-pink-500/20 to-rose-500/20',
        border: 'border-pink-500/30',
        text: 'text-pink-400',
        glow: 'shadow-pink-500/20',
    },
    blue: {
        gradient: 'from-blue-500/20 to-indigo-500/20',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        glow: 'shadow-blue-500/20',
    },
};

/**
 * Premium Stats Card Component
 * 
 * Displays key metrics with animated numbers, trends, and visual flair
 */
export function StatCard({ title, value, change, trend = 'neutral', icon, color }: StatCardProps) {
    const styles = colorStyles[color];

    const trendIcon = {
        up: '↗',
        down: '↘',
        neutral: '→',
    }[trend];

    const trendColor = {
        up: 'text-emerald-400',
        down: 'text-red-400',
        neutral: 'text-slate-400',
    }[trend];

    return (
        <div className={`
            group relative overflow-hidden rounded-2xl 
            bg-gradient-to-br ${styles.gradient}
            border ${styles.border}
            backdrop-blur-xl
            p-6
            transition-all duration-300
            hover:scale-[1.02] hover:-translate-y-1
            hover:shadow-2xl ${styles.glow}
            cursor-default
        `}>
            {/* Background gradient orb */}
            <div className={`
                absolute -top-10 -right-10 w-32 h-32 
                bg-gradient-to-br ${styles.gradient}
                rounded-full blur-3xl opacity-30
                group-hover:opacity-50 transition-opacity duration-500
            `} />

            {/* Content */}
            <div className="relative z-10">
                {/* Icon & Title Row */}
                <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl group-hover:scale-110 transition-transform duration-300">
                        {icon}
                    </span>
                    <span className={`text-sm font-medium ${styles.text}`}>
                        {title}
                    </span>
                </div>

                {/* Value - Large number */}
                <div className={`text-4xl font-bold text-white mb-2 tabular-nums tracking-tight`}>
                    {value}
                </div>

                {/* Change indicator */}
                {change && (
                    <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                        <span className="text-base">{trendIcon}</span>
                        <span>{change}</span>
                    </div>
                )}
            </div>

            {/* Animated shimmer effect on hover */}
            <div className="
                absolute inset-0 
                bg-gradient-to-r from-transparent via-white/5 to-transparent
                -translate-x-full group-hover:translate-x-full
                transition-transform duration-1000
            " />
        </div>
    );
}

/**
 * Stats Grid Container
 */
interface StatsGridProps {
    children: ReactNode;
}

export function StatsGrid({ children }: StatsGridProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {children}
        </div>
    );
}
