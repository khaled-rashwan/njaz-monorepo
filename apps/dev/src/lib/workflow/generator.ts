// ============================================
// Workflow Engine — Generator
// ============================================
// Takes intake form data and produces a structured workflow
// by combining templates for selected project types.

import type { IntakeFormData } from '../intake/types';
import type { GeneratedWorkflow, WorkflowPhase } from './types';
import { WORKFLOW_TEMPLATES } from './templates';

/**
 * Generate a unified project workflow from the intake form data.
 *
 * The generator:
 * 1. Selects the templates for all chosen project types.
 * 2. Merges phases (shared setup phases are de-duplicated).
 * 3. Adds conditional phases based on selected features.
 * 4. Calculates total estimated hours & weeks.
 */
export function generateWorkflow(formData: IntakeFormData): GeneratedWorkflow {
    const { projectTypes, features, timeline } = formData;

    if (projectTypes.length === 0) {
        return {
            phases: [],
            totalEstimatedHours: 0,
            totalEstimatedWeeks: 0,
            generatedAt: new Date().toISOString(),
            includedTypes: [],
            activeFeatures: [],
        };
    }

    // 1. Collect phases from each selected project type
    const allPhases: WorkflowPhase[] = [];
    const seenPhaseIds = new Set<string>();

    for (const pt of projectTypes) {
        const template = WORKFLOW_TEMPLATES[pt];
        if (!template) continue;

        for (const phase of template.phases) {
            if (!seenPhaseIds.has(phase.id)) {
                seenPhaseIds.add(phase.id);
                allPhases.push({ ...phase, tasks: [...phase.tasks] });
            }
        }
    }

    // 2. Add conditional feature-specific tasks
    const activeFeatureKeys = Object.entries(features)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key);

    const featureTaskMap: Record<string, { phase: string; task: import('./types').WorkflowTask }> = {
        multilingual: {
            phase: 'web-dev',
            task: { title: 'Implement i18n/RTL support', titleAr: 'تنفيذ دعم تعدد اللغات', type: 'development', estimatedHours: 12, priority: 'high' },
        },
        auth_system: {
            phase: 'web-backend',
            task: { title: 'Implement authentication system', titleAr: 'تنفيذ نظام المصادقة', type: 'development', estimatedHours: 14, priority: 'high' },
        },
        ecommerce_module: {
            phase: 'web-dev',
            task: { title: 'Build e-commerce module', titleAr: 'بناء وحدة التجارة الإلكترونية', type: 'development', estimatedHours: 24, priority: 'high' },
        },
        payment_integration: {
            phase: 'ecom-dev',
            task: { title: 'Integrate payment gateway', titleAr: 'دمج بوابة الدفع', type: 'development', estimatedHours: 16, priority: 'high' },
        },
        push_notifications: {
            phase: 'mobile-dev',
            task: { title: 'Implement push notifications', titleAr: 'تنفيذ الإشعارات الفورية', type: 'development', estimatedHours: 10, priority: 'medium' },
        },
        offline_mode: {
            phase: 'mobile-dev',
            task: { title: 'Implement offline mode', titleAr: 'تنفيذ وضع عدم الاتصال', type: 'development', estimatedHours: 16, priority: 'medium' },
        },
        cms: {
            phase: 'web-backend',
            task: { title: 'Set up CMS integration', titleAr: 'إعداد تكامل CMS', type: 'development', estimatedHours: 14, priority: 'medium' },
        },
        admin_dashboard: {
            phase: 'web-dev',
            task: { title: 'Build admin dashboard', titleAr: 'بناء لوحة التحكم الإدارية', type: 'development', estimatedHours: 20, priority: 'medium' },
        },
        containerization: {
            phase: 'cloud-setup',
            task: { title: 'Docker & Kubernetes setup', titleAr: 'إعداد Docker و Kubernetes', type: 'setup', estimatedHours: 16, priority: 'high' },
        },
        ci_cd: {
            phase: 'cloud-setup',
            task: { title: 'CI/CD pipeline configuration', titleAr: 'إعداد خط أنابيب CI/CD', type: 'setup', estimatedHours: 12, priority: 'high' },
        },
    };

    for (const featureKey of activeFeatureKeys) {
        const mapping = featureTaskMap[featureKey];
        if (!mapping) continue;

        const targetPhase = allPhases.find(p => p.id === mapping.phase);
        if (targetPhase) {
            targetPhase.tasks.push(mapping.task);
        }
    }

    // 3. Apply timeline multiplier to hours
    const timelineMultipliers: Record<string, number> = {
        standard: 1.0,
        accelerated: 0.55,
        rush: 0.30,
    };
    const weekMultiplier = timelineMultipliers[timeline] || 1.0;

    // 4. Calculate totals
    let totalEstimatedHours = 0;
    for (const phase of allPhases) {
        for (const task of phase.tasks) {
            totalEstimatedHours += task.estimatedHours;
        }
    }

    const rawWeeks = totalEstimatedHours / 40; // 40-hour work week
    const totalEstimatedWeeks = Math.max(2, Math.ceil(rawWeeks * weekMultiplier));

    return {
        phases: allPhases,
        totalEstimatedHours,
        totalEstimatedWeeks,
        generatedAt: new Date().toISOString(),
        includedTypes: [...projectTypes],
        activeFeatures: activeFeatureKeys,
    };
}
