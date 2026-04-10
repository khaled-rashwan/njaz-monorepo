import { defineBackend } from '@aws-amplify/backend';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as cdk from 'aws-cdk-lib';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { submitResponse } from './functions/submitResponse/resource';
import { manageUsers } from './functions/manageUsers/resource';
import { initiateReport } from './functions/initiateReport/resource';
import { verifyPayment } from './functions/verifyPayment/resource';
import { computeReport } from './functions/computeReport/resource';
import { generateReportPdf } from './functions/generateReportPdf/resource';
import { storage } from './storage/resource';

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
    storage,
    initiateReport,
    verifyPayment,
    computeReport,
    generateReportPdf,
});

// Grant permissions to the submitResponse function
const surveyTable = backend.data.resources.tables['EstebianSurvey'];
const responseTable = backend.data.resources.tables['EstebianResponse'];

backend.submitResponse.addEnvironment('ESTEBIAN_SURVEY_TABLE', surveyTable.tableName);
backend.submitResponse.addEnvironment('ESTEBIAN_RESPONSE_TABLE', responseTable.tableName);
surveyTable.grantReadData(backend.submitResponse.resources.lambda);
responseTable.grantWriteData(backend.submitResponse.resources.lambda);

// Grant permissions to the reporting functions
const reportTable = backend.data.resources.tables['EstebianReport'];

// initiateReport
backend.initiateReport.addEnvironment('ESTEBIAN_SURVEY_TABLE', surveyTable.tableName);
backend.initiateReport.addEnvironment('ESTEBIAN_REPORT_TABLE', reportTable.tableName);
backend.initiateReport.addEnvironment('PAYMENT_BYPASS_MODE', 'true');
surveyTable.grantReadData(backend.initiateReport.resources.lambda);
reportTable.grantReadWriteData(backend.initiateReport.resources.lambda);

// Step Function Orchestration
const pipelineStack = backend.createStack('ReportPipelineStack');

// Predictable name to break circularity
// Use a static name to break circularity between stacks
const stateMachineName = 'EstebianReportPipeline-v1';

// Tasks (Simplified to remove DynamoDB dependencies from the SF itself)
// The Lambdas will handle their own status updates to break the SF -> Table link
const verifyPaymentTask = new tasks.LambdaInvoke(pipelineStack, 'VerifyPayment', {
    lambdaFunction: backend.verifyPayment.resources.lambda,
    resultPath: '$.paymentResult',
    resultSelector: {
        'verified.$': '$.Payload.verified'
    }
});

const computeReportTask = new tasks.LambdaInvoke(pipelineStack, 'ComputeReport', {
    lambdaFunction: backend.computeReport.resources.lambda,
    resultPath: '$.computeResult',
    resultSelector: {
        'status.$': '$.Payload.status'
    },
    taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(5)),
});

const generatePdfTask = new tasks.LambdaInvoke(pipelineStack, 'GeneratePDF', {
    lambdaFunction: backend.generateReportPdf.resources.lambda,
    resultPath: '$.pdfResult',
    resultSelector: {
        'status.$': '$.Payload.status',
        's3Key.$': '$.Payload.s3Key'
    },
});

// Definition (SF now only manages the Lambda flow)
const definition = verifyPaymentTask
    .next(new sfn.Choice(pipelineStack, 'CheckPaymentResult')
        .when(sfn.Condition.booleanEquals('$.paymentResult.verified', true), 
            computeReportTask.next(generatePdfTask)
        )
        .otherwise(new sfn.Pass(pipelineStack, 'PaymentFailed')));

const stateMachine = new sfn.StateMachine(pipelineStack, 'ReportPipeline', {
    stateMachineName: stateMachineName,
    definitionBody: sfn.DefinitionBody.fromChainable(definition),
    timeout: cdk.Duration.minutes(10),
});

// Grant permission manually to avoid cross-stack dependency in CFN
backend.initiateReport.resources.lambda.addToRolePolicy(new iam.PolicyStatement({
    actions: ['states:StartExecution'],
    resources: [
        `arn:aws:states:${cdk.Stack.of(pipelineStack).region}:${cdk.Stack.of(pipelineStack).account}:stateMachine:${stateMachineName}`
    ]
}));

// Pass the name/arn as a string literal instead of a reference if possible, 
// but since region/account are tokens, we'll just pass the name and let the Lambda build the ARN.
backend.initiateReport.addEnvironment('STATE_MACHINE_NAME', stateMachineName);

// verifyPayment
backend.verifyPayment.addEnvironment('ESTEBIAN_REPORT_TABLE', reportTable.tableName);
backend.verifyPayment.addEnvironment('PAYMENT_BYPASS_MODE', 'true');
reportTable.grantReadWriteData(backend.verifyPayment.resources.lambda);

// computeReport
backend.computeReport.addEnvironment('ESTEBIAN_SURVEY_TABLE', surveyTable.tableName);
backend.computeReport.addEnvironment('ESTEBIAN_RESPONSE_TABLE', responseTable.tableName);
backend.computeReport.addEnvironment('ESTEBIAN_REPORT_TABLE', reportTable.tableName);
surveyTable.grantReadData(backend.computeReport.resources.lambda);
responseTable.grantReadData(backend.computeReport.resources.lambda);
reportTable.grantReadWriteData(backend.computeReport.resources.lambda);

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

// generateReportPdf
backend.generateReportPdf.addEnvironment('ESTEBIAN_REPORT_TABLE', reportTable.tableName);
backend.generateReportPdf.addEnvironment('REPORT_BUCKET_NAME', backend.storage.resources.bucket.bucketName);
reportTable.grantReadWriteData(backend.generateReportPdf.resources.lambda);
backend.storage.resources.bucket.grantReadWrite(backend.generateReportPdf.resources.lambda);

// Export types for frontend usage
export type { Schema } from './data/resource';
