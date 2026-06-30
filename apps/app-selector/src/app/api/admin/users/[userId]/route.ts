import { NextResponse } from 'next/server';
import { executeGraphQL, MUTATIONS } from '@/lib/amplify-server';

function getAuthToken(request: Request): string | null {
    const auth = request.headers.get('Authorization');
    return auth?.startsWith('Bearer ') ? auth.slice(7) : auth;
}

export async function DELETE(
    request: Request,
    { params }: { params: { userId: string } }
) {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    try {
        const result = await executeGraphQL<{ deleteUser: any }>(MUTATIONS.deleteUser, { username: params.userId }, token);
        return NextResponse.json(result.deleteUser);
    } catch (e: any) {
        console.error('Failed to delete user:', e);
        return NextResponse.json({ error: 'Failed to delete user', details: e.message || String(e) }, { status: 500 });
    }
}
