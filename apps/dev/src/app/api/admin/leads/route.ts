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
        const { searchParams } = new URL(request.url);
        const campaignId = searchParams.get('campaignId');
        const result = await executeGraphQL<{ listDevLeads: any }>(QUERIES.listDevLeads, { limit: 500 }, token);
        let leads = result.listDevLeads?.items || [];
        if (campaignId) leads = leads.filter((l: any) => l.campaignId === campaignId);
        return NextResponse.json({ leads });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    try {
        const body = await request.json();
        const result = await executeGraphQL<{ createDevLead: any }>(MUTATIONS.createDevLead, { input: body }, token);
        return NextResponse.json(result.createDevLead);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const token = getAuthToken(request);
    if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    try {
        const body = await request.json();
        const result = await executeGraphQL<{ updateDevLead: any }>(MUTATIONS.updateDevLead, { input: body }, token);
        return NextResponse.json(result.updateDevLead);
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
        const result = await executeGraphQL<{ deleteDevLead: any }>(MUTATIONS.deleteDevLead, { input: { id } }, token);
        return NextResponse.json(result.deleteDevLead);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
