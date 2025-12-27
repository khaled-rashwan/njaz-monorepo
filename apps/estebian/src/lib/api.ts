/**
 * Estebian API Layer
 * 
 * Provides CRUD operations for Estebian data using Amplify Data client.
 * Replaces localStorage storage functions.
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@njaz/shared-backend/amplify/data/resource';

// Create typed Amplify Data client
const client = generateClient<Schema>();

// ============================================
// SCALE OPERATIONS
// ============================================

export interface ScaleInput {
    language: 'ar' | 'en';
    title: string;
    description?: string;
    isPublic?: boolean;
    dimensions: any; // JSON
    options: any; // JSON
}

export async function createScale(input: ScaleInput) {
    const { data, errors } = await client.models.EstebianScale.create({
        language: input.language,
        title: input.title,
        description: input.description,
        isPublic: input.isPublic ?? true,
        dimensions: input.dimensions,
        options: input.options,
    });

    if (errors) {
        console.error('Error creating scale:', errors);
        throw new Error(errors[0]?.message || 'Failed to create scale');
    }

    return data;
}

export async function getScales() {
    const { data, errors } = await client.models.EstebianScale.list();

    if (errors) {
        console.error('Error fetching scales:', errors);
        throw new Error(errors[0]?.message || 'Failed to fetch scales');
    }

    return data || [];
}

export async function getPublicScales() {
    const { data, errors } = await client.models.EstebianScale.list({
        filter: { isPublic: { eq: true } }
    });

    if (errors) {
        console.error('Error fetching public scales:', errors);
        throw new Error(errors[0]?.message || 'Failed to fetch public scales');
    }

    return data || [];
}

export async function getScaleById(id: string) {
    const { data, errors } = await client.models.EstebianScale.get({ id });

    if (errors) {
        console.error('Error fetching scale:', errors);
        throw new Error(errors[0]?.message || 'Failed to fetch scale');
    }

    return data;
}

export async function updateScale(id: string, input: Partial<ScaleInput>) {
    const { data, errors } = await client.models.EstebianScale.update({
        id,
        ...input,
    });

    if (errors) {
        console.error('Error updating scale:', errors);
        throw new Error(errors[0]?.message || 'Failed to update scale');
    }

    return data;
}

export async function deleteScale(id: string) {
    const { data, errors } = await client.models.EstebianScale.delete({ id });

    if (errors) {
        console.error('Error deleting scale:', errors);
        throw new Error(errors[0]?.message || 'Failed to delete scale');
    }

    return data;
}

// ============================================
// SURVEY OPERATIONS
// ============================================

export interface SurveyInput {
    language: 'ar' | 'en';
    title: string;
    introduction?: string;
    isPublished?: boolean;
    demographics?: any; // JSON
    scaleIds: string[];
}

export async function createSurvey(input: SurveyInput) {
    const { data, errors } = await client.models.EstebianSurvey.create({
        language: input.language,
        title: input.title,
        introduction: input.introduction,
        isPublished: input.isPublished ?? false,
        demographics: input.demographics,
        scaleIds: input.scaleIds,
    });

    if (errors) {
        console.error('Error creating survey:', errors);
        throw new Error(errors[0]?.message || 'Failed to create survey');
    }

    return data;
}

export async function getSurveys() {
    const { data, errors } = await client.models.EstebianSurvey.list();

    if (errors) {
        console.error('Error fetching surveys:', errors);
        throw new Error(errors[0]?.message || 'Failed to fetch surveys');
    }

    return data || [];
}

export async function getSurveyById(id: string) {
    const { data, errors } = await client.models.EstebianSurvey.get({ id });

    if (errors) {
        console.error('Error fetching survey:', errors);
        throw new Error(errors[0]?.message || 'Failed to fetch survey');
    }

    return data;
}

export async function updateSurvey(id: string, input: Partial<SurveyInput>) {
    const { data, errors } = await client.models.EstebianSurvey.update({
        id,
        ...input,
    });

    if (errors) {
        console.error('Error updating survey:', errors);
        throw new Error(errors[0]?.message || 'Failed to update survey');
    }

    return data;
}

export async function deleteSurvey(id: string) {
    const { data, errors } = await client.models.EstebianSurvey.delete({ id });

    if (errors) {
        console.error('Error deleting survey:', errors);
        throw new Error(errors[0]?.message || 'Failed to delete survey');
    }

    return data;
}

export async function publishSurvey(id: string) {
    return updateSurvey(id, { isPublished: true });
}

// ============================================
// RESPONSE OPERATIONS
// ============================================

export interface ResponseInput {
    surveyId: string;
    demographics?: any; // JSON
    answers: any; // JSON
    respondentId?: string;
}

export async function submitResponse(input: ResponseInput) {
    const { data, errors } = await client.models.EstebianResponse.create({
        surveyId: input.surveyId,
        submittedAt: new Date().toISOString(),
        demographics: input.demographics,
        answers: input.answers,
        respondentId: input.respondentId,
    });

    if (errors) {
        console.error('Error submitting response:', errors);
        throw new Error(errors[0]?.message || 'Failed to submit response');
    }

    return data;
}

export async function getResponses(surveyId: string) {
    const { data, errors } = await client.models.EstebianResponse.list({
        filter: { surveyId: { eq: surveyId } }
    });

    if (errors) {
        console.error('Error fetching responses:', errors);
        throw new Error(errors[0]?.message || 'Failed to fetch responses');
    }

    return data || [];
}

// ============================================
// REPORT OPERATIONS (Phase 2 - Premium)
// ============================================

export interface ReportInput {
    surveyId: string;
    type: 'demographic' | 'scale' | 'comprehensive';
    isPaid?: boolean;
    data?: any; // JSON
}

export async function createReport(input: ReportInput) {
    const { data, errors } = await client.models.EstebianReport.create({
        surveyId: input.surveyId,
        type: input.type,
        isPaid: input.isPaid ?? false,
        data: input.data,
    });

    if (errors) {
        console.error('Error creating report:', errors);
        throw new Error(errors[0]?.message || 'Failed to create report');
    }

    return data;
}

export async function getReports() {
    const { data, errors } = await client.models.EstebianReport.list();

    if (errors) {
        console.error('Error fetching reports:', errors);
        throw new Error(errors[0]?.message || 'Failed to fetch reports');
    }

    return data || [];
}

// ============================================
// UTILITY: Generate unique ID (fallback)
// ============================================

export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
