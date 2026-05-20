// Core data types for Estebian

/**
 * Scale - A psychometric measurement instrument
 * Each scale is in a single language (Arabic or English)
 */
export interface Scale {
    id: string;
    language: 'ar' | 'en';
    title: string;
    description: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    isPublic: boolean;
    dimensions: Dimension[]; // Metadata: id, name
    statements: Statement[]; // Flat list with order preserved
    options: ScaleOption[];
}

/**
 * Dimension - A category/subscale within a scale
 */
export interface Dimension {
    id: string;
    name: string;
}

/**
 * Statement - An individual item/question
 */
export interface Statement {
    id: string;
    text: string;
    isReversed: boolean;
    dimensionId: string; // Link to dimension
}

/**
 * ScaleOption - Multiple choice answer option with score
 */
export interface ScaleOption {
    id: string;
    label: string;
    value: number; // Score value
}

/**
 * Survey - User-created assessment
 * Each survey is in a single language
 */
export interface Survey {
    id: string;
    language: 'ar' | 'en';
    title: string;
    introduction: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    isPublished: boolean;
    publishedUrl?: string;
    demographics: DemographicField[];
    scaleIds: string[];
    scaleSnapshots?: Scale[]; // Deep copy of scales at publish time
}

/**
 * DemographicField - Pre-survey demographic question
 */
export interface DemographicField {
    id: string;
    type: 'text' | 'select' | 'number' | 'date';
    label: string;
    required: boolean;
    options?: string[]; // For select type
}

/**
 * SurveyResponse - Anonymous participant response
 */
export interface SurveyResponse {
    id: string;
    surveyId: string;
    submittedAt: string;
    demographics: Record<string, any>;
    answers: Record<string, number>; // statementId -> selectedOptionValue
}

/**
 * Report - Generated analysis report (premium feature)
 */
export interface Report {
    id: string;
    surveyId: string;
    type: 'demographic' | 'scale' | 'comprehensive';
    status: ReportStatus;
    createdAt: string;
    createdBy: string;
    
    // Payment
    paymentId?: string;
    paymentMethod?: string;
    paymentAmount?: number;
    paymentCurrency?: string;
    paidAt?: string;
    
    // Computation
    stepFunctionExecutionId?: string;
    computeStartedAt?: string;
    computeCompletedAt?: string;
    errorMessage?: string;
    
    // Output
    isPaid: boolean;
    data: ReportData | null;
    pdfS3Key?: string;
}

export type ReportStatus = 
    | 'pending_payment'
    | 'payment_processing'
    | 'payment_verified'
    | 'computing'
    | 'generating_pdf'
    | 'completed'
    | 'payment_failed'
    | 'computation_failed';

export interface ReportData {
    generatedAt: string;
    surveyTitle: string;
    sampleSize: number;
    demographics?: DemographicAnalysis;
    scaleAnalysis?: ScaleAnalysisResult[];
    interScaleCorrelations?: InterScaleCorrelation[];
    groupDifferences?: GroupDifference[];
    factorAnalysis?: FactorAnalysisResult[];
    mediationAnalysis?: MediationResult[];
    overallMetrics?: OverallMetrics;
}

export interface ScaleAnalysisResult {
    scaleId: string;
    scaleName: string;
    statementCount: number;
    sampleSize: number;

    // Full descriptive statistics for total scale scores
    descriptiveStats: DescriptiveStats | null;

    // Reliability analysis
    reliability: ReliabilityResult | null;

    // Per-dimension breakdown
    dimensions: DimensionResult[];

    // Per-item statistics
    itemStatistics: ItemStatistic[];

    // Pearson correlation matrix (item × item)
    correlationMatrix?: CorrelationEntry[][];

    // Legacy (backward compatibility)
    mean: number;
    cronbachAlpha: number;
}

export interface DescriptiveStats {
    mean: number;
    std: number;
    variance: number;
    min: number;
    max: number;
    median: number;
    skewness: number;
    kurtosis: number;
}

export interface ReliabilityResult {
    cronbachAlpha: number;
    standardizedAlpha: number;
    splitHalf: {
        rawCorrelation: number;
        spearmanBrown: number;
        guttman: number;
    };
}

export interface ItemStatistic {
    statementId: string;
    statementText: string;
    isReversed: boolean;
    dimensionId: string;
    mean: number;
    std: number;
    itemTotalCorrelation: number;
    alphaIfDeleted: number;
}

