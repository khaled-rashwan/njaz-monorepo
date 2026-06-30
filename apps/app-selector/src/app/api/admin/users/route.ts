import { NextResponse } from 'next/server';
import { executeGraphQL, QUERIES, MUTATIONS } from '@/lib/amplify-server';

function getAuthToken(request: Request): string | null {
    const auth = request.headers.get('Authorization');
    return auth?.startsWith('Bearer ') ? auth.slice(7) : auth;
}

// GET: List users via AppSync Lambda
export async function GET(request: Request) {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    try {
        const result = await executeGraphQL<{ listUsers: any }>(QUERIES.listUsers, {}, token);
        const data = result.listUsers;
        return NextResponse.json({ users: data?.users || [] });
    } catch (e: any) {
        console.error('Failed to fetch users:', e);
        return NextResponse.json({ error: 'Failed to fetch users', details: e.message || String(e) }, { status: 500 });
    }
}

// POST: Create a new Cognito User
export async function POST(request: Request) {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    try {
        const body = await request.json();
        const { username, email } = body;

        if (!username || !email) {
            return NextResponse.json({ error: 'Username and email required' }, { status: 400 });
        }

        const result = await executeGraphQL<{ createUser: any }>(MUTATIONS.createUser, { username, email }, token);
        return NextResponse.json(result.createUser);
    } catch (e: any) {
        console.error('Failed to create user:', e);
        return NextResponse.json({ error: 'Failed to create user', details: e.message || String(e) }, { status: 500 });
    }
}
