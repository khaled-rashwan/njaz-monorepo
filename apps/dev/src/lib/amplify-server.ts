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

    // AppSync AWSJSON scalars double-encode JSON strings.
    // Recursively unwrap any string value that is valid JSON.
    return deepParseJson(result.data) as T;
}

/**
 * Recursively parse stringified JSON values returned by AppSync AWSJSON scalars.
 * Handles the double-encoding issue where `JSON.stringify(obj)` is wrapped in
 * another JSON string by AppSync, producing `'"{\\"key\\":\\"val\\"}"'`.
 */
function deepParseJson(value: any): any {
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            // If parsing a string gives us another string, parse again (triple encoding edge case)
            return deepParseJson(parsed);
        } catch {
            return value; // genuine string, not JSON
        }
    }
    if (Array.isArray(value)) {
        return value.map(deepParseJson);
    }
    if (value !== null && typeof value === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = deepParseJson(v);
        }
        return out;
    }
    return value;
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
    createUser: /* GraphQL */ `
        mutation CreateUser($username: String!, $email: String!) {
            createUser(username: $username, email: $email)
        }
    `,
    deleteUser: /* GraphQL */ `
        mutation DeleteUser($username: String!) {
            deleteUser(username: $username)
        }
    `,
    manageUserGroup: /* GraphQL */ `
        mutation ManageUserGroup($username: String!, $group: String!, $action: String!) {
            manageUserGroup(username: $username, group: $group, action: $action)
        }
    `,
    // Campaign Management
    createDevCampaign: /* GraphQL */ `
        mutation CreateDevCampaign($input: CreateDevCampaignInput!) {
            createDevCampaign(input: $input) {
                id name status channel budget startDate endDate createdAt
            }
        }
    `,
    updateDevCampaign: /* GraphQL */ `
        mutation UpdateDevCampaign($input: UpdateDevCampaignInput!) {
            updateDevCampaign(input: $input) {
                id name status channel budget spentAmount startDate endDate goals kpis updatedAt
            }
        }
    `,
    deleteDevCampaign: /* GraphQL */ `
        mutation DeleteDevCampaign($input: DeleteDevCampaignInput!) {
            deleteDevCampaign(input: $input) { id }
        }
    `,
    createDevLead: /* GraphQL */ `
        mutation CreateDevLead($input: CreateDevLeadInput!) {
            createDevLead(input: $input) {
                id name email company source status campaignId estimatedValue createdAt
            }
        }
    `,
    updateDevLead: /* GraphQL */ `
        mutation UpdateDevLead($input: UpdateDevLeadInput!) {
            updateDevLead(input: $input) {
                id name email status assignedTo assignedToName notes estimatedValue convertedInquiryId lastContactDate nextFollowUp updatedAt
            }
        }
    `,
    deleteDevLead: /* GraphQL */ `
        mutation DeleteDevLead($input: DeleteDevLeadInput!) {
            deleteDevLead(input: $input) { id }
        }
    `,
    createDevQuotation: /* GraphQL */ `
        mutation CreateDevQuotation($input: CreateDevQuotationInput!) {
            createDevQuotation(input: $input) {
                id quotationNumber clientName clientEmail status total lineItems currency createdAt
            }
        }
    `,
    updateDevQuotation: /* GraphQL */ `
        mutation UpdateDevQuotation($input: UpdateDevQuotationInput!) {
            updateDevQuotation(input: $input) {
                id status sentAt validUntil lineItems total notes updatedAt
            }
        }
    `,
    deleteDevQuotation: /* GraphQL */ `
        mutation DeleteDevQuotation($input: DeleteDevQuotationInput!) {
            deleteDevQuotation(input: $input) { id }
        }
    `,
};

export const QUERIES = {
    getAppSettings: /* GraphQL */ `
        query GetAppSettings($id: String!) {
            getAppSettings(id: $id) {
                id
                isScholarAiEnabled
                geminiApiKey
                slackWebhookUrl
                githubToken
            }
        }
    `,
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
    listUsers: /* GraphQL */ `
        query ListUsers {
            listUsers
        }
    `,
    // Campaign Management
    listDevCampaigns: /* GraphQL */ `
        query ListDevCampaigns($limit: Int, $nextToken: String) {
            listDevCampaigns(limit: $limit, nextToken: $nextToken) {
                items {
                    id name description channel status startDate endDate budget spentAmount
                    targetAudience goals kpis tags createdByName createdAt updatedAt
                }
                nextToken
            }
        }
    `,
    listDevLeads: /* GraphQL */ `
        query ListDevLeads($limit: Int, $nextToken: String) {
            listDevLeads(limit: $limit, nextToken: $nextToken) {
                items {
                    id campaignId name email phone company source status interest notes
                    assignedTo assignedToName estimatedValue convertedInquiryId
                    lastContactDate nextFollowUp createdAt updatedAt
                }
                nextToken
            }
        }
    `,
    listDevQuotations: /* GraphQL */ `
        query ListDevQuotations($limit: Int, $nextToken: String) {
            listDevQuotations(limit: $limit, nextToken: $nextToken) {
                items {
                    id leadId inquiryId quotationNumber clientName clientEmail status
                    lineItems subtotal tax discount total currency validUntil notes terms
                    sentAt createdByName createdAt updatedAt
                }
                nextToken
            }
        }
    `,
};
