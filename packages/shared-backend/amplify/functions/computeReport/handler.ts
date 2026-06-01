import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import * as stats from "./stats";

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: {
        removeUndefinedValues: true
    }
});

export const handler = async (event: any) => {
    console.log('Event:', JSON.stringify(event));

    // Input might be from verifyPayment or direct start
    const { reportId, surveyId, reportType, efaConfig, mediationConfig, excludedResponseIds, excludedStatementIds } = event;

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
            let lastEvaluatedKey: any = undefined;
            do {
                const queryResult = await docClient.send(new QueryCommand({
                    TableName: responseTable,
                    IndexName: "surveyId-index", 
                    KeyConditionExpression: "surveyId = :sid",
                    ExpressionAttributeValues: { ":sid": surveyId },
                    ExclusiveStartKey: lastEvaluatedKey
                }));
                responses.push(...(queryResult.Items || []));
                lastEvaluatedKey = queryResult.LastEvaluatedKey;
            } while (lastEvaluatedKey);
        } catch (e) {
            console.warn("Query failed (likely missing index), falling back to Scan:", e);
            responses = [];
            let lastEvaluatedKey: any = undefined;
            do {
                const scanResult = await docClient.send(new ScanCommand({
                    TableName: responseTable,
                    FilterExpression: "surveyId = :sid",
                    ExpressionAttributeValues: { ":sid": surveyId },
                    ExclusiveStartKey: lastEvaluatedKey
                }));
                responses.push(...(scanResult.Items || []));
                lastEvaluatedKey = scanResult.LastEvaluatedKey;
            } while (lastEvaluatedKey);
        }
        
        const activeExcludedResponseIds = excludedResponseIds || [];
        const filteredResponses = responses.filter(r => !activeExcludedResponseIds.includes(r.id));

        const sampleSize = filteredResponses.length;
        if (sampleSize === 0) {
            throw new Error("Cannot generate report: No responses found for this survey after quality screening.");
        }

        // 4. Computation Logic
        // Robust deep-parse: handles multiple levels of JSON stringification
        // (GraphQL a.json() + Step Functions JSON.stringify can cause double/triple encoding)
        function deepParseJSON(val: any): any {
            if (val === null || val === undefined) return val;
            if (typeof val !== 'string') return val;
            try {
                const parsed = JSON.parse(val);
                // If the result is still a string, it might be double-encoded
                if (typeof parsed === 'string') return deepParseJSON(parsed);
                return parsed;
            } catch {
                return val;
            }
        }
        
        const parsedEfaConfig = deepParseJSON(efaConfig);
        const parsedMediationConfig = deepParseJSON(mediationConfig);
        
        console.log('[CONFIG_DEBUG] Raw efaConfig type:', typeof efaConfig);
        console.log('[CONFIG_DEBUG] Raw efaConfig value:', JSON.stringify(efaConfig));
        console.log('[CONFIG_DEBUG] Parsed efaConfig:', JSON.stringify(parsedEfaConfig));
        console.log('[CONFIG_DEBUG] Parsed efaConfig keys:', parsedEfaConfig ? Object.keys(parsedEfaConfig) : 'null');
        console.log('[CONFIG_DEBUG] Raw mediationConfig type:', typeof mediationConfig);
        console.log('[CONFIG_DEBUG] Raw mediationConfig value:', JSON.stringify(mediationConfig));
        console.log('[CONFIG_DEBUG] Parsed mediationConfig:', JSON.stringify(parsedMediationConfig));

        let reportData: any = {
            generatedAt: new Date().toISOString(),
            surveyTitle: survey.title,
            sampleSize: sampleSize,
            language: survey.language || 'ar',
            efaConfig: parsedEfaConfig,
            mediationConfig: parsedMediationConfig,
            excludedResponseIds: activeExcludedResponseIds,
            excludedStatementIds: excludedStatementIds || [],
            rawSampleSize: responses.length
        };

        // Deep parse JSON strings if they were stored as strings
        const demographicsSchema = typeof survey.demographics === 'string' ? JSON.parse(survey.demographics) : (survey.demographics || []);
        const rawScaleSnapshots = typeof survey.scaleSnapshots === 'string' ? JSON.parse(survey.scaleSnapshots) : (survey.scaleSnapshots || []);

        // Filter out virtually excluded statements
        const activeExcludedStatementIds = excludedStatementIds || [];
        const scaleSnapshots = rawScaleSnapshots.map((scale: any) => ({
            ...scale,
            statements: (scale.statements || []).filter((s: any) => !activeExcludedStatementIds.includes(s.id))
        }));

        // Process actual response data (parse strings if necessary)
        const processedResponses = filteredResponses.map(r => ({
            ...r,
            answers: typeof r.answers === 'string' ? JSON.parse(r.answers) : (r.answers || {}),
            demographics: typeof r.demographics === 'string' ? JSON.parse(r.demographics) : (r.demographics || {})
        }));

        if (reportType === 'demographic' || reportType === 'comprehensive') {
            reportData.demographics = computeDemographics(processedResponses, demographicsSchema);
        }

        if (reportType === 'scale' || reportType === 'comprehensive') {
            reportData.scaleAnalysis = computeScaleAnalysis(processedResponses, scaleSnapshots);

            // Inter-scale correlations (when multiple scales exist)
            if (scaleSnapshots.length >= 2 && reportData.scaleAnalysis) {
                reportData.interScaleCorrelations = computeInterScaleCorrelations(
                    processedResponses, scaleSnapshots, reportData.scaleAnalysis, survey.language || 'ar'
                );
            }

            // Group differences (T-test & ANOVA)
            reportData.groupDifferences = computeGroupDifferences(
                processedResponses, demographicsSchema, reportData.scaleAnalysis || [], scaleSnapshots
            );

            // Advanced Analytics: EFA/CFA
            if (sampleSize >= 10) {
                reportData.factorAnalysis = computeFactorAnalysis(processedResponses, scaleSnapshots, parsedEfaConfig);
            }

            // Advanced Analytics: Mediation (Sobel)
            if (scaleSnapshots.length >= 3 && sampleSize >= 10) {
                reportData.mediationAnalysis = computeMediationAnalysis(processedResponses, scaleSnapshots, parsedMediationConfig);
            }
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
        const numericValues: number[] = [];

        responses.forEach(r => {
            const val = r.demographics?.[field.id];
            if (val !== undefined && val !== null && val !== '') {
                // Ensure string key for counts
                const key = String(val).trim();
                counts[key] = (counts[key] || 0) + 1;

                // Collect numeric values for number-type fields
                const normalizedType = String(field.type || '').trim().toLowerCase();
                if (normalizedType === 'number') {
                    const num = Number(val);
                    if (!isNaN(num)) {
                        numericValues.push(num);
                    }
                }
            }
        });

        const result: any = {
            fieldId: field.id,
            fieldLabel: field.label,
            type: field.type,
            distribution: counts,
        };

        // Add numeric statistics for number fields
        if (field.type === 'number' && numericValues.length > 0) {
            const n = numericValues.length;
            const minVal = Math.min(...numericValues);
            const maxVal = Math.max(...numericValues);
            
            result.numericStats = {
                count: n,
                min: stats.round(minVal, 2),
                max: stats.round(maxVal, 2),
                mean: stats.round(stats.mean(numericValues), 2),
                std: stats.round(stats.stddev(numericValues), 2),
                median: stats.round(stats.median(numericValues), 2),
                skewness: stats.round(stats.skewness(numericValues), 4),
                kurtosis: stats.round(stats.kurtosis(numericValues), 4),
            };

            // Calculate Dynamic Range Bins (Sturges' Rule)
            if (minVal !== maxVal) {
                const k = Math.max(2, Math.ceil(1 + 3.322 * Math.log10(n)));
                const rawWidth = (maxVal - minVal) / k;
                
                // Determine clean step increments (e.g. 1, 2, 5, 10, 20, 25, 50, etc)
                const cleanIncrements = [1, 2, 5, 10, 20, 25, 50, 100, 250, 500];
                const binWidth = cleanIncrements.find(w => w >= rawWidth) || Math.ceil(rawWidth);
                
                const startBin = Math.floor(minVal / binWidth) * binWidth;
                const bins: { start: number; end: number; label: string; count: number }[] = [];
                let currentStart = startBin;
                
                while (currentStart <= maxVal) {
                    const currentEnd = currentStart + binWidth;
                    const label = `${currentStart} - ${currentEnd - 1}`;
                    bins.push({
                        start: currentStart,
                        end: currentEnd,
                        label,
                        count: 0
                    });
                    currentStart = currentEnd;
                }
                
                // Group the values into corresponding ranges
                numericValues.forEach(val => {
                    let placed = false;
                    for (let i = 0; i < bins.length; i++) {
                        const b = bins[i];
                        if (val >= b.start && val < b.end) {
                            b.count++;
                            placed = true;
                            break;
                        }
                    }
                    if (!placed && bins.length > 0 && val === maxVal) {
                        bins[bins.length - 1].count++;
                    }
                });
                
                // Only include ranges with positive counts, map in correct format
                result.binnedDistribution = bins
                    .filter(b => b.count > 0)
                    .map(b => ({
                        rangeLabel: b.label,
                        count: b.count,
                        percentage: Math.round((b.count / n) * 100)
                    }));
            }
        }

        return result;
    });
    return { fields: results, totalRespondents: responses.length };
}

