import { a, defineData, type ClientSchema } from '@aws-amplify/backend';
import { estebianSchema } from '@njaz/estebian-data';
import { devPlatformSchema } from './dev-platform.schema';
import { industrialSchema } from './industrial.schema';
import { interiorDesignSchema } from './interior-design.schema';
import { submitResponse } from '../functions/submitResponse/resource';
import { manageUsers } from '../functions/manageUsers/resource';
import { initiateReport } from '../functions/initiateReport/resource';

/**
 * Njaz Platform Data Schema
 * 
 * Composed from app-specific domains:
 * - @njaz/estebian-data (Estebian survey platform)
 * - devPlatformSchema (Startup incubator projects)
 * - industrialSchema (PID Controller)
 * - interiorDesignSchema (Design projects)
 */
const schema = a.schema({
    ...estebianSchema,
    ...devPlatformSchema,
    ...industrialSchema,
    ...interiorDesignSchema,

    // ============================================
    // CUSTOM MUTATIONS & QUERIES
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

    requestReport: a.mutation()
        .arguments({
            surveyId: a.id().required(),
            reportType: a.string().required(),
        })
        .returns(a.json())
        .handler(a.handler.function(initiateReport))
        .authorization((allow) => [allow.authenticated()]),

    listUsers: a.query()
        .returns(a.json())
        .handler(a.handler.function(manageUsers))
        .authorization((allow) => [allow.groups(['admins'])]),

    createUser: a.mutation()
        .arguments({ username: a.string().required(), email: a.string().required() })
        .returns(a.json())
        .handler(a.handler.function(manageUsers))
        .authorization((allow) => [allow.groups(['admins'])]),

    deleteUser: a.mutation()
        .arguments({ username: a.string().required() })
        .returns(a.json())
        .handler(a.handler.function(manageUsers))
        .authorization((allow) => [allow.groups(['admins'])]),

    manageUserGroup: a.mutation()
        .arguments({ username: a.string().required(), group: a.string().required(), action: a.string().required() })
        .returns(a.json())
        .handler(a.handler.function(manageUsers))
        .authorization((allow) => [allow.groups(['admins'])]),
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
