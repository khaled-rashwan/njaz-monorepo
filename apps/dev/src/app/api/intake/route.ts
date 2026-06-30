// ============================================
// POST /api/intake — Project Inquiry Submission
// ============================================
// Receives intake form data, generates a workflow,
// saves to DynamoDB via AppSync, auto-creates DevTasks,
// and sends notifications.

import { NextResponse } from 'next/server';
import { generateWorkflow } from '@/lib/workflow';
import { sendSlackNotification, buildInquiryNotification } from '@/lib/notifications';
import { executeGraphQL, MUTATIONS, QUERIES } from '@/lib/amplify-server';

interface IntakePayload {
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    companyName?: string;
    projectDescription: string;
    projectTypes: string[];
    features: Record<string, boolean>;
    timeline: string;
    hasBrandAssets: boolean;
    brandNotes?: string;
    preferredColors?: string;
    stylePreference?: string;
    competitors?: string;
    uploadedFiles?: Array<{ name: string; size: number; type: string }>;
    estimate?: {
        priceMin: number;
        priceMax: number;
        estimatedWeeks: number;
        complexityScore: number;
    };
}

/**
 * Extract a JWT token from the request Authorization header (if present).
 * This is used to identify logged-in users submitting inquiries.
 */
function extractAuthToken(request: Request): string | null {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;
    // Bearer token or raw token
    return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
}

/**
 * Decode basic JWT claims without verification (we trust AppSync to verify).
 * Only used to extract `sub` for the submittedBy field.
 */
function decodeTokenSub(token: string): string | null {
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
        return decoded.sub || null;
    } catch {
        return null;
    }
}

export async function POST(request: Request) {
    try {
        const body: IntakePayload = await request.json();

        // ── Validation ──────────────────────────────────
        const errors: string[] = [];
        if (!body.clientName?.trim()) errors.push('clientName is required');
        if (!body.clientEmail?.trim()) errors.push('clientEmail is required');
        if (!body.projectTypes?.length) errors.push('At least one projectType is required');
        if (!body.projectDescription?.trim()) errors.push('projectDescription is required');

        if (errors.length > 0) {
            return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
        }

        // ── Check if user is authenticated ──────────────
        const authToken = extractAuthToken(request);
        const submittedBy = authToken ? decodeTokenSub(authToken) : null;

        // ── Generate Workflow ───────────────────────────
        const workflow = generateWorkflow({
            projectTypes: body.projectTypes as any[],
            features: body.features || {},
            timeline: (body.timeline || 'standard') as any,
            hasBrandAssets: body.hasBrandAssets || false,
            uploadedFiles: [],
            brandNotes: body.brandNotes || '',
            preferredColors: body.preferredColors || '',
            stylePreference: body.stylePreference || '',
            competitors: body.competitors || '',
            clientName: body.clientName,
            clientEmail: body.clientEmail,
            clientPhone: body.clientPhone || '',
            companyName: body.companyName || '',
            projectDescription: body.projectDescription,
        });

        // ── Prepare DynamoDB Input ──────────────────────
        const input: Record<string, any> = {
            clientName: body.clientName.trim(),
            clientEmail: body.clientEmail.trim(),
            clientPhone: body.clientPhone?.trim() || null,
            companyName: body.companyName?.trim() || null,
            projectDescription: body.projectDescription.trim(),
            projectTypes: body.projectTypes,
            features: JSON.stringify(body.features || {}),
            timeline: body.timeline || 'standard',
            hasBrandAssets: body.hasBrandAssets || false,
            brandNotes: body.brandNotes?.trim() || null,
            preferredColors: body.preferredColors?.trim() || null,
            stylePreference: body.stylePreference?.trim() || null,
            competitors: body.competitors?.trim() || null,
            estimatedPriceMin: body.estimate?.priceMin || 0,
            estimatedPriceMax: body.estimate?.priceMax || 0,
            estimatedWeeks: body.estimate?.estimatedWeeks || 0,
            complexityScore: body.estimate?.complexityScore || 0,
            status: 'new',
            priority: 'medium',
            managementType: 'internal', // Default to internal; admin can change later
            workflow: JSON.stringify(workflow),
            statusHistory: JSON.stringify([{
                status: 'new',
                timestamp: new Date().toISOString(),
                changedBy: submittedBy || 'anonymous',
                note: 'Inquiry submitted',
            }]),
        };

        // Set submittedBy if user was logged in
        if (submittedBy) {
            input.submittedBy = submittedBy;
        }

        // ── Save to DynamoDB ────────────────────────────
        let inquiryId = null;
        try {
            const result = await executeGraphQL<{ createDevInquiry: { id: string } }>(
                MUTATIONS.createDevInquiry,
                { input },
            );
            inquiryId = result.createDevInquiry.id;
            console.log('✅ Inquiry saved to DynamoDB:', inquiryId);
        } catch (dbError: any) {
            // Log but don't fail — the inquiry data is in the request logs
            console.error('⚠️ DynamoDB save failed (schema may not be deployed):', dbError.message);
        }

        // ── Auto-create tasks from workflow phases ──────
        if (inquiryId && workflow.phases.length > 0) {
            try {
                let phaseOrder = 0;
                for (const phase of workflow.phases) {
                    for (const task of phase.tasks) {
                        await executeGraphQL(
                            MUTATIONS.createDevTask,
                            {
                                input: {
                                    inquiryId,
                                    title: task.title,
                                    titleAr: task.titleAr || null,
                                    type: task.type,
                                    status: 'backlog',
                                    priority: task.priority,
                                    estimatedHours: task.estimatedHours,
                                    phase: phase.name,
                                    phaseOrder,
                                },
                            },
                        );
                    }
                    phaseOrder++;
                }
                console.log(`✅ Created ${workflow.phases.reduce((acc, p) => acc + p.tasks.length, 0)} tasks for inquiry ${inquiryId}`);
            } catch (taskError: any) {
                console.error('⚠️ Task creation failed (non-blocking):', taskError.message);
            }
        }

        // ── Send Slack Notification ─────────────────────
        let webhookUrl = process.env.SLACK_WEBHOOK_URL;
        try {
            const settingsResult = await executeGraphQL<{ getAppSettings: any }>(
                QUERIES.getAppSettings,
                { id: 'GLOBAL_CONFIG' }
            );
            if (settingsResult?.getAppSettings?.slackWebhookUrl) {
                webhookUrl = settingsResult.getAppSettings.slackWebhookUrl;
            }
        } catch (err: any) {
            console.error('⚠️ Failed to load AppSettings for Slack Webhook:', err.message);
        }

        if (webhookUrl) {
            const slackPayload = buildInquiryNotification({
                clientName: body.clientName,
                clientEmail: body.clientEmail,
                companyName: body.companyName,
                projectTypes: body.projectTypes,
                timeline: body.timeline,
                projectDescription: body.projectDescription,
                estimatedPriceMin: body.estimate?.priceMin,
                estimatedPriceMax: body.estimate?.priceMax,
            });
            await sendSlackNotification(webhookUrl, slackPayload);
        }

        // ── Response ────────────────────────────────────
        return NextResponse.json({
            success: true,
            id: inquiryId,
            workflow: {
                phaseCount: workflow.phases.length,
                totalEstimatedWeeks: workflow.totalEstimatedWeeks,
                totalEstimatedHours: workflow.totalEstimatedHours,
            },
        });
    } catch (error: any) {
        console.error('❌ Intake submission error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 },
        );
    }
}
