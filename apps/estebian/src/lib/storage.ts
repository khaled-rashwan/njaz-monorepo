import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@njaz/shared-backend';
import { Scale, Survey, SurveyResponse, Report } from './types';

let clientCache: any = null;

function getClient() {
    if (!clientCache) {
        clientCache = generateClient<Schema>();
    }
    return clientCache;
}

/**
 * Storage Strategy:
 * During migration, we prioritize Cloud (Amplify Data).
 * If a call fails or is unauthenticated, we can fall back to local (optional, currently strictly cloud for this revision).
 */

/**
 * Scale Storage Functions
 */
export async function getScales(): Promise<Scale[]> {
    const { data: scales } = await getClient().models.EstebianScale.list();
    return (scales || []).map((s: any) => ({
        ...s,
        dimensions: typeof s.dimensions === 'string' ? JSON.parse(s.dimensions) : (s.dimensions || []),
        statements: typeof s.statements === 'string' ? JSON.parse(s.statements) : (s.statements || []),
        options: typeof s.options === 'string' ? JSON.parse(s.options) : (s.options || [])
    })) as unknown as Scale[];
}

export async function getPublicScales(): Promise<Scale[]> {
    const { data: scales } = await getClient().models.EstebianScale.list({
        filter: { isPublic: { eq: true } }
    });
    return (scales || []).map((s: any) => ({
        ...s,
        dimensions: typeof s.dimensions === 'string' ? JSON.parse(s.dimensions) : (s.dimensions || []),
        statements: typeof s.statements === 'string' ? JSON.parse(s.statements) : (s.statements || []),
        options: typeof s.options === 'string' ? JSON.parse(s.options) : (s.options || [])
    })) as unknown as Scale[];
}

export async function getScaleById(id: string, authMode: 'userPool' | 'apiKey' = 'userPool'): Promise<Scale | null> {
    const { data: scale } = await getClient().models.EstebianScale.get({ id }, { authMode });
    if (!scale) return null;
    return {
        ...scale,
        dimensions: typeof scale.dimensions === 'string' ? JSON.parse(scale.dimensions) : (scale.dimensions || []),
        statements: typeof scale.statements === 'string' ? JSON.parse(scale.statements) : (scale.statements || []),
        options: typeof scale.options === 'string' ? JSON.parse(scale.options) : (scale.options || [])
    } as unknown as Scale;
}

export async function saveScale(scale: Partial<Scale> & { title: string }): Promise<string> {
    const isUpdate = !!scale.id;
    let existing = null;

    if (isUpdate) {
        const { data } = await getClient().models.EstebianScale.get({ id: scale.id! });
        existing = data;
    }

    // Explicitly select schema fields and CLEAN data
    // This ensures that even if legacy frontend code sends nested statements in dimensions,
    // they are stripped before saving to the new schema.
    const cleanDimensions = Array.isArray(scale.dimensions)
        ? scale.dimensions.map((d: any) => ({ id: d.id, name: d.name }))
        : [];

    const scaleInput: any = {
        title: scale.title,
        description: scale.description,
        dimensions: JSON.stringify(cleanDimensions),
        statements: JSON.stringify(scale.statements || []),
        options: JSON.stringify(scale.options || []),
        isPublic: scale.isPublic ?? true,
        language: scale.language || 'ar'
    };

    if (isUpdate && existing) {
        const { data: updated } = await getClient().models.EstebianScale.update({
            id: scale.id!,
            ...scaleInput
        });
        return updated?.id || scale.id!;
    } else {
        // If no ID is provided, AppSync generates a UUID
        if (scale.id) scaleInput.id = scale.id;
        const { data: created } = await getClient().models.EstebianScale.create(scaleInput);
        if (!created) throw new Error("Failed to create scale");
        return created.id;
    }
}

/**
 * Survey Storage Functions
 */
export async function getSurveys(): Promise<Survey[]> {
    const { data: surveys } = await getClient().models.EstebianSurvey.list();
    return (surveys || []).map((s: any) => ({
        ...s,
        demographics: typeof s.demographics === 'string' ? JSON.parse(s.demographics) : s.demographics
    })) as unknown as Survey[];
}

export async function getSurveyById(id: string): Promise<Survey | null> {
    const { data: survey } = await getClient().models.EstebianSurvey.get({ id });
    if (!survey) return null;
    return {
        ...survey,
        demographics: typeof survey.demographics === 'string' ? JSON.parse(survey.demographics) : survey.demographics,
        scaleSnapshots: typeof survey.scaleSnapshots === 'string' ? JSON.parse(survey.scaleSnapshots) : survey.scaleSnapshots
    } as unknown as Survey;
}

export async function getPublishedSurveyById(id: string): Promise<Survey | null> {
    const { data: survey } = await getClient().models.EstebianSurvey.get({ id }, { authMode: 'apiKey' });
    if (!survey || !survey.isPublished) return null;
    return {
        ...survey,
        demographics: typeof survey.demographics === 'string' ? JSON.parse(survey.demographics) : survey.demographics,
        scaleSnapshots: typeof survey.scaleSnapshots === 'string' ? JSON.parse(survey.scaleSnapshots) : survey.scaleSnapshots
    } as unknown as Survey;
}

