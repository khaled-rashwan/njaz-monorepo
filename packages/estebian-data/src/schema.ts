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
            // Dimensions Metadata: Array of { id, name }
            dimensions: a.json().required(),
            // Flattened Statements: Array of { id, text, isReversed, dimensionId }
            // The array index strictly defines the display/user-defined order.
            statements: a.json().required(),
            // Options: Array of { id, label, value } (e.g., Likert scale)
            options: a.json().required(),
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['admins']),
            allow.groups(['estebian-access']),
            // Public scales readable by authenticated users and respondents (via API Key)
            allow.authenticated().to(['read']),
            allow.publicApiKey().to(['get']),
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
            // Scale IDs referenced
            scaleIds: a.string().array().required(),
            // Frozen copy of all scales at publish-time (Array of Scale objects)
            scaleSnapshots: a.json(),
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['admins']),
            allow.groups(['estebian-access']),
            // Published surveys readable by anyone (for respondents)
            allow.publicApiKey().to(['get']),
        ]),

    // ============================================
    // RESPONSE - Participant submission
    // ============================================
    EstebianResponse: a
        .model({
            surveyId: a.id().required(),
            // Store the creator's ID to allow them to see the results
            surveyOwner: a.string().required(),
            submittedAt: a.datetime().required(),
            // Demographics: Record<fieldId, value>
            demographics: a.json(),
            // Answers: Record<statementId, selectedOptionValue>
            answers: a.json().required(),
        })
        .authorization((allow) => [
            // The survey creator (owner of this record manually set) can read
            // We use identity claim check for the surveyOwner field
            allow.ownerDefinedIn('surveyOwner').to(['read', 'delete']),
            allow.groups(['admins']),
        ]),

    // ============================================
    // REPORT - Generated analysis (Premium)
    // ============================================
    EstebianReport: a
        .model({
            surveyId: a.id().required(),
            type: a.enum(['demographic', 'scale', 'comprehensive']),
            status: a.enum([
                'pending_payment',
                'payment_processing',
                'payment_verified',
                'computing',
                'generating_pdf',
                'completed',
                'payment_failed',
                'computation_failed'
            ]),
            
            // Payment tracking
            paymentId: a.string(),           // External payment gateway transaction ID
            paymentMethod: a.string(),       // 'moyasar' | 'stripe' | 'bypass'
            paymentAmount: a.float(),        // Amount charged
            paymentCurrency: a.string(),     // 'SAR' | 'USD'
            paidAt: a.datetime(),            // When payment was confirmed
            
            // Computation tracking
            stepFunctionExecutionId: a.string(),
            computeStartedAt: a.datetime(),
            computeCompletedAt: a.datetime(),
            errorMessage: a.string(),
            
            // Report output
            data: a.json(),                  // Computed statistical results
            pdfS3Key: a.string(),            // S3 key for the generated PDF
            
            // Legacy/Legacy-derived
            isPaid: a.boolean().default(false),
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['admins']),
            allow.groups(['estebian-access']),
        ]),
};

// Type export for frontend usage
export type EstebianSchemaType = typeof estebianSchema;
