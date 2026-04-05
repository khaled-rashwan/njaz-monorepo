import { defineAuth } from '@aws-amplify/backend';

/**
 * Njaz Platform Authentication Configuration
 * 
 * Groups strategy:
 * - Role groups: admins, engineers, users, viewers
 * - App access groups: estebian-access, pid-access, devplatform-access, interior-access
 */
export const auth = defineAuth({
    loginWith: {
        email: true,
    },
    groups: ["admins", "devplatform-access", "pid-access", "interior-access"],
    userAttributes: {
        // Optional: Display name in Arabic
        'custom:display_name_ar': {
            dataType: 'String',
            mutable: true,
        },
        // Optional: User's organization
        'custom:organization': {
            dataType: 'String',
            mutable: true,
        },
    },
    // Groups will be created post-deployment:
    // Role groups: admins, engineers, users, viewers
    // App groups: estebian-access, pid-access, devplatform-access, interior-access
});
