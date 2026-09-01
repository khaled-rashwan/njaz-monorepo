import { a } from '@aws-amplify/backend';

/**
 * Scholar Data Schema
 * 
 * Block-based academic writing platform with:
 * - Documents (research papers, theses, articles)
 * - Blocks (structured content units with fractional ordering)
 * - Literature Items (collected papers from API searches)
 * - Code Executions (sandboxed code run history)
 */

export const scholarSchema = {
    // ============================================
    // PROJECT - Root workspace container
    // ============================================
    ScholarProject: a
        .model({
            title: a.string().required(),
            description: a.string(),
            tags: a.string().array(),
            metadata: a.json(),
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['admins']),
            allow.groups(['scholar-access']),
        ]),

    // ============================================
    // DOCUMENT - Research document container
    // ============================================
    ScholarDocument: a
        .model({
            projectId: a.id().required(),
            title: a.string().required(),
            abstract: a.string(),
            status: a.enum(['draft', 'review', 'published']),
            // Document-level settings: citation style, template, export prefs
            metadata: a.json(),
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['admins']),
            allow.groups(['scholar-access']),
        ]),

    // ============================================
    // BLOCK - Fundamental content unit
    // ============================================
    ScholarBlock: a
        .model({
            documentId: a.id().required(),
            type: a.enum([
                'TEXT',
                'HEADING',
                'FIGURE',
                'TABLE',
                'EQUATION',
                'REFERENCE',
                'CODE',
                'AI_PROMPT',
                'DIVIDER',
            ]),
            // Actual payload: rich text, LaTeX string, table cell data, code source, etc.
            content: a.json(),
            // AI lineage, prompts, cross-reference UUIDs, linked literature IDs
            metadata: a.json(),
            // For nesting (e.g., list item inside list block). Null if root level.
            parentId: a.string(),
            // Fractional indexing for performant drag-and-drop reordering
            orderIndex: a.float().required(),
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['admins']),
            allow.groups(['scholar-access']),
        ]),

    // ============================================
    // LITERATURE ITEM - Collected research papers
    // ============================================
    ScholarLiteratureItem: a
        .model({
            projectId: a.id().required(),
            source: a.enum(['openalex', 'semantic_scholar', 'crossref', 'manual']),
            externalId: a.string(),
            title: a.string().required(),
            authors: a.json(),
            year: a.integer(),
            journal: a.string(),
            abstract: a.string(),
            citationCount: a.integer(),
            doi: a.string(),
            url: a.string(),
            // Raw API response for statistical analysis
            fullMetadata: a.json(),
            tags: a.string().array(),
            notes: a.string(),
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['admins']),
            allow.groups(['scholar-access']),
        ]),

    // ============================================
    // DATASET - Associated research data files
    // ============================================
    ScholarDataset: a
        .model({
            projectId: a.id().required(),
            name: a.string().required(),
            description: a.string(),
            s3Key: a.string(), // Reference to uploaded file in S3
            format: a.string(), // csv, json, etc.
            metadata: a.json(),
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['admins']),
            allow.groups(['scholar-access']),
        ]),

    // ============================================
    // CODE EXECUTION - Sandboxed code run history
    // ============================================
    ScholarCodeExecution: a
        .model({
            blockId: a.id().required(),
            documentId: a.id().required(),
            language: a.string().required(),
            code: a.string().required(),
            stdout: a.string(),
            stderr: a.string(),
            exitCode: a.integer(),
            executionTimeMs: a.integer(),
            status: a.enum(['pending', 'running', 'completed', 'failed', 'timeout']),
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['admins']),
            allow.groups(['scholar-access']),
        ]),

    // ============================================
    // USER PROFILE - AI Quotas & Settings
    // ============================================
    UserScholarProfile: a
        .model({
            id: a.id().required(),
            isAiSuspended: a.boolean().default(false),
            billingTier: a.enum(['FREE', 'PRO', 'ENTERPRISE']),
            apiCreditsRemaining: a.integer().default(10), // default credits
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['admins']),
        ]),

    // ============================================
    // SCHOLAR FIGURE - Project Figure Bank
    // ============================================
    ScholarFigure: a
        .model({
            projectId: a.id().required(),
            title: a.string().required(),
            s3Key: a.string().required(),
            contentType: a.string(),
            sizeBytes: a.integer(),
            caption: a.string(),
            metadata: a.json(),
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['admins']),
            allow.groups(['scholar-access']),
        ]),

    ScholarWorkflowJob: a
        .model({
            projectId: a.id().required(),
            pipelineVersion: a.string().required(),
            status: a.enum(['idle', 'queued', 'running', 'completed', 'failed']),
            inputs: a.json(),
            outputs: a.json(),
            errorLogs: a.string(),
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['admins']),
            allow.groups(['scholar-access']),
        ]),

    ScholarAnalysisArtifact: a
        .model({
            projectId: a.id().required(),
            name: a.string().required(),
            description: a.string(),
            s3Key: a.string().required(),
            format: a.string().required(),
            metadata: a.json(),
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['admins']),
            allow.groups(['scholar-access']),
        ]),

    ScholarSimulationTrajectory: a
        .model({
            projectId: a.id().required(),
            name: a.string().required(),
            snapshotDelta: a.float(),
            trajectoryDataS3Key: a.string(),
            parameters: a.json(),
            metadata: a.json(),
        })
        .authorization((allow) => [
            allow.owner(),
            allow.groups(['admins']),
            allow.groups(['scholar-access']),
        ]),
};
