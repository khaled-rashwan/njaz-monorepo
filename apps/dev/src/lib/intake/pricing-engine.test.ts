import { describe, it, expect } from 'vitest';
import { calculateEstimate, formatCurrency } from './pricing-engine';
import type { IntakeFormData } from './types';

describe('calculateEstimate', () => {
    it('returns zeroes when no project types are selected', () => {
        const emptyData: IntakeFormData = {
            projectTypes: [],
            features: {} as any,
            timeline: 'standard',
            budgetRange: 'small',
        } as any;
        const estimate = calculateEstimate(emptyData);
        expect(estimate.priceMin).toBe(0);
        expect(estimate.priceMax).toBe(0);
        expect(estimate.estimatedWeeks).toBe(0);
        expect(estimate.complexityScore).toBe(0);
    });

    it('calculates base website pricing with standard timeline', () => {
        const data: IntakeFormData = {
            projectTypes: ['website'],
            features: {} as any,
            timeline: 'standard',
        } as any;
        const estimate = calculateEstimate(data);
        expect(estimate.priceMin).toBe(3000);
        expect(estimate.priceMax).toBe(8000);
        expect(estimate.estimatedWeeks).toBe(6);
    });

    it('adds feature add-on costs properly', () => {
        const data: IntakeFormData = {
            projectTypes: ['website'],
            features: {
                cms: true, // +800 min, +2000 max
            } as any,
            timeline: 'standard',
        } as any;
        const estimate = calculateEstimate(data);
        expect(estimate.priceMin).toBe(3800);
        expect(estimate.priceMax).toBe(10000);
    });

    it('applies rush timeline multipliers (1.5x price, compressed weeks)', () => {
        const data: IntakeFormData = {
            projectTypes: ['website'],
            features: {} as any,
            timeline: 'rush',
        } as any;
        const estimate = calculateEstimate(data);
        expect(estimate.priceMin).toBe(Math.round(3000 * 1.5));
        expect(estimate.priceMax).toBe(Math.round(8000 * 1.5));
        expect(estimate.estimatedWeeks).toBe(Math.round(6 * 0.3));
    });
});

describe('formatCurrency', () => {
    it('formats numbers as USD currency string', () => {
        expect(formatCurrency(5000)).toMatch(/\$5,000/);
    });
});
