/**
 * Cross-Reference Engine
 * 
 * Parses [[ref:uuid]] tags in block content and resolves them
 * to human-readable counters like "Figure 3", "Table 1", "Equation 7".
 * 
 * Counter is calculated based on the block's orderIndex relative to
 * all other blocks of the same type.
 */

import { ScholarBlock, BlockType } from '@/types';
import { sortByOrder } from './fractional-index';
import { useEditorStore } from '@/store/editor-store';

// Pattern to match cross-reference tags (including comma-separated lists of IDs)
const REF_PATTERN = /\[\[ref:([a-f0-9-,\s]+)\]\]/g;

// Human-readable labels for block types (singular & plural)
const TYPE_LABELS: Partial<Record<BlockType, { singular: { en: string; ar: string }; plural: { en: string; ar: string } }>> = {
    FIGURE: {
        singular: { en: 'Figure', ar: 'شكل' },
        plural: { en: 'Figures', ar: 'الأشكال' }
    },
    TABLE: {
        singular: { en: 'Table', ar: 'جدول' },
        plural: { en: 'Tables', ar: 'الجداول' }
    },
    EQUATION: {
        singular: { en: 'Equation', ar: 'معادلة' },
        plural: { en: 'Equations', ar: 'المعادلات' }
    },
    CODE: {
        singular: { en: 'Code', ar: 'كود' },
        plural: { en: 'Code', ar: 'أكواد' }
    },
    HEADING: {
        singular: { en: 'Section', ar: 'قسم' },
        plural: { en: 'Sections', ar: 'أقسام' }
    },
};

/**
 * Build a map of blockId → counter number for each block type.
 * e.g., The 3rd TABLE block in order gets counter 3.
 */
export function buildCounterMap(
    blocks: ScholarBlock[]
): Map<string, { type: BlockType; counter: number }> {
    const sorted = sortByOrder(blocks);
    const counterMap = new Map<string, { type: BlockType; counter: number }>();
    const typeCounters: Partial<Record<BlockType, number>> = {};

    for (const block of sorted) {
        const type = block.type;
        if (TYPE_LABELS[type] || type === 'REFERENCE') {
            typeCounters[type] = (typeCounters[type] || 0) + 1;
            counterMap.set(block.id, { type, counter: typeCounters[type]! });
        }
    }

    return counterMap;
}

/**
 * Convert a number to Roman numerals.
 */
