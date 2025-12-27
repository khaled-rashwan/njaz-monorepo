import { a, defineData, type ClientSchema } from '@aws-amplify/backend';
import { estebianSchema } from '@njaz/estebian-data';

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
