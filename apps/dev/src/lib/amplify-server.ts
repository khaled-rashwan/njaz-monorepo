// ============================================
// Server-side AppSync Helper
// ============================================
// Direct GraphQL calls to AWS AppSync using API key or user token auth.
// Used by Next.js API routes.

import amplifyConfig from '../../amplify_outputs.json';

const APPSYNC_URL: string = amplifyConfig.data?.url || '';
const API_KEY: string = amplifyConfig.data?.api_key || '';

/**
 * Execute a GraphQL operation against the AppSync API.
 *
 * @param query - The GraphQL query or mutation string
 * @param variables - Optional variables for the operation
 * @param authToken - Optional JWT token for user-pool auth (overrides API key)
 * @returns The parsed `data` field from the GraphQL response
 * @throws Error if the response contains GraphQL errors
 */
export async function executeGraphQL<T = Record<string, any>>(
    query: string,
    variables?: Record<string, any>,
    authToken?: string,
): Promise<T> {
    if (!APPSYNC_URL || (!API_KEY && !authToken)) {
        throw new Error(
            'AppSync not configured. Ensure amplify_outputs.json has data.url and data.api_key. ' +
            'Run `npm run sync-amplify` from the monorepo root.',
        );
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (authToken) {
        headers['Authorization'] = authToken;
    } else {
        headers['x-api-key'] = API_KEY;
    }

    const response = await fetch(APPSYNC_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
        throw new Error(`AppSync HTTP error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors?.length) {
        const message = result.errors.map((e: any) => e.message).join('; ');
        throw new Error(`AppSync GraphQL error: ${message}`);
    }

    return result.data as T;
}

// ============================================
// DevInquiry Mutations & Queries
// ============================================

export const MUTATIONS = {
    createDevInquiry: /* GraphQL */ `
        mutation CreateDevInquiry($input: CreateDevInquiryInput!) {
            createDevInquiry(input: $input) {
                id
                clientName
                clientEmail
                status
                submittedBy
                createdAt
            }
        }
    `,
    updateDevInquiry: /* GraphQL */ `
        mutation UpdateDevInquiry($input: UpdateDevInquiryInput!) {
            updateDevInquiry(input: $input) {
                id
                status
                assignedTo
                assignedToName
                priority
                adminNotes
                managementType
                githubRepo
                githubIssueUrl
                githubIssueNumber
                statusHistory
                updatedAt
            }
        }
    `,
    createDevTask: /* GraphQL */ `
        mutation CreateDevTask($input: CreateDevTaskInput!) {
            createDevTask(input: $input) {
                id
                inquiryId
                title
                status
                type
                priority
                phase
                phaseOrder
                createdAt
            }
        }
    `,
    updateDevTask: /* GraphQL */ `
        mutation UpdateDevTask($input: UpdateDevTaskInput!) {
            updateDevTask(input: $input) {
                id
                status
                assignedTo
                assignedToName
                actualHours
                completedAt
                githubIssueNumber
                githubIssueUrl
                updatedAt
            }
        }
    `,
    deleteDevTask: /* GraphQL */ `
        mutation DeleteDevTask($input: DeleteDevTaskInput!) {
            deleteDevTask(input: $input) {
                id
            }
        }
    `,
    createDevComment: /* GraphQL */ `
        mutation CreateDevComment($input: CreateDevCommentInput!) {
            createDevComment(input: $input) {
                id
                targetType
                targetId
                authorName
                content
                isInternal
                createdAt
            }
        }
    `,
};

export const QUERIES = {
    listDevInquiries: /* GraphQL */ `
        query ListDevInquiries($limit: Int, $nextToken: String) {
            listDevInquiries(limit: $limit, nextToken: $nextToken) {
                items {
                    id
                    clientName
                    clientEmail
                    clientPhone
                    companyName
                    projectTypes
                    status
                    timeline
                    estimatedPriceMin
                    estimatedPriceMax
                    estimatedWeeks
                    complexityScore
                    projectDescription
                    submittedBy
                    assignedTo
                    assignedToName
                    priority
                    adminNotes
                    managementType
                    githubRepo
                    githubIssueUrl
                    statusHistory
                    workflow
                    createdAt
                    updatedAt
                }
                nextToken
            }
        }
    `,
    getDevInquiry: /* GraphQL */ `
        query GetDevInquiry($id: ID!) {
            getDevInquiry(id: $id) {
                id
                clientName
                clientEmail
                clientPhone
                companyName
                projectTypes
                features
                timeline
                hasBrandAssets
                brandNotes
                preferredColors
                stylePreference
                competitors
                projectDescription
                estimatedPriceMin
                estimatedPriceMax
                estimatedWeeks
                complexityScore
                status
                workflow
                submittedBy
                assignedTo
                assignedToName
                priority
                adminNotes
                proposalUrl
                managementType
                githubRepo
                githubIssueUrl
                githubIssueNumber
                statusHistory
                createdAt
                updatedAt
            }
        }
    `,
    listDevTasks: /* GraphQL */ `
        query ListDevTasks($limit: Int, $nextToken: String) {
            listDevTasks(limit: $limit, nextToken: $nextToken) {
                items {
                    id
                    inquiryId
                    title
                    titleAr
                    description
                    type
                    status
                    priority
                    assignedTo
                    assignedToName
                    estimatedHours
                    actualHours
                    phase
                    phaseOrder
                    dueDate
                    completedAt
                    githubIssueNumber
                    githubIssueUrl
                    createdAt
                    updatedAt
                }
                nextToken
            }
        }
    `,
    listDevComments: /* GraphQL */ `
        query ListDevComments($limit: Int, $nextToken: String) {
            listDevComments(limit: $limit, nextToken: $nextToken) {
                items {
                    id
                    targetType
                    targetId
                    authorId
                    authorName
                    content
                    isInternal
                    createdAt
                }
                nextToken
            }
        }
    `,
};
