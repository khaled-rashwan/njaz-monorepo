import { a } from '@aws-amplify/backend';

export const devPlatformSchema = {
    // ============================================
    // DEV PLATFORM - Digital Transformation
    // ============================================
    DevProject: a
        .model({
            name: a.string().required(),
            type: a.enum(['wordpress', 'web_app', 'mobile_app', 'cloud_architecture', 'digital_transformation']),
            status: a.enum(['planning', 'in_progress', 'completed', 'on_hold']),
            description: a.string(),
            requirements: a.json(),
            timeline: a.json(),
            budget: a.float(),
            clientName: a.string(),
            clientEmail: a.string(),
        })
        .authorization((allow) => [
            allow.groups(['admins']),
            allow.groups(['devplatform-access']),
            allow.owner(),
        ]),

    // ============================================
    // DEV INQUIRY - Client Intake Pipeline
    // ============================================
    DevInquiry: a
        .model({
            clientName: a.string().required(),
            clientEmail: a.string().required(),
            clientPhone: a.string(),
            companyName: a.string(),
            projectDescription: a.string().required(),
            projectTypes: a.string().array().required(),
            features: a.json(),
            timeline: a.enum(['standard', 'accelerated', 'rush']),
            hasBrandAssets: a.boolean(),
            brandNotes: a.string(),
            preferredColors: a.string(),
            stylePreference: a.string(),
            competitors: a.string(),
            estimatedPriceMin: a.float(),
            estimatedPriceMax: a.float(),
            estimatedWeeks: a.integer(),
            complexityScore: a.integer(),
            status: a.enum(['new', 'reviewing', 'proposal_sent', 'approved', 'in_progress', 'completed', 'cancelled']),
            workflow: a.json(),
            notifiedAt: a.datetime(),
            submittedBy: a.string(),
            assignedTo: a.string(),
            assignedToName: a.string(),
            priority: a.enum(['low', 'medium', 'high', 'urgent']),
            adminNotes: a.string(),
            proposalUrl: a.string(),
            githubRepo: a.string(),
            githubIssueUrl: a.string(),
            githubIssueNumber: a.integer(),
            managementType: a.enum(['internal', 'github', 'hybrid']),
            statusHistory: a.json(),
        })
        .authorization((allow) => [
            allow.publicApiKey().to(['create']),
            allow.authenticated().to(['read']),
            allow.groups(['admins']),
            allow.groups(['devplatform-access']),
        ]),

    // ============================================
    // DEV TASK - Granular Task Management
    // ============================================
    DevTask: a
        .model({
            inquiryId: a.id(),
            title: a.string().required(),
            titleAr: a.string(),
            description: a.string(),
            type: a.enum(['setup', 'design', 'development', 'testing', 'deployment', 'documentation', 'review']),
            status: a.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done']),
            priority: a.enum(['low', 'medium', 'high', 'urgent']),
            assignedTo: a.string(),
            assignedToName: a.string(),
            estimatedHours: a.float(),
            actualHours: a.float(),
            notes: a.string(),
            phase: a.string(),
            phaseOrder: a.integer(),
            dueDate: a.date(),
            completedAt: a.datetime(),
            githubIssueNumber: a.integer(),
            githubIssueUrl: a.string(),
        })
        .authorization((allow) => [
            allow.groups(['admins']),
            allow.groups(['devplatform-access']),
        ]),

    // ============================================
    // DEV COMMENT - Activity Log & Communication
    // ============================================
    DevComment: a
        .model({
            targetType: a.enum(['inquiry', 'task']),
            targetId: a.id().required(),
            authorId: a.string().required(),
            authorName: a.string().required(),
            content: a.string().required(),
            isInternal: a.boolean(),
        })
        .authorization((allow) => [
            allow.groups(['admins']),
            allow.groups(['devplatform-access']),
            allow.authenticated().to(['read']),
        ]),

    // ============================================
    // CAMPAIGN MANAGEMENT - CRM & Sales Pipeline
    // ============================================
    DevCampaign: a
        .model({
            name: a.string().required(),
            description: a.string(),
            channel: a.enum(['social_media', 'email', 'seo', 'paid_ads', 'referral', 'events', 'content', 'other']),
            status: a.enum(['draft', 'active', 'paused', 'completed', 'cancelled']),
            startDate: a.date(),
            endDate: a.date(),
            budget: a.float(),
            spentAmount: a.float(),
            targetAudience: a.string(),
            goals: a.string(),
            kpis: a.json(),
            tags: a.string().array(),
            createdByName: a.string(),
        })
        .authorization((allow) => [
            allow.groups(['admins']),
            allow.groups(['devplatform-access']),
        ]),

    DevLead: a
        .model({
            campaignId: a.id(),
            name: a.string().required(),
            email: a.string().required(),
            phone: a.string(),
            company: a.string(),
            source: a.enum(['campaign', 'referral', 'website', 'social', 'cold_outreach', 'event', 'other']),
            status: a.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
            interest: a.string(),
            notes: a.string(),
            assignedTo: a.string(),
            assignedToName: a.string(),
            estimatedValue: a.float(),
            convertedInquiryId: a.id(),
            lastContactDate: a.date(),
            nextFollowUp: a.date(),
        })
        .authorization((allow) => [
            allow.groups(['admins']),
            allow.groups(['devplatform-access']),
        ]),

    DevQuotation: a
        .model({
            leadId: a.id(),
            inquiryId: a.id(),
            quotationNumber: a.string().required(),
            clientName: a.string().required(),
            clientEmail: a.string().required(),
            status: a.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']),
            lineItems: a.json().required(),
            subtotal: a.float(),
            tax: a.float(),
            discount: a.float(),
            total: a.float().required(),
            currency: a.string(),
            validUntil: a.date(),
            notes: a.string(),
            terms: a.string(),
            sentAt: a.datetime(),
            createdByName: a.string(),
        })
        .authorization((allow) => [
            allow.groups(['admins']),
            allow.groups(['devplatform-access']),
        ]),
};
