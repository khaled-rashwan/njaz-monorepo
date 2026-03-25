// ============================================
// POST /api/intake — Project Inquiry Submission
// ============================================
// Receives intake form data, generates a workflow,
// saves to DynamoDB via AppSync, and sends notifications.

import { NextResponse } from 'next/server';
import { generateWorkflow } from '@/lib/workflow';
import { sendSlackNotification, buildInquiryNotification } from '@/lib/notifications';
import { executeGraphQL, MUTATIONS } from '@/lib/amplify-server';

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
        const input = {
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
            workflow: JSON.stringify(workflow),
        };

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

        // ── Send Slack Notification ─────────────────────
        const webhookUrl = process.env.SLACK_WEBHOOK_URL;
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
