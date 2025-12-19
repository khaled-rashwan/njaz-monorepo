# Njaz Platform - Cognito Authentication Strategy (Revised)

## Cognito Default vs Custom Attributes

### What Cognito Provides by Default:
- ✅ `sub` - Unique user identifier (UUID) - **USE THIS, not custom engineer_id**
- ✅ `email`, `phone_number` - Standard attributes
- ✅ `email_verified`, `phone_number_verified` - Verification status
- ✅ `cognito:groups` - User's group memberships (this is the key!)

### Custom Attributes We Actually Need:
```typescript
// In amplify/auth/resource.ts
export const auth = defineAuth({
  userAttributes: {
    // Optional: Business-specific identifier (only if you have external ID system)
    'custom:employee_id': {
      dataType: 'String',
      mutable: false,
    },
    // Optional: User's organization/company
    'custom:organization': {
      dataType: 'String',
      mutable: true,
    },
    // Optional: User's display name in Arabic
    'custom:display_name_ar': {
      dataType: 'String',
      mutable: true,
    }
  }
});
```

## Recommended Group Strategy

### Option A: Role-Based + App-Based Groups (RECOMMENDED)

**Role Groups** (What they can do):
- `admins` - Platform administrators
- `engineers` - App owners/developers  
- `users` - Regular users
- `viewers` - Read-only access

**App Groups** (Which apps they can access):
- `estebian-access`
- `pid-access`
- `devplatform-access`
- `interior-access`

**Combined Example:**
A user in groups: `['engineers', 'estebian-access', 'pid-access']`
- Can access: Estebian and PID apps
- Has permissions: Engineer-level (can modify app settings)

**Authorization in Schema:**
```typescript
// Estebian survey data
EstebianSurvey: a.model({
  title: a.string().required(),
  questions: a.json(),
  responses: a.json(),
}).authorization([
  a.allow.groups(['admins']), // Admins can do everything
  a.allow.groups(['estebian-access']).to(['read', 'create']), // Users can read/create
  a.allow.groups(['engineers', 'estebian-access']) // Engineers can do everything if in app
])
```

### Option B: App-Role Combined Groups

**Single Groups with Role+App:**
- `estebian-admin`
- `estebian-engineer`
- `estebian-user`
- `pid-admin`
- `pid-engineer`
- `pid-user`
- `interior-admin`
- `interior-user`
- `platform-superadmin` (access everything)

**Pros:**
- More granular control
- Clear permissions per app
- No need for custom attributes

**Cons:**
- More groups to manage
- Can hit Cognito group limits faster (10,000 groups max)
- User with many apps = many groups

**Authorization:**
```typescript
EstebianSurvey: a.model({
  title: a.string(),
}).authorization([
  a.allow.groups(['platform-superadmin']),
  a.allow.groups(['estebian-admin']),
  a.allow.groups(['estebian-engineer']),
  a.allow.groups(['estebian-user']).to(['read', 'create'])
])
```

### Option C: Custom Attribute for App Access (NOT RECOMMENDED)

```typescript
// Don't do this - harder to manage
userAttributes: {
  'custom:app_access': {
    dataType: 'String', // "estebian,pid,interior"
    mutable: true,
  }
}
```

**Why not recommended:**
- Need custom resolver logic to parse comma-separated values
- Harder to query/filter
- Less integration with Amplify's built-in auth
- More code to maintain

## My Recommendation: **Option A (Hybrid)**

```typescript
// User Groups Example
{
  username: "khaleddev",
  sub: "abc-123-uuid", // Use this as user ID
  email: "khaled@example.com",
  "cognito:groups": [
    "engineers",           // Role: What they can do
    "estebian-access",     // App: Which apps they access
    "pid-access",
    "devplatform-access"
  ]
}
```

**Why this works best:**
1. ✅ Clear separation: roles vs app access
2. ✅ Fewer total groups
3. ✅ Easy to add new apps (just add `newapp-access` group)
4. ✅ Easy to add new roles (just add role group)
5. ✅ Works naturally with Amplify Gen 2 authorization
6. ✅ User can be in multiple apps easily

