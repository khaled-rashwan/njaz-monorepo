import { describe, it, expect } from 'vitest';
import { resolveRef } from './cross-reference';
import { BlockType } from '@/types';

describe('cross-reference bulk resolution', () => {
    const counterMap = new Map<string, { type: BlockType; counter: number }>();
    counterMap.set('eq6', { type: 'EQUATION', counter: 6 });
    counterMap.set('eq7', { type: 'EQUATION', counter: 7 });
    counterMap.set('eq8', { type: 'EQUATION', counter: 8 });
    counterMap.set('fig1', { type: 'FIGURE', counter: 1 });
    counterMap.set('fig2', { type: 'FIGURE', counter: 2 });
    counterMap.set('tbl1', { type: 'TABLE', counter: 1 });

    it('resolves two equations as "Equations 6 and 7"', () => {
        expect(resolveRef('eq6,eq7', counterMap)).toBe('Equations 6 and 7');
    });

    it('resolves three consecutive equations as "Equations 6-8"', () => {
        expect(resolveRef('eq6,eq7,eq8', counterMap)).toBe('Equations 6-8');
    });

    it('resolves two figures as "Figures 1 and 2"', () => {
        expect(resolveRef('fig1,fig2', counterMap)).toBe('Figures 1 and 2');
    });

    it('keeps mixed types distinct', () => {
        expect(resolveRef('fig1,tbl1', counterMap)).toBe('Figure 1, Table 1');
    });

    it('resolves single equation as "Equation 6"', () => {
        expect(resolveRef('eq6', counterMap)).toBe('Equation 6');
    });
});
