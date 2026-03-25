# Complete Implementation Guide
## Automated Project Management & Workflow System

---

## CONTEXT

This system operates within the **njaz monorepo**. It uses **AWS Amplify Gen2** (shared via `packages/shared-backend`) for the backend and **Next.js 14 App Router** for the frontend, specifically residing in the `apps/dev` application.

The backend (Cognito, DynamoDB, AppSync) is **shared** across all monorepo apps. Data models are defined centrally and all apps consume the same `amplify_outputs.json`.

---

## QUICK START

### 1. Monorepo Setup

```bash
# From the monorepo root
cd c:\Programming\njaz

# Install dependencies
npm install

# Build shared packages
npm run build -w @njaz/ui-components
```

### 2. Environment Setup

Inside `apps/dev/.env.local`, add optional integrations:

```env
# Slack Notifications (optional — intake works without it)
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# GitHub Automation (Phase 3)
GITHUB_TOKEN="ghp_your_token_here"
GITHUB_ORG="your-organization"

# AI Analysis (Future)
OPENAI_API_KEY="sk-your_openai_key"
```

> **Note:** AWS credentials are managed by Amplify sandbox profiles. No explicit AWS keys needed locally.

### 3. Backend Deployment (Amplify Gen2)

```bash
# Deploy sandbox backend (from monorepo root or shared-backend)
cd packages/shared-backend
npx ampx sandbox
```

This deploys DynamoDB tables (including `DevInquiry`), AppSync API, and Cognito in real-time. Keep this terminal running while developing.

After the sandbox deploys, sync the config to all frontend apps:

```bash
# From monorepo root
npm run sync-amplify
```

### 4. Run Development Server

```bash
# From monorepo root, in a separate terminal
npm run dev -w dev
```

Visit:
- `http://localhost:3003/` — Homepage
- `http://localhost:3003/contact` — Client Intake Form
- `http://localhost:3003/dashboard` — Admin Dashboard (requires auth)

---

## FILE STRUCTURE IN MONOREPO

```
njaz/
├── packages/
│   ├── shared-backend/               # ★ Amplify Gen2 Backend (shared)
│   │   ├── amplify/
│   │   │   ├── data/
│   │   │   │   └── resource.ts       # DynamoDB schemas (DevInquiry, DevProject, etc.)
│   │   │   ├── auth/
│   │   │   │   └── resource.ts       # Cognito configuration
│   │   │   ├── functions/            # Lambda functions
│   │   │   └── backend.ts            # Entry point for backend resources
│   │   └── amplify_outputs.json      # Generated config (synced to apps)
│   ├── estebian-data/                # Domain-specific data models
│   ├── shared-auth/                  # Cross-app auth utilities
│   └── ui-components/               # Shared UI library (design system)
└── apps/
    └── dev/
        ├── amplify_outputs.json      # Synced from shared-backend
        ├── docs/
        │   ├── project-spec.md       # Full system specification
        │   └── implementation-guide.md  # This file
        ├── src/
        │   ├── app/
        │   │   ├── api/
        │   │   │   └── intake/
        │   │   │       └── route.ts   # POST endpoint for form submission
        │   │   ├── contact/
        │   │   │   └── page.tsx       # Public Intake Form
        │   │   ├── dashboard/
        │   │   │   └── page.tsx       # Admin Dashboard (auth required)
        │   │   ├── about/page.tsx
        │   │   ├── services/page.tsx
        │   │   ├── portfolio/page.tsx
        │   │   ├── layout.tsx
        │   │   ├── page.tsx           # Homepage
        │   │   └── providers.tsx
        │   ├── components/
        │   │   ├── intake/            # Multi-step Intake Wizard
        │   │   │   ├── IntakeWizard.tsx
        │   │   │   ├── ProgressBar.tsx
        │   │   │   ├── EstimateCard.tsx
        │   │   │   └── steps/
        │   │   │       ├── StepProjectType.tsx
        │   │   │       ├── StepFeatures.tsx
        │   │   │       ├── StepTimeline.tsx
        │   │   │       ├── StepBrandAssets.tsx
        │   │   │       ├── StepClientInfo.tsx
        │   │   │       └── StepReview.tsx
        │   │   ├── AmplifyProvider.tsx
        │   │   └── LanguageContext.tsx
        │   └── lib/
        │       ├── intake/            # Intake types, constants, pricing
        │       │   ├── types.ts
        │       │   ├── constants.ts
        │       │   ├── pricing-engine.ts
        │       │   └── index.ts
        │       ├── workflow/          # Workflow generation engine
        │       │   ├── types.ts
        │       │   ├── templates.ts
        │       │   ├── generator.ts
        │       │   └── index.ts
        │       ├── notifications/     # Slack webhook integration
        │       │   ├── slack.ts
        │       │   └── index.ts
        │       └── amplify-server.ts  # Server-side AppSync helper
        └── .env.local
```

