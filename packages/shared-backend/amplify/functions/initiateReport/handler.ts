import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: {
        removeUndefinedValues: true
    }
});
const sfnClient = new SFNClient({});

export const handler = async (event: any, context: any) => {
    console.log('Event:', JSON.stringify(event));

    const { surveyId, reportType, efaConfig, mediationConfig } = event.arguments;

    if (!surveyId || !reportType) {
        throw new Error("surveyId and reportType are required");
    }

    try {
        const surveyTable = process.env.ESTEBIAN_SURVEY_TABLE;
        const reportTable = process.env.ESTEBIAN_REPORT_TABLE;
        const sfnName = process.env.STATE_MACHINE_NAME;
        const bypassPayment = process.env.PAYMENT_BYPASS_MODE === 'true';

        if (!surveyTable || !reportTable || !sfnName) {
            throw new Error("Required environment variables are missing (surveyTable, reportTable, sfnName)");
        }

        // Derive SF ARN from current lambda context to avoid hard CFN dependency
        const lambdaArn = context.invokedFunctionArn;
        const parts = lambdaArn.split(':');
        const region = parts[3];
        const account = parts[4];
        const sfnArn = `arn:aws:states:${region}:${account}:stateMachine:${sfnName}`;

        const userId = event.identity?.sub || event.identity?.username;
        const userGroups = event.identity?.groups || [];
        const isAdmin = userGroups.includes('admins');

        console.log('Auth check:', { userId, userGroups, isAdmin });

        // 1. Verify survey ownership or admin status
        const getSurvey = await docClient.send(new GetCommand({
            TableName: surveyTable,
            Key: { id: surveyId }
        }));

        const survey = getSurvey.Item;
        if (!survey) {
            console.error('Survey not found:', surveyId);
            throw new Error("Survey not found");
        }

        const surveyOwner = survey.owner || survey.createdBy;
        console.log('Survey Details:', { surveyId, surveyOwner });

        if (surveyOwner !== userId && !isAdmin) {
            console.warn('Authorization denined:', { surveyOwner, userId, isAdmin });
            throw new Error("Unauthorized to generate reports for this survey");
        }

        const inputReportId = event.arguments.reportId;
        const reportId = inputReportId || crypto.randomUUID();
        const now = new Date().toISOString();
        
        let isPaid = bypassPayment;
        let createdAt = now;
        
        // If an existing report ID was provided, verify it and inherit paid status
        if (inputReportId) {
            const getReport = await docClient.send(new GetCommand({
                TableName: reportTable,
                Key: { id: inputReportId }
            }));
            const existingReport = getReport.Item;
            if (existingReport) {
                isPaid = existingReport.isPaid || bypassPayment;
                createdAt = existingReport.createdAt || now;
            }
        }
        
        const initialStatus = isPaid ? 'payment_verified' : 'pending_payment';

        const reportItem = {
            id: reportId,
            surveyId: surveyId,
            type: reportType,
            status: initialStatus,
            isPaid: isPaid,
            createdAt: createdAt,
            updatedAt: now,
            owner: userId,
            __typename: 'EstebianReport'
        };

        await docClient.send(new PutCommand({
            TableName: reportTable,
            Item: reportItem
        }));

        // 3. Start Step Function
        const sfnInput = {
            reportId,
            surveyId,
            reportType,
            userId,
            bypassPayment,
            isPaid,
            efaConfig,
            mediationConfig
        };

        const sfnResult = await sfnClient.send(new StartExecutionCommand({
            stateMachineArn: sfnArn,
            name: `Report-${reportId}-${Date.now()}`,
            input: JSON.stringify(sfnInput)
        }));

        return {
            reportId,
            status: initialStatus,
            paymentUrl: bypassPayment ? null : "https://test.moyasar.com/simulate", // Placeholder for actual gateway redirect
            stepFunctionExecutionId: sfnResult.executionArn
        };

    } catch (error: any) {
        console.error('Error initiating report:', error);
        throw new Error(error.message || "Internal Server Error");
    }
};
