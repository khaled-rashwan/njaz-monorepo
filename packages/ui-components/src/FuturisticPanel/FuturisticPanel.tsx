'use client';

import { ReactNode } from 'react';

interface FuturisticPanelProps {
    children: ReactNode;
    title?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    glowColor?: 'cyan' | 'purple' | 'gold' | 'green' | 'pink';
}

const glowColors = {
    cyan: {
        border: 'border-cyan-500/30',
        shadow: 'shadow-cyan-500/20',
        text: 'text-cyan-400',
        glow: 'rgba(56, 205, 223, 0.3)',
    },
    purple: {
        border: 'border-purple-500/30',
        shadow: 'shadow-purple-500/20',
        text: 'text-purple-400',
        glow: 'rgba(139, 92, 246, 0.3)',
    },
    gold: {
        border: 'border-amber-500/30',
        shadow: 'shadow-amber-500/20',
        text: 'text-amber-400',
        glow: 'rgba(245, 158, 11, 0.3)',
    },
    green: {
        border: 'border-emerald-500/30',
        shadow: 'shadow-emerald-500/20',
        text: 'text-emerald-400',
        glow: 'rgba(16, 185, 129, 0.3)',
    },
    pink: {
        border: 'border-pink-500/30',
        shadow: 'shadow-pink-500/20',
        text: 'text-pink-400',
        glow: 'rgba(236, 72, 153, 0.3)',
    },
};

/**
 * Futuristic Panel Component
 * 
 * Sci-fi styled panel with glowing borders, beveled corners, and glass effect
 */
export function FuturisticPanel({
    children,
    title,
    className = '',
    size = 'md',
    glowColor = 'cyan'
}: FuturisticPanelProps) {
    const colors = glowColors[glowColor];

    const sizeClasses = {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };

    return (
        <div
            className={`
                futuristic-panel relative overflow-hidden
                bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90
                backdrop-blur-xl
                border ${colors.border}
                rounded-lg
                ${sizeClasses[size]}
                transition-all duration-300
                hover:shadow-2xl hover:${colors.shadow}
                group
                ${className}
            `}
            style={{
                clipPath: 'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))',
                boxShadow: `0 0 30px ${colors.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
            }}
        >
            {/* Corner accents */}
            <div className="absolute top-0 left-3 w-8 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />
            <div className="absolute top-3 left-0 w-[2px] h-8 bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-60" />
            <div className="absolute bottom-0 right-3 w-8 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />
            <div className="absolute bottom-3 right-0 w-[2px] h-8 bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-60" />

            {/* Scan line effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{ animation: 'scan 3s linear infinite' }}
            />

            {/* Title */}
            {title && (
                <div className={`text-xs font-bold uppercase tracking-widest ${colors.text} mb-4 flex items-center gap-2`}>
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    {title}
                </div>
            )}

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}

/**
 * Big Number Display for stats
 */
interface BigNumberProps {
    value: number | string;
    label?: string;
    color?: 'cyan' | 'purple' | 'gold' | 'green' | 'white';
}

export function BigNumber({ value, label, color = 'white' }: BigNumberProps) {
    const colorClasses = {
        cyan: 'text-cyan-400',
        purple: 'text-purple-400',
        gold: 'text-amber-400',
        green: 'text-emerald-400',
        white: 'text-white',
    };

    return (
        <div className="relative">
            <div className={`text-5xl md:text-6xl font-black tabular-nums ${colorClasses[color]}`}
                style={{ textShadow: '0 0 30px currentColor' }}
            >
                {value}
            </div>
            {label && (
                <div className="text-sm text-slate-400 mt-1">{label}</div>
            )}
        </div>
    );
}

/**
 * Mini Bar Chart
 */
interface MiniBarChartProps {
    data: number[];
    color?: 'cyan' | 'purple' | 'gold' | 'green';
}

export function MiniBarChart({ data, color = 'purple' }: MiniBarChartProps) {
    const maxValue = Math.max(...data);

    const gradients = {
        cyan: 'from-cyan-600 to-cyan-400',
        purple: 'from-purple-600 to-purple-400',
        gold: 'from-amber-600 to-amber-400',
        green: 'from-emerald-600 to-emerald-400',
    };

    return (
        <div className="flex items-end gap-1 h-16">
            {data.map((value, i) => (
                <div
                    key={i}
                    className={`flex-1 bg-gradient-to-t ${gradients[color]} rounded-t opacity-80 hover:opacity-100 transition-all duration-300`}
                    style={{
                        height: `${(value / maxValue) * 100}%`,
                        boxShadow: `0 0 10px ${glowColors[color].glow}`,
                        transform: 'skewX(-3deg)',
                    }}
                />
            ))}
        </div>
    );
}

/**
 * Mini Line Chart with glow
 */
interface MiniLineChartProps {
    data: number[];
    color?: 'cyan' | 'purple' | 'gold' | 'green';
}

export function MiniLineChart({ data, color = 'green' }: MiniLineChartProps) {
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;

    const points = data.map((value, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((value - minValue) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    const areaPoints = `0,100 ${points} 100,100`;

    const strokeColors = {
        cyan: '#38CDDF',
        purple: '#A78BFA',
        gold: '#FBBF24',
        green: '#34D399',
    };

    return (
        <div className="h-12 w-full">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={strokeColors[color]} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={strokeColors[color]} stopOpacity="0" />
                    </linearGradient>
                    <filter id={`glow-${color}`}>
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <polygon
                    points={areaPoints}
                    fill={`url(#gradient-${color})`}
                />
                <polyline
                    points={points}
                    fill="none"
                    stroke={strokeColors[color]}
                    strokeWidth="2"
                    filter={`url(#glow-${color})`}
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
        </div>
    );
}

/**
 * Circular Action Button
 */
interface ActionButtonProps {
    icon: string;
    label: string;
    onClick?: () => void;
    color?: 'cyan' | 'purple' | 'gold' | 'green';
}

export function ActionButton({ icon, label, onClick, color = 'cyan' }: ActionButtonProps) {
    const colors = glowColors[color];

    return (
        <button
            onClick={onClick}
            className={`
                group flex flex-col items-center gap-2 p-4
                transition-all duration-300
                hover:scale-110
            `}
        >
            <div
                className={`
                    w-14 h-14 rounded-full
                    bg-gradient-to-br from-slate-800 to-slate-900
                    border ${colors.border}
                    flex items-center justify-center
                    text-2xl
                    transition-all duration-300
                    group-hover:shadow-lg
                `}
                style={{
                    boxShadow: `0 0 20px ${colors.glow}`,
                }}
            >
                {icon}
            </div>
            <span className="text-xs text-slate-400 group-hover:text-white transition-colors">
                {label}
            </span>
        </button>
    );
}

/**
 * Activity Log Item
 */
interface ActivityItemProps {
    timestamp: string;
    action: string;
    status?: 'completed' | 'pending' | 'error';
}

export function ActivityItem({ timestamp, action, status = 'completed' }: ActivityItemProps) {
    const statusColors = {
        completed: 'bg-emerald-500',
        pending: 'bg-amber-500',
        error: 'bg-red-500',
    };

    return (
        <div className="flex items-center gap-3 py-2 px-3 hover:bg-white/5 rounded transition-colors text-sm">
            <span className="text-cyan-400/70 font-mono text-xs w-20 flex-shrink-0">{timestamp}</span>
            <span className={`w-2 h-2 rounded-full ${statusColors[status]} flex-shrink-0`} />
            <span className="text-slate-300 truncate">{action}</span>
        </div>
    );
}