function computeScaleAnalysis(responses: any[], scales: any[]) {
    return scales.map((scale: any) => {
        const statements = scale.statements || [];
        const options = scale.options || [];

        // Determine Likert scale range from options
        const optionValues = options.map((o: any) => Number(o.value)).filter((v: number) => !isNaN(v));
        const maxOptionValue = optionValues.length > 0 ? Math.max(...optionValues) : 5;
        const minOptionValue = optionValues.length > 0 ? Math.min(...optionValues) : 1;

        // Build item matrix (respondents × items) with reverse-scoring
        const itemMatrix = stats.buildItemMatrix(responses, statements, maxOptionValue, minOptionValue);
        const sampleSize = itemMatrix.length;

        if (sampleSize < 2 || statements.length < 2) {
            return {
                scaleId: scale.id,
                scaleName: scale.title,
                statementCount: statements.length,
                sampleSize,
                descriptiveStats: null,
                reliability: null,
                dimensions: [],
                itemStatistics: [],
            };
        }

        // ── Scale-Level Total Scores ──
        const totalScores = itemMatrix.map(row => row.reduce((a, b) => a + b, 0));

        // ── Descriptive Statistics ──
        const descriptiveStats = {
            mean: stats.round(stats.mean(totalScores), 2),
            std: stats.round(stats.stddev(totalScores), 2),
            variance: stats.round(stats.variance(totalScores), 2),
            min: Math.min(...totalScores),
            max: Math.max(...totalScores),
            median: stats.round(stats.median(totalScores), 2),
            skewness: stats.round(stats.skewness(totalScores), 4),
            kurtosis: stats.round(stats.kurtosis(totalScores), 4),
        };

        // ── Reliability Analysis ──
        const alpha = stats.round(stats.cronbachAlpha(itemMatrix));
        const stdAlpha = stats.round(stats.standardizedAlpha(itemMatrix));
        const splitHalfResult = stats.splitHalf(itemMatrix);

        const reliability = {
            cronbachAlpha: alpha,
            standardizedAlpha: stdAlpha,
            splitHalf: splitHalfResult,
        };

        // ── Item-Level Statistics ──
        const itemStatistics = statements.map((stmt: any, idx: number) => {
            const itemScores = itemMatrix.map(row => row[idx]);
            return {
                statementId: stmt.id,
                statementText: stmt.text || '',
                isReversed: stmt.isReversed || false,
                dimensionId: stmt.dimensionId || '',
                mean: stats.round(stats.mean(itemScores), 2),
                std: stats.round(stats.stddev(itemScores), 2),
                itemTotalCorrelation: stats.round(stats.itemTotalCorrelation(itemMatrix, idx)),
                alphaIfDeleted: stats.round(stats.alphaIfItemDeleted(itemMatrix, idx)),
            };
        });

        // ── Dimension-Level Analysis ──
        const dimensions = scale.dimensions || [];
        const dimensionResults = dimensions.map((dim: any) => {
            const dimIndices = statements
                .map((s: any, i: number) => s.dimensionId === dim.id ? i : -1)
                .filter((i: number) => i >= 0);

            // Dimension total scores per respondent
            const dimScores = itemMatrix.map(row =>
                dimIndices.reduce((sum: number, i: number) => sum + row[i], 0)
            );

            // Dimension sub-matrix for reliability
            const dimMatrix = itemMatrix.map(row =>
                dimIndices.map((i: number) => row[i])
            );

            const dimAlpha = dimIndices.length > 1
                ? stats.round(stats.cronbachAlpha(dimMatrix))
                : null;

            return {
                dimensionId: dim.id,
                dimensionName: dim.name,
                statementCount: dimIndices.length,
                mean: stats.round(stats.mean(dimScores), 2),
                std: stats.round(stats.stddev(dimScores), 2),
                skewness: stats.round(stats.skewness(dimScores), 4),
                kurtosis: stats.round(stats.kurtosis(dimScores), 4),
                cronbachAlpha: dimAlpha,
            };
        });

        // ── Pearson Correlation Matrix (items × items) ──
        // Cap at 30 items for performance (30×30 = 900 cells)
        let correlationMatrixResult = undefined;
        if (statements.length <= 30 && sampleSize >= 3) {
            correlationMatrixResult = stats.correlationMatrix(itemMatrix);
        }

        return {
            scaleId: scale.id,
            scaleName: scale.title,
            statementCount: statements.length,
            sampleSize,
            descriptiveStats,
            reliability,
            dimensions: dimensionResults,
            itemStatistics,
            correlationMatrix: correlationMatrixResult,
            // Keep legacy field for backward compatibility
            mean: descriptiveStats.mean,
            cronbachAlpha: alpha,
        };
    });
}