---

## CORE SYSTEM COMPONENTS

### 1. Client Intake Form (Frontend)
**Location**: `apps/dev/src/components/intake/IntakeWizard.tsx`

- 6-step wizard: Project Type → Features → Timeline → Brand Assets → Client Info → Review
- Uses React `useReducer` for state management across all steps
- Real-time pricing estimate updates via `pricing-engine.ts`
- Full RTL/Arabic support via `LanguageContext`
- Submits JSON payload to `/api/intake`

### 2. Form Submission API
**Location**: `apps/dev/src/app/api/intake/route.ts`

Flow:
1. Validates the incoming payload (required fields check)
2. Generates a project workflow using the workflow engine
3. Saves to DynamoDB via direct AppSync GraphQL call (API key auth)
4. Sends Slack notification (if `SLACK_WEBHOOK_URL` is configured)
5. Returns success with inquiry ID and workflow summary

### 3. Workflow Engine
**Location**: `apps/dev/src/lib/workflow/`

- **templates.ts** — Comprehensive templates for all 7 project types
- **generator.ts** — Combines templates based on selected types, injects feature-specific tasks, applies timeline multipliers
- Each template includes phases with bilingual tasks, dependencies, approval gates, and automation hooks

### 4. Admin Dashboard
**Location**: `apps/dev/src/app/dashboard/page.tsx`

- Protected page (requires Cognito authentication)
- Displays all project inquiries with status badges
- Stats overview: total, new, in-progress, completed
- Filter tabs for status-based views
- Expandable detail for each inquiry

### 5. Data Model (DynamoDB)
**Location**: `packages/shared-backend/amplify/data/resource.ts`

The `DevInquiry` model captures:
- Client info (name, email, phone, company)
- Project configuration (types, features, timeline)
- Brand preferences (assets, colors, style, competitors)
- Computed estimates (price range, weeks, complexity)
- Lifecycle status with 7 states
- Generated workflow (JSON)

Authorization:
- `publicApiKey.create` — Anonymous form submissions
- `groups('admins')` — Full management access
- `groups('devplatform-access')` — Team access

---

## TESTING IN SANDBOX

1. Start the Amplify sandbox: `cd packages/shared-backend && npx ampx sandbox`
2. Sync config: `npm run sync-amplify`
3. Start dev server: `npm run dev -w dev`
4. Open `http://localhost:3003/contact` and submit an inquiry
5. Check the terminal for the API route logs
6. View submitted inquiries at `http://localhost:3003/dashboard` (requires auth)

---

## DEPLOYMENT TO PRODUCTION

When deploying to AWS Amplify Hosting:

1. Attach environment variables (`SLACK_WEBHOOK_URL`, etc.) in the Hosting console
2. The backend provisions via CI/CD from `packages/shared-backend`
3. The `amplify_outputs.json` is auto-generated during the build
4. All apps in the monorepo are built and deployed together

---

## IMPLEMENTATION PHASES

| Phase | Status | Components |
|:------|:-------|:-----------|
| **Phase 1**: Frontend UI & State | ✅ Complete | Intake wizard, all step components, pricing engine, estimate card |
| **Phase 2**: Backend Integration | ✅ Complete | DevInquiry model, API route, workflow engine, notifications, dashboard |
| **Phase 3**: GitHub Automation | 🔜 Next | Auto-create repos, project boards, issue tracking |
| **Phase 4**: Team Features | 📋 Planned | Task board, team management, auto-assignment |
| **Phase 5**: Client Portal | 📋 Planned | Client dashboard, status tracking, communication |
| **Phase 6**: AI Features | 📋 Planned | Smart requirement analysis, task breakdown |
