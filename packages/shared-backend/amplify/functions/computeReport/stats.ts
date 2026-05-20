/**
 * Statistical Utility Functions for Estebian Report Engine
 * 
 * Pure mathematical functions — no AWS dependencies.
 * All functions handle edge cases (empty arrays, single values, etc.)
 */

// ============================================
// BASIC DESCRIPTIVE STATISTICS
// ============================================

export function mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Sample variance (n-1 denominator) */
export function variance(arr: number[]): number {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1);
}

export function stddev(arr: number[]): number {
    return Math.sqrt(variance(arr));
}

export function median(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Sample skewness (adjusted Fisher-Pearson) */
export function skewness(arr: number[]): number {
    const n = arr.length;
    if (n < 3) return 0;
    const m = mean(arr);
    const s = stddev(arr);
    if (s === 0) return 0;
    const sum3 = arr.reduce((sum, x) => sum + ((x - m) / s) ** 3, 0);
    return (n / ((n - 1) * (n - 2))) * sum3;
}

/** Excess kurtosis (Fisher's definition, normal = 0) */
export function kurtosis(arr: number[]): number {
    const n = arr.length;
    if (n < 4) return 0;
    const m = mean(arr);
    const s = stddev(arr);
    if (s === 0) return 0;
    const sum4 = arr.reduce((sum, x) => sum + ((x - m) / s) ** 4, 0);
    const k = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum4
        - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
    return k;
}

// ============================================
// CORRELATION
// ============================================

/** Pearson product-moment correlation coefficient */
export function pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    const mx = mean(x.slice(0, n));
    const my = mean(y.slice(0, n));
    let sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
        const dx = x[i] - mx;
        const dy = y[i] - my;
        sumXY += dx * dy;
        sumX2 += dx * dx;
        sumY2 += dy * dy;
    }
    const denom = Math.sqrt(sumX2 * sumY2);
    return denom === 0 ? 0 : sumXY / denom;
}

/**
 * Approximate two-tailed p-value for Pearson r
 * using t-distribution: t = r × sqrt((n-2) / (1-r²))
 * Then approximate p from t using the regularized incomplete beta function.
 */
export function pValueForR(r: number, n: number): number {
    if (n < 3) return 1;
    const absR = Math.abs(r);
    if (absR >= 1) return 0;
    const t = absR * Math.sqrt((n - 2) / (1 - absR * absR));
    const df = n - 2;
    // Approximate two-tailed p using the Student-t survival function
    return 2 * studentTSurvival(t, df);
}

/** Approximate survival function (1-CDF) for Student-t distribution */
function studentTSurvival(t: number, df: number): number {
    // Use the incomplete beta function relationship:
    // P(T > t) = 0.5 * I(df/(df+t²), df/2, 0.5)  
    // We use a simple series approximation that works well for our purposes
    const x = df / (df + t * t);
    return 0.5 * incompleteBeta(x, df / 2, 0.5);
}

/** Regularized incomplete beta function Ix(a, b) — series approximation */
function incompleteBeta(x: number, a: number, b: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Use continued fraction (Lentz's algorithm) for better convergence
    const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
    const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;
    // Use series expansion
    let sum = 1, term = 1;
    for (let n = 1; n <= 200; n++) {
        term *= (n - b) * x / (a + n);
        sum += term;
        if (Math.abs(term) < 1e-10) break;
    }
    const result = front * sum;
    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, result));
}

/** Log-gamma function (Stirling approximation) */
function lnGamma(z: number): number {
    if (z <= 0) return 0;
    // Lanczos approximation
    const g = 7;
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
        771.32342877765313, -176.61502916214059, 12.507343278686905,
        -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) {
        return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
    }
    z -= 1;
    let x = c[0];
    for (let i = 1; i < g + 2; i++) {
        x += c[i] / (z + i);
    }
    const t2 = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t2) - t2 + Math.log(x);
}

