import { defineBackend } from '@aws-amplify/backend';
import * as iam from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { submitResponse } from './functions/submitResponse/resource';
import { manageUsers } from './functions/manageUsers/resource';

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
    manageUsers,
});

// Grant permissions to the submitResponse function
const surveyTable = backend.data.resources.tables['EstebianSurvey'];
const responseTable = backend.data.resources.tables['EstebianResponse'];

backend.submitResponse.addEnvironment('ESTEBIAN_SURVEY_TABLE', surveyTable.tableName);
backend.submitResponse.addEnvironment('ESTEBIAN_RESPONSE_TABLE', responseTable.tableName);

surveyTable.grantReadData(backend.submitResponse.resources.lambda);
responseTable.grantWriteData(backend.submitResponse.resources.lambda);

// Grant permissions to manageUsers for Cognito User Pool Administration
const userPool = backend.auth.resources.userPool;
backend.manageUsers.addEnvironment('USER_POOL_ID', userPool.userPoolId);
backend.manageUsers.resources.lambda.addToRolePolicy(
    new iam.PolicyStatement({
        actions: [
            'cognito-idp:ListUsers',
            'cognito-idp:AdminCreateUser',
            'cognito-idp:AdminDeleteUser',
            'cognito-idp:AdminAddUserToGroup',
            'cognito-idp:AdminRemoveUserFromGroup',
            'cognito-idp:AdminListGroupsForUser',
            'cognito-idp:AdminUpdateUserAttributes'
        ],
        resources: [userPool.userPoolArn],
    })
);

// Export types for frontend usage
export type { Schema } from './data/resource';
