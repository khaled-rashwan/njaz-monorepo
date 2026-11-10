# Njaz Engineering Platform - Project Brief (Updated)

## Project Overview
**Domain:** njaz.org  
**Platform Name:** Njaz (إنجاز) - meaning "Achievement/Accomplishment" in Arabic  
**Project Type:** Cloud-native multi-engineer platform  
**Purpose:** A collaborative engineering platform where multiple engineers/teams develop specialized applications under unified infrastructure, focusing on engineering tools, surveys, development services, and design solutions.

## Platform Philosophy
Njaz is designed to be **future-proof and AI-ready**. As AI absorbs more specialized tasks, the platform remains general-purpose and adaptable. Each app can evolve independently or merge into larger platforms as needs change.

---

## Core Applications (Current Roadmap)

### 1. Estebian (إستبيان) - Psychometric Survey Platform
**Arabic Name:** استبيان  
**Purpose:** Professional Arabic-language surveys for psychological and social research  
**Domain:** surveys.njaz.org or estebian.njaz.org

**Features:**
- Arabic-first survey builder (RTL support)
- Psychometric scales and validated instruments
- Statistical analysis and reporting
- Response collection and management
- Data export (SPSS, Excel, CSV)
- Anonymous and authenticated surveys
- Real-time response tracking

**Target Users:**
- Psychologists and researchers
- Academic institutions
- HR departments
- Market researchers
- Social scientists

**Technical Considerations:**
- Strong RTL (Right-to-Left) support
- Complex statistical computations
- Data privacy compliance
- Large-scale response handling

---

### 2. Industrial Engineering Platform (PID as Starting Point)
**Purpose:** Industrial control and automation tools (starting with PID controllers)  
**Domain:** industrial.njaz.org or pid.njaz.org

**Architecture Decision:**
**Option A: Start Specific → Grow General** (RECOMMENDED)
```
apps/
├── pid-controller/          # Start here - focused PID tool
└── industrial/ (future)     # Later: expand to full industrial platform
```

**Option B: Start General → Add Modules**
```
apps/
└── industrial-platform/
    ├── modules/
    │   ├── pid/            # PID module
    │   ├── scada/          # Future: SCADA module
    │   └── optimization/   # Future: optimization module
```

**Recommendation:** Start with **Option A** (PID-focused app)
- Faster to market
- Clear scope
- Easy to expand later
- Each new industrial tool can be a separate app or integrated later

**PID Controller Features (Phase 1):**
- Controller configuration interface
- Parameter tuning (Kp, Ki, Kd)
- Real-time monitoring and visualization
- Simulation and testing
- Performance metrics
- Tuning recommendations

**Future Industrial Features:**
- SCADA integration
- Process optimization
- Predictive maintenance
- Energy monitoring
- Equipment management

---

### 3. Development & Digital Transformation Platform
**Purpose:** All-in-one platform for modern development and digital transformation  
**Domain:** dev.njaz.org or transform.njaz.org

**Why "All-in-One"?**
As AI absorbs specialized tasks (WordPress development, app coding, cloud architecture), the platform becomes more about **orchestration and consultation** rather than manual coding. This app focuses on the **complete digital transformation journey**.

**Features:**

**Web Development Services:**
- WordPress management and optimization
- Custom web application development
- Progressive Web Apps (PWAs)
- Performance optimization
- SEO and analytics

**Mobile Development:**
- Cross-platform app development
- Native app consulting
- App store optimization

**Cloud Architecture:**
- AWS infrastructure design
- Cloud migration planning
- Cost optimization
- DevOps automation
- Monitoring and alerting

**Digital Transformation:**
- Business process analysis
- Technology roadmapping
- System integration
- Legacy system modernization
- Change management

**AI Integration Layer (Future):**
- AI-assisted code generation
- Automated cloud provisioning
- Intelligent optimization suggestions
- Predictive scaling
- Automated testing

**Target Users:**
- Businesses seeking digital transformation
- Startups needing technical architecture
- Companies migrating to cloud
- Organizations modernizing systems

---

### 4. Interior Design Platform
**Purpose:** Interior design visualization and project management  
**Domain:** interior.njaz.org or design.njaz.org

**Features:**
- Project portfolio showcase
- 3D visualization tools (or integration with tools like SketchUp)
- Mood boards and inspiration collections
- Client project management
- Budget estimation and tracking
- Material and furniture catalogs
- Measurement tools
- Before/after galleries
- Client collaboration workspace

**Technical Considerations:**
- Heavy image/media handling
- 3D model rendering (consider Three.js integration)
- Image optimization for performance
- Mobile-first design for on-site use