/**
 * Build a full Pearson correlation matrix for a set of item columns.
 * Returns a 2D array where matrix[i][j] = { r, p }
 */
export function correlationMatrix(matrix: number[][]): { r: number; p: number }[][] {
    const n = matrix.length;
    if (n < 2) return [];
    const k = matrix[0]?.length || 0;
    if (k < 2) return [];

    // Extract column arrays
    const columns: number[][] = [];
    for (let j = 0; j < k; j++) {
        columns.push(matrix.map(row => row[j]));
    }

    const result: { r: number; p: number }[][] = [];
    for (let i = 0; i < k; i++) {
        result[i] = [];
        for (let j = 0; j < k; j++) {
            if (i === j) {
                result[i][j] = { r: 1, p: 0 };
            } else if (j < i) {
                // Use symmetry
                result[i][j] = result[j][i];
            } else {
                const r = pearsonCorrelation(columns[i], columns[j]);
                const p = pValueForR(r, n);
                result[i][j] = { r: round(r), p: round(p, 6) };
            }
        }
    }
    return result;
}

/**
 * Interpret correlation strength based on |r|
 */
/**
 * Interpret correlation strength and direction
 */
export function interpretCorrelation(r: number, language: 'ar' | 'en' = 'en'): string {
    const absR = Math.abs(r);
    const isPos = r >= 0;
    
    if (language === 'ar') {
        const direction = isPos ? 'طردية (+)' : 'عكسية (-)';
        let strength = '';
        if (absR >= 0.8) strength = 'قوية جداً';
        else if (absR >= 0.6) strength = 'قوية';
        else if (absR >= 0.4) strength = 'متوسطة';
        else if (absR >= 0.2) strength = 'ضعيفة';
        else strength = 'ضعيفة جداً';
        return `${direction} ${strength}`;
    } else {
        const direction = isPos ? 'Positive (+)' : 'Negative (-)';
        let strength = '';
        if (absR >= 0.8) strength = 'Very Strong';
        else if (absR >= 0.6) strength = 'Strong';
        else if (absR >= 0.4) strength = 'Moderate';
        else if (absR >= 0.2) strength = 'Weak';
        else strength = 'Very Weak';
        return `${strength} ${direction}`;
    }
}

// ============================================
// GROUP DIFFERENCES (T-TEST & ANOVA)
// ============================================

/**
 * Welch's Independent T-test (does not assume equal variance)
 */
export function ttest(a: number[], b: number[]): { t: number; p: number; df: number } {
    const n1 = a.length;
    const n2 = b.length;
    if (n1 < 2 || n2 < 2) return { t: 0, p: 1, df: 0 };

    const m1 = mean(a);
    const m2 = mean(b);
    const v1 = variance(a);
    const v2 = variance(b);

    const se1 = v1 / n1;
    const se2 = v2 / n2;
    const se = Math.sqrt(se1 + se2);

    if (se === 0) return { t: 0, p: 1, df: 0 };

    const t = (m1 - m2) / se;

    // Welch-Satterthwaite equation for degrees of freedom
    const df = (se1 + se2) ** 2 / (se1 ** 2 / (n1 - 1) + se2 ** 2 / (n2 - 1));

    return { t, p: pValueForT(t, df), df };
}

/**
 * One-way ANOVA
 */
