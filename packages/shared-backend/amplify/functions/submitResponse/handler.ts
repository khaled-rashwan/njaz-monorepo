import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event: any) => {
    console.log('Event:', JSON.stringify(event));

    // Mutation arguments are in event.arguments for AppSync Lambda resolvers
    const { surveyId, answers, demographics } = event.arguments;

    if (!surveyId) {
        throw new Error("surveyId is required");
    }

    try {
        // 1. Get the survey to find the owner
        // Table name will be provided via environment variable
        const surveyTable = process.env.ESTEBIAN_SURVEY_TABLE;
        const responseTable = process.env.ESTEBIAN_RESPONSE_TABLE;

        if (!surveyTable || !responseTable) {
            throw new Error("Table environment variables not set");
        }

        const getSurvey = await docClient.send(new GetCommand({
            TableName: surveyTable,
            Key: { id: surveyId }
        }));

        const survey = getSurvey.Item;
        if (!survey) {
            throw new Error("Survey not found");
        }

        // 2. Extract the owner (createdBy or owner system field)
        // In Amplify, the owner field is usually named 'owner' by default
        // but we stored 'createdBy' manually too. Let's look for both.
        const surveyOwner = survey.owner || survey.createdBy;

        if (!surveyOwner) {
            throw new Error("Survey has no owner");
        }

        // 3. Create the response
        const responseId = crypto.randomUUID();
        const now = new Date().toISOString();

        const responseItem = {
            id: responseId,
            surveyId: surveyId,
            surveyOwner: surveyOwner, // This is the identifier used for authorization
            submittedAt: now,
            demographics: demographics,
            answers: answers,
            __typename: 'EstebianResponse',
            createdAt: now,
            updatedAt: now,
            owner: surveyOwner // Set owner field so they have permission to read it
        };

        await docClient.send(new PutCommand({
            TableName: responseTable,
            Item: responseItem
        }));

        return {
            id: responseId,
            surveyId,
            submittedAt: now
        };
    } catch (error: any) {
        console.error('Error submitting response:', error);
        throw new Error(error.message || "Internal Server Error");
    }
};
