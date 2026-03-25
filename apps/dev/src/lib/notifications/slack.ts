// ============================================
// Notification System — Slack Webhooks
// ============================================

interface SlackBlock {
    type: string;
    text?: { type: string; text: string } | string;
    elements?: Array<{ type: string; text?: { type: string; text: string } | string; url?: string }>;
    fields?: Array<{ type: string; text: string }>;
}

interface SlackPayload {
    text: string;
    blocks?: SlackBlock[];
}

/**
 * Send a message to Slack via webhook.
 * Returns true on success, false on failure (never throws).
 */
export async function sendSlackNotification(
    webhookUrl: string,
    payload: SlackPayload,
): Promise<boolean> {
    if (!webhookUrl) return false;

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        return response.ok;
    } catch (error) {
        console.error('⚠️ Slack notification failed:', error);
        return false;
    }
}

/**
 * Build a rich Slack message for a new project inquiry.
 */
export function buildInquiryNotification(inquiry: {
    clientName: string;
    clientEmail: string;
    companyName?: string;
    projectTypes: string[];
    timeline?: string;
    projectDescription?: string;
    estimatedPriceMin?: number;
    estimatedPriceMax?: number;
}): SlackPayload {
    const typeLabels: Record<string, string> = {
        website: '🌐 Website',
        mobile_app: '📱 Mobile App',
        ecommerce: '🛒 E-Commerce',
        branding: '🎨 Branding',
        campaign: '📢 Campaign',
        cloud: '☁️ Cloud & DevOps',
        seo: '🔍 SEO & Analytics',
    };

    const types = inquiry.projectTypes
        .map(t => typeLabels[t] || t)
        .join(', ');

    const priceRange = inquiry.estimatedPriceMin && inquiry.estimatedPriceMax
        ? `$${inquiry.estimatedPriceMin.toLocaleString()} – $${inquiry.estimatedPriceMax.toLocaleString()}`
        : 'N/A';

    return {
        text: `🚀 New Project Inquiry from ${inquiry.clientName}`,
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `🚀 New Project Inquiry`,
                },
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*Client:*\n${inquiry.clientName}` },
                    { type: 'mrkdwn', text: `*Email:*\n${inquiry.clientEmail}` },
                    { type: 'mrkdwn', text: `*Company:*\n${inquiry.companyName || '—'}` },
                    { type: 'mrkdwn', text: `*Timeline:*\n${inquiry.timeline || 'Standard'}` },
                    { type: 'mrkdwn', text: `*Services:*\n${types}` },
                    { type: 'mrkdwn', text: `*Estimated:*\n${priceRange}` },
                ],
            },
            ...(inquiry.projectDescription ? [{
                type: 'section' as const,
                text: {
                    type: 'mrkdwn' as const,
                    text: `*Description:*\n${inquiry.projectDescription.slice(0, 300)}${inquiry.projectDescription.length > 300 ? '...' : ''}`,
                },
            }] : []),
            {
                type: 'divider' as any,
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Submitted at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' })} (AST)`,
                    },
                ],
            },
        ],
    };
}