/**
 * Compute inter-scale Pearson correlations.
 * For each pair of scales, correlate their total scores.
 */
function computeInterScaleCorrelations(
    responses: any[],
    scales: any[],
    scaleResults: any[],
    language: 'ar' | 'en' = 'ar'
): any[] {
    // Build total-score arrays for each scale
    const scaleTotals: Map<string, { scores: number[]; name: string }> = new Map();

    for (const scale of scales) {
        const statements = scale.statements || [];
        const options = scale.options || [];
        const optionValues = options.map((o: any) => Number(o.value)).filter((v: number) => !isNaN(v));
        const maxOptionValue = optionValues.length > 0 ? Math.max(...optionValues) : 5;
        const minOptionValue = optionValues.length > 0 ? Math.min(...optionValues) : 1;

        const itemMatrix = stats.buildItemMatrix(responses, statements, maxOptionValue, minOptionValue);
        const totals = itemMatrix.map(row => row.reduce((a, b) => a + b, 0));
        scaleTotals.set(scale.id, { scores: totals, name: scale.title });
    }

    const correlations: any[] = [];
    const scaleIds = Array.from(scaleTotals.keys());

    for (let i = 0; i < scaleIds.length; i++) {
        for (let j = i + 1; j < scaleIds.length; j++) {
            const a = scaleTotals.get(scaleIds[i])!;
            const b = scaleTotals.get(scaleIds[j])!;
            // Use the shorter array length
            const n = Math.min(a.scores.length, b.scores.length);
            if (n < 3) continue;

            const r = stats.round(stats.pearsonCorrelation(a.scores, b.scores));
            const p = stats.round(stats.pValueForR(r, n), 6);

            correlations.push({
                scaleA: scaleIds[i],
                scaleAName: a.name,
                scaleB: scaleIds[j],
                scaleBName: b.name,
                r,
                p,
                interpretation: stats.interpretCorrelation(r, language),
            });
        }
    }

    return correlations;
}

