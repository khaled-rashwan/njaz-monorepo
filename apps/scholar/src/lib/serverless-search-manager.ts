import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = 'NjazLiteratureResilience';

const ddbClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
});
const docClient = DynamoDBDocumentClient.from(ddbClient);

export class ServerlessSearchManager {
    // ----------------------------------------------------
    // DISTRIBUTED CACHE
    // ----------------------------------------------------
    public static async getCache(key: string): Promise<any | null> {
        try {
            const command = new GetCommand({
                TableName: TABLE_NAME,
                Key: { pk: `cache#${key}` },
            });
            const res = await docClient.send(command);
            if (!res.Item) return null;

            const nowSeconds = Math.floor(Date.now() / 1000);
            if (res.Item.ttl && nowSeconds > res.Item.ttl) {
                return null;
            }
            return res.Item.value;
        } catch (error) {
            console.error('DynamoDB getCache failed:', error);
            return null;
        }
    }

    public static async setCache(key: string, value: any, ttlSeconds = 604800): Promise<void> {
        try {
            const nowSeconds = Math.floor(Date.now() / 1000);
            const command = new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    pk: `cache#${key}`,
                    value,
                    ttl: nowSeconds + ttlSeconds,
                },
            });
            await docClient.send(command);
        } catch (error) {
            console.error('DynamoDB setCache failed:', error);
        }
    }

    // ----------------------------------------------------
    // DISTRIBUTED TOKEN BUCKET RATE LIMITER
    // ----------------------------------------------------
    public static async checkRateLimit(provider: string, maxTokens = 10, refillRatePerSec = 5): Promise<boolean> {
        const pk = `rate_limit#${provider}`;
        const now = Date.now();
        
        try {
            const getCmd = new GetCommand({
                TableName: TABLE_NAME,
                Key: { pk },
            });
            const res = await docClient.send(getCmd);
            
            let tokens = maxTokens;
            let lastRefillTime = now;

            if (res.Item) {
                const elapsedMs = now - (res.Item.lastRefillTime || now);
                const refilledTokens = (elapsedMs / 1000) * refillRatePerSec;
                tokens = Math.min(maxTokens, (res.Item.tokens || 0) + refilledTokens);
                lastRefillTime = now;
            }

            if (tokens >= 1) {
                const updateCmd = new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: { pk },
                    UpdateExpression: 'SET tokens = :newTokens, lastRefillTime = :now',
                    ConditionExpression: 'attribute_not_exists(pk) OR tokens = :oldTokens OR lastRefillTime = :oldRefillTime',
                    ExpressionAttributeValues: {
                        ':newTokens': tokens - 1,
                        ':now': now,
                        ':oldTokens': res.Item?.tokens || 0,
                        ':oldRefillTime': res.Item?.lastRefillTime || now,
                    },
                });
                
                try {
                    await docClient.send(updateCmd);
                    return true;
                } catch (condError: any) {
                    if (condError.name === 'ConditionalCheckFailedException') {
                        return this.checkRateLimit(provider, maxTokens, refillRatePerSec);
                    }
                    throw condError;
                }
            }

            return false;
        } catch (error) {
            console.error('DynamoDB checkRateLimit failed:', error);
            return true;
        }
    }

    // ----------------------------------------------------
    // CIRCUIT BREAKER
    // ----------------------------------------------------
    public static async checkCircuit(provider: string): Promise<'CLOSED' | 'OPEN'> {
        const pk = `circuit#${provider}`;
        try {
            const command = new GetCommand({
                TableName: TABLE_NAME,
                Key: { pk },
            });
            const res = await docClient.send(command);
            if (!res.Item) return 'CLOSED';

            if (res.Item.status === 'OPEN') {
                if (Date.now() > (res.Item.cooldownUntil || 0)) {
                    await this.recordSuccess(provider);
                    return 'CLOSED';
                }
                return 'OPEN';
            }
            return 'CLOSED';
        } catch (error) {
            console.error('DynamoDB checkCircuit failed:', error);
            return 'CLOSED';
        }
    }

    public static async recordFailure(provider: string, maxFailures = 3, cooldownSec = 300): Promise<void> {
        const pk = `circuit#${provider}`;
        try {
            const getCmd = new GetCommand({
                TableName: TABLE_NAME,
                Key: { pk },
            });
            const res = await docClient.send(getCmd);
            const currentFailures = (res.Item?.failureCount || 0) + 1;
            
            const isTripped = currentFailures >= maxFailures;
            const cooldownUntil = isTripped ? Date.now() + cooldownSec * 1000 : 0;

            const putCmd = new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    pk,
                    status: isTripped ? 'OPEN' : 'CLOSED',
                    failureCount: currentFailures,
                    cooldownUntil,
                },
            });
            await docClient.send(putCmd);
        } catch (error) {
            console.error('DynamoDB recordFailure failed:', error);
        }
    }

    public static async recordSuccess(provider: string): Promise<void> {
        const pk = `circuit#${provider}`;
        try {
            const putCmd = new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    pk,
                    status: 'CLOSED',
                    failureCount: 0,
                    cooldownUntil: 0,
                },
            });
            await docClient.send(putCmd);
        } catch (error) {
            console.error('DynamoDB recordSuccess failed:', error);
        }
    }
}