export function anova(groups: number[][]): { F: number; p: number; df1: number; df2: number } {
    const k = groups.length;
    const ns = groups.map(g => g.length);
    const totalN = ns.reduce((a, b) => a + b, 0);
    if (k < 2 || totalN <= k) return { F: 0, p: 1, df1: 0, df2: 0 };

    const means = groups.map(g => mean(g));
    const variances = groups.map(g => variance(g));
    const globalMean = groups.flat().reduce((a, b) => a + b, 0) / totalN;

    // Sum of Squares Between (SSB)
    let ssb = 0;
    for (let i = 0; i < k; i++) {
        ssb += ns[i] * (means[i] - globalMean) ** 2;
    }

    // Sum of Squares Within (SSW)
    let ssw = 0;
    for (let i = 0; i < k; i++) {
        ssw += (ns[i] - 1) * variances[i];
    }

    const df1 = k - 1;
    const df2 = totalN - k;

    const msb = ssb / df1;
    const msw = ssw / df2;

    if (msw === 0) return { F: 0, p: 1, df1, df2 };

    const F = msb / msw;

    return { F, p: pValueForF(F, df1, df2), df1, df2 };
}

export function pValueForT(t: number, df: number): number {
    return 2 * studentTSurvival(Math.abs(t), df);
}

export function pValueForF(F: number, df1: number, df2: number): number {
    if (F <= 0) return 1;
    const x = df2 / (df2 + df1 * F);
    return incompleteBeta(x, df2 / 2, df1 / 2);
}


// ============================================
// RELIABILITY ANALYSIS
// ============================================

/**
 * Cronbach's Alpha
 * 
 * Formula: α = (k / (k-1)) × (1 - Σσ²ᵢ / σ²ₜ)
 * 
 * @param matrix 2D array [respondents][items] — each cell is a numeric score
 * @returns alpha coefficient (0 to 1)
 */
export function cronbachAlpha(matrix: number[][]): number {
    const n = matrix.length; // respondents
    if (n < 2) return 0;
    const k = matrix[0]?.length || 0; // items
    if (k < 2) return 0;

    // Item variances
    let sumItemVariances = 0;
    for (let j = 0; j < k; j++) {
        const itemScores = matrix.map(row => row[j]);
        sumItemVariances += variance(itemScores);
    }

    // Total score variance
    const totalScores = matrix.map(row => row.reduce((a, b) => a + b, 0));
    const totalVariance = variance(totalScores);

    if (totalVariance === 0) return 0;

    return (k / (k - 1)) * (1 - sumItemVariances / totalVariance);
}

/**
 * Standardized Cronbach's Alpha
 * Based on average inter-item correlation
 * 
 * Formula: α_std = (k × r̄) / (1 + (k-1) × r̄)
 */
export function standardizedAlpha(matrix: number[][]): number {
    const n = matrix.length;
    if (n < 2) return 0;
    const k = matrix[0]?.length || 0;
    if (k < 2) return 0;

    // Calculate average inter-item correlation
    let sumCorr = 0;
    let pairCount = 0;
    for (let i = 0; i < k; i++) {
        for (let j = i + 1; j < k; j++) {
            const xi = matrix.map(row => row[i]);
            const xj = matrix.map(row => row[j]);
            sumCorr += pearsonCorrelation(xi, xj);
            pairCount++;
        }
    }
    if (pairCount === 0) return 0;
    const avgCorr = sumCorr / pairCount;

    return (k * avgCorr) / (1 + (k - 1) * avgCorr);
}

/**
 * Split-Half Reliability
 * 
 * Splits items into odd/even groups, computes correlation,
 * then applies Spearman-Brown and Guttman corrections.
 */
