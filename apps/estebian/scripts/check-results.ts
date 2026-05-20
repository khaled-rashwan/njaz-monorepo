import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const RESPONSE_TABLE = "EstebianResponse-hkndaads5jbyjpt66gbo7to6hq-NONE";
const REPORT_TABLE = "EstebianReport-hkndaads5jbyjpt66gbo7to6hq-NONE";
const SURVEY_ID = "6df7003f-3408-445a-a8ff-da5da85bc01d";

async function check() {
    console.log(`Checking responses for Survey: ${SURVEY_ID}`);

    // Scan table to find items matching surveyId
    // (Since surveyId might be the partition key or a GSI, a Scan is foolproof for a sandbox environment)
    const responsesRes = await docClient.send(new ScanCommand({
        TableName: RESPONSE_TABLE,
        FilterExpression: "surveyId = :sid",
        ExpressionAttributeValues: {
            ":sid": SURVEY_ID
        }
    }));

    const items = responsesRes.Items || [];
    console.log(`\n📊 Total responses found in DynamoDB: ${items.length}`);

    // Let's inspect some sample responses
    if (items.length > 0) {
        console.log("\nSample Response Demographics:");
        items.slice(0, 5).forEach((item, idx) => {
            console.log(`[${idx + 1}] ID: ${item.id} | Demographics:`, JSON.stringify(item.demographics));
        });
    }

    // Now let's check reports
    const reportsRes = await docClient.send(new ScanCommand({
        TableName: REPORT_TABLE,
        FilterExpression: "surveyId = :sid",
        ExpressionAttributeValues: {
            ":sid": SURVEY_ID
        }
    }));

    const reports = reportsRes.Items || [];
    console.log(`\n📋 Reports found in DynamoDB: ${reports.length}`);
    reports.forEach((rep, idx) => {
        console.log(`[${idx + 1}] ID: ${rep.id} | Type: ${rep.type} | Status: ${rep.status} | Error: ${rep.errorMessage || "None"}`);
    });
}

check().catch(console.error);
