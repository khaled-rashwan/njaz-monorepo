---
name: njaz:frontend
description: Build Njaz frontend pages using the Futuristic design system, RTL/i18n support, and @njaz/ui-components.
allowed-tools:
  - "*"
---

# Njaz Frontend Development Skill

You are a senior frontend engineer specializing in the Njaz platform. This skill teaches you how to build pages that match the established design language and architecture.

## Technology Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 3.x
- **State**: React hooks (`useState`, `useEffect`, custom hooks)
- **Auth**: AWS Amplify v6 (`aws-amplify/auth`)
- **Data**: AWS Amplify Data (GraphQL)
- **Build**: TurboRepo (monorepo orchestration)

---

## Monorepo Structure

```
njaz/
├── apps/
│   ├── estebian/         # Psychometric survey platform
│   ├── landing/          # Marketing landing page
│   └── app-selector/     # Suite dashboard / app picker
├── packages/
│   ├── ui-components/    # @njaz/ui-components (shared UI)
│   ├── shared-auth/      # @njaz/shared-auth (auth helpers)
│   └── estebian-data/    # @njaz/estebian-data (data models)
└── scripts/
    ├── sync-amplify-config.js
    └── sync-assets.js
```

---

## Design System: "Futuristic Command Center"

All Njaz apps share a unified visual language inspired by sci-fi interfaces.

### Core Principles
1.  **Glassmorphism**: Semi-transparent backgrounds with `backdrop-blur-xl`.
2.  **Neon Glows**: Colored borders and shadows (cyan, purple, amber, emerald, pink).
3.  **Beveled Corners**: Use CSS `clip-path` for sci-fi panel edges.
4.  **Micro-animations**: Subtle `transition-all duration-300` on interactive elements.

### Color Palette (HSL-based)
| Token | Tailwind Class | Hex | Usage |
|:------|:---------------|:----|:------|
| Primary Glow | `cyan-400/500` | `#38CDDF` | Borders, accents, links |
| Secondary Glow | `purple-400/500` | `#A78BFA` | Alt panels, highlights |
| Warning/Gold | `amber-400/500` | `#FBBF24` | Alerts, pricing |
| Success | `emerald-400/500` | `#34D399` | Success states |
| Accent | `pink-400/500` | `#EC4899` | Review/final states |
| Background | `slate-900/800` | `#0F172A` | Page/panel backgrounds |
| Text Primary | `white` | `#FFFFFF` | Headings |
| Text Secondary | `slate-400` | `#94A3B8` | Body text, labels |

### Mandatory UI Components
Always import from `@njaz/ui-components`:

```typescript
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
```

- **`SharedHeader`**: Fixed top nav with auth, suite navigation, and RTL support.
- **`SharedFooter`**: Standard footer with RTL-aware links.
- **`FuturisticPanel`**: Glassmorphism container with `glowColor` prop (`cyan`, `purple`, `gold`, `green`, `pink`).

---

## Internationalization (i18n) & RTL

Njaz supports Arabic (RTL) and English (LTR). Every text string must be translatable.

### Pattern: `useLanguage` Hook
```typescript
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';

export default function MyPage() {
    const { t, language, direction } = useLanguage();

    return (
        <div dir={direction}>
            <h1>{t('English Text', 'النص العربي')}</h1>
        </div>
    );
}
```

### Rules
1.  **Always wrap content** in `<div dir={direction}>`.
2.  **Use `t(en, ar)`** for every user-visible string.
3.  **Conditional icons**: Flip arrow directions based on `direction === 'rtl'`.
    ```tsx
    {direction === 'rtl' ? '→' : '←'} {t('Back', 'رجوع')}
    ```
4.  **Input fields**: Set `dir={isRtl ? 'rtl' : 'ltr'}` on `<input>` and `<textarea>`.

---

## Page Structure Template

Every new page MUST follow this structure. Replace `APP_NAME` with the target app (e.g., `estebian`, `landing`):