export function splitHalf(matrix: number[][]): {
    rawCorrelation: number;
    spearmanBrown: number;
    guttman: number;
} {
    const n = matrix.length;
    const k = matrix[0]?.length || 0;
    if (n < 2 || k < 2) {
        return { rawCorrelation: 0, spearmanBrown: 0, guttman: 0 };
    }

    // Split into odd/even items
    const halfA: number[] = []; // scores for odd items per respondent
    const halfB: number[] = []; // scores for even items per respondent

    for (let i = 0; i < n; i++) {
        let sumA = 0, sumB = 0;
        for (let j = 0; j < k; j++) {
            if (j % 2 === 0) sumA += matrix[i][j];
            else sumB += matrix[i][j];
        }
        halfA.push(sumA);
        halfB.push(sumB);
    }

    const r = pearsonCorrelation(halfA, halfB);

    // Spearman-Brown correction: r_sb = (2×r) / (1+r)
    const spearmanBrown = (1 + Math.abs(r)) === 0 ? 0 : (2 * r) / (1 + r);

    // Guttman split-half: λ₂ = 2(1 - (σ²_A + σ²_B) / σ²_T)
    const varA = variance(halfA);
    const varB = variance(halfB);
    const totalScores = matrix.map(row => row.reduce((a, b) => a + b, 0));
    const varT = variance(totalScores);
    const guttman = varT === 0 ? 0 : 2 * (1 - (varA + varB) / varT);

    return {
        rawCorrelation: round(r),
        spearmanBrown: round(spearmanBrown),
        guttman: round(guttman),
    };
}

/**
 * Cronbach's Alpha if a specific item is deleted
 */
export function alphaIfItemDeleted(matrix: number[][], itemIndex: number): number {
    const reducedMatrix = matrix.map(row =>
        row.filter((_, j) => j !== itemIndex)
    );
    return cronbachAlpha(reducedMatrix);
}

/**
 * Corrected Item-Total Correlation
 * Correlation between the item and the total score MINUS that item.
 */
export function itemTotalCorrelation(matrix: number[][], itemIndex: number): number {
    const itemScores = matrix.map(row => row[itemIndex]);
    const correctedTotals = matrix.map(row =>
        row.reduce((a, b) => a + b, 0) - row[itemIndex]
    );
    return pearsonCorrelation(itemScores, correctedTotals);
}

// ============================================
// ADVANCED STATISTICS (EFA, CFA, MEDIATION)
// ============================================

/**
 * Simple Linear Regression (y = a + bx)
 */
export function linearRegression(x: number[], y: number[]): { 
    slope: number; 
    intercept: number; 
    r2: number; 
    stdError: number;
    t: number;
    p: number;
} {
    const n = Math.min(x.length, y.length);
    if (n < 2) return { slope: 0, intercept: 0, r2: 0, stdError: 0, t: 0, p: 1 };

    const mx = mean(x);
    const my = mean(y);

    let ssXX = 0, ssYY = 0, ssXY = 0;
    for (let i = 0; i < n; i++) {
        const dx = x[i] - mx;
        const dy = y[i] - my;
        ssXX += dx * dx;
        ssYY += dy * dy;
        ssXY += dx * dy;
    }

    const b = ssXX === 0 ? 0 : ssXY / ssXX;
    const a = my - b * mx;
    const r = pearsonCorrelation(x, y);
    const r2 = r * r;

    // Standard Error of Slope
    const ssRes = ssYY - b * ssXY;
    const s2 = ssRes / (n - 2);
    const stdError = Math.sqrt(s2 / ssXX);
    
    const t = stdError === 0 ? 0 : b / stdError;
    const p = pValueForT(t, n - 2);

    return { slope: b, intercept: a, r2, stdError, t, p };
}

/**
 * Sobel Test for Mediation
 * Z = (a * b) / sqrt(b² * sa² + a² * sb²)
 * where a = IV -> Med, b = Med -> DV (controlling for IV)
 */
export function sobelTest(iv: number[], mediator: number[], dv: number[]): { 
    z: number; 
    p: number; 
    isSignificant: boolean;
    a: number;
    sa: number;
    b: number;
    sb: number;
} {
    // 1. Regression: IV -> Mediator (Path a)
    const regA = linearRegression(iv, mediator);
    const a = regA.slope;
    const sa = regA.stdError;

    // 2. Regression: Mediator -> DV, controlling for IV (Path b)
    // To control for IV, we use residuals of DV ~ IV and Mediator ~ IV
    const resDV = iv.map((val, i) => dv[i] - linearRegression(iv, dv).slope * val);
    const resMed = iv.map((val, i) => mediator[i] - linearRegression(iv, mediator).slope * val);
    const regB = linearRegression(resMed, resDV);
    const b = regB.slope;
    const sb = regB.stdError;

    if (a === 0 && b === 0) return { z: 0, p: 1, isSignificant: false, a: 0, sa: 0, b: 0, sb: 0 };

    const denom = Math.sqrt(b * b * sa * sa + a * a * sb * sb);
    const z = (a * b) / denom;
    const p = 2 * (1 - normalCDF(Math.abs(z)));

    return { z, p, isSignificant: p < 0.05, a, sa, b, sb };
}

function normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
}

/**
 * Full PCA with eigenvalues, explained variance, and optional Varimax rotation.
 * Returns a rich result object for academic reporting.
 */
export interface PCAResult {
    /** Loadings matrix: items × components */
    loadings: number[][];
    /** Eigenvalues for each component (for scree plot) */
    eigenvalues: number[];
    /** Percentage of variance explained by each component */
    varianceExplained: number[];
    /** Cumulative variance explained */
    cumulativeVariance: number[];
    /** Total variance (sum of all eigenvalues = number of variables for correlation matrix) */
    totalVariance: number;
    /** Whether varimax rotation was applied */
    rotated: boolean;
    /** Rotation method used */
    rotationMethod: string;
}

export function pcaFull(
    matrix: number[][],
    componentsCount: number = 3,
    rotation: 'none' | 'varimax' = 'varimax',
    eigenvalueThreshold?: number
): PCAResult {
    const n = matrix.length;
    const k = matrix[0]?.length || 0;
    if (n < 2 || k < 2) return {
        loadings: [], eigenvalues: [], varianceExplained: [],
        cumulativeVariance: [], totalVariance: 0, rotated: false, rotationMethod: 'none'
    };

    // 1. Standardize columns
    const colData: number[][] = [];
    for (let j = 0; j < k; j++) {
        const col = matrix.map(row => row[j]);
        const m = mean(col);
        const s = stddev(col) || 1;
        colData.push(col.map(v => (v - m) / s));
    }

    // 2. Correlation matrix
    const corr: number[][] = [];
    for (let i = 0; i < k; i++) {
        corr[i] = [];
        for (let j = 0; j < k; j++) {
            corr[i][j] = pearsonCorrelation(colData[i], colData[j]);
        }
    }

    // 3. Extract eigenvalues and eigenvectors via power iteration + deflation
    const allEigenvalues: number[] = [];
    const allEigenvectors: number[][] = [];
    const workMatrix = corr.map(row => [...row]); // deep copy

    const maxComponents = Math.min(k, n - 1);
    for (let c = 0; c < maxComponents; c++) {
        let vec = new Array(k).fill(0).map(() => Math.random() - 0.5);
        let mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
        vec = vec.map(v => v / (mag || 1));

        let eigenvalue = 0;
        for (let iter = 0; iter < 100; iter++) {
            const nextVec = new Array(k).fill(0);
            for (let i = 0; i < k; i++) {
                for (let j = 0; j < k; j++) {
                    nextVec[i] += workMatrix[i][j] * vec[j];
                }
            }
            mag = Math.sqrt(nextVec.reduce((sum, v) => sum + v * v, 0));
            if (mag < 1e-10) break;
            vec = nextVec.map(v => v / mag);
            eigenvalue = mag;
        }

        allEigenvalues.push(eigenvalue);
        allEigenvectors.push(vec);

        // Deflate
        for (let i = 0; i < k; i++) {
            for (let j = 0; j < k; j++) {
                workMatrix[i][j] -= eigenvalue * vec[i] * vec[j];
            }
        }
    }

    // 4. Determine number of components to retain
    let retainCount = componentsCount;
    if (eigenvalueThreshold !== undefined) {
        retainCount = allEigenvalues.filter(ev => ev >= eigenvalueThreshold).length;
        retainCount = Math.max(1, Math.min(retainCount, maxComponents));
    }
    retainCount = Math.min(retainCount, maxComponents);

    const totalVariance = k; // sum of eigenvalues of correlation matrix = p
    const eigenvalues = allEigenvalues.slice(0, retainCount);
    const varianceExplained = eigenvalues.map(ev => round((ev / totalVariance) * 100, 2));
    const cumulativeVariance: number[] = [];
    let cumSum = 0;
    for (const ve of varianceExplained) {
        cumSum += ve;
        cumulativeVariance.push(round(cumSum, 2));
    }

    // 5. Build unrotated loadings (items × components)
    // Loading = eigenvector * sqrt(eigenvalue)
    let loadings: number[][] = [];
    for (let i = 0; i < k; i++) {
        loadings[i] = [];
        for (let c = 0; c < retainCount; c++) {
            loadings[i][c] = allEigenvectors[c][i] * Math.sqrt(allEigenvalues[c]);
        }
    }

    // 6. Apply Varimax rotation if requested
    let rotated = false;
    if (rotation === 'varimax' && retainCount > 1) {
        loadings = varimaxRotation(loadings, retainCount);
        rotated = true;
    }

    // Round loadings
    loadings = loadings.map(row => row.map(v => round(v, 3)));

    return {
        loadings,
        eigenvalues: allEigenvalues.map(ev => round(ev, 4)), // all eigenvalues for scree plot
        varianceExplained,
        cumulativeVariance,
        totalVariance,
        rotated,
        rotationMethod: rotation
    };
}

