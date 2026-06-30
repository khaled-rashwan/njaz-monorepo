import amplifyConfig from '../../amplify_outputs.json';

const APPSYNC_URL: string = amplifyConfig.data?.url || '';
const API_KEY: string = amplifyConfig.data?.api_key || '';

export async function executeGraphQL<T = Record<string, any>>(
    query: string,
    variables?: Record<string, any>,
    authToken?: string,
): Promise<T> {
    if (!APPSYNC_URL || (!API_KEY && !authToken)) {
        throw new Error(
            'AppSync not configured. Ensure amplify_outputs.json has data.url and data.api_key.',
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

    return deepParseJson(result.data) as T;
}

function deepParseJson(value: any): any {
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return deepParseJson(parsed);
        } catch {
            return value;
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

export const MUTATIONS = {
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
};

export const QUERIES = {
    listUsers: /* GraphQL */ `
        query ListUsers {
            listUsers
        }
    `,
};
