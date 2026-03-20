# Complete Implementation Guide
## Automated Project Management & Workflow System

---

## CONTEXT

This system operates within the `njaz` monorepo. It uses **AWS Amplify Gen2** (Cognito, DynamoDB, API) for the backend and **Next.js 14 App Router** for the frontend, specifically residing in the `apps/dev` application.

## QUICK START

### 1. Monorepo Setup

```bash
# Make sure you are at the monorepo root
cd c:\Programming\njaz

# Install dependencies if you haven't
npm install

# Build the shared packages
npm run build -w @njaz/ui-components
```

### 2. Environment Setup

Inside `apps/dev/.env.local`, ensure the following are configured:

```env
# AWS Amplify Gen 2 will automatically generate a config
# No explicit AWS keys needed locally since you'll use AWS profiles

# GitHub Automation
GITHUB_TOKEN="ghp_your_token_here"
GITHUB_ORG="your-organization"
GITHUB_WEBHOOK_SECRET="your_webhook_secret"

# Notifications
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Optional
OPENAI_API_KEY="sk-your_openai_key" # For AI requirement analysis
```

### 3. Backend Deployment (Amplify Gen2)

```bash
# Deploy your sandbox backend to your personal AWS account
cd apps/dev
npx ampx sandbox
```
This deploys the DynamoDB schemas and Lambda functions in real-time as you code them.

### 4. Run Development Server

```bash
# In another terminal window at the monorepo root
npm run dev -w dev
```

Visit `http://localhost:3000/contact` to see the client intake form!

---

## FILE STRUCTURE IN MONOREPO

```
njaz/
├── packages/
│   └── ui-components/                 # Shared UI library used by dev app
└── apps/
    └── dev/
        ├── amplify/                   # AWS Amplify Gen2 Backend
        │   ├── data/
        │   │   └── resource.ts        # DynamoDB Schemas (Client, Project, Workflow)
        │   ├── auth/
        │   │   └── resource.ts        # Cognito Setup
        │   └── backend.ts             # Entry point for backend resources
        ├── src/
        │   ├── app/
        │   │   ├── api/
        │   │   │   ├── intake/        # Next.js API for form submission
        │   │   │   │   └── route.ts
        │   │   │   └── webhooks/      # GitHub webhooks
        │   │   ├── contact/
        │   │   │   └── page.tsx       # Public Intake Form
        │   │   ├── dashboard/
        │   │   │   └── page.tsx       # Internal Team Dashboard
        │   ├── components/
        │   │   └── intake/            # The Step-by-Step Intake Wizard
        │   ├── lib/
        │   │   ├── automation/        # GitHub Automation and Scaffolding
        │   │   ├── backend/           # AWS Helpers
        │   │   ├── notifications/     # Slack and Email integration
        │   │   └── workflow/          # Workflow generation logic
        └── .env.local
```

---

## CORE SYSTEM COMPONENTS

### 1. Client Intake Form
**Location**: `apps/dev/src/components/intake/IntakeWizard.tsx`

Features:
- Multi-step wizard matching the `project-spec.md` requirements.
- Uses standard React reducers to track state across components.
- Submits JSON payload directly to the `/api/intake` endpoint.

### 2. Form Submission API
**Location**: `apps/dev/src/app/api/intake/route.ts`

Flow:
1. Validates the incoming payload.
2. Calls the Amplify Data API internally to save to DynamoDB.
3. Generates the S3 pre-signed upload URLs if the user has attachments.
4. Synchronously invokes our `WorkflowGenerator` and `GitHubAutomation`.
5. Sends notifications out via Slack Webhooks.

### 3. GitHub Automation
**Location**: `apps/dev/src/lib/automation/github.ts`

Uses `octokit` to programmatically:
- Take the `clientName` and `projectName` to generate a new private repo.
- Populate it with scaffolding from templates.
- Initialize the Project boards on the GitHub Organization.

---

## TESTING IN SANDBOX

When making modifications to the schema models in `amplify/data/resource.ts`, the `npx ampx sandbox` process will automatically redeploy the backend in seconds.

Test the API integration via the frontend UI locally at `localhost:3000/contact` and view the console outputs and Network tab for the AWS submission.

## DEPLOYMENT TO PRODUCTION

When deploying to Vercel/AWS Amplify Hosting, attach your `GITHUB_TOKEN` and webhook strings to the App Environment Variables in the Hosting console. The backend will provision via CI/CD automatically.