export interface DimensionResult {
    dimensionId: string;
    dimensionName: string;
    statementCount: number;
    mean: number;
    std: number;
    skewness?: number;
    kurtosis?: number;
    cronbachAlpha: number | null;
}

export interface CorrelationEntry {
    r: number;
    p: number;
}

export interface InterScaleCorrelation {
    scaleA: string;
    scaleAName: string;
    scaleB: string;
    scaleBName: string;
    r: number;
    p: number;
    interpretation: string;
}

export interface GroupDifference {
    fieldId: string;
    fieldLabel: string;
    testType: 'ttest' | 'anova';
    results: {
        scaleId: string;
        scaleName: string;
        statistic: number; // t-value or F-value
        pValue: number;
        groupMeans: Record<string, number>; // label -> mean
        groupCounts: Record<string, number>; // label -> n
        significant: boolean;
        direction?: string; // e.g., "Higher for Group X"
    }[];
}

export interface DemographicAnalysis {
    fields: {
        fieldId: string;
        fieldLabel: string;
        type: string;
        distribution: Record<string, number>;  // value -> count
        numericStats?: {
            count: number;
            min: number;
            max: number;
            mean: number;
            std: number;
            median?: number;
            skewness?: number;
            kurtosis?: number;
        };
    }[];
    totalRespondents: number;
}

export interface OverallMetrics {
    totalResponses: number;
    completionRate: number;
    averageResponseTime?: number;
}

export interface FactorAnalysisResult {
    scaleId: string;
    scaleName: string;
    efa: {
        loadings: number[][]; // [itemIndex][componentIndex]
        componentsCount: number;
        itemLabels: string[];
        factorMethod: 'eigenvalue' | 'fixed';
        eigenvalueThreshold?: number;
        rotationMethod?: string;
        rotated: boolean;
        eigenvalues?: number[];
        varianceExplained?: number[];
        cumulativeVariance?: number[];
        itemDimensions?: string[];
        factorMapping?: {
            dimensionName: string;
            factorIndex: number;
            factorName: string;
            averageLoading: number;
            strength: 'Strong' | 'Moderate' | 'Weak';
            strengthAr: string;
        }[];
    };
    cfa: {
        loadings: { 
            statementId: string; 
            statementText: string; 
            dimensionName: string; 
            loading: number; // Correlation with intended dimension
        }[];
        congruenceScore: number; // Average loading on intended dimensions
        fitIndices?: {
            chiSquare: number;
            df: number;
            pValue: number;
            rmsea: number;
            cfi: number;
            tli: number;
            srmr: number;
        };
        dimensions?: {
            dimensionId: string;
            dimensionName: string;
            itemCount: number;
            avgLoading: number;
            items: {
                text: string;
                loading: number;
                index?: number;
            }[];
            covariances?: {
                dimensionId: string;
                dimensionName: string;
                correlation: number;
            }[];
        }[];
    };
}

export interface MediationResult {
    independentScaleId: string;
    independentScaleName: string;
    mediatorScaleId: string;
    mediatorScaleName: string;
    dependentScaleId: string;
    dependentScaleName: string;
    z: number;
    p: number;
    significant: boolean;
}

// Default scale options (Likert 5-point) - Arabic
export const DEFAULT_LIKERT_OPTIONS_AR: ScaleOption[] = [
    { id: '1', label: 'أعارض بشدة', value: 1 },
    { id: '2', label: 'أعارض', value: 2 },
    { id: '3', label: 'محايد', value: 3 },
    { id: '4', label: 'أوافق', value: 4 },
    { id: '5', label: 'أوافق بشدة', value: 5 },
];

// Default scale options (Likert 5-point) - English
export const DEFAULT_LIKERT_OPTIONS_EN: ScaleOption[] = [
    { id: '1', label: 'Strongly Disagree', value: 1 },
    { id: '2', label: 'Disagree', value: 2 },
    { id: '3', label: 'Neutral', value: 3 },
    { id: '4', label: 'Agree', value: 4 },
    { id: '5', label: 'Strongly Agree', value: 5 },
];

export function getDefaultOptions(language: 'ar' | 'en'): ScaleOption[] {
    return language === 'ar' ? DEFAULT_LIKERT_OPTIONS_AR : DEFAULT_LIKERT_OPTIONS_EN;
}