/**
 * Compute group differences (T-test and ANOVA) for demographic fields.
 */
function computeGroupDifferences(
    responses: any[],
    demographicsSchema: any[],
    scaleResults: any[],
    scales: any[]
) {
    // 1. Prepare total scores for each scale
    // Note: indices in scaleData.scores match indices in responses
    const scaleData = scales.map(scale => {
        const statements = scale.statements || [];
        const options = scale.options || [];
        const optionValues = options.map((o: any) => Number(o.value)).filter((v: number) => !isNaN(v));
        const maxOptionValue = optionValues.length > 0 ? Math.max(...optionValues) : 5;
        const minOptionValue = optionValues.length > 0 ? Math.min(...optionValues) : 1;

        const itemMatrix = stats.buildItemMatrix(responses, statements, maxOptionValue, minOptionValue);
        const totalScores = itemMatrix.map(row => row.reduce((a, b) => a + b, 0));

        return {
            scaleId: scale.id,
            scaleName: scale.title,
            scores: totalScores
        };
    });

    // 2. Identify categorical demographic fields (select or text with few unique values)
    const categoricalFields = demographicsSchema.filter(f => {
        if (f.type === 'select') return true;
        if (f.type === 'text') {
            const values = new Set(responses.map(r => r.demographics?.[f.id]).filter(v => v));
            return values.size > 1 && values.size <= 10;
        }
        return false;
    });

    const differences: any[] = [];

    categoricalFields.forEach(field => {
        // Group respondent indices by this field's value
        const groups: Record<string, number[]> = {}; // label -> respondentIndices
        responses.forEach((r, idx) => {
            const val = r.demographics?.[field.id];
            if (val !== undefined && val !== null && val !== '') {
                const key = String(val).trim();
                if (!groups[key]) groups[key] = [];
                groups[key].push(idx);
            }
        });

        const groupNames = Object.keys(groups);
        if (groupNames.length < 2) return;

        const fieldResults: any[] = [];

        scaleData.forEach(scale => {
            const groupScores = groupNames.map(name =>
                groups[name].map(idx => scale.scores[idx]).filter(s => s !== undefined)
            );

            // Filter out groups with < 2 members for valid stats
            const validGroupIndices = groupNames
                .map((_, i) => i)
                .filter(i => groupScores[i].length >= 2);

            if (validGroupIndices.length < 2) return;

            const finalGroupNames = validGroupIndices.map(i => groupNames[i]);
            const finalGroupScores = validGroupIndices.map(i => groupScores[i]);

            const groupMeans: Record<string, number> = {};
            const groupCounts: Record<string, number> = {};
            finalGroupNames.forEach((name, i) => {
                groupMeans[name] = stats.round(stats.mean(finalGroupScores[i]), 2);
                groupCounts[name] = finalGroupScores[i].length;
            });

            if (finalGroupNames.length === 2) {
                // T-test
                const tRes = stats.ttest(finalGroupScores[0], finalGroupScores[1]);
                const sig = tRes.p < 0.05;
                let direction = "";
                if (sig) {
                    const m1 = groupMeans[finalGroupNames[0]];
                    const m2 = groupMeans[finalGroupNames[1]];
                    direction = m1 > m2 ? finalGroupNames[0] : finalGroupNames[1];
                }

                fieldResults.push({
                    scaleId: scale.scaleId,
                    scaleName: scale.scaleName,
                    statistic: stats.round(tRes.t, 3),
                    pValue: stats.round(tRes.p, 4),
                    significant: sig,
                    testType: 'ttest',
                    groupMeans,
                    groupCounts,
                    direction
                });
            } else {
                // ANOVA
                const aRes = stats.anova(finalGroupScores);
                const sig = aRes.p < 0.05;

                fieldResults.push({
                    scaleId: scale.scaleId,
                    scaleName: scale.scaleName,
                    statistic: stats.round(aRes.F, 3),
                    pValue: stats.round(aRes.p, 4),
                    significant: sig,
                    testType: 'anova',
                    groupMeans,
                    groupCounts
                });
            }
        });

        if (fieldResults.length > 0) {
            differences.push({
                fieldId: field.id,
                fieldLabel: field.label,
                testType: groupNames.length === 2 ? 'ttest' : 'anova',
                results: fieldResults
            });
        }
    });

    return differences;
}

