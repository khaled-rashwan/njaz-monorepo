import { NextResponse } from 'next/server';
import { executeGraphQL, QUERIES, MUTATIONS } from '@/lib/amplify-server';

function getAuthToken(request: Request): string | null {
    const auth = request.headers.get('Authorization');
    return auth?.startsWith('Bearer ') ? auth.slice(7) : auth;
}

export async function GET(request: Request) {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    try {
        const result = await executeGraphQL<{ listDevCampaigns: any }>(QUERIES.listDevCampaigns, { limit: 200 }, token);
        return NextResponse.json({ campaigns: result.listDevCampaigns?.items || [] });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    try {
        const body = await request.json();
        const result = await executeGraphQL<{ createDevCampaign: any }>(MUTATIONS.createDevCampaign, { input: body }, token);
        return NextResponse.json(result.createDevCampaign);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    try {
        const body = await request.json();
        const result = await executeGraphQL<{ updateDevCampaign: any }>(MUTATIONS.updateDevCampaign, { input: body }, token);
        return NextResponse.json(result.updateDevCampaign);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
        const result = await executeGraphQL<{ deleteDevCampaign: any }>(MUTATIONS.deleteDevCampaign, { input: { id } }, token);
        return NextResponse.json(result.deleteDevCampaign);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
