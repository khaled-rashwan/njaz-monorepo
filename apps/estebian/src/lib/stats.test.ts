import { describe, it, expect } from 'vitest';
import {
    mean,
    variance,
    stddev,
    pearsonCorrelation,
    cronbachAlpha,
    alphaIfItemDeleted,
    itemTotalCorrelation,
    buildItemMatrix,
    hasStraightLining,
    hasPatternedResponses,
} from './stats';

describe('descriptive statistics', () => {
    it('computes the mean and handles empty input', () => {
        expect(mean([1, 2, 3, 4])).toBe(2.5);
        expect(mean([])).toBe(0);
    });

    it('computes the sample variance (n - 1) and stddev', () => {
        // Sample variance of [2,4,4,4,5,5,7,9] is 32/7
        const data = [2, 4, 4, 4, 5, 5, 7, 9];
        expect(variance(data)).toBeCloseTo(32 / 7, 10);
        expect(stddev(data)).toBeCloseTo(Math.sqrt(32 / 7), 10);
        expect(variance([42])).toBe(0);
    });
});

describe('pearsonCorrelation', () => {
    it('returns +1 / -1 for perfectly linear data', () => {
        expect(pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 10);
        expect(pearsonCorrelation([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 10);
    });

    it('returns 0 when one variable has zero variance', () => {
        expect(pearsonCorrelation([1, 2, 3], [5, 5, 5])).toBe(0);
    });

    it('truncates to the shorter series', () => {
        expect(pearsonCorrelation([1, 2, 3, 99], [1, 2, 3])).toBeCloseTo(1, 10);
    });
});

describe('cronbachAlpha', () => {
    it('is 1 for perfectly consistent items', () => {
        const matrix = [
            [1, 1, 1],
            [2, 2, 2],
            [3, 3, 3],
            [4, 4, 4],
        ];
        expect(cronbachAlpha(matrix)).toBeCloseTo(1, 10);
    });

    it('matches a hand-computed reference value', () => {
        // Item variances: 1, 1, 1 (sum 3); total scores 6,9,9,12 -> variance 6
        // alpha = 3/2 * (1 - 3/6) = 0.75
        const matrix = [
            [1, 2, 3],
            [2, 3, 4],
            [3, 2, 4],
            [4, 3, 5],
        ];
        const itemVarSum = [0, 1, 2]
            .map(j => variance(matrix.map(r => r[j])))
            .reduce((a, b) => a + b, 0);
        const totalVar = variance(matrix.map(r => r.reduce((a, b) => a + b, 0)));
        const expected = (3 / 2) * (1 - itemVarSum / totalVar);
        expect(cronbachAlpha(matrix)).toBeCloseTo(expected, 10);
    });

    it('is clamped to [0, 1] and guards degenerate input', () => {
        const negativelyRelated = [
            [1, 5],
            [5, 1],
            [2, 4],
            [4, 2],
        ];
        expect(cronbachAlpha(negativelyRelated)).toBe(0);
        expect(cronbachAlpha([[1, 2, 3]])).toBe(0); // single respondent
        expect(cronbachAlpha([[1], [2], [3]])).toBe(0); // single item
    });

    it('alphaIfItemDeleted drops exactly the requested column', () => {
        const matrix = [
            [1, 1, 5],
            [2, 2, 1],
            [3, 3, 4],
            [4, 4, 2],
        ];
        // Removing the noisy third item leaves two identical items -> alpha 1
        expect(alphaIfItemDeleted(matrix, 2)).toBeCloseTo(1, 10);
    });

    it('itemTotalCorrelation uses the corrected (item-excluded) total', () => {
        const matrix = [
            [1, 1, 1],
            [2, 2, 2],
            [3, 3, 3],
        ];
        expect(itemTotalCorrelation(matrix, 0)).toBeCloseTo(1, 10);
    });
});

describe('buildItemMatrix', () => {
    const statements = [{ id: 'q1' }, { id: 'q2', isReversed: true }];

    it('reverse-scores flagged statements on the given scale', () => {
        const matrix = buildItemMatrix([{ answers: { q1: 5, q2: 5 } }], statements, 5, 1);
        expect(matrix).toEqual([[5, 1]]);
    });

    it('treats missing answers as 0 and drops fully empty responses', () => {
        const matrix = buildItemMatrix(
            [{ answers: { q1: 4 } }, { answers: {} }, {}],
            statements
        );
        expect(matrix).toEqual([[4, 0]]);
    });
});

describe('data-cleaning heuristics', () => {
    it('flags straight-lining only with 3+ identical items', () => {
        expect(hasStraightLining([3, 3, 3, 3])).toBe(true);
        expect(hasStraightLining([3, 3])).toBe(false);
        expect(hasStraightLining([3, 3, 4])).toBe(false);
    });

    it('flags ascending / descending runs of five', () => {
        expect(hasPatternedResponses([1, 2, 3, 4, 5])).toBe(true);
        expect(hasPatternedResponses([5, 4, 3, 2, 1, 3])).toBe(true);
        expect(hasPatternedResponses([1, 2, 3, 4, 4])).toBe(false);
    });

    it('flags alternating patterns of length 6+', () => {
        expect(hasPatternedResponses([5, 1, 5, 1, 5, 1])).toBe(true);
        expect(hasPatternedResponses([5, 1, 5, 1, 5, 2])).toBe(false);
    });
});
