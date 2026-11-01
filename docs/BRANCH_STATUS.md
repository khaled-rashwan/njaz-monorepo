# Repository Status & Architecture Brief

**Project:** Njaz Monorepo  
**Repository:** `https://github.com/khaled-rashwan/njaz-monorepo.git`  
**Root Path:** `C:\Programming\njaz`  
**Current Active Branch:** `test`  
**Last Updated:** 2026-11-01

---

## 1. Git Branch Status

### Local Branches
| Branch Name | Upstream Tracking | Status | Commit Hash | Latest Commit Message / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **`test`** *(active)* | `origin/test` | Synchronized with origin | `0d2b09a` | `feat(scholar): update document editor, comments panel, and canvas features` |
| **`main`** | `origin/main` | Synchronized with origin | `cc44ca8` | `Merge branch 'main' of https://github.com/khaled-rashwan/njaz-monorepo` |

> *Note:* Extraneous local branches (`enhance/scholar-document-styling`, `verify-reporting-main-branch`) have been pruned. Only `main` and `test` are retained.

### Remote (GitHub) Branches
| Remote Branch | Tracking Pointer | Latest Commit Hash | Message Summary |
| :--- | :--- | :--- | :--- |
| **`origin/main`** | `origin/HEAD` | `cc44ca8` | Production/stable release branch |
| **`origin/test`** | Upstream of `test` | `0d2b09a` | Staging/integration branch (contains latest Scholar features & docs) |

---

## 2. Directory Hierarchy & Root Structure

```
njaz/
├── .agent/                # Antigravity/Agent workspace configuration and skills
│   └── skills/            # Custom workspace skills (njaz-backend, njaz-frontend)
├── apps/                  # Monorepo front-end applications
│   ├── app-selector/      # Cross-product entry portal & application switcher
│   ├── dev/               # Internal developer console and administration
│   ├── estebian/          # Estebian survey generation and analysis platform
│   ├── landing/           # Main marketing and public landing site
│   └── scholar/           # Scholar research and document creation app
├── docs/                  # Project documentation & operational briefs
│   └── BRANCH_STATUS.md   # Git branch status & monorepo conventions
├── packages/              # Shared monorepo packages and libraries
│   ├── estebian-data/     # Survey schema, entities, and data models
│   ├── shared-assets/     # Global static assets, icons, fonts, and images
│   ├── shared-auth/       # AWS Cognito authentication wrappers and utilities
│   ├── shared-backend/    # AWS Amplify Gen2 schemas, Lambda functions, triggers
│   └── ui-components/     # Shared design system components (Futuristic theme)
├── scripts/               # Maintenance, build, and deployment automation scripts
└── build/                 # Build artifacts and build scripts
```

---

## 3. Best Practice Naming Conventions

### Directory & Package Conventions
- **Apps & Packages:** Lowercase `kebab-case` (e.g., `app-selector`, `shared-backend`, `ui-components`).
- **Groupings:** High-level project areas reside in standard plural directories (`apps/`, `packages/`, `scripts/`, `docs/`).

### File Naming Standards
- **React Components:** `PascalCase.tsx` (e.g., `CommentsPanel.tsx`, `ProjectCanvas.tsx`).
- **Hooks, Stores, & Utilities:** `kebab-case.ts` (e.g., `docx-export.ts`, `editor-store.ts`).
- **Next.js App Router Reserved Files:** lowercase (e.g., `page.tsx`, `layout.tsx`, `route.ts`, `globals.css`).
- **Documentation:** `kebab-case.md` or `UPPERCASE.md` for standard root documents (`README.md`, `BRANCH_STATUS.md`).

### Git Standards
- **Branch Naming:** Retain `main` (production) and `test` (integration staging) as long-lived branches. Use `<category>/<short-description-in-kebab-case>` for short-lived feature branches before merging.
- **Commit Messages (Conventional Commits):** `<type>(<scope>): <subject>` (e.g., `feat`, `fix`, `refactor`, `chore`, `docs`).
