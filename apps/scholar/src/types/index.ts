// ============================================
// Scholar Types
// ============================================

export type BlockType =
    | 'TEXT'
    | 'HEADING'
    | 'FIGURE'
    | 'TABLE'
    | 'EQUATION'
    | 'REFERENCE'
    | 'CODE'
    | 'AI_PROMPT'
    | 'DIVIDER';

export type DocumentStatus = 'draft' | 'review' | 'published';

export type LiteratureSource = 'openalex' | 'semantic_scholar' | 'crossref' | 'isbn_books' | 'ieee_xplore' | 'figshare' | 'manual';

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout';

// ============================================
// Content Payloads (stored in ScholarBlock.content JSON)
// ============================================

export interface TextContent {
    text: string;
    format?: 'plain' | 'markdown';
}

export interface HeadingContent {
    text: string;
    level: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface EquationContent {
    latex: string;
    displayMode: boolean;
    label?: string;
}

export interface TableContent {
    headers: string[];
    rows: string[][];
    caption?: string;
}

export interface FigureContent {
    src: string;
    alt: string;
    caption?: string;
    width?: number;
}

export interface ReferenceContent {
    literatureItemId: string;
    citationKey?: string;
    formattedCitation?: string;
}

export interface CodeContent {
    code: string;
    language: string;
    showLineNumbers?: boolean;
}

export interface AIPromptContent {
    prompt: string;
    contextBlockIds?: string[];
    generatedText?: string;
}

// ============================================
// Block Metadata (stored in ScholarBlock.metadata JSON)
// ============================================

export interface BlockMetadata {
    ai?: {
        prompt: string;
        model: string;
        generatedAt: string | null;
        contextBlockIds: string[];
    };
    crossRefs?: string[];  // [[ref:uuid]] references found in this block
    linkedLiteratureIds?: string[];
    lastEditedAt?: string;
    canvasSource?: CanvasSourceMetadata;
}

// ============================================
// Comment & Issues Types
// ============================================

export type CommentStatus = 'open' | 'in_progress' | 'resolved';

export interface AICommentAssessment {
    evaluatedAt: string;
    isValid: boolean;
    verdict: 'valid' | 'invalid' | 'already_resolved' | 'needs_clarification';
    analysis: string;
    suggestedFix?: string;
    canAutoResolve?: boolean;
}

export interface DocumentComment {
    id: string;
    documentId: string;
    blockId?: string;
    blockSnippet?: string;
    author?: string;
    text: string;
    status: CommentStatus;
    aiAssessment?: AICommentAssessment;
    createdAt: string;
    updatedAt?: string;
    resolvedAt?: string;
    resolvedBy?: string;
}

// ============================================
// Document-level Types
// ============================================

export interface ScholarProject {
    id: string;
    title: string;
    description?: string;
    owner?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ScholarDocument {
    id: string;
    projectId: string;
    title: string;
    abstract?: string;
    status?: DocumentStatus;
    metadata?: Record<string, any>;
    owner?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ScholarBlock {
    id: string;
    documentId: string;
    type: BlockType;
    content: any;
    metadata?: BlockMetadata;
    parentId?: string | null;
    orderIndex: number;
    owner?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ScholarLiteratureItem {
    id: string;
    projectId: string;
    source: LiteratureSource;
    externalId?: string;
    title: string;
    authors?: { name: string; affiliation?: string }[];
    year?: number;
    journal?: string;
    abstract?: string;
    citationCount?: number;
    doi?: string;
    url?: string;
    fullMetadata?: Record<string, any>;
    tags?: string[];
    notes?: string;
    owner?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ScholarFigure {
    id: string;
    projectId: string;
    title: string;
    s3Key: string;
    contentType?: string;
    sizeBytes?: number;
    caption?: string;
    metadata?: Record<string, any>;
    owner?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ScholarCodeExecution {
    id: string;
    blockId: string;
    documentId: string;
    language: string;
    code: string;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    executionTimeMs?: number;
    status: ExecutionStatus;
    owner?: string;
    createdAt?: string;
    updatedAt?: string;
}

// ============================================
// Block Component Props
// ============================================

export interface BlockProps {
    block: ScholarBlock;
    isFocused: boolean;
    onContentChange: (content: any) => void;
    onFocus: () => void;
    onDelete?: () => void;
}

// ============================================
// Literature Search
// ============================================

export interface LiteratureSearchResult {
    source: LiteratureSource;
    externalId: string;
    title: string;
    authors: { name: string }[];
    year?: number;
    journal?: string;
    abstract?: string;
    citationCount?: number;
    doi?: string;
    url?: string;
    rawData?: Record<string, any>;
}

// ============================================
// Code Execution
// ============================================

export interface CodeExecutionRequest {
    language: string;
    code: string;
    stdin?: string;
}

export interface CodeExecutionResponse {
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTimeMs: number;
}

// ============================================
// Canvas Integration Types
// ============================================

export type ResearchBlockType =
    | 'reference-collection'
    | 'literature-survey'
    | 'dataset'
    | 'analysis-result'
    | 'notes'
    | 'workflow-pipeline'
    | 'statistical-analysis'
    | 'simulation-engine'
    | 'literature-search'
    | 'processing-pipeline'
    | 'llm-analysis'
    | 'results-table';

export interface CanvasSourceMetadata {
    blockId: string;
    blockType: ResearchBlockType;
    title: string;
    pushedAt: string;
}

export interface ResearchBlockData {
    id: string;
    type: ResearchBlockType;
    title: string;
    content: any;
    projectId: string;
    createdAt?: string;
}

export interface WorkflowPipelineNodeData {
    pipelineVersion: 'V1' | 'V3';
    status: 'idle' | 'queued' | 'extracting' | 'success' | 'failed';
    inputs?: { query?: string; corpusId?: string; criteriaJson?: string };
    outputs?: { masterCsvPath?: string; confidenceAverage?: number; extractedPapers?: any[] };
    errorLogs?: string;
}

export interface StatisticalAnalysisNodeData {
    schema?: Record<string, string>;
    datasetPath?: string;
    resultCsvPath?: string;
    codeSource?: string;
    status?: 'idle' | 'running' | 'success' | 'failed';
    result?: any;
}

export interface SimulationNodeData {
    status?: 'idle' | 'running' | 'success' | 'failed';
    trajectoryDataS3Key?: string;
    snapshotDelta?: number;
    averageDelta?: number;
    trajectoryPoints?: any[];
    parameters?: {
        timescale?: number;
        assetConfig?: string;
    };
}

export interface CanvasLayout {
    nodePositions: { id: string; position: { x: number; y: number } }[];
    researchBlocks: ResearchBlockData[];
}

export * from './journal';

