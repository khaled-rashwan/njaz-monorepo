---
name: njaz:backend
description: Manage AWS Amplify Gen2 backend, Cognito authentication, DynamoDB data models, and Lambda functions for the Njaz platform.
allowed-tools:
  - "*"
---

# Njaz Backend Development Skill

You are a senior backend/fullstack engineer specializing in AWS Amplify Gen2 within a TurboRepo monorepo. This skill teaches you how to manage data, authentication, and serverless logic for the Njaz platform.

## Technology Stack
- **Backend Framework**: AWS Amplify Gen2 (CDK-based)
- **Database**: DynamoDB (via Amplify Data)
- **Auth**: Amazon Cognito User Pools
- **Serverless**: AWS Lambda (via Amplify Functions)
- **API**: AppSync GraphQL (auto-generated from schema)
- **Build**: TurboRepo (monorepo orchestration)

---

## Project Structure

```
njaz/
├── packages/
│   ├── shared-backend/       # Amplify backend definition
│   │   ├── amplify/
│   │   │   ├── auth/         # Cognito configuration
│   │   │   ├── data/         # Data schema (uses estebian-data)
│   │   │   └── backend.ts    # Main backend definition
│   │   ├── amplify_outputs.json  # Generated config (synced to apps)
│   │   └── package.json
│   ├── estebian-data/        # Domain-specific data models
│   │   └── src/schema.ts     # Amplify Data definitions
│   └── shared-auth/          # Auth utilities (cross-app)
│       └── src/index.ts
├── apps/
│   ├── estebian/             # Frontend app (consumes backend)
│   ├── landing/
│   └── app-selector/
└── scripts/
    └── sync-amplify-config.js  # Syncs amplify_outputs.json to apps
```

---

## Data Modeling with Amplify Data

### Schema Definition Location
All data models are defined in `packages/estebian-data/src/schema.ts`.

### Model Template
```typescript
import { a, type ClientSchema } from '@aws-amplify/backend';

export const mySchema = {
    MyModel: a
        .model({
            // Required field
            title: a.string().required(),
            // Optional field with default
            status: a.enum(['draft', 'published']).default('draft'),
            // JSON field for complex nested data
            metadata: a.json(),
            // Reference to another model via ID
            parentId: a.id(),
            // Array of strings
            tags: a.string().array(),
        })
        .authorization((allow) => [
            // Owner can do everything
            allow.owner(),
            // Admin group has full access
            allow.groups(['admins']),
            // Authenticated users can read
            allow.authenticated().to(['read']),
            // Unauthenticated (guest) for public create (e.g., survey responses)
            allow.guest().to(['create']),
        ]),
};
```

### Authorization Rules
| Rule | Use Case |
|:-----|:---------|
| `allow.owner()` | User owns their own records (CRUD on their data) |
| `allow.groups(['admins'])` | Admin users have full access |
| `allow.groups(['app-access'])` | App-specific user group (e.g., `estebian-access`) |
| `allow.authenticated().to(['read'])` | Any logged-in user can read |
| `allow.guest().to(['create'])` | Anonymous submissions (e.g., survey responses) |

---

## Cognito Authentication

### Frontend Usage
```typescript
import { getCurrentUser, signOut } from 'aws-amplify/auth';

// Check if user is logged in
async function checkAuth() {
    try {
        const user = await getCurrentUser();
        return { username: user.username, email: user.signInDetails?.loginId };
    } catch {
        return null; // Not authenticated
    }
}

// Sign out
async function handleSignOut() {
    await signOut();
    window.location.href = '/';
}
```

### Cross-App Session Sharing
The Njaz platform uses **subdomain-based auth** to share sessions across apps (e.g., `estebian.njaz.org`, `dashboard.njaz.org`).

**Cookie Configuration** (in `amplify/auth/resource.ts`):
```typescript
cookieStorage: {
    domain: '.njaz.org',  // Leading dot for subdomains
    sameSite: 'lax',
    secure: true,
}
```

### Redirect Helpers
Use `@njaz/shared-auth` for cross-app redirects:
```typescript
import { getDashboardUrl, getCurrentUrl } from '@njaz/shared-auth';

// Redirect to login
const loginUrl = getDashboardUrl(getCurrentUrl());
window.location.href = loginUrl;
```

---

## Local Development Workflow