function solveOptimalMapping(dimensions: any[], loadings: number[][], statements: any[]) {
    const m = dimensions.length;
    if (m === 0 || m > 8) return null;
    const k = loadings[0]?.length || 0;
    if (m !== k) return null; // Only bijective matching

    // Compute average absolute loadings matrix
    const weightMatrix: number[][] = [];
    for (let d = 0; d < m; d++) {
        const dimId = dimensions[d].id;
        const dimIndices = statements
            .map((s: any, idx: number) => s.dimensionId === dimId ? idx : -1)
            .filter((idx: number) => idx >= 0);
        
        weightMatrix[d] = [];
        for (let f = 0; f < m; f++) {
            if (dimIndices.length === 0) {
                weightMatrix[d][f] = 0;
                continue;
            }
            const sumAbs = dimIndices.reduce((sum: number, idx: number) => sum + Math.abs(loadings[idx]?.[f] || 0), 0);
            weightMatrix[d][f] = sumAbs / dimIndices.length;
        }
    }

    // Solve using Permutation Search
    let bestScore = -1;
    let bestPermutation: number[] = [];

    const permute = (arr: number[], memo: number[] = []) => {
        if (arr.length === 0) {
            let score = 0;
            for (let i = 0; i < m; i++) {
                score += weightMatrix[i][memo[i]];
            }
            if (score > bestScore) {
                bestScore = score;
                bestPermutation = [...memo];
            }
            return;
        }
        for (let i = 0; i < arr.length; i++) {
            const curr = arr.slice();
            const next = curr.splice(i, 1);
            permute(curr.slice(), memo.concat(next));
        }
    };

    const initialArr = Array.from({ length: m }, (_, i) => i);
    permute(initialArr);

    // Format output mapping
    const mapping: any[] = [];
    for (let d = 0; d < m; d++) {
        const pairedFactorIdx = bestPermutation[d];
        const avgLoadingOnPaired = weightMatrix[d][pairedFactorIdx];
        
        // Match Strength
        let strength = 'Weak';
        let strengthAr = 'ضعيف';
        if (avgLoadingOnPaired >= 0.50) {
            strength = 'Strong';
            strengthAr = 'قوي';
        } else if (avgLoadingOnPaired >= 0.35) {
            strength = 'Moderate';
            strengthAr = 'متوسط';
        }

        mapping.push({
            dimensionId: dimensions[d].id,
            dimensionName: dimensions[d].name,
            factorIndex: pairedFactorIdx + 1, // 1-indexed
            factorName: `F${pairedFactorIdx + 1}`,
            averageLoading: Number(avgLoadingOnPaired.toFixed(3)),
            strength,
            strengthAr
        });
    }

    return mapping;
}

