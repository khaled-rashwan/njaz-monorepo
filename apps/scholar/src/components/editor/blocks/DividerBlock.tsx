'use client';

import { BlockProps } from '@/types';

export function DividerBlock({ block, isFocused, onContentChange, onFocus }: BlockProps) {
    return (
        <div className="w-full py-3 flex items-center justify-center" onClick={onFocus}>
            <div className={`
                w-full h-px transition-colors
                ${isFocused
                    ? 'bg-gradient-to-r from-transparent via-amber-500/40 to-transparent'
                    : 'bg-gradient-to-r from-transparent via-slate-700/50 to-transparent'
                }
            `} />
        </div>
    );
}
