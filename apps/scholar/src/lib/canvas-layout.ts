/**
 * Canvas Layout Persistence
 *
 * Serializes/deserializes the React Flow node positions and research blocks
 * to/from the master document's metadata field, allowing the canvas
 * to remember user-arranged positions across sessions.
 */

import { ResearchBlockData, CanvasLayout } from '@/types';

/** Default empty layout */
export function emptyCanvasLayout(): CanvasLayout {
    return {
        nodePositions: [],
        researchBlocks: [],
    };
}

/** Merge saved positions into calculated node positions (saved positions win) */
export function applyNodePositions(
    calculatedNodes: { id: string; position: { x: number; y: number } }[],
    savedPositions: CanvasLayout['nodePositions']
): { id: string; position: { x: number; y: number } }[] {
    const posMap = new Map(savedPositions.map(p => [p.id, p.position]));
    return calculatedNodes.map(node => ({
        ...node,
        position: posMap.get(node.id) || node.position,
    }));
}

/** Extract only the positions array from a list of React Flow nodes */
export function extractNodePositions(
    nodes: { id: string; position: { x: number; y: number } }[]
): CanvasLayout['nodePositions'] {
    return nodes.map(n => ({ id: n.id, position: { ...n.position } }));
}

/**
 * Parse a canvas layout from a document's metadata JSON.
 * Returns a default layout if the field is missing or invalid.
 */
export function parseCanvasLayout(metadata: Record<string, any> | undefined | null): CanvasLayout {
    if (!metadata?.canvasLayout) return emptyCanvasLayout();
    try {
        const layout = typeof metadata.canvasLayout === 'string'
            ? JSON.parse(metadata.canvasLayout)
            : metadata.canvasLayout;
        return {
            nodePositions: Array.isArray(layout.nodePositions) ? layout.nodePositions : [],
            researchBlocks: Array.isArray(layout.researchBlocks) ? layout.researchBlocks : [],
        };
    } catch {
        return emptyCanvasLayout();
    }
}

/** Produce a research block for the canvas from minimal inputs */
export function createResearchBlockData(
    id: string,
    type: ResearchBlockData['type'],
    title: string,
    projectId: string,
    content: any = {}
): ResearchBlockData {
    return {
        id,
        type,
        title,
        content,
        projectId,
        createdAt: new Date().toISOString(),
    };
}
