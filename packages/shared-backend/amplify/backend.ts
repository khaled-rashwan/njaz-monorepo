import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { submitResponse } from './functions/submitResponse/resource';

/**
 * Njaz Platform Backend
 * 
 * Shared Amplify Gen 2 backend for all Njaz apps.
 * Authentication is shared via Cognito with group-based access control.
 * Data layer includes models for all platform apps.
 */
const backend = defineBackend({
    auth,
    data,
    submitResponse,
});

// Grant permissions to the submitResponse function
const surveyTable = backend.data.resources.tables['EstebianSurvey'];
const responseTable = backend.data.resources.tables['EstebianResponse'];

backend.submitResponse.addEnvironment('ESTEBIAN_SURVEY_TABLE', surveyTable.tableName);
backend.submitResponse.addEnvironment('ESTEBIAN_RESPONSE_TABLE', responseTable.tableName);

surveyTable.grantReadData(backend.submitResponse.resources.lambda);
responseTable.grantWriteData(backend.submitResponse.resources.lambda);

// Export types for frontend usage
export type { Schema } from './data/resource';
