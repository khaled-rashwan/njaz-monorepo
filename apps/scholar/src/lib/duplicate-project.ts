import { client } from './amplify-client';
import { v4 as uuidv4 } from 'uuid';
import { ScholarBlock, ScholarDocument, ScholarLiteratureItem } from '@/types';

/**
 * Deep clones a Scholar Project including:
 * 1. ScholarProject record (with new ID and optional title suffix)
 * 2. All ScholarDocument records
 * 3. All ScholarBlock records (with IDs remapped, and reference blocks updated to point to new literature item IDs)
 * 4. All ScholarLiteratureItem records
 * 5. Canvas layout metadata (with node positions and research blocks preserved)
 *
 * @param sourceProjectId ID of the project to duplicate
 * @param customTitle Optional custom title for the duplicate
 * @returns The newly created project ID
 */
export async function duplicateScholarProject(
    sourceProjectId: string,
    customTitle?: string
): Promise<string> {
    // 1. Fetch source project
    const { data: sourceProject, errors: projErrors } = await client.models.ScholarProject.get({ id: sourceProjectId });
    if (projErrors || !sourceProject) {
        throw new Error(projErrors?.[0]?.message || 'Source project not found');
    }

    const newProjectId = uuidv4();
    const newProjectTitle = customTitle || `${sourceProject.title} (Copy)`;

    // 2. Fetch all documents for this project
    let allDocs: any[] = [];
    let docNextToken: string | null | undefined = null;
    do {
        const { data: docsPage, nextToken, errors }: any = await client.models.ScholarDocument.list({
            filter: { projectId: { eq: sourceProjectId } },
            nextToken: docNextToken || undefined,
            limit: 1000,
        });
        if (errors) {
            throw new Error(errors[0]?.message || 'Failed to list project documents');
        }
        if (docsPage) {
            allDocs = [...allDocs, ...docsPage];
        }
        docNextToken = nextToken;
    } while (docNextToken);

    // 3. Fetch all literature items for this project
    let allLitItems: any[] = [];
    let litNextToken: string | null | undefined = null;
    do {
        const { data: litPage, nextToken, errors }: any = await client.models.ScholarLiteratureItem.list({
            filter: { projectId: { eq: sourceProjectId } },
            nextToken: litNextToken || undefined,
            limit: 1000,
        });
        if (errors) {
            throw new Error(errors[0]?.message || 'Failed to list project literature');
        }
        if (litPage) {
            allLitItems = [...allLitItems, ...litPage];
        }
        litNextToken = nextToken;
    } while (litNextToken);

    // Map old literature ID -> new literature ID
    const litIdMap = new Map<string, string>();
    const clonedLiteraturePayloads: any[] = allLitItems.map((item) => {
        const newLitId = uuidv4();
        litIdMap.set(item.id, newLitId);
        return {
            id: newLitId,
            projectId: newProjectId,
            source: item.source,
            externalId: item.externalId || undefined,
            title: item.title,
            authors: typeof item.authors === 'string' ? item.authors : (item.authors ? JSON.stringify(item.authors) : undefined),
            year: item.year || undefined,
            journal: item.journal || undefined,
            abstract: item.abstract || undefined,
            citationCount: item.citationCount || undefined,
            doi: item.doi || undefined,
            url: item.url || undefined,
            fullMetadata: typeof item.fullMetadata === 'string' ? item.fullMetadata : (item.fullMetadata ? JSON.stringify(item.fullMetadata) : undefined),
            tags: item.tags || undefined,
            notes: item.notes || undefined,
        };
    });

    // Map old document ID -> new document ID
    const docIdMap = new Map<string, string>();
    // Map old block ID -> new block ID (needed if sections metadata references block IDs)
    const blockIdMap = new Map<string, string>();

    // 4. For each document, fetch its blocks
    const docBlocksMap = new Map<string, any[]>();
    for (const doc of allDocs) {
        const newDocId = uuidv4();
        docIdMap.set(doc.id, newDocId);

        let docBlocks: any[] = [];
        let blockNextToken: string | null | undefined = null;
        do {
            const { data: blocksPage, nextToken, errors }: any = await client.models.ScholarBlock.list({
                filter: { documentId: { eq: doc.id } },
                nextToken: blockNextToken || undefined,
                limit: 1000,
            });
            if (errors) {
                throw new Error(errors[0]?.message || `Failed to fetch blocks for document ${doc.id}`);
            }
            if (blocksPage) {
                docBlocks = [...docBlocks, ...blocksPage];
            }
            blockNextToken = nextToken;
        } while (blockNextToken);

        docBlocksMap.set(doc.id, docBlocks);
        docBlocks.forEach((b) => {
            blockIdMap.set(b.id, uuidv4());
        });
    }

    // 5. Create new ScholarProject
    const { errors: createProjErrors } = await client.models.ScholarProject.create({
        id: newProjectId,
        title: newProjectTitle,
        description: sourceProject.description || undefined,
    });
    if (createProjErrors) {
        throw new Error(createProjErrors[0]?.message || 'Failed to create duplicate project');
    }

    // 6. Create cloned Literature items in parallel batches
    const BATCH_SIZE = 10;
    for (let i = 0; i < clonedLiteraturePayloads.length; i += BATCH_SIZE) {
        const batch = clonedLiteraturePayloads.slice(i, i + BATCH_SIZE);
        await Promise.all(
            batch.map((payload) => client.models.ScholarLiteratureItem.create(payload))
        );
    }

    // 7. Create cloned Documents and their Blocks
    for (const oldDoc of allDocs) {
        const newDocId = docIdMap.get(oldDoc.id)!;
        const oldBlocks = docBlocksMap.get(oldDoc.id) || [];

        // Parse and remap metadata (e.g. sections list, canvasLayout)
        let parsedMeta: any = {};
        if (oldDoc.metadata) {
            try {
                parsedMeta = typeof oldDoc.metadata === 'string'
                    ? JSON.parse(oldDoc.metadata)
                    : { ...oldDoc.metadata };
            } catch {
                parsedMeta = {};
            }
        }

        // Remap sections if present
        if (Array.isArray(parsedMeta.sections)) {
            parsedMeta.sections = parsedMeta.sections.map(
                (secId: string) => blockIdMap.get(secId) || secId
            );
        }

        // Remap canvas layout if present in master document
        if (parsedMeta.canvasLayout) {
            try {
                const layout = typeof parsedMeta.canvasLayout === 'string'
                    ? JSON.parse(parsedMeta.canvasLayout)
                    : parsedMeta.canvasLayout;

                if (layout && typeof layout === 'object') {
                    // Update projectId, literature references, and block connections for researchBlocks
                    if (Array.isArray(layout.researchBlocks)) {
                        layout.researchBlocks = layout.researchBlocks.map((rb: any) => {
                            let updatedRb = { ...rb, projectId: newProjectId };

                            // Remap paper IDs inside reference collections or search results
                            if (updatedRb.content && typeof updatedRb.content === 'object') {
                                let updatedContent = { ...updatedRb.content };
                                if (Array.isArray(updatedContent.papers)) {
                                    updatedContent.papers = updatedContent.papers.map((p: any) => {
                                        if (p?.id && litIdMap.has(p.id)) {
                                            return { ...p, id: litIdMap.get(p.id)! };
                                        }
                                        return p;
                                    });
                                }

                                // Remap sourceBlockId if pointing to a section or research block
                                if (typeof updatedContent.sourceBlockId === 'string') {
                                    if (updatedContent.sourceBlockId.startsWith('section-')) {
                                        const oldSecId = updatedContent.sourceBlockId.replace('section-', '');
                                        const newSecId = blockIdMap.get(oldSecId) || oldSecId;
                                        updatedContent.sourceBlockId = `section-${newSecId}`;
                                    }
                                }

                                updatedRb.content = updatedContent;
                            }

                            return updatedRb;
                        });
                    }

                    // Remap node positions for documents, sections, and section citation nodes
                    if (Array.isArray(layout.nodePositions)) {
                        layout.nodePositions = layout.nodePositions.map((np: any) => {
                            if (!np?.id || typeof np.id !== 'string') return np;
                            let newId = np.id;
                            if (np.id.startsWith('document-')) {
                                const oldDId = np.id.replace('document-', '');
                                if (docIdMap.has(oldDId)) {
                                    newId = `document-${docIdMap.get(oldDId)}`;
                                }
                            } else if (np.id.startsWith('citations-section-')) {
                                const oldSId = np.id.replace('citations-section-', '');
                                if (blockIdMap.has(oldSId)) {
                                    newId = `citations-section-${blockIdMap.get(oldSId)}`;
                                }
                            } else if (np.id.startsWith('section-')) {
                                const oldSId = np.id.replace('section-', '');
                                if (blockIdMap.has(oldSId)) {
                                    newId = `section-${blockIdMap.get(oldSId)}`;
                                }
                            }
                            return { ...np, id: newId };
                        });
                    }

                    parsedMeta.canvasLayout = layout;
                }
            } catch (err) {
                console.warn('Could not remap canvasLayout metadata:', err);
            }
        }

        // Helper to remap any embedded [[ref:id1,id2]] citations to new block IDs
        const remapRefTags = (text: string): string => {
            if (!text || typeof text !== 'string') return text;
            const citationPattern = /\[\[ref:([a-f0-9-,\s]+)\]\]/g;
            return text.replace(citationPattern, (_, idsString: string) => {
                const remappedIds = idsString
                    .split(',')
                    .map((rawId) => {
                        const trimmed = rawId.trim();
                        return blockIdMap.get(trimmed) || trimmed;
                    })
                    .join(',');
                return `[[ref:${remappedIds}]]`;
            });
        };

        // Create the new document
        await client.models.ScholarDocument.create({
            id: newDocId,
            projectId: newProjectId,
            title: oldDoc.title,
            abstract: oldDoc.abstract || undefined,
            status: oldDoc.status || 'draft',
            metadata: JSON.stringify(parsedMeta),
        });

        // Clone blocks for this document
        const clonedBlockPayloads: any[] = oldBlocks.map((block) => {
            const newBlockId = blockIdMap.get(block.id) || uuidv4();
            let parsedContent: any = block.content;
            if (typeof parsedContent === 'string') {
                try {
                    parsedContent = JSON.parse(parsedContent);
                } catch {
                    parsedContent = block.content;
                }
            }

            // Remap literatureItemId & citation keys for REFERENCE blocks
            if (block.type === 'REFERENCE') {
                if (parsedContent && typeof parsedContent === 'object') {
                    if (parsedContent.literatureItemId && litIdMap.has(parsedContent.literatureItemId)) {
                        const newLitId = litIdMap.get(parsedContent.literatureItemId)!;
                        const newLitItem = clonedLiteraturePayloads.find((item) => item.id === newLitId);
                        
                        let citationKey = parsedContent.citationKey;
                        if (newLitItem) {
                            let authorLastName = 'Unknown';
                            let authorsList: any[] = [];
                            if (newLitItem.authors) {
                                try {
                                    authorsList = typeof newLitItem.authors === 'string'
                                        ? JSON.parse(newLitItem.authors)
                                        : newLitItem.authors;
                                } catch {
                                    authorsList = [];
                                }
                            }
                            if (Array.isArray(authorsList) && authorsList[0]) {
                                const first = authorsList[0];
                                const fullName = typeof first === 'string' ? first : (first?.name || '');
                                if (fullName) {
                                    authorLastName = fullName.trim().split(' ').pop() || 'Unknown';
                                }
                            }
                            citationKey = `${authorLastName}, ${newLitItem.year || 'n.d.'}`;
                        }

                        parsedContent = {
                            ...parsedContent,
                            literatureItemId: newLitId,
                            citationKey: citationKey || parsedContent.citationKey,
                        };
                    }
                }
            } else {
                // For non-reference blocks, remap any [[ref:...]] inline citations
                if (typeof parsedContent === 'string') {
                    parsedContent = remapRefTags(parsedContent);
                } else if (parsedContent && typeof parsedContent === 'object') {
                    if (typeof parsedContent.text === 'string') {
                        parsedContent.text = remapRefTags(parsedContent.text);
                    }
                    if (typeof parsedContent.caption === 'string') {
                        parsedContent.caption = remapRefTags(parsedContent.caption);
                    }
                    if (Array.isArray(parsedContent.rows)) {
                        parsedContent.rows = parsedContent.rows.map((row: any[]) =>
                            Array.isArray(row)
                                ? row.map((cell) => (typeof cell === 'string' ? remapRefTags(cell) : cell))
                                : row
                        );
                    }
                }
            }

            let parsedMetadata: any = block.metadata;
            if (typeof parsedMetadata === 'string') {
                try {
                    parsedMetadata = JSON.parse(parsedMetadata);
                } catch {
                    parsedMetadata = {};
                }
            }

            if (parsedMetadata && typeof parsedMetadata === 'object') {
                // Remap crossRefs in metadata
                if (Array.isArray(parsedMetadata.crossRefs)) {
                    parsedMetadata.crossRefs = parsedMetadata.crossRefs.map(
                        (oldRefId: string) => blockIdMap.get(oldRefId) || oldRefId
                    );
                }
                // Remap linkedLiteratureIds in metadata
                if (Array.isArray(parsedMetadata.linkedLiteratureIds)) {
                    parsedMetadata.linkedLiteratureIds = parsedMetadata.linkedLiteratureIds.map(
                        (oldLitId: string) => litIdMap.get(oldLitId) || oldLitId
                    );
                }
                // Remap canvasSource if present
                if (parsedMetadata.canvasSource && typeof parsedMetadata.canvasSource === 'object') {
                    if (parsedMetadata.canvasSource.blockId && blockIdMap.has(parsedMetadata.canvasSource.blockId)) {
                        parsedMetadata.canvasSource = {
                            ...parsedMetadata.canvasSource,
                            blockId: blockIdMap.get(parsedMetadata.canvasSource.blockId)!,
                        };
                    }
                }
            }

            const parentId = block.parentId ? (blockIdMap.get(block.parentId) || block.parentId) : undefined;

            return {
                id: newBlockId,
                documentId: newDocId,
                type: block.type,
                content: typeof parsedContent === 'object' ? JSON.stringify(parsedContent) : parsedContent,
                metadata: typeof parsedMetadata === 'object' ? JSON.stringify(parsedMetadata) : parsedMetadata,
                orderIndex: block.orderIndex,
                parentId,
            };
        });

        // Insert blocks in parallel batches
        for (let i = 0; i < clonedBlockPayloads.length; i += BATCH_SIZE) {
            const batch = clonedBlockPayloads.slice(i, i + BATCH_SIZE);
            await Promise.all(
                batch.map((payload) => client.models.ScholarBlock.create(payload))
            );
        }
    }

    return newProjectId;
}