**Target Users:**
- Interior designers
- Architects
- Home owners
- Real estate developers
- Furniture retailers

---

### 5. Admin Dashboard (Platform Management)
**Purpose:** Unified platform administration  
**Domain:** admin.njaz.org

**Features:**
- User management across all apps
- App access control (group management)
- Platform analytics and monitoring
- Billing and usage tracking
- System health monitoring
- Logs and debugging tools
- Configuration management

---

## Flexible Architecture Strategy

### App Evolution Scenarios

**Scenario 1: PID grows into Industrial Platform**
```
Before:
apps/pid-controller/

After:
apps/industrial-platform/
  ├── pid/
  ├── scada/
  └── energy/
```

**Scenario 2: New app emerges from AI absorption**
As AI handles more WordPress/web dev, a new app emerges:
```
apps/ai-orchestration/  # New app for AI-powered automation
```

**Scenario 3: Interior Design splits**
If interior design grows:
```
apps/interior-design/
apps/3d-visualization/  # Separate performance-intensive 3D features
```

### Recommended Structure (Flexible Growth)

```
njaz-platform/
├── apps/
│   ├── estebian/                  # Arabic surveys (stable scope)
│   ├── pid-controller/            # Start focused, can expand
│   ├── dev-platform/              # Digital transformation suite
│   ├── interior-design/           # Design platform
│   ├── admin-dashboard/           # Platform admin
│   └── landing/                   # njaz.org homepage
├── packages/
│   ├── shared-backend/            # Amplify Gen 2
│   ├── ui-components/
│   │   ├── arabic-ui/            # RTL components for Estebian
│   │   ├── charts/               # For PID & analytics
│   │   └── forms/                # Shared form components
│   ├── utils/
│   │   ├── rtl-helpers/          # Arabic/RTL utilities
│   │   ├── industrial/           # Industrial calculations
│   │   └── design/               # Design utilities
│   └── types/
└── tools/                         # Build tools & scripts
```

---

## Updated Technical Architecture

### Subdomain Strategy
```
https://njaz.org                    → Platform landing page
https://app.njaz.org                → App selector dashboard (after login)

# Individual Apps
https://estebian.njaz.org           → Arabic surveys platform
https://industrial.njaz.org         → Industrial engineering (PID)
https://dev.njaz.org                → Development & transformation
https://interior.njaz.org           → Interior design platform
https://admin.njaz.org              → Platform administration

# Alternative (shorter subdomains)
https://surveys.njaz.org
https://pid.njaz.org
https://transform.njaz.org
https://design.njaz.org
```

### Authentication & Access Control

**User Groups (Cognito):**

**Role Groups:**
- `admins` - Platform administrators
- `engineers` - App owners/developers
- `users` - Regular users
- `viewers` - Read-only access

**App Access Groups:**
- `estebian-access` - Can use survey platform
- `industrial-access` - Can use industrial tools
- `devplatform-access` - Can use dev platform
- `interior-access` - Can use design platform

**Example User:**
```json
{
  "sub": "uuid-abc-123",
  "email": "khaled@example.com",
  "cognito:groups": [
    "engineers",
    "estebian-access",
    "industrial-access",
    "devplatform-access"
  ]
}
```

---

## Data Models (Simplified)

### Estebian Schema
```typescript
EstebianSurvey: a.model({
  title: a.string().required(),
  titleAr: a.string().required(),  // Arabic title
  description: a.string(),
  descriptionAr: a.string(),
  questions: a.json(),  // Array of questions
  settings: a.json(),   // Survey settings
  isPublished: a.boolean(),
  createdBy: a.string(),
}).authorization([
  a.allow.groups(['admins']),
  a.allow.groups(['engineers', 'estebian-access']),
  a.allow.groups(['estebian-access']).to(['read'])
])

EstebianResponse: a.model({
  surveyId: a.id().required(),
  responses: a.json(),
  submittedAt: a.datetime(),
  respondentId: a.string(),  // Anonymous or authenticated
}).authorization([
  a.allow.owner(),
  a.allow.groups(['estebian-access'])
])
```

### Industrial (PID) Schema
```typescript
PIDController: a.model({
  name: a.string().required(),
  description: a.string(),
  parameters: a.json(),  // { kp, ki, kd, setpoint }
  processVariable: a.float(),
  output: a.float(),
  isActive: a.boolean(),
  createdBy: a.string(),
}).authorization([
  a.allow.groups(['admins']),
  a.allow.groups(['engineers', 'industrial-access']),
  a.allow.groups(['industrial-access']).to(['read'])
])

PIDLog: a.model({
  controllerId: a.id().required(),
  timestamp: a.datetime(),
  data: a.json(),  // Time-series data
}).authorization([
  a.allow.groups(['industrial-access'])
])
```

