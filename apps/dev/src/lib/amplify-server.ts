// ============================================
// Server-side AppSync Helper
// ============================================
// Direct GraphQL calls to AWS AppSync using API key auth.
// Used by Next.js API routes where the Amplify client library
// is not needed.

import amplifyConfig from '../../amplify_outputs.json';

const APPSYNC_URL: string = amplifyConfig.data?.url || '';
const API_KEY: string = amplifyConfig.data?.api_key || '';

/**
 * Execute a GraphQL operation against the AppSync API.
 *
 * @param query - The GraphQL query or mutation string
 * @param variables - Optional variables for the operation
 * @returns The parsed `data` field from the GraphQL response
 * @throws Error if the response contains GraphQL errors
 */
export async function executeGraphQL<T = Record<string, any>>(
    query: string,
    variables?: Record<string, any>,
): Promise<T> {
    if (!APPSYNC_URL || !API_KEY) {
        throw new Error(
            'AppSync not configured. Ensure amplify_outputs.json has data.url and data.api_key. ' +
            'Run `npm run sync-amplify` from the monorepo root.',
        );
    }

    const response = await fetch(APPSYNC_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
        },
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

/**
 * Mutations for the DevInquiry model.
 */
export const MUTATIONS = {
    createDevInquiry: /* GraphQL */ `
        mutation CreateDevInquiry($input: CreateDevInquiryInput!) {
            createDevInquiry(input: $input) {
                id
                clientName
                clientEmail
                status
                createdAt
            }
        }
    `,
};

export const QUERIES = {
    listDevInquiries: /* GraphQL */ `
        query ListDevInquiries {
            listDevInquiries {
                items {
                    id
                    clientName
                    clientEmail
                    companyName
                    projectTypes
                    status
                    timeline
                    estimatedPriceMin
                    estimatedPriceMax
                    estimatedWeeks
                    projectDescription
                    createdAt
                    updatedAt
                }
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
                createdAt
                updatedAt
            }
        }
    `,
};
