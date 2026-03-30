// ============================================
// GET/PATCH/POST /api/admin/tasks — Task Management
// ============================================
// GET: List tasks (optionally filtered by inquiryId or assignedTo)
// PATCH: Update task status, assignment, hours
// POST: Create ad-hoc tasks

import { NextResponse } from 'next/server';
import { executeGraphQL, QUERIES, MUTATIONS } from '@/lib/amplify-server';

function getAuthToken(request: Request): string | null {
    const auth = request.headers.get('Authorization');
    if (!auth) return null;
    return auth.startsWith('Bearer ') ? auth.slice(7) : auth;
}

// ── GET: List tasks ─────────────────────────────────────
export async function GET(request: Request) {
    const token = getAuthToken(request);
    if (!token) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const inquiryId = searchParams.get('inquiryId');
        const assignedTo = searchParams.get('assignedTo');

        const result = await executeGraphQL<{
            listDevTasks: { items: any[]; nextToken?: string };
        }>(QUERIES.listDevTasks, { limit: 500 }, token);

        let tasks = result.listDevTasks?.items || [];

        // Client-side filtering (AppSync doesn't support complex filters on all fields)
        if (inquiryId) {
            tasks = tasks.filter((t: any) => t.inquiryId === inquiryId);
        }
        if (assignedTo) {
            tasks = tasks.filter((t: any) => t.assignedTo === assignedTo);
        }

        return NextResponse.json({ tasks });
    } catch (error: any) {
        console.error('❌ Failed to fetch tasks:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tasks', message: error.message },
            { status: 500 },
        );
    }
}

// ── POST: Create a task ─────────────────────────────────
export async function POST(request: Request) {
    const token = getAuthToken(request);
    if (!token) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
        const body = await request.json();

        if (!body.inquiryId || !body.title) {
            return NextResponse.json(
                { error: 'inquiryId and title are required' },
                { status: 400 },
            );
        }

        const input = {
            inquiryId: body.inquiryId,
            title: body.title,
            titleAr: body.titleAr || null,
            description: body.description || null,
            type: body.type || 'development',
            status: body.status || 'backlog',
            priority: body.priority || 'medium',
            assignedTo: body.assignedTo || null,
            assignedToName: body.assignedToName || null,
            estimatedHours: body.estimatedHours || null,
            phase: body.phase || 'Ad-hoc',
            phaseOrder: body.phaseOrder || 99,
            dueDate: body.dueDate || null,
        };

        const result = await executeGraphQL<{ createDevTask: any }>(
            MUTATIONS.createDevTask,
            { input },
            token,
        );

        return NextResponse.json({ task: result.createDevTask });
    } catch (error: any) {
        console.error('❌ Failed to create task:', error);
        return NextResponse.json(
            { error: 'Failed to create task', message: error.message },
            { status: 500 },
        );
    }
}

// ── PATCH: Update a task ────────────────────────────────
export async function PATCH(request: Request) {
    const token = getAuthToken(request);
    if (!token) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        // If marking as done, set completedAt
        if (updates.status === 'done' && !updates.completedAt) {
            updates.completedAt = new Date().toISOString();
        }

        // If moving away from done, clear completedAt
        if (updates.status && updates.status !== 'done') {
            updates.completedAt = null;
        }

        const result = await executeGraphQL<{ updateDevTask: any }>(
            MUTATIONS.updateDevTask,
            { input: { id, ...updates } },
            token,
        );

        return NextResponse.json({ task: result.updateDevTask });
    } catch (error: any) {
        console.error('❌ Failed to update task:', error);
        return NextResponse.json(
            { error: 'Failed to update task', message: error.message },
            { status: 500 },
        );
    }
}
