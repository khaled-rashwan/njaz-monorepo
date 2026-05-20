# Estebian Reporting Service — Requirements Specification
# مواصفات خدمة التقارير — إستبيان

> **Version:** 2.1  
> **Last Updated:** 2026-05-20  
> **Status:** Phase 1, 2, and 3 COMPLETE — Phase 4 (SPSS/Excel) is future work  
> **Language Support:** Arabic (RTL) / English (LTR) — all outputs must be bilingual  
> **Authentication:** Required (Cognito)  
> **Payment:** Planned for future (currently bypassed)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Report Types](#2-report-types)
3. [A — Demographic Analysis](#3-a--demographic-analysis)
4. [B — Scale Analysis](#4-b--scale-analysis)
5. [C — Inter-Scale Relations](#5-c--inter-scale-relations)
6. [D — Group Differences](#6-d--group-differences)
7. [Output Formats](#7-output-formats)
8. [Architecture & Pipeline](#8-architecture--pipeline)
9. [Current Implementation Status](#9-current-implementation-status)
10. [Reference: Sample Work](#10-reference-sample-work)

---

## 1. Overview

Estebian (إستبيان) is a psychometric survey platform. Its reporting service transforms raw survey responses into professional statistical reports suitable for academic research, psychology practice, and organizational assessment.

### Core Principles

- **Automated**: All statistics computed from raw response data — no manual intervention
- **Bilingual**: Every table, label, interpretation, and PDF rendered in Arabic & English
- **Modular**: Each analysis section (A/B/C/D) can be generated independently or as part of a comprehensive report
- **Academically Rigorous**: Output must match the standards expected in peer-reviewed journals and doctoral theses
- **Exportable**: Results available as interactive web views, downloadable PDF, and raw data exports (Excel/CSV/SPSS)

---

## 2. Report Types

| Report Type | Arabic | Sections Included | Price Tier |
|:---|:---|:---|:---|
| `demographic` | تقرير ديموغرافي | A only | Basic |
| `scale` | تحليل المقاييس | B only | Standard |
| `comprehensive` | تقرير شامل | A + B + C + D | Premium |
| `relations` | تقرير العلاقات | C + D only | Standard |

---

## 3. A — Demographic Analysis
### تحليل الخصائص الديموغرافية للعينة

Analyzes all demographic fields attached to the survey. Treatment depends on field type.

### 3.1 Total Sample Size (حجم العينة الكلي)

| Metric | Arabic |
|:---|:---|
| Total responses | إجمالي الاستجابات |
| Valid responses | الاستجابات الصالحة |
| Incomplete responses | الاستجابات غير المكتملة |
| Response rate (if known) | معدل الاستجابة |

### 3.2 By Field Type

#### 3.2.1 Text Fields (حقول نصية)
- Frequency table of unique values
- Top N most common values with counts and percentages
- "Other" category grouping for rare values
- Optional: text categorization/grouping (e.g., profession → main category, as done in the Asmaa Sayed sample)

**Output Table:**

| القيمة (Value) | التكرار (Count) | النسبة المئوية (%) |
|:---|:---:|:---:|
| طبيب | 67 | 60.9% |
| ممرض | 34 | 30.9% |
| ... | ... | ... |

#### 3.2.2 Number Fields (حقول رقمية)

| Statistic | Arabic | Formula |
|:---|:---|:---|
| Count (N) | العدد | n |
| Minimum | الحد الأدنى | min(x) |
| Maximum | الحد الأقصى | max(x) |
| Mean | المتوسط الحسابي | Σx / n |
| Standard Deviation | الانحراف المعياري | √(Σ(x−μ)² / (n−1)) |
| Median | الوسيط | middle value |
| Mode | المنوال | most frequent |
| Skewness | الالتواء | measure of asymmetry |
| Kurtosis | التفرطح | measure of tail weight |

#### 3.2.3 Multiple Choice / Select Fields (حقول الاختيار)

- Frequency and percentage for each option
- Bar chart / pie chart visualization
- Cross-tabulation with other demographic fields (e.g., gender × profession)

**Output Table:**

| الاختيار (Choice) | التكرار (Freq) | النسبة (%) | رسم بياني |
|:---|:---:|:---:|:---|
| ذكر | 38 | 34.5% | ████████ |
| أنثى | 72 | 65.5% | ████████████████ |

#### 3.2.4 Date Fields (حقول التاريخ)

- Earliest and latest dates
- Date range
- Distribution by month/year
- If birth date: calculate age statistics (min, max, mean, std)

### 3.3 Cross-Tabulation (الجداول التقاطعية)

For every pair of categorical demographic fields, produce a cross-tabulation matrix showing counts and percentages. Example: Gender × Profession (as in the sample report Section 4).

### 3.4 Suggested Additional Demographics Statistics

- **Missing data analysis**: percentage of missing values per field
- **Chi-Square test (χ²)**: test independence between categorical variables
- **Visualization**: automatic generation of bar charts, pie charts, histograms

---

## 4. B — Scale Analysis
### تحليل المقاييس

For each psychometric scale included in the survey, compute the following sections.

### 4.1 Descriptive Statistics (الإحصاءات الوصفية)

Per scale and per dimension:

| Statistic | Arabic |
|:---|:---|
| N (valid) | العدد |
| Mean (المتوسط) | المتوسط الحسابي |
| Std. Deviation | الانحراف المعياري |
| Variance | التباين |
| Min | الحد الأدنى |
| Max | الحد الأقصى |
| Median | الوسيط |
| Skewness | الالتواء |
| Kurtosis | التفرطح |
| Weighted Mean (relative importance) | المتوسط الموزون (الأهمية النسبية) |

Also per individual statement: mean, std, item-total correlation.

### 4.2 Reliability Analysis (تحليل الثبات)

#### 4.2.1 Cronbach's Alpha (ألفا كرونباخ)

- Overall scale alpha
- Per-dimension alpha
- Alpha-if-item-deleted table (for each statement)
- Interpretation guidelines:

| Alpha Range | Interpretation (EN) | التفسير (AR) |
|:---|:---|:---|
| α ≥ 0.90 | Excellent | ممتاز |
| 0.80 ≤ α < 0.90 | Good | جيد |
| 0.70 ≤ α < 0.80 | Acceptable | مقبول |
| 0.60 ≤ α < 0.70 | Questionable | مشكوك فيه |
| α < 0.60 | Poor | ضعيف |

**Formula:**
```
α = (k / (k-1)) × (1 - Σσ²ᵢ / σ²ₜ)
```
Where k = number of items, σ²ᵢ = variance of item i, σ²ₜ = variance of total scores.

#### 4.2.2 Split-Half Reliability (ثبات التجزئة النصفية)

- Spearman-Brown corrected coefficient
- Guttman split-half coefficient
- Split method: odd-even items

**Formula (Spearman-Brown):**
```
r_sb = (2 × r_half) / (1 + r_half)
```

#### 4.2.3 Additional Reliability Methods (Suggested)

- **McDonald's Omega (ω)**: more appropriate when items are not tau-equivalent
- **Composite Reliability (CR)**: from factor loadings
- **Test-Retest** (if repeated measures data available — future)

### 4.3 Consistency Analysis (تحليل الاتساق)

#### 4.3.1 Pearson Correlation Matrix (مصفوفة ارتباط بيرسون)

- Full correlation matrix between all statements within a scale
- Significance levels (p-values) with stars (* p<0.05, ** p<0.01, *** p<0.001)
- Item-total correlation for each statement
- Inter-dimension correlation matrix

**Interpretation Guide:**

| |r| Range | Strength (EN) | القوة (AR) |
|:---|:---|:---|
| 0.00 – 0.19 | Very Weak | ضعيفة جداً |
| 0.20 – 0.39 | Weak | ضعيفة |
| 0.40 – 0.59 | Moderate | متوسطة |
| 0.60 – 0.79 | Strong | قوية |
| 0.80 – 1.00 | Very Strong | قوية جداً |

#### 4.3.2 Spearman Rank Correlation (ارتباط سبيرمان)

- Non-parametric alternative
- Useful when data is ordinal or not normally distributed
- Same output format as Pearson

### 4.4 Exploratory Factor Analysis — EFA (التحليل العاملي الاستكشافي)

#### 4.4.1 Pre-Checks

| Test | Arabic | Purpose | Acceptable Value |
|:---|:---|:---|:---|
| KMO (Kaiser-Meyer-Olkin) | اختبار KMO | Sampling adequacy | ≥ 0.60 |
| Bartlett's Test of Sphericity | اختبار بارتليت | Correlation significance | p < 0.05 |

#### 4.4.2 Factor Extraction

- **Method**: Principal Component Analysis (PCA) or Principal Axis Factoring (PAF)
- **Rotation**: Varimax (orthogonal) or Promax (oblique)
- **Number of factors**: determined by:
  - Kaiser criterion (eigenvalue > 1)
  - Scree plot (visual elbow)
  - Parallel analysis (Monte Carlo simulation)

#### 4.4.3 Output Tables

**Eigenvalues & Variance Explained (القيم الذاتية ونسب التباين المفسر):**

| العامل (Factor) | القيمة الذاتية (Eigenvalue) | % التباين المفسر | % التراكمي |
|:---:|:---:|:---:|:---:|
| 1 | 5.42 | 27.1% | 27.1% |
| 2 | 3.18 | 15.9% | 43.0% |
| ... | ... | ... | ... |

**Rotated Factor Loadings Matrix (مصفوفة تشبعات العوامل بعد التدوير):**

| البند (Statement) | العامل 1 | العامل 2 | العامل 3 | ... |
|:---|:---:|:---:|:---:|:---:|
| البند 1 | **0.82** | 0.12 | 0.05 | ... |
| البند 2 | 0.08 | **0.76** | 0.11 | ... |

- Bold loadings ≥ 0.40 (configurable threshold)
- Communalities column
- Statement-to-factor assignment compared with original scale dimensions

#### 4.4.4 Visualizations

- Scree plot
- Factor loading heatmap

### 4.5 Confirmatory Factor Analysis — CFA (التحليل العاملي التوكيدي)

#### 4.5.1 Model Specification

- Test the hypothesized factor structure (from the scale's dimensions)
- Each statement loads on its assigned dimension
- Dimensions may correlate with each other

#### 4.5.2 Path Diagram (مخطط المسار)

- Visual diagram showing:
  - Latent variables (dimensions) as ovals/circles
  - Observed variables (statements) as rectangles
  - Standardized factor loadings on each path
  - Error variance for each observed variable
  - Correlations between latent variables (curved arrows)

#### 4.5.3 Model Fit Indices (مؤشرات جودة المطابقة)

| Index | Arabic | Good Fit | Acceptable Fit |
|:---|:---|:---|:---|
| χ² / df (CMIN/DF) | مربع كاي / درجات الحرية | < 2 | < 5 |
| GFI | مؤشر حسن المطابقة | ≥ 0.95 | ≥ 0.90 |
| AGFI | مؤشر حسن المطابقة المعدل | ≥ 0.90 | ≥ 0.85 |
| CFI | مؤشر المطابقة المقارن | ≥ 0.95 | ≥ 0.90 |
| TLI (NNFI) | مؤشر تاكر-لويس | ≥ 0.95 | ≥ 0.90 |
| RMSEA | جذر متوسط مربع خطأ التقريب | ≤ 0.05 | ≤ 0.08 |
| SRMR | الجذر التربيعي لمتوسط المربعات المعيارية للبواقي | ≤ 0.05 | ≤ 0.08 |
| PCLOSE | قيمة الإغلاق | > 0.05 | — |

#### 4.5.4 CFA Output Tables

**Standardized Factor Loadings (التشبعات المعيارية):**

| البند | العامل الكامن | التشبع المعياري | الخطأ المعياري | النسبة الحرجة (C.R.) | الدلالة (p) |
|:---|:---|:---:|:---:|:---:|:---:|
| S1 | البعد الأول | 0.74 | 0.05 | 14.80 | *** |

**Convergent Validity (الصدق التقاربي):**

| Factor | AVE | CR |
|:---|:---:|:---:|
| Dimension 1 | 0.58 | 0.82 |

- AVE (Average Variance Extracted) ≥ 0.50
- CR (Composite Reliability) ≥ 0.70

**Discriminant Validity (الصدق التمييزي):**
- √AVE for each factor should exceed its correlation with every other factor

---

## 5. C — Inter-Scale Relations
### العلاقات بين المقاييس

When a survey contains multiple scales, analyze the relationships between them.

### 5.1 Pearson Correlation Between Scales (ارتباط بيرسون بين المقاييس)

| Scale Pair | r | p-value | Interpretation |
|:---|:---:|:---:|:---|
| Scale A ↔ Scale B | 0.328 | 0.0005 | Significant, moderate positive |
| Scale A ↔ Scale C | -0.334 | 0.0004 | Significant, moderate negative |

### 5.2 Simple Linear Regression (الانحدار الخطي البسيط)

For each pair of scales (one as predictor, one as outcome):
- R², Adjusted R²
- F-statistic, p-value
- Regression coefficients (B, β, t, p)
- Regression equation

### 5.3 Multiple Regression (الانحدار المتعدد)

When 3+ scales exist:
- Stepwise, Enter, or Backward methods
- Model summary (R², ΔR², F)
- Coefficients table (B, SE, β, t, p)
- Collinearity diagnostics (VIF, Tolerance)

### 5.4 Mediation Analysis (تحليل الوساطة)

Test whether one scale mediates the relationship between two other scales.

- **Sobel Test (اختبار سوبل)**:
  - z-statistic
  - p-value
  - Indirect effect (a × b)
  - Direct effect (c')
  - Total effect (c)

**Sobel Formula:**
```
z = (a × b) / √(b²×SE_a² + a²×SE_b²)
```

- **Bootstrap method** (Preacher & Hayes): 95% CI for indirect effect

### 5.5 Moderation Analysis (تحليل التعديل / الدور المعدل)

Test whether a third variable moderates the relationship between two scales.

- Interaction term (X × M)
- Hierarchical regression:
  - Step 1: Main effects (X, M)
  - Step 2: Interaction (X×M)
  - ΔR² for the interaction step
- Simple slopes analysis at ±1 SD of moderator
- Johnson-Neyman regions of significance (if applicable)

### 5.6 Structural Equation Modeling — SEM (النمذجة بالمعادلات البنائية)

Future enhancement for complex multi-scale models:
- Path analysis with latent variables
- Model fit indices (same as CFA)
- Direct and indirect effects

---

## 6. D — Group Differences
### الفروق بين المجموعات

Use demographic variables to compare scale scores across groups.

### 6.1 Two-Group Comparisons (مقارنة مجموعتين)

#### Independent Samples T-Test (اختبار ت للعينات المستقلة)

For binary demographics (e.g., Gender):

| Scale | Group 1 Mean | Group 2 Mean | t | df | p | Cohen's d | Result |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| Scale A | 86.71 | 91.79 | -0.691 | 108 | 0.491 | 0.14 | Not significant |

- Levene's test for equality of variances
- Effect size: Cohen's d

#### Mann-Whitney U Test (اختبار مان-ويتني)

Non-parametric alternative when assumptions violated.

### 6.2 Multi-Group Comparisons (مقارنة عدة مجموعات)

#### One-Way ANOVA (تحليل التباين الأحادي)

For categorical demographics with 3+ groups (e.g., Profession):

| Scale | F | df_between | df_within | p | η² | Result |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| Scale A | 0.711 | 3 | 106 | 0.548 | 0.02 | Not significant |

- Homogeneity of variances (Levene's test)
- Post-hoc tests when significant:
  - **Tukey HSD** (equal variances)
  - **Games-Howell** (unequal variances)
  - **Scheffé** (conservative)
- Effect size: η² (eta-squared)

#### Kruskal-Wallis Test (اختبار كروسكال-واليس)

Non-parametric alternative with Dunn's post-hoc test.

### 6.3 Two-Way ANOVA (تحليل التباين الثنائي)

For interaction effects between two demographic variables (e.g., Gender × Profession):
- Main effects for each factor
- Interaction effect
- Estimated marginal means

### 6.4 Descriptive Statistics by Group

For each demographic variable, provide:
- Count, Mean, Std for each scale × group combination
- Combined cross-tabulation (as in sample report Section 4)

---

## 7. Output Formats

### 7.1 Interactive Web Report (تقرير تفاعلي)

- Rendered in-app using the Futuristic design system
- Interactive charts (bar, pie, scatter, heatmap)
- Expandable/collapsible sections
- RTL/LTR toggle
- Print-friendly mode

### 7.2 PDF Report (تقرير PDF)

- Professional academic layout
- Arabic font support (e.g., Amiri, Cairo)
- University/organization logo placement
- Table of contents
- Page numbers
- APA-style tables
- Embedded charts as vector graphics
- Cover page with survey metadata

### 7.3 Data Exports (تصدير البيانات)

| Format | Extension | Description |
|:---|:---|:---|
| Excel | .xlsx | Multi-sheet workbook with raw data + computed scores |
| CSV | .csv | UTF-8 encoded comma-separated values |
| SPSS | .sav | SPSS-compatible data file (future) |
| Raw JSON | .json | Machine-readable full analysis output |

### 7.4 Specific Export Sheets (Excel)

1. **Raw Responses**: original answers per respondent
2. **Scored Data**: Likert-coded numeric values (with reverse-scoring applied)
3. **Scale Totals**: per-respondent total/mean score for each scale and dimension
4. **Demographics Summary**: frequency tables
5. **Reliability**: Alpha, split-half tables
6. **Correlation Matrix**: full matrix with significance
7. **Factor Analysis**: loadings, eigenvalues
8. **Differences**: T-test, ANOVA results

---

## 8. Architecture & Pipeline

### 8.1 Current Pipeline (Step Functions)

```
User Request → initiateReport (Lambda)
  → VerifyPayment (Lambda) → CheckPaymentResult
    → ComputeReport (Lambda) → GenerateReportPdf (Lambda)
      → MarkCompleted (DynamoDB Update)
```

### 8.2 Required Pipeline Enhancement

```
User Request → initiateReport
  → VerifyPayment
    → ComputeReport [ENHANCED — modular sections A/B/C/D]
      → GenerateVisualizations [NEW — chart generation]
        → GenerateReportPdf [ENHANCED — full academic PDF]
          → GenerateExports [NEW — Excel/CSV/SPSS]
            → MarkCompleted
```

### 8.3 Computation Strategy

**Phase 1 (Current — Enhance):**
- All computation in a single Lambda (computeReport)
- JavaScript/TypeScript using:
  - Custom statistical functions (mean, std, correlation, alpha)
  - `simple-statistics` or `jstat` npm packages

**Phase 2 (Future — Scale):**
- Heavy computations (EFA, CFA, SEM) offloaded to:
  - Python Lambda layer with `numpy`, `scipy`, `factor_analyzer`, `semopy`
  - OR containerized computation (ECS/Fargate)
- Reason: JavaScript lacks mature EFA/CFA libraries

### 8.4 Data Model Changes Needed

The `EstebianReport.data` JSON field must expand to accommodate all sections. See `types.ts` for the current `ReportData` interface — it needs significant extension to cover EFA, CFA, mediation, moderation, and group differences output.

---

## 9. Current Implementation Status

| Feature | Status | Notes |
|:---|:---|:---|
| Demographic frequency counts | ✅ Implemented | Full distribution with percentages |
| Numeric descriptive stats | ✅ Implemented | min, max, mean, std, median, skewness, kurtosis |
| Scale descriptive stats | ✅ Implemented | Mean, std, variance, min, max, median, skewness, kurtosis |
| Cronbach's Alpha | ✅ Implemented | Real variance-based formula + per-dimension alpha |
| Standardized Alpha | ✅ Implemented | Based on average inter-item correlation |
| Split-Half Reliability | ✅ Implemented | Spearman-Brown + Guttman corrections |
| Item-Total Correlation | ✅ Implemented | Corrected item-total correlation per statement |
| Alpha-if-Item-Deleted | ✅ Implemented | Per-item diagnostic |
| Reverse-Scoring | ✅ Implemented | Handled in buildItemMatrix utility |
| Pearson Correlation Matrix | ✅ Implemented | Full item×item matrix with p-values and significance stars |
| Inter-Scale Correlation | ✅ Implemented | Pearson r with p-values between scale total scores |
| Skewness & Kurtosis | ✅ Implemented | Scale-level, dimension-level, and demographic numeric fields |
| Word Document Export | ✅ Implemented | Professional .docx with cover page, APA tables, RTL support |
| Reports Hub Page | ✅ Implemented | /reports simplified as survey hub with links to per-survey reports |
| Interactive Web Report | ✅ Enhanced | Correlation matrix heatmap, inter-scale table, skew/kurtosis display |
| Spearman Correlation | ❌ Not implemented | |
| EFA | ✅ Implemented | Varimax rotation, Kaiser criterion, Visual Scree Plot |
| CFA | ✅ Implemented | Actual Fit Indices (RMSEA, CFI, TLI, SRMR), Congruence |
| Path Diagram | ✅ Implemented | Structural grid-based layout visualizing factor structure |
| Sobel Test / Mediation | ✅ Implemented | Custom role selection (IV/M/DV) |
| Moderation Analysis | ❌ Not implemented | |
| T-Test | ✅ Implemented | Independent samples T-Test with direction interpretation |
| ANOVA | ✅ Implemented | One-Way ANOVA for multi-group demographic variables |
| PDF Generation | ⚠️ Replaced | Replaced by Word (.docx) export — more useful for researchers |
| Excel Export | ❌ Not implemented | Phase 4 |
| SPSS Export | ❌ Not implemented | Phase 4 |

---

## 10. Reference: Sample Work

The folder `docs/Asmaa Sayed/` contains a complete manual analysis workflow performed using Python + Excel for a real study with 3 psychometric scales (Stress, Self-Compassion, Burnout) and 110 respondents. Key reference files:

| File | Purpose |
|:---|:---|
| `final_analysis.py` | Cronbach's alpha, Pearson correlation, descriptive stats |
| `run_official_corr.py` | Official Pearson correlation with interpretation |
| `run_differences.py` | T-test (gender) and ANOVA (profession) |
| `analysis_report_arabic.md` | Full Arabic statistical report output |
| `differences_results.md` | Group differences results |
| `correlation_official.md` | Correlation matrix results |
| `scoring.html` | Likert scoring with reverse items |

This sample work represents the **minimum viable output** that the automated reporting service must replicate and exceed.

---

## Appendix: Implementation Priority

### Priority 1 — Foundation (الأساسيات) — ✅ COMPLETE
1. ~~Fix Cronbach's Alpha (real computation, not hardcoded)~~
2. ~~Full descriptive statistics (mean, std, min, max, median, skewness, kurtosis)~~
3. ~~Demographic analysis by field type (text/number/select/date)~~
4. ~~Item-total correlation~~

### Priority 2 — Core Analysis (التحليل الأساسي) — ✅ COMPLETE
5. ~~Pearson correlation matrices~~ ✅
6. ~~Split-half reliability~~ ✅
7. ~~T-test and ANOVA for group differences~~ ✅
8. ~~Inter-scale correlations~~ ✅

### Priority 3 — Advanced Analysis (التحليل المتقدم) — ✅ COMPLETE
9. ~~EFA (KMO, Bartlett, eigenvalues, rotated loadings)~~
10. ~~CFA (fit indices, path diagram, convergent/discriminant validity)~~
11. ~~Mediation (Sobel test, bootstrap)~~
12. Moderation (interaction, simple slopes) — ❌ FUTURE

### Priority 4 — Output & Export (المخرجات) — 🟡 PARTIALLY COMPLETE
13. ~~Professional Word (.docx) export with Arabic/RTL support~~ ✅ (replaced PDF)
14. Multi-sheet Excel export — ❌ TODO
15. ~~Interactive web visualizations (correlation heatmap, stats panels)~~ ✅
16. SPSS export — ❌ FUTURE

---

*This document is the authoritative reference for the Estebian reporting service. Update it as features are added or requirements change.*