### Development Platform Schema
```typescript
Project: a.model({
  name: a.string().required(),
  type: a.enum(['wordpress', 'web-app', 'mobile-app', 'cloud-architecture', 'digital-transformation']),
  status: a.enum(['planning', 'in-progress', 'completed']),
  description: a.string(),
  requirements: a.json(),
  timeline: a.json(),
  budget: a.float(),
  clientId: a.string(),
}).authorization([
  a.allow.groups(['admins', 'engineers', 'devplatform-access'])
])
```

### Interior Design Schema
```typescript
DesignProject: a.model({
  name: a.string().required(),
  clientName: a.string(),
  location: a.string(),
  type: a.enum(['residential', 'commercial', 'office', 'retail']),
  images: a.string().array(),  // S3 keys
  status: a.enum(['concept', 'design', 'execution', 'completed']),
  budget: a.float(),
  description: a.string(),
}).authorization([
  a.allow.groups(['admins', 'engineers', 'interior-access']),
  a.allow.owner()
])
```

---

## Key Decisions to Make Now

### 1. PID Controller Scope
**Decision needed:** Start narrow (PID only) or start broad (industrial platform)?  
**Recommendation:** Start narrow → `apps/pid-controller/`
- Faster development
- Clear MVP
- Can expand to industrial platform later
- Each new industrial tool can be evaluated: new app vs. module?

### 2. Development Platform Positioning
**Question:** Is this a service showcase or active tool platform?  
**Options:**
- **Option A:** Portfolio + project management (clients can track projects)
- **Option B:** Active development tools (code generators, deployment tools)
- **Option C:** Hybrid (portfolio + some AI-powered tools)

**Recommendation:** Start with **Option A**, add AI tools as Option C later

### 3. App Naming Convention
**Choose one:**
- **Arabic names:** estebian.njaz.org (cultural connection)
- **English descriptive:** surveys.njaz.org (international reach)
- **Hybrid:** Use both (DNS aliases)

**Recommendation:** Hybrid approach (primary Arabic, alias English)

### 4. Shared vs Separate Backends
**Current recommendation:** Shared backend (as discussed)  
**Exception:** If any app needs completely different tech (e.g., PID needs real-time WebSockets), consider separate backend for that specific app.

---

## Phase-Based Rollout

### Phase 1: Foundation (Weeks 1-2)
- [ ] Monorepo setup with Turborepo
- [ ] Shared Amplify Gen 2 backend
- [ ] Authentication with Cognito (groups configured)
- [ ] Landing page at njaz.org
- [ ] Basic admin dashboard

### Phase 2: First App (Weeks 3-4)
- [ ] Choose one app to build first (recommendation: Estebian - clearest scope)
- [ ] Complete data models
- [ ] Build core features
- [ ] Deploy to subdomain
- [ ] Test authentication and authorization

### Phase 3: Parallel Apps (Weeks 5-10)
- [ ] Build remaining apps in parallel (different engineers)
- [ ] Share common components
- [ ] Establish patterns and best practices
- [ ] Complete shared UI library

### Phase 4: Integration & Polish (Weeks 11-12)
- [ ] Cross-app features (if needed)
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation
- [ ] User testing

---

## Success Metrics

**Platform Level:**
- All 4 apps deployed and accessible
- Single sign-on working across all apps
- < 30 minutes to add new app
- < 1 hour engineer onboarding time

**App Specific:**
- Estebian: 100+ surveys created, Arabic RTL working perfectly
- PID: Real-time monitoring with < 100ms latency
- Dev Platform: 10+ projects tracked
- Interior: 50+ projects showcased with images

---

## Questions to Answer During Development

1. **Estebian:** Which statistical packages to integrate? (SPSS compatibility level?)
2. **PID:** WebSockets vs. polling for real-time data? Separate backend needed?
3. **Dev Platform:** Active tools or just portfolio? AI integration timeline?
4. **Interior:** 3D rendering in-browser or external tool integration?
5. **All apps:** Mobile app versions needed? (React Native shared code?)

---

## Getting Started

```bash
# Initialize monorepo
npx create-turbo@latest njaz-platform

# Add shared backend
cd njaz-platform
mkdir -p packages/shared-backend
cd packages/shared-backend
npm create amplify@latest

# Choose first app to build (recommendation: Estebian)
cd ../../apps
npx create-next-app@latest estebian
```

---

**Status:** Planning → Implementation  
**Priority App:** Estebian (clearest scope, immediate value)  
**Platform Goal:** 4 working apps in 3 months  
**Team:** 4-5 engineers, each owning 1-2 apps