## Implementation Example

### 1. Define Groups in Backend
```typescript
// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';

const backend = defineBackend({
  auth,
  data,
});

// Create default groups
const { cfnUserPool } = backend.auth.resources.cfnResources;

// This happens post-deployment via Lambda or manually:
// - admins
// - engineers  
// - users
// - viewers
// - estebian-access
// - pid-access
// - devplatform-access
// - interior-access
```

### 2. Authorization Rules
```typescript
// amplify/data/resource.ts
const schema = a.schema({
  
  // Estebian models
  EstebianSurvey: a.model({
    title: a.string().required(),
    titleAr: a.string(),
    description: a.string(),
    questions: a.json(),
    createdBy: a.string(),
  }).authorization([
    a.allow.groups(['admins']), // Platform admins
    a.allow.groups(['engineers', 'estebian-access']), // Engineers with app access
    a.allow.groups(['estebian-access']).to(['read', 'create']), // Users can view and take surveys
  ]),

  // PID Controller models
  PIDController: a.model({
    name: a.string().required(),
    parameters: a.json(),
    setpoint: a.float(),
  }).authorization([
    a.allow.groups(['admins']),
    a.allow.groups(['engineers', 'pid-access']),
    a.allow.groups(['pid-access']).to(['read']),
  ]),

  // Shared resources (all authenticated users)
  SharedResource: a.model({
    name: a.string(),
    type: a.string(),
  }).authorization([
    a.allow.authenticated().to(['read']),
    a.allow.groups(['engineers', 'admins']).to(['create', 'update', 'delete']),
  ]),
});
```

### 3. Frontend - Check User Access
```typescript
// lib/auth-utils.ts
import { fetchAuthSession } from 'aws-amplify/auth';

export async function getUserGroups() {
  const session = await fetchAuthSession();
  const groups = session.tokens?.accessToken.payload['cognito:groups'] as string[] || [];
  return groups;
}

export async function hasAppAccess(appName: string) {
  const groups = await getUserGroups();
  return groups.includes(`${appName}-access`) || groups.includes('admins');
}

export async function getUserRole() {
  const groups = await getUserGroups();
  if (groups.includes('admins')) return 'admin';
  if (groups.includes('engineers')) return 'engineer';
  if (groups.includes('users')) return 'user';
  return 'viewer';
}

// Usage in app
const canAccessEstebian = await hasAppAccess('estebian');
const userRole = await getUserRole();
```

### 4. Admin Dashboard - Manage User Groups
```typescript
// Add user to groups via Admin API
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from "@aws-sdk/client-cognito-identity-provider";

async function grantAppAccess(username: string, appName: string, role: string = 'users') {
  const client = new CognitoIdentityProviderClient();
  
  // Add role group
  await client.send(new AdminAddUserToGroupCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Username: username,
    GroupName: role, // 'engineers', 'users', etc.
  }));
  
  // Add app access group
  await client.send(new AdminAddUserToGroupCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Username: username,
    GroupName: `${appName}-access`, // 'estebian-access', 'pid-access', etc.
  }));
}
```

## Summary Table

| Attribute/Group | Purpose | Type | Example |
|----------------|---------|------|---------|
| `sub` | User unique ID | Default | `abc-123-uuid` |
| `email` | User email | Default | `khaled@example.com` |
| `admins` | Platform admin role | Group | Access everything |
| `engineers` | App developer role | Group | Can modify apps |
| `users` | Regular user role | Group | Standard access |
| `estebian-access` | Can access Estebian | Group | App permission |
| `pid-access` | Can access PID app | Group | App permission |
| `interior-access` | Can access Interior app | Group | App permission |

## Group Management Strategy

**When user signs up:**
1. Default: Add to `users` group
2. Default: No app access (or add to one default app)

**When admin grants access:**
1. Keep or change role group (`engineers`, `users`, etc.)
2. Add to app-access groups (`estebian-access`, etc.)

**When new app is added:**
1. Create new group: `newapp-access`
2. Add relevant users to group
3. Update authorization rules in schema

This is cleaner, more scalable, and works perfectly with Amplify Gen 2!
