import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event: any) => {
    console.log('Event:', JSON.stringify(event));

    const { reportId, bypassPayment } = event;

    if (!reportId) {
        throw new Error("reportId is required in Step Function input");
    }

    try {
        const reportTable = process.env.ESTEBIAN_REPORT_TABLE;
        
        // 1. If bypass mode is active, we assume verification is already done or instant
        // In the initial record it was already set to 'payment_verified' if bypassed.
        if (bypassPayment === true) {
            return { verified: true };
        }

        // 2. Placeholder for real payment verification logic
        // (e.g. calling Moyasar/Stripe API)
        const isVerified = false; // Default to false for non-bypassed until configured

        if (isVerified) {
            await docClient.send(new UpdateCommand({
                TableName: reportTable,
                Key: { id: reportId },
                UpdateExpression: "SET #status = :s, isPaid = :p, paidAt = :t",
                ExpressionAttributeNames: { "#status": "status" },
                ExpressionAttributeValues: {
                    ":s": "payment_verified",
                    ":p": true,
                    ":t": new Date().toISOString()
                }
            }));
        } else {
             await docClient.send(new UpdateCommand({
                TableName: reportTable,
                Key: { id: reportId },
                UpdateExpression: "SET #status = :s, errorMessage = :e",
                ExpressionAttributeNames: { "#status": "status" },
                ExpressionAttributeValues: {
                    ":s": "payment_failed",
                    ":e": "Payment verification failed"
                }
            }));
        }

        return { verified: isVerified };

    } catch (error: any) {
        console.error('Error verifying payment:', error);
        throw error; 
    }
};
