import { NextResponse } from 'next/server';
import { executeGraphQL, MUTATIONS } from '@/lib/amplify-server';

function getAuthToken(request: Request): string | null {
    const auth = request.headers.get('Authorization');
    return auth?.startsWith('Bearer ') ? auth.slice(7) : auth;
}

export async function POST(
    request: Request,
    { params }: { params: { userId: string } }
) {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    try {
        const body = await request.json();
        const { group } = body;

        const result = await executeGraphQL<{ manageUserGroup: any }>(MUTATIONS.manageUserGroup, {
            username: params.userId,
            group,
            action: 'add'
        }, token);

        return NextResponse.json(result.manageUserGroup);
    } catch (e: any) {
        console.error('Failed to add group:', e);
        return NextResponse.json({ error: 'Failed to add group', details: e.message || String(e) }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { userId: string } }
) {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    try {
        const body = await request.json();
        const { group } = body;

        const result = await executeGraphQL<{ manageUserGroup: any }>(MUTATIONS.manageUserGroup, {
            username: params.userId,
            group,
            action: 'remove'
        }, token);

        return NextResponse.json(result.manageUserGroup);
    } catch (e: any) {
        console.error('Failed to remove group:', e);
        return NextResponse.json({ error: 'Failed to remove group', details: e.message || String(e) }, { status: 500 });
    }
}
