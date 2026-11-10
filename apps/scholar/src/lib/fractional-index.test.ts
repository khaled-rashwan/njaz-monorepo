import { describe, it, expect } from 'vitest';
import {
    generateOrderBetween,
    generateOrderAtEnd,
    generateOrderAtStart,
    generateOrderAfter,
    needsRebalancing,
    rebalanceOrders,
    sortByOrder,
} from './fractional-index';

describe('generateOrderBetween', () => {
    it('returns the default gap for an empty list', () => {
        expect(generateOrderBetween(null, null)).toBe(1);
    });

    it('bisects between neighbours', () => {
        expect(generateOrderBetween(1, 2)).toBe(1.5);
    });

    it('handles open-ended boundaries', () => {
        expect(generateOrderBetween(null, 2)).toBe(1);
        expect(generateOrderBetween(3, null)).toBe(4);
    });

    it('always lands strictly between its neighbours', () => {
        let lo = 1;
        const hi = 2;
        for (let i = 0; i < 30; i++) {
            const mid = generateOrderBetween(lo, hi);
            expect(mid).toBeGreaterThan(lo);
            expect(mid).toBeLessThan(hi);
            lo = mid;
        }
    });
});

describe('start / end / after helpers', () => {
    const blocks = [{ orderIndex: 1 }, { orderIndex: 2 }, { orderIndex: 3 }];

    it('appends after the max and prepends before the min', () => {
        expect(generateOrderAtEnd(blocks)).toBe(4);
        expect(generateOrderAtStart(blocks)).toBe(0.5);
        expect(generateOrderAtEnd([])).toBe(1);
        expect(generateOrderAtStart([])).toBe(1);
    });

    it('inserts after a middle block at the midpoint', () => {
        expect(generateOrderAfter(blocks[0], blocks)).toBe(1.5);
    });

    it('inserts after the last block with a full gap', () => {
        expect(generateOrderAfter(blocks[2], blocks)).toBe(4);
    });

    it('falls back to appending when the target is unknown', () => {
        expect(generateOrderAfter({ orderIndex: 99 }, blocks)).toBe(4);
    });
});

describe('rebalancing', () => {
    it('detects gaps below the minimum threshold', () => {
        expect(needsRebalancing([{ orderIndex: 1 }, { orderIndex: 1.000001 }])).toBe(true);
        expect(needsRebalancing([{ orderIndex: 1 }, { orderIndex: 2 }])).toBe(false);
    });

    it('produces evenly spaced indexes', () => {
        expect(rebalanceOrders(3)).toEqual([1, 2, 3]);
        expect(rebalanceOrders(0)).toEqual([]);
    });

    it('sorts without mutating the input', () => {
        const input = [{ orderIndex: 3 }, { orderIndex: 1 }, { orderIndex: 2 }];
        const sorted = sortByOrder(input);
        expect(sorted.map(b => b.orderIndex)).toEqual([1, 2, 3]);
        expect(input.map(b => b.orderIndex)).toEqual([3, 1, 2]);
    });
});