export function toRoman(num: number): string {
    const romanMap: [number, string][] = [
        [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
        [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
        [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let result = '';
    let remaining = num;
    for (const [value, symbol] of romanMap) {
        while (remaining >= value) {
            result += symbol;
            remaining -= value;
        }
    }
    return result;
}

/**
 * Collapses consecutive integers into range formatting (e.g. 21-23, 25).
 */
export function formatRangeNumbers(numbers: number[]): string {
    if (numbers.length === 0) return '';
    const uniqueSorted = Array.from(new Set(numbers)).sort((a, b) => a - b);
    
    const parts: string[] = [];
    let i = 0;
    
    while (i < uniqueSorted.length) {
        let j = i;
        while (j + 1 < uniqueSorted.length && uniqueSorted[j + 1] === uniqueSorted[j] + 1) {
            j++;
        }
        
        const count = j - i + 1;
        if (count >= 3) {
            parts.push(`${uniqueSorted[i]}-${uniqueSorted[j]}`);
        } else {
            for (let k = i; k <= j; k++) {
                parts.push(uniqueSorted[k].toString());
            }
        }
        i = j + 1;
    }
    
    return parts.join(', ');
}

/**
 * Collapses adjacent citation brackets (e.g. [21] [22] [23] -> [21-23]).
 */
export function collapseAdjacentBrackets(text: string): string {
    let prevText = '';
    let currentText = text;
    
    while (currentText !== prevText) {
        prevText = currentText;
        currentText = currentText.replace(/\[([0-9-,\s]+)\](?:\s*,\s*|\s+)?\[([0-9-,\s]+)\]/g, (match, grp1, grp2) => {
            const numbers: number[] = [];
            const parseNums = (s: string) => {
                s.split(/[\s,]+/).forEach(part => {
                    if (part.includes('-')) {
                        const [start, end] = part.split('-').map(x => parseInt(x, 10));
                        if (!isNaN(start) && !isNaN(end)) {
                            for (let n = start; n <= end; n++) {
                                numbers.push(n);
                            }
                        }
                    } else {
                        const n = parseInt(part, 10);
                        if (!isNaN(n)) {
                            numbers.push(n);
                        }
                    }
                });
            };
            parseNums(grp1);
            parseNums(grp2);
            
            if (numbers.length > 0) {
                return `[${formatRangeNumbers(numbers)}]`;
            }
            return match;
        });
    }
    
    return currentText;
}

/**
 * Resolve a single [[ref:uuid]] (or [[ref:id1,id2]]) tag to its display text.
 */
export function resolveRef(
    blockId: string,
    counterMap: Map<string, { type: BlockType; counter: number }>,
    language: 'en' | 'ar' = 'en'
): string {
    if (blockId.includes(',')) {
        const ids = blockId.split(',').map(id => id.trim()).filter(Boolean);
        const entries = ids.map(id => ({ id, entry: counterMap.get(id) })).filter(item => item.entry !== undefined);
        
        if (entries.length === 0) return `[??]`;

        // Group by type
        const typeGroups = new Map<BlockType, { id: string; counter: number }[]>();
        for (const item of entries) {
            const t = item.entry!.type;
            if (!typeGroups.has(t)) {
                typeGroups.set(t, []);
            }
            typeGroups.get(t)!.push({ id: item.id, counter: item.entry!.counter });
        }

        const formattedGroups: string[] = [];

        Array.from(typeGroups.entries()).forEach(([type, items]) => {
            if (type === 'REFERENCE') {
                const refNums = items.map(i => i.counter);
                formattedGroups.push(`[${formatRangeNumbers(refNums)}]`);
                return;
            }

            const labelConfig = TYPE_LABELS[type];
            if (!labelConfig) {
                formattedGroups.push(...items.map(i => resolveRef(i.id, counterMap, language)));
                return;
            }

            if (items.length === 1) {
                formattedGroups.push(resolveRef(items[0].id, counterMap, language));
                return;
            }

            // Multiple items of the same type (e.g. EQUATION, FIGURE, TABLE)
            const prefix = language === 'ar' ? labelConfig.plural.ar : labelConfig.plural.en;
            const uniqueSortedNums = Array.from(new Set(items.map(i => i.counter))).sort((a, b) => a - b);
            
            // Format numbers: 2 numbers -> "6 and 7", 3+ consecutive -> "6–8", non-consecutive -> "6, 7 and 9"
            let numStr = '';
            if (uniqueSortedNums.length === 2) {
                numStr = `${uniqueSortedNums[0]} and ${uniqueSortedNums[1]}`;
            } else {
                numStr = formatRangeNumbers(uniqueSortedNums).replace(/, ([^,]+)$/, ' and $1');
            }

            formattedGroups.push(`${prefix} ${numStr}`);
        });

        return formattedGroups.join(', ');
    }

    const entry = counterMap.get(blockId);
    if (!entry) {
        return `[??]`;
    }
    if (entry.type === 'REFERENCE') {
        return `[${entry.counter}]`;
    }
    const label = TYPE_LABELS[entry.type];
    if (!label) {
        return `[${entry.counter}]`;
    }
    const singularLabel = language === 'ar' ? label.singular.ar : label.singular.en;
    if (entry.type === 'HEADING') {
        try {
            const state = useEditorStore.getState();
            const allBlocks = state.blocks || [];
            const docObj = state.document;
            const headingStyles = docObj?.metadata?.headingStyles;
            const headingNumbers = calculateHeadingNumbers(allBlocks, headingStyles);
            
            const headingBlock = allBlocks.find(b => b.id === blockId);
            if (headingBlock) {
                const level = headingBlock.content?.level || 2;
                const selfPrefix = headingNumbers.get(blockId);
                
                if (selfPrefix && selfPrefix.trim()) {
                    let formattedCounter = selfPrefix.trim().replace(/\.$/, '');
                    
                    // If it is a sub-section (level > 1), prepend the parent level 1 heading prefix if not already present
                    if (level > 1) {
                        const sortedBlocks = [...allBlocks].sort((a, b) => a.orderIndex - b.orderIndex);
                        const headingIdx = sortedBlocks.findIndex(b => b.id === blockId);
                        
                        // Find the closest preceding Heading 1
                        let parentHeading1 = null;
                        for (let i = headingIdx - 1; i >= 0; i--) {
                            if (sortedBlocks[i].type === 'HEADING' && sortedBlocks[i].content?.level === 1) {
                                parentHeading1 = sortedBlocks[i];
                                break;
                            }
                        }
                        
                        if (parentHeading1) {
                            const parentPrefix = headingNumbers.get(parentHeading1.id);
                            if (parentPrefix && parentPrefix.trim()) {
                                const parentClean = parentPrefix.trim().replace(/\.$/, '');
                                if (!formattedCounter.startsWith(parentClean)) {
                                    formattedCounter = `${parentClean}-${formattedCounter}`;
                                }
                            }
                        }
                    }
                    return `${singularLabel} ${formattedCounter}`;
                }
            }
        } catch (e) {
            console.error("Failed to calculate heading number for cross reference:", e);
        }
        
        // Fallback
        const state = useEditorStore.getState();
        const headingBlock = state.blocks?.find(b => b.id === blockId);
        const level = headingBlock?.content?.level || 1;
        const formattedCounter = level === 1 ? toRoman(entry.counter) : entry.counter.toString();
        return `${singularLabel} ${formattedCounter}`;
    }

    const formattedCounter = entry.counter.toString();
    return `${singularLabel} ${formattedCounter}`;
}

/**
 * Replace all [[ref:uuid]] tags in a string with resolved references.
 */
export function resolveAllRefs(
    text: string,
    counterMap: Map<string, { type: BlockType; counter: number }>,
    language: 'en' | 'ar' = 'en'
): string {
    let resolved = text.replace(REF_PATTERN, (_, blockId) => {
        return resolveRef(blockId, counterMap, language);
    });

    resolved = collapseAdjacentBrackets(resolved);
    return resolved;
}

/**
 * Extract all [[ref:uuid]] block IDs from a string.
 */
export function extractRefIds(text: string): string[] {
    const ids: string[] = [];
    let match;
    const pattern = new RegExp(REF_PATTERN.source, 'g');
    while ((match = pattern.exec(text)) !== null) {
        ids.push(match[1]);
    }
    return ids;
}

/**
 * Find all blocks that reference a given block ID.
 */
export function findReferencingBlocks(
    targetBlockId: string,
    blocks: ScholarBlock[]
): ScholarBlock[] {
    return blocks.filter(block => {
        const content = block.content;
        if (!content) return false;
        const text = typeof content === 'string' ? content : JSON.stringify(content);
        return text.includes(`[[ref:${targetBlockId}]]`);
    });
}

/**
 * Convert a number to alphabetical string (A, B, C... Z, AA, AB...).
 */
export function toAlphaUpper(num: number): string {
    let result = '';
    let temp = num - 1;
    while (temp >= 0) {
        result = String.fromCharCode((temp % 26) + 65) + result;
        temp = Math.floor(temp / 26) - 1;
    }
    return result || 'A';
}

/**
 * Format heading counter based on configured style.
 */
export function formatHeadingCounter(counter: number, style: string): string {
    switch (style) {
        case 'numeric':
            return `${counter}.`;
        case 'alpha-upper':
            return `${toAlphaUpper(counter)}.`;
        case 'alpha-lower':
            return `${toAlphaUpper(counter).toLowerCase()}.`;
        case 'roman-upper':
            return `${toRoman(counter)}.`;
        case 'roman-lower':
            return `${toRoman(counter).toLowerCase()}.`;
        case 'bullet':
            return '•';
        default:
            return '';
    }
}

/**
 * Calculate hierarchical heading numbers for all HEADING blocks.
 * Restarts sub-counters whenever a parent level heading changes (e.g. H2 restarts on H1).
 */
export function calculateHeadingNumbers(
    blocks: ScholarBlock[],
    styles?: Record<number, string>
): Map<string, string> {
    const sorted = sortByOrder(blocks);
    const headingNumbers = new Map<string, string>();
    const counters = [0, 0, 0, 0, 0, 0, 0]; // 1-indexed

    const headingStyles = styles || {
        1: 'none',
        2: 'none',
        3: 'none',
        4: 'none',
        5: 'none',
        6: 'none',
    };

    for (const block of sorted) {
        if (block.type === 'HEADING' && block.content) {
            const level = block.content.level || 2;
            counters[level] = (counters[level] || 0) + 1;
            // Reset all sub-levels (e.g. H2 resets H3-H6)
            for (let i = level + 1; i <= 6; i++) {
                counters[i] = 0;
            }

            const style = headingStyles[level] || 'none';
            if (style === 'none') {
                headingNumbers.set(block.id, '');
                continue;
            }

            if (style === 'hierarchical') {
                const parts: string[] = [];
                for (let i = 1; i <= level; i++) {
                    const parentStyle = headingStyles[i] || 'none';
                    if (parentStyle !== 'none') {
                        parts.push(counters[i].toString());
                    }
                }
                if (parts.length === 0) {
                    parts.push(counters[level].toString());
                }
                headingNumbers.set(block.id, parts.join('.') + '.');
            } else {
                headingNumbers.set(block.id, formatHeadingCounter(counters[level], style));
            }
        }
    }
    return headingNumbers;
}

/**
 * Filter blocks list to only include blocks belonging to sections mapped to a document.
 */
export function filterBlocksForDocument(
    allBlocks: ScholarBlock[],
    document: { metadata?: Record<string, any> } | null
): ScholarBlock[] {
    if (!document) return [];
    const connectedSections = document.metadata?.sections;
    
    if (!connectedSections || !Array.isArray(connectedSections)) {
        return sortByOrder(allBlocks);
    }
    
    const sorted = sortByOrder(allBlocks);
    const sectionMap = new Map<string, ScholarBlock[]>();
    const prefixBlocks: ScholarBlock[] = [];
    const referenceBlocks: ScholarBlock[] = [];
    
    let currentSectionId: string | null = null;
    
    for (const block of sorted) {
        if (block.type === 'REFERENCE') {
            referenceBlocks.push(block);
            continue;
        }
        
        if (block.type === 'HEADING' && block.content?.level === 1) {
            currentSectionId = block.id;
            sectionMap.set(currentSectionId, [block]);
        } else {
            if (currentSectionId) {
                const list = sectionMap.get(currentSectionId) || [];
                list.push(block);
                sectionMap.set(currentSectionId, list);
            } else {
                prefixBlocks.push(block);
            }
        }
    }
    
    const filtered: ScholarBlock[] = [...prefixBlocks];
    
    for (const sectionId of connectedSections) {
        const blocksInSection = sectionMap.get(sectionId);
        if (blocksInSection) {
            filtered.push(...blocksInSection);
        }
    }
    
    filtered.push(...referenceBlocks);
    return filtered;
}
