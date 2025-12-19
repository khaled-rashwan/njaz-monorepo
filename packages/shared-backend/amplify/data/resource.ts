import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

/**
 * Njaz Platform Data Schema
 * 
 * Includes models for:
 * - Estebian (surveys)
 * - PID Controller (industrial)
 * - Dev Platform (projects)
 * - Interior Design (design projects)
 */
const schema = a.schema({
    // ============================================
    // ESTEBIAN - Arabic Survey Platform
    // ============================================

    EstebianSurvey: a
        .model({
            title: a.string().required(),
            titleAr: a.string(), // Arabic title
            description: a.string(),
            descriptionAr: a.string(), // Arabic description
            questions: a.json(), // Array of questions
            settings: a.json(), // Survey settings
            isPublished: a.boolean().default(false),
            responseCount: a.integer().default(0),
        })
        .authorization((allow) => [
            allow.groups(['admins']),
            allow.groups(['estebian-access']),
            allow.owner(),
        ]),

    EstebianResponse: a
        .model({
            surveyId: a.id().required(),
            responses: a.json().required(), // Answers to questions
            respondentId: a.string(), // Anonymous or authenticated
            submittedAt: a.datetime(),
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['estebian-access']).to(['read', 'create']),
        ]),

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
    },
});
