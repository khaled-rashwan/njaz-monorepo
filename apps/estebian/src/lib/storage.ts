import { Scale, Survey, SurveyResponse, Report } from './types';

// Storage keys
const SCALES_KEY = 'estebian_scales';
const SURVEYS_KEY = 'estebian_surveys';
const RESPONSES_KEY = 'estebian_responses';
const REPORTS_KEY = 'estebian_reports';

/**
 * Scale Storage Functions
 */
export function getScales(): Scale[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(SCALES_KEY);
    return data ? JSON.parse(data) : [];
}

export function getPublicScales(): Scale[] {
    return getScales().filter(s => s.isPublic);
}

export function getScaleById(id: string): Scale | null {
    return getScales().find(s => s.id === id) || null;
}

export function saveScale(scale: Scale): void {
    const scales = getScales();
    const index = scales.findIndex(s => s.id === scale.id);
    if (index >= 0) {
        scales[index] = scale;
    } else {
        scales.push(scale);
    }
    localStorage.setItem(SCALES_KEY, JSON.stringify(scales));
}

export function deleteScale(id: string): void {
    const scales = getScales().filter(s => s.id !== id);
    localStorage.setItem(SCALES_KEY, JSON.stringify(scales));
}

/**
 * Survey Storage Functions
 */
export function getSurveys(userId?: string): Survey[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(SURVEYS_KEY);
    const surveys: Survey[] = data ? JSON.parse(data) : [];
    return userId ? surveys.filter(s => s.createdBy === userId) : surveys;
}

export function getSurveyById(id: string): Survey | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(SURVEYS_KEY);
    const surveys: Survey[] = data ? JSON.parse(data) : [];
    return surveys.find(s => s.id === id) || null;
}

export function getPublishedSurveyById(id: string): Survey | null {
    const survey = getSurveyById(id);
    return survey?.isPublished ? survey : null;
}

export function saveSurvey(survey: Survey): void {
    if (typeof window === 'undefined') return;
    const data = localStorage.getItem(SURVEYS_KEY);
    const surveys: Survey[] = data ? JSON.parse(data) : [];
    const index = surveys.findIndex(s => s.id === survey.id);
    if (index >= 0) {
        surveys[index] = survey;
    } else {
        surveys.push(survey);
    }
    localStorage.setItem(SURVEYS_KEY, JSON.stringify(surveys));
}

export function deleteSurvey(id: string): void {
    if (typeof window === 'undefined') return;
    const data = localStorage.getItem(SURVEYS_KEY);
    const surveys: Survey[] = data ? JSON.parse(data) : [];
    const filtered = surveys.filter(s => s.id !== id);
    localStorage.setItem(SURVEYS_KEY, JSON.stringify(filtered));
}

/**
 * Response Storage Functions
 */
export function getResponses(surveyId?: string): SurveyResponse[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(RESPONSES_KEY);
    const responses: SurveyResponse[] = data ? JSON.parse(data) : [];
    return surveyId ? responses.filter(r => r.surveyId === surveyId) : responses;
}

export function saveResponse(response: SurveyResponse): void {
    if (typeof window === 'undefined') return;
    const data = localStorage.getItem(RESPONSES_KEY);
    const responses: SurveyResponse[] = data ? JSON.parse(data) : [];
    responses.push(response);
    localStorage.setItem(RESPONSES_KEY, JSON.stringify(responses));
}

/**
 * Report Storage Functions
 */
export function getReports(userId?: string): Report[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(REPORTS_KEY);
    const reports: Report[] = data ? JSON.parse(data) : [];
    return userId ? reports.filter(r => r.createdBy === userId) : reports;
}

export function saveReport(report: Report): void {
    if (typeof window === 'undefined') return;
    const data = localStorage.getItem(REPORTS_KEY);
    const reports: Report[] = data ? JSON.parse(data) : [];
    reports.push(report);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

/**
 * Generate unique ID
 */
export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