function computeFactorAnalysis(responses: any[], scales: any[], config?: any) {
    console.log('[EFA_DEBUG] computeFactorAnalysis called. Config:', JSON.stringify(config));
    console.log('[EFA_DEBUG] Config keys:', config ? Object.keys(config) : 'null');
    console.log('[EFA_DEBUG] Scale IDs:', scales.map(s => s.id));
    
    const globalRotation = config?.rotation || 'varimax';
    const selectedScaleId = config?.selectedScaleId;

    // Filter scales to only calculate EFA/CFA for the selected scale if specified
    const targetScales = selectedScaleId
        ? scales.filter((s: any) => s.id === selectedScaleId)
        : scales;

    return targetScales.map((scale: any) => {
        // Support both scale-specific config maps and flat legacy config structures
        const scaleConfig = (config && config[scale.id]) ? config[scale.id] : config;
        
        console.log(`[EFA_DEBUG] Scale "${scale.title}" (${scale.id}): configHasKey=${!!(config && config[scale.id])}, scaleConfig=${JSON.stringify(scaleConfig)}`);
        
        const factorMethod = scaleConfig?.factorMethod || 'fixed';
        const eigenvalueThreshold = scaleConfig?.eigenvalueThreshold || 1.0;
        const rotation = scaleConfig?.rotation || globalRotation;

        const statements = scale.statements || [];
        const dimensions = scale.dimensions || [];
        const defaultFactorCount = dimensions.length > 0 ? dimensions.length : 3;
        const factorCount = scaleConfig?.factorCount || defaultFactorCount;
        
        console.log(`[EFA_DEBUG] Scale "${scale.title}": factorMethod=${factorMethod}, factorCount=${factorCount}, eigenThreshold=${eigenvalueThreshold}, rotation=${rotation}`);
        const options = scale.options || [];
        const optionValues = options.map((o: any) => Number(o.value)).filter((v: number) => !isNaN(v));
        const maxOptionValue = optionValues.length > 0 ? Math.max(...optionValues) : 5;
        const minOptionValue = optionValues.length > 0 ? Math.min(...optionValues) : 1;

        const itemMatrix = stats.buildItemMatrix(responses, statements, maxOptionValue, minOptionValue);
        const sampleSize = itemMatrix.length;

        if (sampleSize < 10 || statements.length < 3) {
            return null;
        }

        // 1. EFA using pcaFull with eigenvalues, variance, and rotation
        const efaResult = stats.pcaFull(
            itemMatrix,
            factorMethod === 'eigenvalue' ? statements.length : factorCount,
            rotation,
            factorMethod === 'eigenvalue' ? eigenvalueThreshold : undefined
        );
        
        // 2. CFA — Item-Dimension Congruence and Fit Indices
        const k = statements.length;
        const m = dimensions.length;

        // Observed correlation matrix for the items in this scale
        const observedCorr: number[][] = [];
        const itemColumns = statements.map((_: any, idx: number) => itemMatrix.map(row => row[idx]));
        for (let i = 0; i < k; i++) {
            observedCorr[i] = [];
            for (let j = 0; j < k; j++) {
                observedCorr[i][j] = stats.pearsonCorrelation(itemColumns[i], itemColumns[j]);
            }
        }

        const cfaLoadings = statements.map((stmt: any, idx: number) => {
            const dim = dimensions.find((d: any) => d.id === stmt.dimensionId);
            const dimIndices = statements
                .map((s: any, i: number) => s.dimensionId === stmt.dimensionId ? i : -1)
                .filter((i: number) => i >= 0);
            
            const itemScores = itemColumns[idx];
            const dimScores = itemMatrix.map(row => 
                dimIndices.reduce((sum: number, i: number) => sum + row[i], 0)
            );
            
            return {
                statementId: stmt.id,
                statementText: stmt.text || '',
                dimensionId: stmt.dimensionId || '',
                dimensionName: dim?.name || 'Unknown',
                loading: stats.round(stats.pearsonCorrelation(itemScores, dimScores), 3),
                index: idx + 1
            };
        });

        // Inter-factor correlations
        const factorScores = dimensions.map((dim: any) => {
            const dimIndices = statements
                .map((s: any, i: number) => s.dimensionId === dim.id ? i : -1)
                .filter((i: number) => i >= 0);
            return itemMatrix.map(row => 
                dimIndices.reduce((sum: number, idx: number) => sum + row[idx], 0)
            );
        });

        const factorCorr: number[][] = [];
        for (let i = 0; i < m; i++) {
            factorCorr[i] = [];
            for (let j = 0; j < m; j++) {
                factorCorr[i][j] = i === j ? 1.0 : stats.round(stats.pearsonCorrelation(factorScores[i], factorScores[j]), 3);
            }
        }

        // Prepare loadings matrix for fit index calculation (items x dimensions)
        const loadingsMatrix: number[][] = [];
        for (let i = 0; i < k; i++) {
            loadingsMatrix[i] = [];
            for (let j = 0; j < m; j++) {
                // standardized loading on its assigned factor, 0 otherwise
                loadingsMatrix[i][j] = statements[i].dimensionId === dimensions[j].id ? cfaLoadings[i].loading : 0;
            }
        }

        // Compute Fit Indices
        const fitIndices = stats.computeCFAFitIndices(observedCorr, loadingsMatrix, factorCorr, sampleSize);

        // Group CFA loadings by dimension for the path diagram
        const cfaDimensions = dimensions.map((dim: any, dIdx: number) => {
            const dimLoadings = cfaLoadings.filter((l: any) => l.dimensionId === dim.id);
            const avgLoading = dimLoadings.length > 0 
                ? stats.round(dimLoadings.reduce((s: number, l: any) => s + l.loading, 0) / dimLoadings.length, 3)
                : 0;
            
            // Compute Composite Reliability (CR) and Average Variance Extracted (AVE)
            const loadingsList = dimLoadings.map((l: any) => Math.min(Math.max(l.loading, -0.999), 0.999));
            const sumLoadings = loadingsList.reduce((s: number, val: number) => s + val, 0);
            const sumSqLoadings = loadingsList.reduce((s: number, val: number) => s + val * val, 0);
            const sumErrors = loadingsList.reduce((s: number, val: number) => s + (1 - val * val), 0);

            const cr = sumErrors + sumLoadings * sumLoadings > 0
                ? (sumLoadings * sumLoadings) / (sumLoadings * sumLoadings + sumErrors)
                : 0;
            const ave = sumErrors + sumSqLoadings > 0
                ? sumSqLoadings / (sumSqLoadings + sumErrors)
                : 0;
            
            // Collect covariances with other factors
            const covariances = dimensions.map((other: any, oIdx: number) => ({
                dimensionId: other.id,
                dimensionName: other.name,
                correlation: factorCorr[dIdx][oIdx]
            })).filter((c: any) => c.dimensionId !== dim.id);

            return {
                dimensionId: dim.id,
                dimensionName: dim.name,
                avgLoading,
                cr: stats.round(cr, 4),
                ave: stats.round(ave, 4),
                itemCount: dimLoadings.length,
                covariances,
                items: dimLoadings.map((l: any) => ({
                    text: l.statementText.substring(0, 40),
                    loading: l.loading,
                    index: l.index
                }))
            };
        });

        const congruenceScore = stats.round(
            cfaLoadings.reduce((sum: number, l: any) => sum + l.loading, 0) / (cfaLoadings.length || 1),
            3
        );

        const kmoBartlett = stats.calculateKMOAndBartlett(itemMatrix, statements.length);
        const factorMapping = solveOptimalMapping(dimensions, efaResult.loadings, statements);

        return {
            scaleId: scale.id,
            scaleName: scale.title,
            efa: {
                loadings: efaResult.loadings,
                eigenvalues: efaResult.eigenvalues,
                varianceExplained: efaResult.varianceExplained,
                cumulativeVariance: efaResult.cumulativeVariance,
                componentsCount: efaResult.loadings[0]?.length || 0,
                rotated: efaResult.rotated,
                rotationMethod: efaResult.rotationMethod,
                factorMethod,
                eigenvalueThreshold: factorMethod === 'eigenvalue' ? eigenvalueThreshold : undefined,
                itemLabels: statements.map((s: any) => s.text || ''),
                itemDimensions: statements.map((s: any) => {
                    const dim = dimensions.find((d: any) => d.id === s.dimensionId);
                    return dim?.name || '';
                }),
                factorMapping,
                kmo: kmoBartlett.kmo,
                bartlett: kmoBartlett.bartlett
            },
            cfa: {
                loadings: cfaLoadings,
                dimensions: cfaDimensions,
                congruenceScore,
                fitIndices
            }
        };
    }).filter(r => r !== null);
}

