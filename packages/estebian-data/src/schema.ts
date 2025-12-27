import { a, type ClientSchema } from '@aws-amplify/backend';

/**
 * Estebian Data Schema
 * 
 * Psychometric survey platform with:
 * - Scales (measurement instruments with dimensions and statements)
 * - Surveys (assembled from scales with demographics)
 * - Responses (participant answers)
 * - Reports (generated analysis - premium feature)
 */

export const estebianSchema = {
    // ============================================
    // SCALE - Psychometric measurement instrument
    // ============================================
    EstebianScale: a
        .model({
            language: a.enum(['ar', 'en']),
            title: a.string().required(),
            description: a.string(),
            isPublic: a.boolean().default(true),
            // Dimensions: Array of { id, name, statements: [{ id, text, isReversed }] }
            dimensions: a.json().required(),
            // Options: Array of { id, label, value } (e.g., Likert scale)
            options: a.json().required(),
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['admins']),
            allow.groups(['estebian-access']),
            // Public scales readable by authenticated users
            allow.authenticated().to(['read']),
        ]),

    // ============================================
    // SURVEY - Assessment instrument
    // ============================================
    EstebianSurvey: a
        .model({
            language: a.enum(['ar', 'en']),
            title: a.string().required(),
            introduction: a.string(),
            isPublished: a.boolean().default(false),
            publishedUrl: a.string(),
            // Demographics: Array of { id, type, label, required, options? }
            demographics: a.json(),
            // Scale IDs in order of appearance
            scaleIds: a.string().array().required(),
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['admins']),
            allow.groups(['estebian-access']),
            // Published surveys readable by anyone (for respondents)
            allow.guest().to(['read']),
        ]),

    // ============================================
    // RESPONSE - Participant submission
    // ============================================
    EstebianResponse: a
        .model({
            surveyId: a.id().required(),
            submittedAt: a.datetime().required(),
            // Demographics: Record<fieldId, value>
            demographics: a.json(),
            // Answers: Record<statementId, selectedOptionValue>
            answers: a.json().required(),
            // Optional respondent identifier (anonymous by default)
            respondentId: a.string(),
        })
        .authorization((allow) => [
            // Anyone can create (anonymous responses)
            allow.guest().to(['create']),
            // Owner of the survey can read responses
            allow.groups(['admins']),
            allow.groups(['estebian-access']).to(['read']),
        ]),

    // ============================================
    // REPORT - Generated analysis (Premium)
    // ============================================
    EstebianReport: a
        .model({
            surveyId: a.id().required(),
            type: a.enum(['demographic', 'scale', 'comprehensive']),
            isPaid: a.boolean().default(false),
            // Report data (charts, statistics, etc.)
            data: a.json(),
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['admins']),
            allow.groups(['estebian-access']),
        ]),
};

// Type export for frontend usage
export type EstebianSchemaType = typeof estebianSchema;