```tsx
'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { getDashboardUrl, getCurrentUrl } from '@njaz/shared-auth';

export default function NewPage() {
    const { t, language, direction } = useLanguage();
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const user = await getCurrentUser();
            setUserId(user.username);
            // Fetch page-specific data here
        } catch {
            setUserId(null);
        } finally {
            setIsLoading(false);
        }
    }

    // --- LOADING STATE ---
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center futuristic-bg">
                <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </div>
        );
    }

    // --- UNAUTHENTICATED STATE ---
    if (!userId) {
        return (
            <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
                <SharedHeader currentApp="APP_NAME" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />
                <main className="flex-1 pt-24 pb-8 px-4 flex items-center justify-center">
                    <FuturisticPanel glowColor="cyan" size="lg">
                        <div className="text-center py-12">
                            <h2 className="text-2xl font-bold text-white mb-3">{t('Authentication Required', 'المصادقة مطلوبة')}</h2>
                            <a href={getDashboardUrl(getCurrentUrl())} className="futuristic-btn-primary">
                                {t('Sign In', 'تسجيل الدخول')}
                            </a>
                        </div>
                    </FuturisticPanel>
                </main>
                <SharedFooter direction={direction} t={t} />
            </div>
        );
    }

    // --- AUTHENTICATED STATE ---
    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader currentApp="APP_NAME" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />

            <main className="flex-1 pt-24 pb-8 px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Page Header */}
                    <div className="mb-8">
                        <Link href="/" className="futuristic-btn inline-flex items-center gap-2 text-sm mb-3">
                            {direction === 'rtl' ? (
                                <>{t('Back', 'رجوع')} <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></>
                            ) : (
                                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> {t('Back', 'رجوع')}</>
                            )}
                        </Link>
                        <h1 className="text-3xl font-bold text-white">{t('Page Title', 'عنوان الصفحة')}</h1>
                    </div>

                    {/* Content Panels */}
                    <FuturisticPanel glowColor="cyan" size="lg">
                        {/* Your content here */}
                    </FuturisticPanel>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
```

---

## CSS Utility Classes

These are defined in `packages/ui-components/src/styles.css` or app-level globals:

| Class | Effect |
|:------|:-------|
| `futuristic-bg` | Dark gradient background with subtle noise texture |
| `futuristic-btn` | Ghost button with cyan border glow |
| `futuristic-btn-primary` | Filled gradient button (purple-to-cyan) |
| `futuristic-input` | Dark input field with cyan focus ring |

---

## Monorepo Import Rules

### Cross-Package Imports
```typescript
// UI Components (shared visuals)
import { FuturisticPanel, SharedHeader } from '@njaz/ui-components';

// Auth Helpers (redirects, session checks)
import { getDashboardUrl, getCurrentUrl } from '@njaz/shared-auth';

// App-Specific Types (per-app data models)
import { Survey, Scale } from '@/lib/types';
```

### Never Do
- ❌ Import directly from `../../../packages/...` (use package names).
- ❌ Hardcode URLs across apps (use `getDashboardUrl`).
- ❌ Use raw `#hex` colors in JSX (use Tailwind classes).

---

## Local Development Workflow

### 1. Start the Dev Server
```bash
# Run a specific app (recommended for faster feedback)
npm run dev --filter=estebian

# Or run all apps
npm run dev
```

### 2. Build Verification (Before Commit)
```bash
# Build the specific app you changed
npx turbo run build --filter=estebian

# Or build the entire monorepo
npm run build
```

### 3. Common Issues
| Symptom | Cause | Fix |
|:--------|:------|:----|
| `Module not found: @njaz/ui-components` | Package not built | Run `npm run build` at root |
| Type errors after schema change | Types out of sync | Run `npm run sync-amplify` |
| Missing `amplify_outputs.json` | Sandbox not synced | Run `npm run sync-amplify` |

---

## Verification Checklist (Before Commit)
- [ ] **Build Validation**: Run `npm run build` (or `npx turbo run build --filter=APP_NAME`) and ensure 0 errors.
- [ ] **Runtime Validation**: Run `npm run dev` and verify the page loads without runtime errors.
- [ ] All strings wrapped in `t('en', 'ar')`.
- [ ] `dir={direction}` on root container.
- [ ] `SharedHeader` and `SharedFooter` present.
- [ ] Loading and unauthenticated states handled.
- [ ] No hardcoded colors (use Tailwind palette).
- [ ] Responsive: Test at 320px, 768px, 1280px widths.