function computeMediationAnalysis(responses: any[], scales: any[], config?: any) {
    console.log('[MEDIATION_DEBUG] Config received:', JSON.stringify(config));
    console.log('[MEDIATION_DEBUG] Scale count:', scales.length);
    console.log('[MEDIATION_DEBUG] Scale IDs:', scales.map(s => `${s.id} (${s.title})`));
    
    if (scales.length < 3) return [];

    // Map scales by ID for easy lookup
    const scalesMap = new Map(scales.map(s => [s.id, s]));

    // Determine roles
    let ivScale = config?.independentScaleId ? scalesMap.get(config.independentScaleId) : scales[0];
    let medScale = config?.mediatorScaleId ? scalesMap.get(config.mediatorScaleId) : scales[1];
    let dvScale = config?.dependentScaleId ? scalesMap.get(config.dependentScaleId) : scales[2];
    
    console.log('[MEDIATION_DEBUG] Config IDs: IV=', config?.independentScaleId, 'M=', config?.mediatorScaleId, 'DV=', config?.dependentScaleId);
    console.log('[MEDIATION_DEBUG] Resolved: IV=', ivScale?.title, 'M=', medScale?.title, 'DV=', dvScale?.title);

    // Fallback if selections are invalid
    if (!ivScale || !medScale || !dvScale) {
        ivScale = scales[0];
        medScale = scales[1];
        dvScale = scales[2];
    }

    const roles = [ivScale, medScale, dvScale];
    
    const scaleTotals = roles.map(scale => {
        const statements = scale.statements || [];
        const options = scale.options || [];
        const optionValues = options.map((o: any) => Number(o.value)).filter((v: number) => !isNaN(v));
        const maxOptionValue = optionValues.length > 0 ? Math.max(...optionValues) : 5;
        const minOptionValue = optionValues.length > 0 ? Math.min(...optionValues) : 1;

        const itemMatrix = stats.buildItemMatrix(responses, statements, maxOptionValue, minOptionValue);
        return itemMatrix.map(row => row.reduce((a, b) => a + b, 0));
    });

    const n = Math.min(...scaleTotals.map(s => s.length));
    if (n < 10) return [];

    const results = [];
    const iv = scaleTotals[0].slice(0, n);
    const med = scaleTotals[1].slice(0, n);
    const dv = scaleTotals[2].slice(0, n);

    const res = stats.sobelTest(iv, med, dv);
    results.push({
        independentScaleId: ivScale.id,
        independentScaleName: ivScale.title,
        mediatorScaleId: medScale.id,
        mediatorScaleName: medScale.title,
        dependentScaleId: dvScale.id,
        dependentScaleName: dvScale.title,
        z: stats.round(res.z, 3),
        p: stats.round(res.p, 4),
        significant: res.isSignificant,
        a: stats.round(res.a, 4),
        sa: stats.round(res.sa, 4),
        b: stats.round(res.b, 4),
        sb: stats.round(res.sb, 4)
    });

    return results;
}
