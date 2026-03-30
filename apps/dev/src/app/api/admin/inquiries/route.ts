// ============================================
// GET/PATCH /api/admin/inquiries — Admin Inquiry Management
// ============================================
// GET: List all inquiries with task progress counts
// PATCH: Update inquiry status, assignment, priority, notes

import { NextResponse } from 'next/server';
import { executeGraphQL, QUERIES, MUTATIONS } from '@/lib/amplify-server';

/**
 * Extract auth token from request headers.
 * Admin routes require a valid Cognito JWT.
 */
function getAuthToken(request: Request): string | null {
    const auth = request.headers.get('Authorization');
    if (!auth) return null;
    return auth.startsWith('Bearer ') ? auth.slice(7) : auth;
}

// ── GET: List all inquiries ─────────────────────────────
export async function GET(request: Request) {
    const token = getAuthToken(request);
    if (!token) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
        // Fetch inquiries using user token (group auth enforced by AppSync)
        const inquiriesResult = await executeGraphQL<{
            listDevInquiries: { items: any[]; nextToken?: string };
        }>(QUERIES.listDevInquiries, { limit: 100 }, token);

        // Fetch all tasks to compute progress per inquiry
        const tasksResult = await executeGraphQL<{
            listDevTasks: { items: any[] };
        }>(QUERIES.listDevTasks, { limit: 500 }, token);

        const tasks = tasksResult.listDevTasks?.items || [];

        // Group tasks by inquiryId and compute progress
        const tasksByInquiry: Record<string, { total: number; done: number; inProgress: number }> = {};
        for (const task of tasks) {
            if (!tasksByInquiry[task.inquiryId]) {
                tasksByInquiry[task.inquiryId] = { total: 0, done: 0, inProgress: 0 };
            }
            tasksByInquiry[task.inquiryId].total++;
            if (task.status === 'done') tasksByInquiry[task.inquiryId].done++;
            if (task.status === 'in_progress' || task.status === 'in_review') {
                tasksByInquiry[task.inquiryId].inProgress++;
            }
        }

        // Enrich inquiries with task progress
        const inquiries = (inquiriesResult.listDevInquiries?.items || []).map((inquiry: any) => ({
            ...inquiry,
            taskProgress: tasksByInquiry[inquiry.id] || { total: 0, done: 0, inProgress: 0 },
        }));

        return NextResponse.json({
            inquiries,
            nextToken: inquiriesResult.listDevInquiries?.nextToken,
        });
    } catch (error: any) {
        console.error('❌ Failed to fetch inquiries:', error);
        return NextResponse.json(
            { error: 'Failed to fetch inquiries', message: error.message },
            { status: 500 },
        );
    }
}

// ── PATCH: Update an inquiry ────────────────────────────
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

        // If status is changing, append to statusHistory
        if (updates.status) {
            // Fetch current inquiry to get existing history
            const current = await executeGraphQL<{ getDevInquiry: any }>(
                QUERIES.getDevInquiry,
                { id },
                token,
            );

            const existingHistory = current.getDevInquiry?.statusHistory
                ? (typeof current.getDevInquiry.statusHistory === 'string'
                    ? JSON.parse(current.getDevInquiry.statusHistory)
                    : current.getDevInquiry.statusHistory)
                : [];

            existingHistory.push({
                status: updates.status,
                timestamp: new Date().toISOString(),
                changedBy: updates._changedBy || 'admin',
                note: updates._statusNote || `Status changed to ${updates.status}`,
            });

            updates.statusHistory = JSON.stringify(existingHistory);
        }

        // Remove internal-only fields
        delete updates._changedBy;
        delete updates._statusNote;

        const result = await executeGraphQL<{ updateDevInquiry: any }>(
            MUTATIONS.updateDevInquiry,
            { input: { id, ...updates } },
            token,
        );

        return NextResponse.json({ inquiry: result.updateDevInquiry });
    } catch (error: any) {
        console.error('❌ Failed to update inquiry:', error);
        return NextResponse.json(
            { error: 'Failed to update inquiry', message: error.message },
            { status: 500 },
        );
    }
}