/**
 * Varimax rotation of a loading matrix.
 * Maximizes variance of squared loadings across factors.
 */
function varimaxRotation(loadings: number[][], nFactors: number, maxIter: number = 100, tol: number = 1e-6): number[][] {
    const p = loadings.length; // number of items
    // Deep copy
    let L = loadings.map(row => [...row]);

    for (let iter = 0; iter < maxIter; iter++) {
        let maxChange = 0;
        // Rotate each pair of factors
        for (let f1 = 0; f1 < nFactors - 1; f1++) {
            for (let f2 = f1 + 1; f2 < nFactors; f2++) {
                // Compute rotation angle
                let A = 0, B = 0, C = 0, D = 0;
                for (let i = 0; i < p; i++) {
                    const u = L[i][f1] * L[i][f1] - L[i][f2] * L[i][f2];
                    const v = 2 * L[i][f1] * L[i][f2];
                    A += u;
                    B += v;
                    C += u * u - v * v;
                    D += 2 * u * v;
                }
                const num = D - 2 * A * B / p;
                const den = C - (A * A - B * B) / p;
                const angle = 0.25 * Math.atan2(num, den);

                if (Math.abs(angle) < tol) continue;
                maxChange = Math.max(maxChange, Math.abs(angle));

                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);

                // Apply rotation
                for (let i = 0; i < p; i++) {
                    const l1 = L[i][f1];
                    const l2 = L[i][f2];
                    L[i][f1] = l1 * cosA + l2 * sinA;
                    L[i][f2] = -l1 * sinA + l2 * cosA;
                }
            }
        }
        if (maxChange < tol) break;
    }
    return L;
}

/** Backwards-compatible wrapper */
export function pcaLoadings(matrix: number[][], componentsCount = 3): number[][] {
    const result = pcaFull(matrix, componentsCount, 'none');
    return result.loadings;
}


// ============================================
// HELPERS
// ============================================

/** Round to N decimal places (default 4) */
export function round(value: number, decimals = 4): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

/**
 * Build an item-score matrix from responses and scale statements.
 * Handles reverse-scored items.
 * 
 * @returns 2D array [respondents][items] with only respondents who answered at least 1 item
 */