### 1. Starting the Amplify Sandbox
The sandbox creates a personal cloud environment for testing backend changes.

```bash
# From monorepo root (recommended)
npm run amplify:sandbox

# Or directly from the backend package
cd packages/shared-backend && npx ampx sandbox
```

**Important**: The sandbox will watch for file changes and hot-deploy them. Keep this terminal running while developing.

### 2. Syncing Config to Frontend Apps
After the sandbox generates `amplify_outputs.json`, sync it to all frontend apps:

```bash
npm run sync-amplify
```

This copies the config from `packages/shared-backend/amplify_outputs.json` to:
- `apps/landing/amplify_outputs.json`
- `apps/app-selector/amplify_outputs.json`
- `apps/estebian/amplify_outputs.json`

### 3. Verifying the Full Stack
After backend changes, always verify the frontend still works:

```bash
# Step 1: Build to check for type errors
npm run build

# Step 2: Run the dev server to verify runtime behavior
npm run dev
```

### 4. Common Issues
| Symptom | Cause | Fix |
|:--------|:------|:----|
| `Cannot find module 'amplify_outputs.json'` | Config not synced | Run `npm run sync-amplify` |
| GraphQL type errors | Schema changed, types stale | Restart sandbox, then `npm run build` |
| `Unauthorized` on API calls | Auth mode mismatch | Check `authMode` in `generateClient()` |
| Sandbox fails to deploy | Invalid schema syntax | Check `schema.ts` for missing `.required()` or auth rules |

---

## Lambda Functions (Amplify Functions)

### Creating a Function
```typescript
// packages/shared-backend/amplify/functions/myFunction/resource.ts
import { defineFunction } from '@aws-amplify/backend';

export const myFunction = defineFunction({
    name: 'myFunction',
    entry: './handler.ts',
    timeoutSeconds: 30,
    memoryMB: 256,
});
```

### Handler Template
```typescript
// packages/shared-backend/amplify/functions/myFunction/handler.ts
import type { Handler } from 'aws-lambda';

export const handler: Handler = async (event) => {
    console.log('Event:', JSON.stringify(event));

    try {
        // Your logic here
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Success' }),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
};
```

### Connecting to Data
```typescript
import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource';
import { myFunction } from './functions/myFunction/resource';

const backend = defineBackend({ data, myFunction });

// Grant function access to DynamoDB tables
const dataStack = backend.data;
// ... add policies as needed
```

---

## Common Patterns

### 1. Fetching Data with Ownership
```typescript
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

// List items owned by current user (automatic owner filtering)
const { data } = await client.models.MySurvey.list();

// Create with automatic owner assignment
await client.models.MySurvey.create({ title: 'New Survey' });
```

### 2. Public Data (Guest Access)
```typescript
// For models with `allow.guest().to(['create'])`
const client = generateClient<Schema>({ authMode: 'apiKey' });

await client.models.SurveyResponse.create({
    surveyId: '123',
    answers: { q1: 'a' },
});
```

### 3. Admin Operations
```typescript
// For models with `allow.groups(['admins'])`
// User must be in the 'admins' Cognito group
const { data } = await client.models.AllUsers.list();
```

---

## Deployment

### Production Deployment
Amplify CI/CD is configured via `amplify.yml` at the monorepo root.

**Pipeline Stages:**
1. `preBuild`: Install dependencies (`npm ci`)
2. `build`: Build all apps (`npm run build`)
3. `postBuild`: Sync assets, generate outputs

### Manual Deployment
```bash
# Deploy to production branch
cd packages/shared-backend
npx ampx pipeline-deploy --branch main
```

---

## Verification Checklist (Before Commit)
- [ ] **Build Validation**: Run `npm run build` to verify type safety across the monorepo.
- [ ] **Sandbox Validation**: Run `npx ampx sandbox` and confirm backend deploys successfully.
- [ ] **Sync Validation**: Run `npm run sync-amplify` and verify `amplify_outputs.json` is updated in all apps.
- [ ] **Runtime Validation**: Run `npm run dev` and test both authenticated and unauthenticated flows.
- [ ] Schema changes are backward-compatible (no required field removal).
- [ ] Authorization rules cover owner, admin, and public access appropriately.
- [ ] Lambda functions have proper error handling and logging.
- [ ] Secrets are stored in Amplify Secrets Manager, not hardcoded.
