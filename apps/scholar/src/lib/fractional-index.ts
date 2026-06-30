/**
 * Fractional Indexing for Block Ordering
 * 
 * Enables drag-and-drop reordering without rewriting sibling rows.
 * Each block has a float `orderIndex`. When inserting between two blocks,
 * we compute the midpoint. This avoids O(n) updates on reorder.
 * 
 * Precision: JavaScript floats have ~15 significant digits.
 * After ~50 bisections between two values, we may need to rebalance.
 */

const DEFAULT_GAP = 1.0;
const MIN_GAP = 0.00001;

/**
 * Generate an orderIndex for a new block inserted between two existing blocks.
 */
export function generateOrderBetween(
    before: number | null,
    after: number | null
): number {
    if (before === null && after === null) {
        return DEFAULT_GAP;
    }
    if (before === null) {
        return after! / 2;
    }
    if (after === null) {
        return before + DEFAULT_GAP;
    }
    return (before + after) / 2;
}

/**
 * Generate an orderIndex for appending a block at the end.
 */
export function generateOrderAtEnd(blocks: { orderIndex: number }[]): number {
    if (blocks.length === 0) {
        return DEFAULT_GAP;
    }
    const maxOrder = Math.max(...blocks.map(b => b.orderIndex));
    return maxOrder + DEFAULT_GAP;
}

/**
 * Generate an orderIndex for prepending a block at the start.
 */
export function generateOrderAtStart(blocks: { orderIndex: number }[]): number {
    if (blocks.length === 0) {
        return DEFAULT_GAP;
    }
    const minOrder = Math.min(...blocks.map(b => b.orderIndex));
    return minOrder / 2;
}

/**
 * Generate an orderIndex for inserting a block after a specific block.
 */
export function generateOrderAfter(
    targetBlock: { orderIndex: number },
    sortedBlocks: { orderIndex: number }[]
): number {
    const targetIdx = sortedBlocks.findIndex(
        b => b.orderIndex === targetBlock.orderIndex
    );

    if (targetIdx === -1) {
        return generateOrderAtEnd(sortedBlocks);
    }

    // If it's the last block, append after it
    if (targetIdx === sortedBlocks.length - 1) {
        return targetBlock.orderIndex + DEFAULT_GAP;
    }

    // Otherwise, midpoint between target and next
    const nextBlock = sortedBlocks[targetIdx + 1];
    return (targetBlock.orderIndex + nextBlock.orderIndex) / 2;
}

/**
 * Check if blocks need rebalancing (gaps too small).
 * Returns true if any adjacent pair has a gap smaller than MIN_GAP.
 */
export function needsRebalancing(sortedBlocks: { orderIndex: number }[]): boolean {
    for (let i = 0; i < sortedBlocks.length - 1; i++) {
        const gap = sortedBlocks[i + 1].orderIndex - sortedBlocks[i].orderIndex;
        if (gap < MIN_GAP) {
            return true;
        }
    }
    return false;
}

/**
 * Rebalance all block orderIndexes with even spacing.
 * Returns new orderIndex values mapped by array index.
 */
export function rebalanceOrders(count: number): number[] {
    return Array.from({ length: count }, (_, i) => (i + 1) * DEFAULT_GAP);
}

/**
 * Sort blocks by orderIndex.
 */
export function sortByOrder<T extends { orderIndex: number }>(blocks: T[]): T[] {
    return [...blocks].sort((a, b) => a.orderIndex - b.orderIndex);
}
