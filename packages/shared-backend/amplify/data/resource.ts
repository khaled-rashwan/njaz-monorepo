import { a, defineData, type ClientSchema } from '@aws-amplify/backend';
import { estebianSchema } from '@njaz/estebian-data';
import { submitResponse } from '../functions/submitResponse/resource';

/**
 * Njaz Platform Data Schema
 * 
 * Composed from app-specific packages:
 * - @njaz/estebian-data (Estebian survey platform)
 * 
 * Plus shared/other app models defined here:
 * - PID Controller (industrial)
 * - Dev Platform (projects)
 * - Interior Design (design projects)
 */
const schema = a.schema({
    // ============================================
    // ESTEBIAN - Imported from @njaz/estebian-data
    // ============================================
    ...estebianSchema,

    // ============================================
    // PID CONTROLLER - Industrial Platform
    // ============================================

    PIDController: a
        .model({
            name: a.string().required(),
            description: a.string(),
            kp: a.float().default(1.0), // Proportional gain
            ki: a.float().default(0.0), // Integral gain
            kd: a.float().default(0.0), // Derivative gain
            setpoint: a.float().default(0.0),
            processVariable: a.float(),
            output: a.float(),
            isActive: a.boolean().default(false),
        })
        .authorization((allow) => [
            allow.groups(['admins']),
            allow.groups(['pid-access']),
            allow.owner(),
        ]),

    PIDLog: a
        .model({
            controllerId: a.id().required(),
            timestamp: a.datetime().required(),
            setpoint: a.float(),
            processVariable: a.float(),
            output: a.float(),
            error: a.float(),
        })
        .authorization((allow) => [
            allow.groups(['pid-access']),
        ]),

    // ============================================
    // DEV PLATFORM - Digital Transformation
    // ============================================

    DevProject: a
        .model({
            name: a.string().required(),
            type: a.enum(['wordpress', 'web_app', 'mobile_app', 'cloud_architecture', 'digital_transformation']),
            status: a.enum(['planning', 'in_progress', 'completed', 'on_hold']),
            description: a.string(),
            requirements: a.json(),
            timeline: a.json(),
            budget: a.float(),
            clientName: a.string(),
            clientEmail: a.string(),
        })
        .authorization((allow) => [
            allow.groups(['admins']),
            allow.groups(['devplatform-access']),
            allow.owner(),
        ]),

    // ============================================
    // DEV INQUIRY - Client Intake Pipeline
    // ============================================
    // Captures all data from the multi-step intake wizard.
    // Public users can create (form is anonymous),
    // while admins manage the full lifecycle.

    DevInquiry: a
        .model({
            // Client information
            clientName: a.string().required(),
            clientEmail: a.string().required(),
            clientPhone: a.string(),
            companyName: a.string(),
            projectDescription: a.string().required(),

            // Project configuration
            projectTypes: a.string().array().required(),
            features: a.json(),      // Record<FeatureKey, boolean>
            timeline: a.enum(['standard', 'accelerated', 'rush']),

            // Brand assets
            hasBrandAssets: a.boolean(),
            brandNotes: a.string(),
            preferredColors: a.string(),
            stylePreference: a.string(),
            competitors: a.string(),

            // Computed estimate
            estimatedPriceMin: a.float(),
            estimatedPriceMax: a.float(),
            estimatedWeeks: a.integer(),
            complexityScore: a.integer(),

            // Lifecycle
            status: a.enum(['new', 'reviewing', 'proposal_sent', 'approved', 'in_progress', 'completed', 'cancelled']),

            // Generated workflow (JSON blob from workflow engine)
            workflow: a.json(),

            // Notification tracking
            notifiedAt: a.datetime(),
        })
        .authorization((allow) => [
            // Anyone can submit the intake form (no login required)
            allow.publicApiKey().to(['create']),
            // Admins and dev team can manage inquiries
            allow.groups(['admins']),
            allow.groups(['devplatform-access']),
        ]),

    // ============================================
    // CUSTOM MUTATIONS
    // ============================================

    submitResponse: a.mutation()
        .arguments({
            surveyId: a.id().required(),
            answers: a.json().required(),
            demographics: a.json(),
        })
        .returns(a.json())
        .handler(a.handler.function(submitResponse))
        .authorization((allow) => [allow.publicApiKey()]),

    // ============================================
    // INTERIOR DESIGN - Design Platform
    // ============================================

    DesignProject: a
        .model({
            name: a.string().required(),
            clientName: a.string(),
            location: a.string(),
            type: a.enum(['residential', 'commercial', 'office', 'retail', 'hospitality']),
            status: a.enum(['concept', 'design', 'execution', 'completed']),
            budget: a.float(),
            description: a.string(),
            images: a.string().array(), // S3 keys
            moodBoard: a.json(), // Mood board data
        })
        .authorization((allow) => [
            allow.groups(['admins']),
            allow.groups(['interior-access']),
            allow.owner(),
        ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
    schema,
    authorizationModes: {
        defaultAuthorizationMode: 'userPool',
        // Allow unauthenticated access for public survey responses
        apiKeyAuthorizationMode: {
            expiresInDays: 365,
        },
    },
});
