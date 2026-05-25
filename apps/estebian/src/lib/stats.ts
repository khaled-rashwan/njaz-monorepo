/**
 * Psychometric & Descriptive Statistics Utilities (Client-Side)
 * 
 * Ported and extended from backend engine to support real-time
 * browser-side simulations and data cleaning.
 */

export function mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function variance(arr: number[]): number {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1);
}

export function stddev(arr: number[]): number {
    return Math.sqrt(variance(arr));
}

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

export function cronbachAlpha(matrix: number[][]): number {
    const n = matrix.length; // respondents
    if (n < 2) return 0;
    const k = matrix[0]?.length || 0; // items
    if (k < 2) return 0;

    let sumItemVariances = 0;
    for (let j = 0; j < k; j++) {
        const itemScores = matrix.map(row => row[j]);
        sumItemVariances += variance(itemScores);
    }

    const totalScores = matrix.map(row => row.reduce((a, b) => a + b, 0));
    const totalVariance = variance(totalScores);

    if (totalVariance === 0) return 0;

    const alpha = (k / (k - 1)) * (1 - sumItemVariances / totalVariance);
    return Math.max(0, Math.min(1, alpha)); // Clamp between 0 and 1
}

export function alphaIfItemDeleted(matrix: number[][], itemIndex: number): number {
    const reducedMatrix = matrix.map(row =>
        row.filter((_, j) => j !== itemIndex)
    );
    return cronbachAlpha(reducedMatrix);
}

export function itemTotalCorrelation(matrix: number[][], itemIndex: number): number {
    const itemScores = matrix.map(row => row[itemIndex]);
    const correctedTotals = matrix.map(row =>
        row.reduce((a, b) => a + b, 0) - row[itemIndex]
    );
    return pearsonCorrelation(itemScores, correctedTotals);
}

/**
 * Builds a column score matrix for a set of statements.
 * Handles reverse-scoring dynamically.
 */
export function buildItemMatrix(
    responses: any[],
    statements: { id: string; isReversed?: boolean }[],
    maxVal = 5,
    minVal = 1
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
                if (stmt.isReversed) {
                    val = (maxVal + minVal) - val;
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
 * Data Cleaning Algorithms
 */

// Straight-lining check: standard deviation of item scores inside a scale is 0.
export function hasStraightLining(row: number[]): boolean {
    if (row.length < 3) return false;
    const s = stddev(row);
    return s === 0;
}

// Continuous repeating pattern check (e.g. 5,4,3,2,1 or 1,2,3,4,5 or alternating)
export function hasPatternedResponses(row: number[]): boolean {
    if (row.length < 5) return false;
    
    // Check 1: Repeating ascents/descents (e.g. 1,2,3,4,5)
    let ascCount = 0;
    let descCount = 0;
    
    for (let i = 1; i < row.length; i++) {
        const diff = row[i] - row[i - 1];
        if (diff === 1) {
            ascCount++;
            descCount = 0;
        } else if (diff === -1) {
            descCount++;
            ascCount = 0;
        } else {
            ascCount = 0;
            descCount = 0;
        }
        
        if (ascCount >= 4 || descCount >= 4) {
            return true; // Ascent or descent of 5 elements
        }
    }
    
    // Check 2: Alternating pattern (e.g. 5,1,5,1,5 or 4,2,4,2,4)
    if (row.length >= 6) {
        let isAlternating = true;
        const diff1 = row[2] - row[0];
        const diff2 = row[3] - row[1];
        if (diff1 === 0 && diff2 === 0 && row[0] !== row[1]) {
            for (let i = 4; i < row.length; i++) {
                if (row[i] !== row[i - 2]) {
                    isAlternating = false;
                    break;
                }
            }
            if (isAlternating) return true;
        }
    }
    
    return false;
}