export function buildItemMatrix(
    responses: any[],
    statements: { id: string; isReversed?: boolean }[],
    maxOptionValue: number,
    minOptionValue: number
): number[][] {
    const matrix: number[][] = [];

    for (const resp of responses) {
        const row: number[] = [];
        let hasAnswer = false;

        for (const stmt of statements) {
            const rawVal = resp.answers?.[stmt.id];
            let val = (rawVal !== undefined && rawVal !== null) ? Number(rawVal) : 0;

            if (val > 0) {
                hasAnswer = true;
                // Apply reverse scoring
                if (stmt.isReversed) {
                    val = (maxOptionValue + minOptionValue) - val;
                }
            }
            row.push(val);
        }

        if (hasAnswer) {
            matrix.push(row);
        }
    }

    return matrix;
}

/**
 * Computes CFA Fit Indices based on Observed vs Implied Correlation Matrix
 */
export function computeCFAFitIndices(
    observedCorr: number[][],
    loadings: number[][],
    factorCorr: number[][],
    sampleSize: number
) {
    const p = observedCorr.length;
    const m = factorCorr.length;
    
    // 1. Calculate Implied Correlation Matrix: Sigma = L * Phi * L' + Psi
    const implied: number[][] = [];
    for (let i = 0; i < p; i++) {
        implied[i] = [];
        for (let j = 0; j < p; j++) {
            if (i === j) {
                implied[i][j] = 1.0;
            } else {
                let sum = 0;
                for (let k = 0; k < m; k++) {
                    for (let l = 0; l < m; l++) {
                        sum += loadings[i][k] * factorCorr[k][l] * loadings[j][l];
                    }
                }
                implied[i][j] = sum;
            }
        }
    }

    let residualSumSq = 0;
    for (let i = 0; i < p; i++) {
        for (let j = 0; j < p; j++) {
            const diff = observedCorr[i][j] - implied[i][j];
            residualSumSq += diff * diff;
        }
    }
    
    const srmr = Math.sqrt(residualSumSq / (p * (p + 1) || 1));
    const chiSquare = (sampleSize - 1) * (residualSumSq / 2);
    
    const q = p + (m * (m - 1)) / 2;
    const df = Math.max(1, (p * (p + 1)) / 2 - q);

    const rmsea = Math.sqrt(Math.max(0, (chiSquare - df) / (df * (sampleSize - 1) || 1)));

    const nullChiSquare = (sampleSize - 1) * (p * (p - 1) / 4);
    const nullDf = Math.max(1, (p * (p - 1)) / 2);

    const cfi = 1 - (Math.max(0, chiSquare - df) / Math.max(0, chiSquare - df, nullChiSquare - nullDf, 0.001));
    const tli = (nullChiSquare / nullDf - chiSquare / df) / (nullChiSquare / nullDf - 1 || 1);

    return {
        chiSquare: round(chiSquare, 2),
        df,
        pValue: round(1 - chiSquareDist(chiSquare, df), 4),
        rmsea: round(rmsea, 3),
        cfi: round(Math.min(1, cfi), 3),
        tli: round(Math.min(1, tli), 3),
        srmr: round(srmr, 3)
    };
}

