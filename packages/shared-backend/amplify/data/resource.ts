import { a, defineData, type ClientSchema } from '@aws-amplify/backend';
import { estebianSchema } from '@njaz/estebian-data';
import { devPlatformSchema } from './dev-platform.schema';
import { industrialSchema } from './industrial.schema';
import { interiorDesignSchema } from './interior-design.schema';
import { scholarSchema } from './scholar.schema';
import { submitResponse } from '../functions/submitResponse/resource';
import { manageUsers } from '../functions/manageUsers/resource';
import { initiateReport } from '../functions/initiateReport/resource';
import { analyzeData } from '../functions/analyzeData/resource';

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
    ...scholarSchema,

    // ============================================
    // GLOBAL SETTINGS
    // ============================================
    AppSettings: a
        .model({
            id: a.string().required(),
            isScholarAiEnabled: a.boolean().default(true),
            geminiApiKey: a.string(),
            slackWebhookUrl: a.string(),
            githubToken: a.string(),
        })
        .identifier(['id'])
        .authorization((allow) => [
            allow.authenticated().to(['read']),
            allow.groups(['admins']),
        ]),

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

    analyzeData: a.mutation()
        .arguments({
            dataset: a.json().required(),
            analysisType: a.string().required(),
            parameters: a.json(),
        })
        .returns(a.json())
        .handler(a.handler.function(analyzeData))
        .authorization((allow) => [allow.authenticated()]),

    requestReport: a.mutation()
        .arguments({
            surveyId: a.id().required(),
            reportType: a.string().required(),
            reportId: a.string(),
            efaConfig: a.json(),
            mediationConfig: a.json(),
            excludedResponseIds: a.string().array(),
            excludedStatementIds: a.string().array(),
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
