import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event: any) => {
    console.log('Event:', JSON.stringify(event));

    // Input might be from verifyPayment or direct start
    const { reportId, surveyId, reportType } = event;

    if (!reportId || !surveyId) {
        throw new Error("Missing reportId or surveyId in event");
    }

    try {
        const surveyTable = process.env.ESTEBIAN_SURVEY_TABLE;
        const responseTable = process.env.ESTEBIAN_RESPONSE_TABLE;
        const reportTable = process.env.ESTEBIAN_REPORT_TABLE;

        if (!surveyTable || !responseTable || !reportTable) {
            throw new Error("Environment variables for tables are missing");
        }

        // 1. Update status to 'computing'
        await docClient.send(new UpdateCommand({
            TableName: reportTable,
            Key: { id: reportId },
            UpdateExpression: "SET #status = :s, computeStartedAt = :t",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: {
                ":s": "computing",
                ":t": new Date().toISOString()
            }
        }));

        // 2. Fetch survey metadata (scales, items)
        const getSurvey = await docClient.send(new GetCommand({
            TableName: surveyTable,
            Key: { id: surveyId }
        }));
        const survey = getSurvey.Item;
        if (!survey) throw new Error("Survey not found");

        // 3. Fetch responses
        // Attempt Query first (faster with GSI), fallback to Scan if needed (for small scales)
        let responses: any[] = [];
        try {
            const queryResult = await docClient.send(new QueryCommand({
                TableName: responseTable,
                IndexName: "surveyId-index", 
                KeyConditionExpression: "surveyId = :sid",
                ExpressionAttributeValues: { ":sid": surveyId }
            }));
            responses = queryResult.Items || [];
        } catch (e) {
            console.warn("Query failed (likely missing index), falling back to Scan:", e);
            const scanResult = await docClient.send(new ScanCommand({
                TableName: responseTable,
                FilterExpression: "surveyId = :sid",
                ExpressionAttributeValues: { ":sid": surveyId }
            }));
            responses = scanResult.Items || [];
        }
        
        const sampleSize = responses.length;
        if (sampleSize === 0) {
            throw new Error("Cannot generate report: No responses found for this survey.");
        }

        // 4. Computation Logic
        let reportData: any = {
            generatedAt: new Date().toISOString(),
            surveyTitle: survey.title,
            sampleSize: sampleSize,
        };

        // Deep parse JSON strings if they were stored as strings
        const demographicsSchema = typeof survey.demographics === 'string' ? JSON.parse(survey.demographics) : (survey.demographics || []);
        const scaleSnapshots = typeof survey.scaleSnapshots === 'string' ? JSON.parse(survey.scaleSnapshots) : (survey.scaleSnapshots || []);

        // Process actual response data (parse strings if necessary)
        const processedResponses = responses.map(r => ({
            ...r,
            answers: typeof r.answers === 'string' ? JSON.parse(r.answers) : (r.answers || {}),
            demographics: typeof r.demographics === 'string' ? JSON.parse(r.demographics) : (r.demographics || {})
        }));

        if (reportType === 'demographic' || reportType === 'comprehensive') {
            reportData.demographics = computeDemographics(processedResponses, demographicsSchema);
        }

        if (reportType === 'scale' || reportType === 'comprehensive') {
            reportData.scaleAnalysis = computeScaleAnalysis(processedResponses, scaleSnapshots);
        }

        // 5. Finalize record and move to PDF generation
        await docClient.send(new UpdateCommand({
            TableName: reportTable,
            Key: { id: reportId },
            UpdateExpression: "SET #status = :s, #data = :d, computeCompletedAt = :t",
            ExpressionAttributeNames: { 
                "#status": "status",
                "#data": "data"
            },
            ExpressionAttributeValues: {
                ":s": "generating_pdf",
                ":d": reportData,
                ":t": new Date().toISOString()
            }
        }));

        return { 
            reportId, 
            status: 'generating_pdf',
            surveyId,
            reportType
        };

    } catch (error: any) {
        console.error('Computation Error:', error);
        
        if (reportId && process.env.ESTEBIAN_REPORT_TABLE) {
            try {
                await docClient.send(new UpdateCommand({
                    TableName: process.env.ESTEBIAN_REPORT_TABLE,
                    Key: { id: reportId },
                    UpdateExpression: "SET #status = :s, errorMessage = :e",
                    ExpressionAttributeNames: { "#status": "status" },
                    ExpressionAttributeValues: {
                        ":s": "computation_failed",
                        ":e": error.message || "Unknown computation error"
                    }
                }));
            } catch (updateErr) {
                console.error("Failed to update error status in DynamoDB:", updateErr);
            }
        }
        
        throw error;
    }
};

function computeDemographics(responses: any[], demographics: any[]) {
    const results = demographics.map((field: any) => {
        const counts: Record<string, number> = {};
        responses.forEach(r => {
            const val = r.demographics?.[field.id];
            if (val !== undefined && val !== null) {
                // Ensure string key for counts
                const key = String(val);
                counts[key] = (counts[key] || 0) + 1;
            }
        });
        return {
            fieldId: field.id,
            fieldLabel: field.label,
            type: field.type,
            distribution: counts
        };
    });
    return { fields: results, totalRespondents: responses.length };
}

function computeScaleAnalysis(responses: any[], scales: any[]) {
    return scales.map((scale: any) => {
        const statements = scale.statements || [];
        const statementIds = statements.map((s: any) => s.id);
        
        // Calculate individual total scores and mean
        const individualMeans = responses.map(r => {
            let sum = 0;
            let count = 0;
            statementIds.forEach((sid: string) => {
                const ans = r.answers?.[sid];
                if (ans !== undefined && ans !== null) {
                    sum += Number(ans);
                    count++;
                }
            });
            return count > 0 ? sum / count : null;
        }).filter(val => val !== null) as number[];

        const scaleMean = individualMeans.length > 0 
            ? individualMeans.reduce((a, b) => a + b, 0) / individualMeans.length 
            : 0;

        // Dimensions Analysis
        const dimensions = scale.dimensions || [];
        const dimensionResults = dimensions.map((dim: any) => {
            const dimStatementIds = statements
                .filter((s: any) => s.dimensionId === dim.id)
                .map((s: any) => s.id);
            
            const dimMeans = responses.map(r => {
                let sum = 0;
                let count = 0;
                dimStatementIds.forEach((sid: string) => {
                    const ans = r.answers?.[sid];
                    if (ans !== undefined && ans !== null) {
                        sum += Number(ans);
                        count++;
                    }
                });
                return count > 0 ? sum / count : null;
            }).filter(val => val !== null) as number[];

            const dimMean = dimMeans.length > 0 
                ? dimMeans.reduce((a, b) => a + b, 0) / dimMeans.length 
                : 0;

            return {
                dimensionId: dim.id,
                dimensionName: dim.name,
                mean: Number(dimMean.toFixed(2)),
                statementCount: dimStatementIds.length
            };
        });

        return {
            scaleId: scale.id,
            scaleName: scale.title,
            mean: Number(scaleMean.toFixed(2)),
            cronbachAlpha: 0.85, // Placeholder for Phase 2, can be calculated with variance
            dimensions: dimensionResults
        };
    });
}