function chiSquareDist(x: number, df: number): number {
    if (x <= 0 || df <= 0) return 0;
    const z = (Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
    return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

function erf(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
}

/**
 * Inverts a square matrix using Gauss-Jordan elimination
 * Also returns the determinant of the matrix.
 */
export function invertMatrix(matrix: number[][]): {
    inverse: number[][] | null;
    determinant: number;
} {
    const n = matrix.length;
    const augmented: number[][] = [];
    for (let i = 0; i < n; i++) {
        augmented[i] = [];
        for (let j = 0; j < 2 * n; j++) {
            if (j < n) {
                augmented[i][j] = matrix[i][j];
            } else {
                augmented[i][j] = (j - n === i) ? 1.0 : 0.0;
            }
        }
    }

    let det = 1.0;

    for (let i = 0; i < n; i++) {
        let pivotRow = i;
        for (let r = i + 1; r < n; r++) {
            if (Math.abs(augmented[r][i]) > Math.abs(augmented[pivotRow][i])) {
                pivotRow = r;
            }
        }

        if (Math.abs(augmented[pivotRow][i]) < 1e-12) {
            return { inverse: null, determinant: 0 };
        }

        if (pivotRow !== i) {
            const temp = augmented[i];
            augmented[i] = augmented[pivotRow];
            augmented[pivotRow] = temp;
            det *= -1.0;
        }

        const pivotVal = augmented[i][i];
        det *= pivotVal;

        for (let j = 0; j < 2 * n; j++) {
            augmented[i][j] /= pivotVal;
        }

        for (let r = 0; r < n; r++) {
            if (r !== i) {
                const factor = augmented[r][i];
                for (let j = 0; j < 2 * n; j++) {
                    augmented[r][j] -= factor * augmented[i][j];
                }
            }
        }
    }

    const inverse: number[][] = [];
    for (let i = 0; i < n; i++) {
        inverse[i] = [];
        for (let j = 0; j < n; j++) {
            inverse[i][j] = augmented[i][j + n];
        }
    }

    return { inverse, determinant: det };
}

/**
 * Calculates KMO (Kaiser-Meyer-Olkin) and Bartlett's Test of Sphericity
 */
export function calculateKMOAndBartlett(
    itemMatrix: number[][],
    statementsCount: number
): {
    kmo: number;
    bartlett: {
        chiSquare: number;
        df: number;
        pValue: number;
    } | null;
} {
    const N = itemMatrix.length;
    const p = statementsCount;
    if (N < 10 || p < 3) return { kmo: 0, bartlett: null };

    const corr: number[][] = [];
    for (let i = 0; i < p; i++) {
        corr[i] = [];
        for (let j = 0; j < p; j++) {
            if (i === j) {
                corr[i][j] = 1.0;
            } else {
                const colI = itemMatrix.map(row => row[i]);
                const colJ = itemMatrix.map(row => row[j]);
                corr[i][j] = pearsonCorr(colI, colJ);
            }
        }
    }

    function pearsonCorr(x: number[], y: number[]): number {
        const n = x.length;
        const meanX = x.reduce((a, b) => a + b, 0) / n;
        const meanY = y.reduce((a, b) => a + b, 0) / n;
        let num = 0, denX = 0, denY = 0;
        for (let i = 0; i < n; i++) {
            const dx = x[i] - meanX;
            const dy = y[i] - meanY;
            num += dx * dy;
            denX += dx * dx;
            denY += dy * dy;
        }
        if (denX === 0 || denY === 0) return 0;
        return num / Math.sqrt(denX * denY);
    }

    const { inverse, determinant } = invertMatrix(corr);

    let bartlett = null;
    if (determinant > 0) {
        const df = (p * (p - 1)) / 2;
        const multiplier = N - 1 - (2 * p + 5) / 6;
        const chiSquare = -multiplier * Math.log(determinant);
        const pValue = 1 - chiSquareDist(chiSquare, df);
        bartlett = {
            chiSquare: round(chiSquare, 3),
            df,
            pValue: round(Math.max(0, pValue), 4)
        };
    }

    let kmo = 0;
    if (inverse) {
        let sumR2 = 0;
        let sumQ2 = 0;
        for (let i = 0; i < p; i++) {
            for (let j = 0; j < p; j++) {
                if (i !== j) {
                    const rij = corr[i][j];
                    sumR2 += rij * rij;

                    const qij = -inverse[i][j] / Math.sqrt(inverse[i][i] * inverse[j][j]);
                    sumQ2 += qij * qij;
                }
            }
        }
        if (sumR2 + sumQ2 > 0) {
            kmo = sumR2 / (sumR2 + sumQ2);
        }
    }

    return {
        kmo: round(kmo, 3),
        bartlett
    };
}