export async function saveSurvey(survey: Partial<Survey> & { title: string }): Promise<string> {
    const isUpdate = !!survey.id;
    let existing = null;

    if (isUpdate) {
        const { data } = await getClient().models.EstebianSurvey.get({ id: survey.id! });
        existing = data;
    }

    // Explicitly select schema fields
    const surveyInput: any = {
        language: survey.language,
        title: survey.title,
        introduction: survey.introduction,
        isPublished: survey.isPublished,
        publishedUrl: survey.publishedUrl,
        demographics: JSON.stringify(survey.demographics),
        scaleIds: survey.scaleIds,
    };

    // If publishing, create a snapshot of scales
    if (survey.isPublished && survey.scaleIds) {
        // Note: For production robustness, we should fetch the actual scales here
        // to ensure the snapshot is accurate. 
        // For simplicity in this logic, we assume they are passed if snapshots aren't provided.
        if (survey.scaleSnapshots) {
            surveyInput.scaleSnapshots = JSON.stringify(survey.scaleSnapshots);
        } else {
            const snapshots = await Promise.all(
                survey.scaleIds.map(id => getScaleById(id))
            );
            surveyInput.scaleSnapshots = JSON.stringify(snapshots.filter(s => s !== null));
        }
    }

    if (isUpdate && existing) {
        const { data: updated } = await getClient().models.EstebianSurvey.update({
            id: survey.id!,
            ...surveyInput
        });
        return updated?.id || survey.id!;
    } else {
        if (survey.id) surveyInput.id = survey.id;
        const { data: created } = await getClient().models.EstebianSurvey.create(surveyInput);
        if (!created) throw new Error("Failed to create survey");
        return created.id;
    }
}

export async function deleteSurvey(id: string): Promise<void> {
    await getClient().models.EstebianSurvey.delete({ id });
}

/**
 * Response Storage Functions (Anonymous support)
 */
export async function getResponses(surveyId: string): Promise<SurveyResponse[]> {
    let nextToken: string | null = null;
    const allResponses: any[] = [];
    do {
        const response: any = await getClient().models.EstebianResponse.list({
            filter: { surveyId: { eq: surveyId } },
            nextToken: nextToken
        });
        allResponses.push(...(response.data || []));
        nextToken = response.nextToken;
    } while (nextToken);

    return allResponses.map((r: any) => ({
        ...r,
        demographics: typeof r.demographics === 'string' ? JSON.parse(r.demographics) : r.demographics,
        answers: typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers
    })) as unknown as SurveyResponse[];
}

export async function saveResponse(response: SurveyResponse): Promise<string> {
    // Save using the secure custom mutation (API Key for anonymous access)
    // The backend Lambda will internally resolve the survey owner
    const { data: result, errors } = await getClient().mutations.submitResponse({
        surveyId: response.surveyId,
        answers: JSON.stringify(response.answers),
        demographics: JSON.stringify(response.demographics)
    }, {
        authMode: 'apiKey'
    });

    if (errors) {
        console.error('Mutation errors:', errors);
        throw new Error(errors[0].message);
    }

    // result will contain the ID of the created response
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    return parsed?.id || response.id;
}

/**
 * Report Storage Functions
 */
export async function getReports(surveyId: string): Promise<Report[]> {
    const filter = surveyId ? { surveyId: { eq: surveyId } } : undefined;
    let nextToken: string | null = null;
    const allReports: any[] = [];
    do {
        const response: any = await getClient().models.EstebianReport.list({
            filter: filter,
            nextToken: nextToken
        });
        allReports.push(...(response.data || []));
        nextToken = response.nextToken;
    } while (nextToken);

    return allReports.map((r: any) => ({
        ...r,
        data: typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || null)
    })) as unknown as Report[];
}

export async function getReportById(id: string): Promise<Report | null> {
    const { data: report } = await getClient().models.EstebianReport.get({ id });
    if (!report) return null;
    return {
        ...report,
        data: typeof report.data === 'string' ? JSON.parse(report.data) : (report.data || null)
    } as unknown as Report;
}

/**
 * Request a new paid report. This calls the backend Lambda which:
 * 1. Creates a report record with PENDING_PAYMENT status
 * 2. Creates a payment session (or bypasses in dev)
 * 3. Starts the Step Function pipeline
 */
export async function requestReport(
    surveyId: string,
    reportType: 'demographic' | 'scale' | 'comprehensive',
    reportId?: string,
    options?: { efaConfig?: any; mediationConfig?: any }
): Promise<{ reportId: string; paymentUrl: string | null; status: string }> {
    console.log('Available Mutations:', Object.keys(getClient().mutations));
    
    const args: any = { surveyId, reportType };
    if (reportId) args.reportId = reportId;
    if (options?.efaConfig) args.efaConfig = JSON.stringify(options.efaConfig);
    if (options?.mediationConfig) args.mediationConfig = JSON.stringify(options.mediationConfig);
    
    const { data: result, errors } = await getClient().mutations.requestReport(args);

    if (errors) {
        throw new Error(errors[0].message);
    }

    // result is the JSON returned from the Lambda
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    return parsed;
}

/**
 * Legacy saveReport (Client-side)
 * Still useful for testing or non-orchestrated reports
 */
export async function saveReport(report: Report): Promise<string> {
    const { data: created } = await getClient().models.EstebianReport.create({
        id: report.id,
        surveyId: report.surveyId,
        type: report.type,
        status: report.status || (report.isPaid ? 'completed' : 'pending_payment'),
        isPaid: report.isPaid,
        data: JSON.stringify(report.data)
    });

    if (!created) throw new Error("Failed to save report");
    return created.id;
}

/**
 * Standard UUID v4 generator (AppSync compatible)
 */
export function generateId(): string {
    return crypto.randomUUID();
}
