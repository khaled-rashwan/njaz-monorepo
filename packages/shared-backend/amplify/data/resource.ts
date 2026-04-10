import { a, defineData, type ClientSchema } from '@aws-amplify/backend';
import { estebianSchema } from '@njaz/estebian-data';
import { submitResponse } from '../functions/submitResponse/resource';
import { manageUsers } from '../functions/manageUsers/resource';
import { initiateReport } from '../functions/initiateReport/resource';

/**
 * Njaz Platform Data Schema
 * 
 * Composed from app-specific packages:
 * - @njaz/estebian-data (Estebian survey platform)
 * 
 * Plus shared/other app models defined here:
 * - PID Controller (industrial)
 * - Dev Platform (projects)
 * - Interior Design (design projects)
 */
const schema = a.schema({
    // ============================================
    // ESTEBIAN - Imported from @njaz/estebian-data
    // ============================================
    ...estebianSchema,

    // ============================================
    // PID CONTROLLER - Industrial Platform
    // ============================================

    PIDController: a
        .model({
            name: a.string().required(),
            description: a.string(),
            kp: a.float().default(1.0), // Proportional gain
            ki: a.float().default(0.0), // Integral gain
            kd: a.float().default(0.0), // Derivative gain
            setpoint: a.float().default(0.0),
            processVariable: a.float(),
            output: a.float(),
            isActive: a.boolean().default(false),
        })
        .authorization((allow) => [
            allow.groups(['admins']),
            allow.groups(['pid-access']),
            allow.owner(),
        ]),

    PIDLog: a
        .model({
            controllerId: a.id().required(),
            timestamp: a.datetime().required(),
            setpoint: a.float(),
            processVariable: a.float(),
            output: a.float(),
            error: a.float(),
        })
        .authorization((allow) => [
            allow.groups(['pid-access']),
        ]),

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
    // Captures all data from the multi-step intake wizard.
    // Public users can create (anonymous or logged-in).
    // Admins manage the full lifecycle. Clients see their own.

    DevInquiry: a
        .model({
            // Client information
            clientName: a.string().required(),
            clientEmail: a.string().required(),
            clientPhone: a.string(),
            companyName: a.string(),
            projectDescription: a.string().required(),

            // Project configuration
            projectTypes: a.string().array().required(),
            features: a.json(),      // Record<FeatureKey, boolean>
            timeline: a.enum(['standard', 'accelerated', 'rush']),

            // Brand assets
            hasBrandAssets: a.boolean(),
            brandNotes: a.string(),
            preferredColors: a.string(),
            stylePreference: a.string(),
            competitors: a.string(),

            // Computed estimate
            estimatedPriceMin: a.float(),
            estimatedPriceMax: a.float(),
            estimatedWeeks: a.integer(),
            complexityScore: a.integer(),

            // Lifecycle
            status: a.enum(['new', 'reviewing', 'proposal_sent', 'approved', 'in_progress', 'completed', 'cancelled']),

            // Generated workflow (JSON blob from workflow engine)
            workflow: a.json(),

            // Notification tracking
            notifiedAt: a.datetime(),

            // Owner tracking — set when submitter is logged in
            submittedBy: a.string(),          // Cognito sub (user ID)

            // Assignment & management
            assignedTo: a.string(),           // Cognito sub of assigned dev
            assignedToName: a.string(),       // Display name for UI
            priority: a.enum(['low', 'medium', 'high', 'urgent']),
            adminNotes: a.string(),           // Internal notes (not visible to client)
            proposalUrl: a.string(),          // Link to proposal PDF/doc

            // GitHub integration (optional — not all projects need repos)
            githubRepo: a.string(),           // e.g. "njaz-org/client-project"
            githubIssueUrl: a.string(),       // Link to tracking issue
            githubIssueNumber: a.integer(),

            // Management type — determines how tasks are tracked
            managementType: a.enum(['internal', 'github', 'hybrid']),

            // Status changelog: [{status, timestamp, changedBy, note}]
            statusHistory: a.json(),
        })
        .authorization((allow) => [
            // Anyone can submit the intake form (no login required)
            allow.publicApiKey().to(['create']),
            // Logged-in users can read their own submissions
            allow.authenticated().to(['read']),
            // Admins and dev team can manage inquiries
            allow.groups(['admins']),
            allow.groups(['devplatform-access']),
        ]),

    // ============================================
    // DEV TASK - Granular Task Management
    // ============================================
    // Tasks derived from workflow phases, or created ad-hoc.
    // Kanban-compatible statuses. Optional GitHub sync.

    DevTask: a
        .model({
            inquiryId: a.id(),                     // FK → DevInquiry (optional — null for internal tasks)
            title: a.string().required(),
            titleAr: a.string(),
            description: a.string(),
            type: a.enum(['setup', 'design', 'development', 'testing', 'deployment', 'documentation', 'review']),
            status: a.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done']),
            priority: a.enum(['low', 'medium', 'high', 'urgent']),
            assignedTo: a.string(),               // Cognito sub
            assignedToName: a.string(),
            estimatedHours: a.float(),
            actualHours: a.float(),
            notes: a.string(),                    // Detailed status / progress notes
            phase: a.string(),                    // Workflow phase name
            phaseOrder: a.integer(),              // For ordering
            dueDate: a.date(),
            completedAt: a.datetime(),

            // GitHub integration (optional per task)
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
    // Threaded comments on inquiries or tasks.
    // isInternal=true means only team can see.

    DevComment: a
        .model({
            targetType: a.enum(['inquiry', 'task']),
            targetId: a.id().required(),          // ID of inquiry or task
            authorId: a.string().required(),      // Cognito sub
            authorName: a.string().required(),
            content: a.string().required(),
            isInternal: a.boolean(),              // true = team only, false = client visible
        })
        .authorization((allow) => [
            allow.groups(['admins']),
            allow.groups(['devplatform-access']),
            // Clients can read non-internal comments on their inquiries
            allow.authenticated().to(['read']),
        ]),

    // ============================================
    // CUSTOM MUTATIONS
    // ============================================

    submitResponse: a.mutation()
        .arguments({
            surveyId: a.id().required(),
            answers: a.json().required(),
            demographics: a.json(),
        })
        .returns(a.json())
        .handler(a.handler.function(submitResponse))
        .authorization((allow) => [allow.publicApiKey()]),

    requestReport: a.mutation()
        .arguments({
            surveyId: a.id().required(),
            reportType: a.string().required(),
        })
        .returns(a.json())
        .handler(a.handler.function(initiateReport))
        .authorization((allow) => [allow.authenticated()]),

    listUsers: a.query()
        .returns(a.json())
        .handler(a.handler.function(manageUsers))
        .authorization((allow) => [allow.groups(['admins'])]),

    createUser: a.mutation()
        .arguments({ username: a.string().required(), email: a.string().required() })
        .returns(a.json())
        .handler(a.handler.function(manageUsers))
        .authorization((allow) => [allow.groups(['admins'])]),

    deleteUser: a.mutation()
        .arguments({ username: a.string().required() })
        .returns(a.json())
        .handler(a.handler.function(manageUsers))
        .authorization((allow) => [allow.groups(['admins'])]),

    manageUserGroup: a.mutation()
        .arguments({ username: a.string().required(), group: a.string().required(), action: a.string().required() })
        .returns(a.json())
        .handler(a.handler.function(manageUsers))
        .authorization((allow) => [allow.groups(['admins'])]),

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
            kpis: a.json(),          // { impressions, clicks, conversions, etc. }
            tags: a.string().array(),
            createdByName: a.string(),
        })
        .authorization((allow) => [
            allow.groups(['admins']),
            allow.groups(['devplatform-access']),
        ]),

    DevLead: a
        .model({
            campaignId: a.id(),              // FK → DevCampaign (optional — manual leads have none)
            name: a.string().required(),
            email: a.string().required(),
            phone: a.string(),
            company: a.string(),
            source: a.enum(['campaign', 'referral', 'website', 'social', 'cold_outreach', 'event', 'other']),
            status: a.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
            interest: a.string(),            // what they're interested in
            notes: a.string(),
            assignedTo: a.string(),          // Cognito sub
            assignedToName: a.string(),
            estimatedValue: a.float(),
            convertedInquiryId: a.id(),      // FK → DevInquiry when converted
            lastContactDate: a.date(),
            nextFollowUp: a.date(),
        })
        .authorization((allow) => [
            allow.groups(['admins']),
            allow.groups(['devplatform-access']),
        ]),

    DevQuotation: a
        .model({
            leadId: a.id(),                  // FK → DevLead
            inquiryId: a.id(),               // FK → DevInquiry (if already converted)
            quotationNumber: a.string().required(),  // human-readable reference
            clientName: a.string().required(),
            clientEmail: a.string().required(),
            status: a.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']),
            lineItems: a.json().required(),  // [{ description, qty, unitPrice, total }]
            subtotal: a.float(),
            tax: a.float(),
            discount: a.float(),
            total: a.float().required(),
            currency: a.string(),            // default SAR
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

    // ============================================
    // INTERIOR DESIGN - Design Platform
    // ============================================

    DesignProject: a
        .model({
            name: a.string().required(),
            clientName: a.string(),
            location: a.string(),
            type: a.enum(['residential', 'commercial', 'office', 'retail', 'hospitality']),
            status: a.enum(['concept', 'design', 'execution', 'completed']),
            budget: a.float(),
            description: a.string(),
            images: a.string().array(), // S3 keys
            moodBoard: a.json(), // Mood board data
        })
        .authorization((allow) => [
            allow.groups(['admins']),
            allow.groups(['interior-access']),
            allow.owner(),
        ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
    schema,
    authorizationModes: {
        defaultAuthorizationMode: 'userPool',
        // Allow unauthenticated access for public survey responses
        apiKeyAuthorizationMode: {
            expiresInDays: 365,
        },
    },
});
