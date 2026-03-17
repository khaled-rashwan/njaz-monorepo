// ============================================
// Client Intake Pipeline — Pricing Engine
// ============================================
// Pure-function pricing calculator.
// All prices in USD. Hardcoded multipliers.

import type {
    IntakeFormData,
    ProjectEstimate,
    ProjectType,
    FeatureKey,
    TimelineTier,
} from './types';

// ── Base Price Matrix (per project type) ────────────────
const BASE_PRICES: Record<ProjectType, { min: number; max: number; weeks: number }> = {
    website:    { min: 3000,  max: 8000,   weeks: 6 },
    mobile_app: { min: 8000,  max: 20000,  weeks: 10 },
    ecommerce:  { min: 6000,  max: 15000,  weeks: 8 },
    branding:   { min: 1500,  max: 5000,   weeks: 3 },
    campaign:   { min: 2000,  max: 6000,   weeks: 4 },
    cloud:      { min: 4000,  max: 12000,  weeks: 5 },
    seo:        { min: 1500,  max: 4000,   weeks: 4 },
};

// ── Feature Add-on Costs ────────────────────────────────
const FEATURE_COSTS: Record<FeatureKey, { min: number; max: number }> = {
    // Website / E-commerce
    cms:                    { min: 800,  max: 2000 },
    ecommerce_module:       { min: 2000, max: 5000 },
    auth_system:            { min: 600,  max: 1500 },
    blog:                   { min: 400,  max: 1000 },
    analytics:              { min: 500,  max: 1200 },
    seo_optimization:       { min: 600,  max: 1500 },
    multilingual:           { min: 800,  max: 2000 },
    admin_dashboard:        { min: 1200, max: 3000 },
    // Mobile
    push_notifications:     { min: 500,  max: 1200 },
    offline_mode:           { min: 800,  max: 2000 },
    payment_integration:    { min: 1000, max: 2500 },
    social_login:           { min: 400,  max: 800 },
    maps_location:          { min: 600,  max: 1500 },
    camera_media:           { min: 500,  max: 1200 },
    // Branding
    logo_design:            { min: 500,  max: 1500 },
    brand_guidelines:       { min: 800,  max: 2000 },
    stationery:             { min: 400,  max: 1000 },
    social_media_kit:       { min: 600,  max: 1500 },
    // Campaign
    social_media_management: { min: 800, max: 2000 },
    google_ads:             { min: 600,  max: 1500 },
    content_creation:       { min: 500,  max: 1200 },
    email_marketing:        { min: 400,  max: 1000 },
    // Cloud
    ci_cd:                  { min: 800,  max: 2000 },
    containerization:       { min: 1000, max: 2500 },
    monitoring:             { min: 600,  max: 1500 },
    infrastructure_setup:   { min: 1200, max: 3000 },
};

// ── Timeline Multipliers ────────────────────────────────
const TIMELINE_MULTIPLIERS: Record<TimelineTier, { factor: number; weeksMultiplier: number }> = {
    standard:    { factor: 1.0,  weeksMultiplier: 1.0 },
    accelerated: { factor: 1.25, weeksMultiplier: 0.55 },
    rush:        { factor: 1.50, weeksMultiplier: 0.30 },
};

// ── Complexity Scoring ──────────────────────────────────
function calculateComplexity(data: IntakeFormData): number {
    let score = 0;

    // Base complexity from number of project types
    score += data.projectTypes.length * 1.5;

    // Feature count adds complexity
    const featureCount = Object.values(data.features).filter(Boolean).length;
    score += featureCount * 0.4;

    // Certain features add extra complexity
    const highComplexityFeatures: FeatureKey[] = [
        'ecommerce_module', 'payment_integration', 'offline_mode',
        'containerization', 'admin_dashboard', 'multilingual',
    ];
    for (const f of highComplexityFeatures) {
        if (data.features[f]) score += 0.5;
    }

    // Rush timeline adds complexity (more coordination)
    if (data.timeline === 'rush') score += 1;
    if (data.timeline === 'accelerated') score += 0.5;

    return Math.min(10, Math.max(1, Math.round(score)));
}

// ── Main Calculator ─────────────────────────────────────
export function calculateEstimate(data: IntakeFormData): ProjectEstimate {
    // 1. Sum base prices for all selected project types
    let baseMin = 0;
    let baseMax = 0;
    let baseWeeks = 0;

    for (const pt of data.projectTypes) {
        const base = BASE_PRICES[pt];
        baseMin += base.min;
        baseMax += base.max;
        baseWeeks = Math.max(baseWeeks, base.weeks); // Parallel work, longest track
    }

    // If nothing selected, return zeroes
    if (data.projectTypes.length === 0) {
        return {
            priceMin: 0,
            priceMax: 0,
            estimatedWeeks: 0,
            complexityScore: 0,
            breakdown: {
                basePrice: { min: 0, max: 0, label: 'Base' },
                featuresCost: { min: 0, max: 0, label: 'Features' },
                timelineMultiplier: { factor: 1, label: 'Standard' },
                totalBeforeTimeline: { min: 0, max: 0 },
            },
        };
    }

    // 2. Add feature costs
    let featMin = 0;
    let featMax = 0;
    for (const [key, enabled] of Object.entries(data.features)) {
        if (enabled) {
            const cost = FEATURE_COSTS[key as FeatureKey];
            if (cost) {
                featMin += cost.min;
                featMax += cost.max;
            }
        }
    }

    const totalBeforeTimeline = {
        min: baseMin + featMin,
        max: baseMax + featMax,
    };

    // 3. Apply timeline multiplier
    const timeline = TIMELINE_MULTIPLIERS[data.timeline];
    const priceMin = Math.round(totalBeforeTimeline.min * timeline.factor);
    const priceMax = Math.round(totalBeforeTimeline.max * timeline.factor);
    const estimatedWeeks = Math.max(2, Math.round(baseWeeks * timeline.weeksMultiplier));

    // 4. Complexity score
    const complexityScore = calculateComplexity(data);

    // 5. Build breakdown
    const timelineLabel = data.timeline === 'standard'
        ? 'Standard (1×)'
        : data.timeline === 'accelerated'
            ? 'Accelerated (1.25×)'
            : 'Rush (1.5×)';

    return {
        priceMin,
        priceMax,
        estimatedWeeks,
        complexityScore,
        breakdown: {
            basePrice: { min: baseMin, max: baseMax, label: 'Base Project Cost' },
            featuresCost: { min: featMin, max: featMax, label: 'Feature Add-ons' },
            timelineMultiplier: { factor: timeline.factor, label: timelineLabel },
            totalBeforeTimeline,
        },
    };
}

/** Format a number as a USD currency string */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}
