# Roadmap

Planned work, grouped by area. Items move to the changelog / commit history as they land.

## Engineering quality
- [ ] Extend unit test coverage to `citation-parsers.ts`, `cross-reference.ts`, `latex-to-omml.ts`, `pricing-engine.ts`, and `workflow/generator.ts`
- [ ] Remove the duplicate statistics implementations (`apps/estebian/src/lib/stats.ts` and `shared-backend/.../computeReport/stats.ts`) by moving them into one shared, tested package
- [ ] Add a CI workflow that runs `lint`, `test`, and type-checks on every pull request
- [ ] De-duplicate large image assets that are copied into each app's `public/` folder (serve them from `shared-assets` or a CDN)
- [ ] Add integration tests for Lambda handlers (`computeReport`, `submitResponse`) using mocked AWS SDK clients

## Scholar
- [ ] Real-time collaborative editing and comment threads with mentions
- [ ] More DOCX export styles (APA 7, IEEE, and university-specific templates)
- [ ] Citation-style engine (CSL) for in-text citations and bibliography
- [ ] Semantic literature search and clustering on the project canvas
- [ ] PDF reference ingestion with metadata extraction and auto-linking

## Estebian
- [ ] Confirmatory Factor Analysis (CFA) with fit indices (CFI, TLI, RMSEA, SRMR)
- [ ] Bootstrapped indirect effects as a more robust option than the Sobel test
- [ ] Multi-group comparisons (t-test, ANOVA) with effect sizes in Report Studio
- [ ] Move heavy simulations to a Web Worker / Lambda to keep the UI responsive

## Platform
- [ ] Build out subscription tiers and billing on top of the existing `verifyPayment` function
- [ ] Usage analytics dashboard in `app-selector`
- [ ] Harden the PWA/mobile packaging for Estebian
