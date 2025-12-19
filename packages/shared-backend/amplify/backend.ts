import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

/**
 * Njaz Platform Backend
 * 
 * Shared Amplify Gen 2 backend for all Njaz apps.
 * Authentication is shared via Cognito with group-based access control.
 * Data layer includes models for all platform apps.
 * 
 * Cognito Groups (created via CLI):
 * - Role groups: admins, engineers, users, viewers
 * - App groups: estebian-access, pid-access, devplatform-access, interior-access
 */
export const backend = defineBackend({
    auth,
    data,
});

// Export types for frontend usage
export type { Schema } from './data/resource';
