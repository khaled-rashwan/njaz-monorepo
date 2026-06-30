import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ScholarDocument, ScholarBlock, BlockType, BlockMetadata, ScholarLiteratureItem, ScholarFigure, ResearchBlockData, ResearchBlockType, CanvasLayout } from '@/types';
import { generateOrderAtEnd, generateOrderAfter, generateOrderAtStart, sortByOrder, needsRebalancing, rebalanceOrders } from '@/lib/fractional-index';
import { parseCanvasLayout, createResearchBlockData } from '@/lib/canvas-layout';
import { client } from '@/lib/amplify-client';
import { uploadData, remove } from 'aws-amplify/storage';
interface EditorState {
    // Document state
    document: ScholarDocument | null;
    documents: ScholarDocument[];
    blocks: ScholarBlock[];
    literatureItems: ScholarLiteratureItem[];
    figures: ScholarFigure[];
    researchBlocks: ResearchBlockData[];
    canvasLayout: CanvasLayout;
    focusedBlockId: string | null;
    isDirty: boolean;
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;

    // Sidebar state
    activePanel: 'outline' | 'literature' | 'codeRunner' | null;
    inspectorOpen: boolean;

    // Actions — Document
    loadDocument: (docId: string) => Promise<void>;
    loadProjectDocument: (projectId: string) => Promise<void>;
    saveDocument: () => Promise<void>;
    loadProjectDocuments: (projectId: string) => Promise<void>;
    createProjectDocument: (projectId: string, title: string, abstract?: string) => Promise<string>;
    deleteProjectDocument: (docId: string) => Promise<void>;
    updateDocumentSections: (docId: string, sectionIds: string[]) => Promise<void>;
    updateDocumentTitle: (title: string) => void;
    updateDocumentAbstract: (abstract: string) => void;
    updateDocumentKeywords: (keywords: string) => void;
    toggleHeadingNumbering: () => void;
    setHeadingStyle: (style: 'none' | 'ordered' | 'unordered') => void;
    setHeadingLevelStyle: (level: number, style: string) => void;

    // Actions — Blocks
    addBlock: (type: BlockType, afterBlockId?: string, customId?: string) => Promise<string>;
    updateBlockContent: (blockId: string, content: any) => void;
    updateBlockMetadata: (blockId: string, metadata: any) => void;
    deleteBlock: (blockId: string) => Promise<void>;
    moveBlock: (blockId: string, afterBlockId: string | null) => Promise<void>;
    moveBlockUp: (blockId: string) => Promise<void>;
    moveBlockDown: (blockId: string) => Promise<void>;
    reorderReferencesByAppearance: () => Promise<void>;
    focusBlock: (blockId: string | null) => void;

    // Actions — Literature
    addLiteratureItem: (item: Omit<ScholarLiteratureItem, 'owner' | 'createdAt' | 'updatedAt' | 'id'> & { id?: string }) => Promise<string>;
    addLiteratureItemsBulk: (items: (Omit<ScholarLiteratureItem, 'owner' | 'createdAt' | 'updatedAt' | 'id'> & { id?: string })[]) => Promise<string[]>;
    removeLiteratureItem: (itemId: string) => Promise<void>;
    loadLiteratureItems: (projectId: string) => Promise<void>;

    // Actions — Figures
    loadFigures: (projectId: string) => Promise<void>;
    uploadFigure: (projectId: string, title: string, file: File, caption?: string) => Promise<string>;
    deleteFigure: (figureId: string) => Promise<void>;

    // Actions — Canvas Research Blocks
    createResearchBlock: (projectId: string, blockType: ResearchBlockType, title: string) => Promise<string>;
    deleteResearchBlock: (blockId: string) => void;
    updateResearchBlockContent: (blockId: string, content: any) => void;
    pushToSection: (sourceBlockId: string, targetSectionId: string) => Promise<void>;
    saveCanvasLayout: (projectId: string) => Promise<void>;
    loadCanvasLayout: (projectId: string) => void;

    // Actions — UI
    setActivePanel: (panel: 'outline' | 'literature' | 'codeRunner' | null) => void;
    toggleInspector: () => void;

    // Helpers
    getSortedBlocks: () => ScholarBlock[];
    getFocusedBlock: () => ScholarBlock | null;
}

function getMasterDocId(documents: ScholarDocument[], activeDoc: ScholarDocument | null): string {
    const master = documents.find(d => (d.metadata as any)?.isMaster);
    if (master) return master.id;
    if (activeDoc && (activeDoc.metadata as any)?.isMaster) return activeDoc.id;
    if (documents.length > 0) return documents[0].id;
    return activeDoc?.id || '';
}

// Client-side lightweight thumbnail generator
function generateThumbnail(file: File, maxWidth = 300, maxHeight = 200): Promise<Blob> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            resolve(file);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file);
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            resolve(file);
                        }
                    },
                    'image/jpeg',
                    0.7
                );
            };
            img.onerror = () => reject(new Error('Failed to load image for thumbnail generation'));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file for thumbnail generation'));
        reader.readAsDataURL(file);
    });
}

export const useEditorStore = create<EditorState>((set, get) => ({
    // Initial state
    document: null,
    documents: [],
    blocks: [],
    literatureItems: [],
    figures: [],
    researchBlocks: [],
    canvasLayout: { nodePositions: [], researchBlocks: [] },
    focusedBlockId: null,
    isDirty: false,
    isLoading: false,
    isSaving: false,
    error: null,
    activePanel: 'outline',
    inspectorOpen: true,

    // ============================================
    // DOCUMENT ACTIONS
    // ============================================

    loadProjectDocument: async (projectId: string) => {
        set({ 
            isLoading: true, 
            error: null,
            document: null,
            documents: [],
            blocks: [],
            literatureItems: [],
            researchBlocks: [],
            canvasLayout: { nodePositions: [], researchBlocks: [] }
        });
        try {
            // Find all documents associated with projectId
            let docs: any[] = [];
            let docNextToken: string | null | undefined = null;
            do {
                const { data: pageDocs, nextToken: pageNextToken, errors: docErrors }: any = await client.models.ScholarDocument.list({
                    filter: { projectId: { eq: projectId } },
                    nextToken: docNextToken || undefined,
                    limit: 1000,
                });
                
                if (docErrors) {
                    throw new Error(docErrors[0]?.message || 'Failed to search for project document');
                }
                if (pageDocs) {
                    docs = [...docs, ...pageDocs];
                }
                docNextToken = pageNextToken;
            } while (docNextToken);

            let activeDocId: string;
            const parsedDocs: any[] = (docs || []).map(d => {
                let meta = d.metadata;
                if (typeof meta === 'string') {
                    try { meta = JSON.parse(meta); } catch { meta = {}; }
                }
                return { ...d, metadata: meta || {} };
            });

            const masterDoc = parsedDocs.find(d => (d.metadata as any)?.isMaster);

            if (masterDoc) {
                activeDocId = masterDoc.id;
            } else if (parsedDocs.length > 0) {
                // If there's already a document but none marked as master, mark the first one as master
                activeDocId = parsedDocs[0].id;
                parsedDocs[0].metadata = { ...((parsedDocs[0].metadata as any) || {}), isMaster: true };
                await client.models.ScholarDocument.update({
                    id: activeDocId,
                    metadata: JSON.stringify(parsedDocs[0].metadata),
                });
            } else {
                // Fetch the project details to get its title
                const { data: project } = await client.models.ScholarProject.get({ id: projectId });
                const projectTitle = project?.title || 'New Research Paper';
                
                // Create a default master document
                const defaultMetadata = {
                    isMaster: true,
                    sections: [],
                    headingNumberingEnabled: true,
                    headingStyle: 'ordered',
                    headingStyles: {
                        1: 'numeric',
                        2: 'none',
                        3: 'none',
                        4: 'none',
                        5: 'none',
                        6: 'none'
                    }
                };

                const { data: newDoc, errors: createDocErrors } = await client.models.ScholarDocument.create({
                    projectId,
                    title: projectTitle,
                    status: 'draft',
                    metadata: JSON.stringify(defaultMetadata),
                });

                if (createDocErrors || !newDoc) {
                    throw new Error(createDocErrors?.[0]?.message || 'Failed to create default document');
                }

                activeDocId = newDoc.id;
                
                const newDocObj = {
                    ...newDoc,
                    metadata: defaultMetadata,
                } as unknown as ScholarDocument;
                
                parsedDocs.push(newDocObj);

                // Prepopulate with default heading blocks:
                const defaultSections = [
                    { title: 'Introduction', content: 'Introduce your research problem, background context, and key objectives.' },
                    { title: 'Literature Review', content: 'Discuss existing studies and findings in this field.' },
                    { title: 'Methodology', content: 'Explain the research design, data collection, and methods used.' },
                    { title: 'Data Analysis', content: 'Present and interpret your data and statistical results.' },
                    { title: 'Conclusion', content: 'Summarize your findings, limitations, and future work.' },
                    { title: 'References', content: '' },
                ];

                let idx = 1.0;
                const createdSectionIds: string[] = [];
                const createdBlocks: ScholarBlock[] = [];
                for (const section of defaultSections) {
                    // Create Heading block
                    const { data: headingBlock } = await client.models.ScholarBlock.create({
                        documentId: activeDocId,
                        type: 'HEADING',
                        content: JSON.stringify({ text: section.title, level: 1 }),
                        orderIndex: idx,
                    });
                    
                    if (headingBlock) {
                        createdSectionIds.push(headingBlock.id);
                        createdBlocks.push({
                            ...headingBlock,
                            content: { text: section.title, level: 1 },
                            metadata: {},
                        } as any);
                    }
                    
                    idx += 1.0;

                    // Create Text block under heading
                    const { data: textBlock } = await client.models.ScholarBlock.create({
                        documentId: activeDocId,
                        type: 'TEXT',
                        content: JSON.stringify({ text: section.content }),
                        orderIndex: idx,
                    });
                    
                    if (textBlock) {
                        createdBlocks.push({
                            ...textBlock,
                            content: { text: section.content },
                            metadata: {},
                        } as any);
                    }
                    idx += 1.0;
                }

                // Update master document's default sections metadata
                newDocObj.metadata = {
                    ...defaultMetadata,
                    sections: createdSectionIds
                };
                await client.models.ScholarDocument.update({
                    id: activeDocId,
                    metadata: JSON.stringify(newDocObj.metadata),
                });

                // Set state directly to avoid eventual consistency lag
                set({
                    document: newDocObj as unknown as ScholarDocument,
                    documents: parsedDocs as unknown as ScholarDocument[],
                    blocks: createdBlocks,
                    literatureItems: [],
                    canvasLayout: { nodePositions: [], researchBlocks: [] },
                    researchBlocks: [],
                    isLoading: false,
                    isDirty: false,
                });
                return;
            }

            set({ documents: parsedDocs as unknown as ScholarDocument[] });

            // Load the resolved document and its blocks
            await get().loadDocument(activeDocId);
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    loadDocument: async (docId: string) => {
        set({ isLoading: true, error: null });
        try {
            // Load document
            const { data: doc, errors: docErrors } = await client.models.ScholarDocument.get({ id: docId });
            if (docErrors || !doc) {
                throw new Error(docErrors?.[0]?.message || 'Document not found');
            }

            let parsedDocMetadata = doc.metadata;
            if (typeof parsedDocMetadata === 'string') {
                try {
                    parsedDocMetadata = JSON.parse(parsedDocMetadata);
                } catch {
                    parsedDocMetadata = {};
                }
            }

            // Load all documents in the project
            let allDocs: any[] = [];
            let docNextToken: string | null | undefined = null;
            do {
                const { data: pageDocs, nextToken: pageNextToken, errors }: any = await client.models.ScholarDocument.list({
                    filter: { projectId: { eq: doc.projectId } },
                    nextToken: docNextToken || undefined,
                    limit: 1000,
                });
                if (errors) {
                    throw new Error(errors[0]?.message || 'Failed to load project documents');
                }
                if (pageDocs) {
                    allDocs = [...allDocs, ...pageDocs];
                }
                docNextToken = pageNextToken;
            } while (docNextToken);
            const parsedDocs = (allDocs || []).map(d => {
                let meta = d.metadata;
                if (typeof meta === 'string') {
                    try { meta = JSON.parse(meta); } catch { meta = {}; }
                }
                return { ...d, metadata: meta || {} };
            });

            // Find master document ID to load blocks from
            let masterDocId = docId;
            if (!(parsedDocMetadata as any)?.isMaster) {
                const master = parsedDocs.find(d => (d.metadata as any)?.isMaster);
                if (master) {
                    masterDocId = master.id;
                } else if (parsedDocs.length > 0) {
                    masterDocId = parsedDocs[0].id;
                }
            }

            // Load blocks of the master document
            let allBlocks: any[] = [];
            let blockNextToken: string | null | undefined = null;
            do {
                const { data: pageBlocks, nextToken: pageNextToken, errors }: any = await client.models.ScholarBlock.list({
                    filter: { documentId: { eq: masterDocId } },
                    nextToken: blockNextToken || undefined,
                    limit: 1000,
                });
                if (errors) {
                    throw new Error(errors[0]?.message || 'Failed to load blocks');
                }
                if (pageBlocks) {
                    allBlocks = [...allBlocks, ...pageBlocks];
                }
                blockNextToken = pageNextToken;
            } while (blockNextToken);

            // Load literature items
            let allLitItems: any[] = [];
            let litNextToken: string | null | undefined = null;
            do {
                const { data: pageLits, nextToken: pageNextToken, errors }: any = await client.models.ScholarLiteratureItem.list({
                    filter: { projectId: { eq: doc.projectId } },
                    nextToken: litNextToken || undefined,
                    limit: 1000,
                });
                if (errors) {
                    throw new Error(errors[0]?.message || 'Failed to load literature items');
                }
                if (pageLits) {
                    allLitItems = [...allLitItems, ...pageLits];
                }
                litNextToken = pageNextToken;
            } while (litNextToken);

            const parsedBlocks = (allBlocks || []).map(b => {
                let content = b.content;
                let metadata = b.metadata;
                
                if (typeof content === 'string') {
                    try {
                        content = JSON.parse(content);
                    } catch (e) {
                        console.error('Failed to parse block content:', e);
                    }
                }
                if (typeof metadata === 'string') {
                    try {
                        metadata = JSON.parse(metadata);
                    } catch (e) {
                        console.error('Failed to parse block metadata:', e);
                    }
                }
                return {
                    ...b,
                    content,
                    metadata: metadata || {},
                } as unknown as ScholarBlock;
            });

            const parsedDoc = doc ? {
                ...doc,
                metadata: parsedDocMetadata || {}
            } : null;

            // Load canvas layout from the master document
            const masterDoc = parsedDocs.find(d => (d.metadata as any)?.isMaster) || parsedDoc;
            const layout = parseCanvasLayout(masterDoc?.metadata as any);
            // Load figures in parallel
            await get().loadFigures(doc.projectId);

            set({
                document: parsedDoc as unknown as ScholarDocument,
                documents: parsedDocs as unknown as ScholarDocument[],
                blocks: parsedBlocks,
                literatureItems: parseLiteratureItems(allLitItems || []),
                canvasLayout: layout,
                researchBlocks: layout.researchBlocks || [],
                isLoading: false,
                isDirty: false,
            });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    loadProjectDocuments: async (projectId: string) => {
        try {
            let docs: any[] = [];
            let docNextToken: string | null | undefined = null;
            do {
                const { data: pageDocs, nextToken: pageNextToken, errors }: any = await client.models.ScholarDocument.list({
                    filter: { projectId: { eq: projectId } },
                    nextToken: docNextToken || undefined,
                    limit: 1000,
                });
                if (errors) {
                    throw new Error(errors[0]?.message || 'Failed to load project documents');
                }
                if (pageDocs) {
                    docs = [...docs, ...pageDocs];
                }
                docNextToken = pageNextToken;
            } while (docNextToken);
            const parsedDocs = (docs || []).map(d => {
                let meta = d.metadata;
                if (typeof meta === 'string') {
                    try { meta = JSON.parse(meta); } catch { meta = {}; }
                }
                return { ...d, metadata: meta || {} };
            });
            set({ documents: parsedDocs as unknown as ScholarDocument[] });
        } catch (err) {
            console.error('Failed to load project documents:', err);
        }
    },

    createProjectDocument: async (projectId: string, title: string, abstract?: string) => {
        set({ isLoading: true, error: null });
        try {
            const { data: newDoc, errors } = await client.models.ScholarDocument.create({
                projectId,
                title,
                abstract: abstract || '',
                status: 'draft',
                metadata: JSON.stringify({ sections: [] }),
            });
            if (errors || !newDoc) {
                throw new Error(errors?.[0]?.message || 'Failed to create document');
            }
            
            await get().loadProjectDocuments(projectId);
            set({ isLoading: false });
            return newDoc.id;
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
            throw err;
        }
    },

    deleteProjectDocument: async (docId: string) => {
        set({ isLoading: true, error: null });
        try {
            const { data: docToDelete } = await client.models.ScholarDocument.get({ id: docId });
            if (!docToDelete) return;
            
            await client.models.ScholarDocument.delete({ id: docId });
            await get().loadProjectDocuments(docToDelete.projectId);
            set({ isLoading: false });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    updateDocumentSections: async (docId: string, sectionIds: string[]) => {
        try {
            const { data: doc } = await client.models.ScholarDocument.get({ id: docId });
            if (!doc) return;

            let currentMeta = doc.metadata;
            if (typeof currentMeta === 'string') {
                try { currentMeta = JSON.parse(currentMeta); } catch { currentMeta = {}; }
            } else if (!currentMeta) {
                currentMeta = {};
            }

            const updatedMeta = {
                ...(currentMeta as any),
                sections: sectionIds
            };

            await client.models.ScholarDocument.update({
                id: docId,
                metadata: JSON.stringify(updatedMeta),
            });

            const { documents, document: activeDoc } = get();
            const updatedDocs = documents.map(d => 
                d.id === docId ? { ...d, metadata: updatedMeta } : d
            );
            
            set({
                documents: updatedDocs,
                document: activeDoc && activeDoc.id === docId ? { ...activeDoc, metadata: updatedMeta } : activeDoc
            });
        } catch (err: any) {
            console.error('Failed to update document sections:', err);
        }
    },

    saveDocument: async () => {
        await get().reorderReferencesByAppearance();
        const { document, blocks, isDirty } = get();
        if (!document || !isDirty) return;

        set({ isSaving: true });
        try {
            // Save document metadata and blocks in parallel
            await Promise.all([
                client.models.ScholarDocument.update({
                    id: document.id,
                    title: document.title,
                    abstract: document.abstract || undefined,
                    metadata: document.metadata ? JSON.stringify(document.metadata) : undefined,
                }),
                ...blocks.map(block =>
                    client.models.ScholarBlock.update({
                        id: block.id,
                        content: block.content ? JSON.stringify(block.content) : undefined,
                        metadata: block.metadata ? JSON.stringify(block.metadata) : undefined,
                        orderIndex: block.orderIndex,
                        parentId: block.parentId || undefined,
                    })
                )
            ]);

            set({ isSaving: false, isDirty: false });
        } catch (error: any) {
            set({ isSaving: false, error: error.message });
        }
    },

    updateDocumentTitle: (title: string) => {
        const { document } = get();
        if (!document) return;
        set({ document: { ...document, title }, isDirty: true });
    },

    updateDocumentAbstract: (abstract: string) => {
        const { document } = get();
        if (!document) return;
        set({ document: { ...document, abstract }, isDirty: true });
    },

    updateDocumentKeywords: (keywords: string) => {
        const { document } = get();
        if (!document) return;
        const metadata = document.metadata || {};
        set({
            document: {
                ...document,
                metadata: {
                    ...metadata,
                    keywords,
                }
            },
            isDirty: true
        });
    },

    toggleHeadingNumbering: () => {
        const { document } = get();
        if (!document) return;

        const metadata = document.metadata || {};
        const enabled = !metadata.headingNumberingEnabled;

        set({
            document: {
                ...document,
                metadata: {
                    ...metadata,
                    headingNumberingEnabled: enabled,
                    headingStyle: enabled ? 'ordered' : 'none'
                }
            },
            isDirty: true
        });
    },

    setHeadingStyle: (style: 'none' | 'ordered' | 'unordered') => {
        const { document } = get();
        if (!document) return;

        const metadata = document.metadata || {};
        set({
            document: {
                ...document,
                metadata: {
                    ...metadata,
                    headingStyle: style,
                    headingNumberingEnabled: style === 'ordered'
                }
            },
            isDirty: true
        });
    },

    setHeadingLevelStyle: (level: number, style: string) => {
        const { document } = get();
        if (!document) return;

        const metadata = document.metadata || {};
        const headingStyles = metadata.headingStyles || {};
        const updatedStyles = {
            ...headingStyles,
            [level]: style,
        };

        set({
            document: {
                ...document,
                metadata: {
                    ...metadata,
                    headingStyles: updatedStyles,
                }
            },
            isDirty: true
        });
    },

    // ============================================
    // BLOCK ACTIONS
    // ============================================

    addBlock: async (type: BlockType, afterBlockId?: string, customId?: string) => {
        const { document, blocks } = get();
        if (!document) return '';

        const sorted = sortByOrder(blocks);
        let orderIndex: number;

        if (afterBlockId) {
            if (afterBlockId === '__START__') {
                orderIndex = generateOrderAtStart(sorted);
            } else {
                const afterBlock = sorted.find(b => b.id === afterBlockId);
                if (afterBlock) {
                    orderIndex = generateOrderAfter(afterBlock, sorted);
                } else {
                    orderIndex = generateOrderAtEnd(sorted);
                }
            }
        } else {
            orderIndex = generateOrderAtEnd(sorted);
        }

        const defaultContent = getDefaultContent(type);
        const newBlockId = customId || uuidv4();
        const masterDocId = getMasterDocId(get().documents, document);
        const newBlock: ScholarBlock = {
            id: newBlockId,
            documentId: masterDocId,
            type,
            content: defaultContent,
            metadata: {},
            parentId: null,
            orderIndex,
        };

        // Optimistic update
        set({ blocks: [...blocks, newBlock], isDirty: true, focusedBlockId: newBlock.id });

        // Persist
        try {
            await client.models.ScholarBlock.create({
                id: newBlock.id,
                documentId: newBlock.documentId,
                type: newBlock.type,
                content: JSON.stringify(newBlock.content),
                metadata: JSON.stringify(newBlock.metadata),
                parentId: newBlock.parentId || undefined,
                orderIndex: newBlock.orderIndex,
            });
        } catch (error: any) {
            // Rollback
            set({ blocks: blocks, error: error.message });
        }
        return newBlock.id;
    },

    updateBlockContent: (blockId: string, content: any) => {
        const { blocks } = get();
        set({
            blocks: blocks.map(b =>
                b.id === blockId ? { ...b, content } : b
            ),
            isDirty: true,
        });
    },

    updateBlockMetadata: (blockId: string, metadata: any) => {
        const { blocks } = get();
        set({
            blocks: blocks.map(b =>
                b.id === blockId ? { ...b, metadata: { ...b.metadata, ...metadata } } : b
            ),
            isDirty: true,
        });
    },

    deleteBlock: async (blockId: string) => {
        const { blocks } = get();
        const filtered = blocks.filter(b => b.id !== blockId);

        // Optimistic update
        set({ blocks: filtered, isDirty: true, focusedBlockId: null });

        try {
            await client.models.ScholarBlock.delete({ id: blockId });
        } catch (error: any) {
            set({ blocks, error: error.message });
        }
    },

    moveBlock: async (blockId: string, afterBlockId: string | null) => {
        const { blocks } = get();
        const sorted = sortByOrder(blocks);
        const block = blocks.find(b => b.id === blockId);
        if (!block) return;

        let newOrder: number;
        if (afterBlockId === null) {
            // Move to start
            const first = sorted[0];
            newOrder = first ? first.orderIndex / 2 : 1.0;
        } else {
            const afterBlock = sorted.find(b => b.id === afterBlockId);
            if (!afterBlock) return;
            newOrder = generateOrderAfter(afterBlock, sorted.filter(b => b.id !== blockId));
        }

        const updatedBlocks = blocks.map(b =>
            b.id === blockId ? { ...b, orderIndex: newOrder } : b
        );

        set({ blocks: updatedBlocks, isDirty: true });

        // Check if rebalancing is needed
        const newSorted = sortByOrder(updatedBlocks);
        if (needsRebalancing(newSorted)) {
            const newOrders = rebalanceOrders(newSorted.length);
            const rebalanced = newSorted.map((b, i) => ({ ...b, orderIndex: newOrders[i] }));
            set({ blocks: rebalanced });
            // Persist rebalanced orders
            for (const b of rebalanced) {
                await client.models.ScholarBlock.update({
                    id: b.id,
                    orderIndex: b.orderIndex,
                });
            }
        }
    },

    moveBlockUp: async (blockId: string) => {
        const { blocks, moveBlock } = get();
        const sorted = sortByOrder(blocks);
        const index = sorted.findIndex(b => b.id === blockId);
        if (index <= 0) return;

        const afterBlockId = index === 1 ? null : sorted[index - 2].id;
        await moveBlock(blockId, afterBlockId);
    },

    moveBlockDown: async (blockId: string) => {
        const { blocks, moveBlock } = get();
        const sorted = sortByOrder(blocks);
        const index = sorted.findIndex(b => b.id === blockId);
        if (index < 0 || index >= sorted.length - 1) return;

        const afterBlockId = sorted[index + 1].id;
        await moveBlock(blockId, afterBlockId);
    },

    reorderReferencesByAppearance: async () => {
        const { blocks } = get();
        const sorted = sortByOrder(blocks);

        // 1. Gather all REFERENCE block IDs
        const refBlocks = sorted.filter(b => b.type === 'REFERENCE');
        if (refBlocks.length === 0) return;

        const refBlockIds = new Set(refBlocks.map(b => b.id));

        // 2. Scan non-reference blocks for [[ref:uuid]] citations in order (supports comma-separated bulk citations)
        const citationPattern = /\[\[ref:([a-f0-9-,\s]+)\]\]/g;
        const citedIds: string[] = [];
        const seen = new Set<string>();

        for (const block of sorted) {
            if (block.type === 'REFERENCE') continue;

            let textContent = '';
            if (block.content) {
                if (typeof block.content === 'string') {
                    textContent = block.content;
                } else if (typeof block.content.text === 'string') {
                    textContent = block.content.text;
                } else {
                    textContent = JSON.stringify(block.content);
                }
            }

            let match;
            citationPattern.lastIndex = 0;
            while ((match = citationPattern.exec(textContent)) !== null) {
                const ids = match[1].split(',').map(id => id.trim()).filter(Boolean);
                for (const id of ids) {
                    if (refBlockIds.has(id) && !seen.has(id)) {
                        seen.add(id);
                        citedIds.push(id);
                    }
                }
            }
        }

        try {
            // 3. Delete uncited references
            const uncitedRefBlocks = refBlocks.filter(b => !seen.has(b.id));
            let activeBlocks = [...blocks];
            if (uncitedRefBlocks.length > 0) {
                await Promise.all(uncitedRefBlocks.map(b => 
                    client.models.ScholarBlock.delete({ id: b.id })
                ));
                activeBlocks = blocks.filter(b => !uncitedRefBlocks.some(urb => urb.id === b.id));
            }

            // 4. If order is already identical, do nothing (comparing remaining cited blocks)
            const remainingRefBlocks = sortByOrder(activeBlocks).filter(b => b.type === 'REFERENCE');
            const currentRefOrder = remainingRefBlocks.map(b => b.id);
            const isSameOrder = citedIds.length === currentRefOrder.length && 
                citedIds.every((id, idx) => id === currentRefOrder[idx]);

            if (isSameOrder) {
                if (uncitedRefBlocks.length > 0) {
                    set({ blocks: activeBlocks, isDirty: true });
                }
                return;
            }

            // 5. Generate new orderIndex values for REFERENCE blocks
            const nonRefBlocks = activeBlocks.filter(b => b.type !== 'REFERENCE');
            const sortedNonRef = sortByOrder(nonRefBlocks);
            const refHeading = sortedNonRef.find(b => 
                b.type === 'HEADING' && 
                b.content?.level === 1 && 
                (b.content?.text || '').trim().toLowerCase() === 'references'
            );
            const lastNonRef = sortedNonRef[sortedNonRef.length - 1];
            let baseOrder = refHeading ? refHeading.orderIndex : (lastNonRef ? lastNonRef.orderIndex : 0);

            const updatedBlocks = [...activeBlocks];
            const updatesToPersist: { id: string; orderIndex: number }[] = [];

            citedIds.forEach((id, idx) => {
                const newOrder = baseOrder + 1.0 + idx;
                const blockIndex = updatedBlocks.findIndex(b => b.id === id);
                if (blockIndex !== -1) {
                    updatedBlocks[blockIndex] = {
                        ...updatedBlocks[blockIndex],
                        orderIndex: newOrder
                    };
                    updatesToPersist.push({ id, orderIndex: newOrder });
                }
            });

            if (updatesToPersist.length > 0) {
                set({ blocks: updatedBlocks, isDirty: true });
                await Promise.all(updatesToPersist.map(u => 
                    client.models.ScholarBlock.update({
                        id: u.id,
                        orderIndex: u.orderIndex
                    })
                ));
            }
        } catch (err: any) {
            console.error('Failed to persist reference reordering:', err);
        }
    },

    focusBlock: (blockId: string | null) => {
        set({ focusedBlockId: blockId });
    },

    // ============================================
    // LITERATURE ACTIONS
    // ============================================

    addLiteratureItem: async (item) => {
        const { literatureItems } = get();
        const itemId = item.id || uuidv4();
        const newItem = { ...item, id: itemId } as ScholarLiteratureItem;

        set({ literatureItems: [...literatureItems, newItem] });

        try {
            const authorsStr = typeof item.authors === 'string' ? item.authors : (item.authors ? JSON.stringify(item.authors) : undefined);
            const metadataStr = typeof item.fullMetadata === 'string' ? item.fullMetadata : (item.fullMetadata ? JSON.stringify(item.fullMetadata) : undefined);

            await client.models.ScholarLiteratureItem.create({
                ...item,
                id: newItem.id,
                source: item.source === 'isbn_books' ? 'manual' : item.source,
                authors: authorsStr,
                fullMetadata: metadataStr,
            } as any);
        } catch (error: any) {
            console.error("Amplify ScholarLiteratureItem.create failed:", error);
            set({ literatureItems, error: error.message });
        }
        return newItem.id;
    },

    addLiteratureItemsBulk: async (items) => {
        const { document, literatureItems, blocks } = get();
        if (!document) return [];

        const newLitItems: ScholarLiteratureItem[] = [];
        const newRefBlocks: ScholarBlock[] = [];
        const refBlockIds: string[] = [];

        const sorted = sortByOrder(blocks);
        let baseOrder = generateOrderAtEnd(sorted);

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemId = item.id || uuidv4();
            const newItem = { ...item, id: itemId } as ScholarLiteratureItem;
            newLitItems.push(newItem);

            const refBlockId = uuidv4();
            refBlockIds.push(refBlockId);

            const citationKey = item.authors && item.authors.length > 0 
                ? `${item.authors[0].name.split(',')[0]} et al.` 
                : 'Unknown';

            const masterDocId = getMasterDocId(get().documents, document);
            const newBlock: ScholarBlock = {
                id: refBlockId,
                documentId: masterDocId,
                type: 'REFERENCE',
                content: {
                    literatureItemId: itemId,
                    citationKey,
                },
                metadata: {},
                parentId: null,
                orderIndex: baseOrder + i * 1.0,
            };
            newRefBlocks.push(newBlock);
        }

        set({
            literatureItems: [...literatureItems, ...newLitItems],
            blocks: [...blocks, ...newRefBlocks],
            isDirty: true
        });

        try {
            await Promise.all([
                ...newLitItems.map(item => {
                    const authorsStr = typeof item.authors === 'string' ? item.authors : (item.authors ? JSON.stringify(item.authors) : undefined);
                    const metadataStr = typeof item.fullMetadata === 'string' ? item.fullMetadata : (item.fullMetadata ? JSON.stringify(item.fullMetadata) : undefined);

                    return client.models.ScholarLiteratureItem.create({
                        ...item,
                        source: item.source === 'isbn_books' ? 'manual' : item.source,
                        authors: authorsStr,
                        fullMetadata: metadataStr,
                    } as any);
                }),
                ...newRefBlocks.map(block => client.models.ScholarBlock.create({
                    id: block.id,
                    documentId: block.documentId,
                    type: block.type,
                    content: JSON.stringify(block.content),
                    metadata: JSON.stringify(block.metadata),
                    parentId: block.parentId || undefined,
                    orderIndex: block.orderIndex,
                }))
            ]);
        } catch (error: any) {
            console.error("Failed to persist bulk imported citations:", error);
        }

        return refBlockIds;
    },

    removeLiteratureItem: async (itemId: string) => {
        const { literatureItems } = get();
        set({ literatureItems: literatureItems.filter(i => i.id !== itemId) });

        try {
            await client.models.ScholarLiteratureItem.delete({ id: itemId });
        } catch (error: any) {
            set({ literatureItems, error: error.message });
        }
    },

    loadLiteratureItems: async (projectId: string) => {
        try {
            let allItems: any[] = [];
            let nextToken: string | null | undefined = null;
            do {
                const { data, nextToken: pageNextToken, errors }: any = await client.models.ScholarLiteratureItem.list({
                    filter: { projectId: { eq: projectId } },
                    nextToken: nextToken || undefined,
                    limit: 1000,
                });
                if (errors) {
                    throw new Error(errors[0]?.message || 'Failed to load literature items');
                }
                if (data) {
                    allItems = [...allItems, ...data];
                }
                nextToken = pageNextToken;
            } while (nextToken);
            set({ literatureItems: parseLiteratureItems(allItems || []) });
        } catch (error: any) {
            console.error('Failed to load literature items:', error);
        }
    },

    loadFigures: async (projectId: string) => {
        try {
            let allFigures: any[] = [];
            let nextToken: string | null | undefined = null;
            do {
                const { data, nextToken: pageNextToken, errors }: any = await client.models.ScholarFigure.list({
                    filter: { projectId: { eq: projectId } },
                    nextToken: nextToken || undefined,
                    limit: 1000,
                });
                if (errors) {
                    throw new Error(errors[0]?.message || 'Failed to load figures');
                }
                if (data) {
                    allFigures = [...allFigures, ...data];
                }
                nextToken = pageNextToken;
            } while (nextToken);

            const parsedFigures = await Promise.all(allFigures.map(async (fig) => {
                let meta = fig.metadata;
                if (typeof meta === 'string') {
                    try { meta = JSON.parse(meta); } catch { meta = {}; }
                }
                return {
                    ...fig,
                    metadata: meta || {},
                } as ScholarFigure;
            }));

            set({ figures: parsedFigures });
        } catch (error: any) {
            console.error('Failed to load figures:', error);
        }
    },

    uploadFigure: async (projectId: string, title: string, file: File, caption?: string) => {
        const { figures } = get();
        const figId = uuidv4();
        const s3Key = `scholar-figures/${projectId}/${figId}-${file.name}`;
        const s3KeyThumb = `scholar-figures/${projectId}/${figId}-thumb.jpg`;

        try {
            // 1. Generate thumbnail
            let thumbBlob: Blob | null = null;
            try {
                thumbBlob = await generateThumbnail(file);
            } catch (thumbErr) {
                console.warn("Failed to generate thumbnail, falling back to original:", thumbErr);
            }

            // 2. Upload original file to S3
            const uploadTask = uploadData({
                path: s3Key,
                data: file,
                options: {
                    contentType: file.type
                }
            });
            await uploadTask.result;

            // 3. Upload thumbnail file to S3 if generated
            if (thumbBlob) {
                const uploadThumbTask = uploadData({
                    path: s3KeyThumb,
                    data: thumbBlob,
                    options: {
                        contentType: 'image/jpeg'
                    }
                });
                await uploadThumbTask.result;
            }

            // 4. Create Figure entry in DynamoDB
            const metadataObj = {
                thumbnailS3Key: thumbBlob ? s3KeyThumb : undefined
            };

            const { data: newFig, errors } = await client.models.ScholarFigure.create({
                id: figId,
                projectId,
                title,
                s3Key,
                contentType: file.type,
                sizeBytes: file.size,
                caption: caption || undefined,
                metadata: JSON.stringify(metadataObj),
            });

            if (errors || !newFig) {
                throw new Error(errors?.[0]?.message || 'Failed to create database figure record');
            }

            const addedFig: ScholarFigure = {
                id: newFig.id,
                projectId: newFig.projectId,
                title: newFig.title,
                s3Key: newFig.s3Key,
                contentType: newFig.contentType || undefined,
                sizeBytes: newFig.sizeBytes || undefined,
                caption: newFig.caption || undefined,
                metadata: metadataObj,
                createdAt: newFig.createdAt,
                updatedAt: newFig.updatedAt,
            };

            set({ figures: [...figures, addedFig] });
            return addedFig.id;
        } catch (error: any) {
            console.error('Failed to upload figure:', error);
            throw error;
        }
    },

    deleteFigure: async (figureId: string) => {
        const { figures } = get();
        const fig = figures.find(f => f.id === figureId);
        if (!fig) return;

        set({ figures: figures.filter(f => f.id !== figureId) });

        try {
            // 1. Delete S3 original object
            await remove({ path: fig.s3Key });

            // 2. Delete S3 thumbnail object if exists
            if (fig.metadata?.thumbnailS3Key) {
                try {
                    await remove({ path: fig.metadata.thumbnailS3Key });
                } catch (thumbErr) {
                    console.warn("Failed to remove S3 thumbnail object:", thumbErr);
                }
            }

            // 3. Delete database record
            await client.models.ScholarFigure.delete({ id: figureId });
        } catch (error: any) {
            console.error('Failed to delete figure:', error);
            // Rollback
            set({ figures });
            throw error;
        }
    },

    // ============================================
    // CANVAS RESEARCH BLOCK ACTIONS
    // ============================================

    createResearchBlock: async (projectId: string, blockType: ResearchBlockType, title: string) => {
        const id = uuidv4();
        const newBlock = createResearchBlockData(id, blockType, title, projectId);
        const { researchBlocks, canvasLayout } = get();
        const updatedBlocks = [...researchBlocks, newBlock];
        const updatedLayout = { ...canvasLayout, researchBlocks: updatedBlocks };
        set({ researchBlocks: updatedBlocks, canvasLayout: updatedLayout });
        // Persist into master document metadata
        await get().saveCanvasLayout(projectId);
        return id;
    },

    deleteResearchBlock: (blockId: string) => {
        const { researchBlocks, canvasLayout } = get();
        const updated = researchBlocks.filter(b => b.id !== blockId);
        set({
            researchBlocks: updated,
            canvasLayout: { ...canvasLayout, researchBlocks: updated },
        });
    },

    updateResearchBlockContent: (blockId: string, content: any) => {
        const { researchBlocks, canvasLayout } = get();
        const updated = researchBlocks.map(b =>
            b.id === blockId ? { ...b, content } : b
        );
        set({
            researchBlocks: updated,
            canvasLayout: { ...canvasLayout, researchBlocks: updated },
        });
    },

    pushToSection: async (sourceBlockId: string, targetSectionId: string) => {
        const { researchBlocks, blocks, document, documents } = get();
        const researchBlock = researchBlocks.find(b => b.id === sourceBlockId);
        if (!researchBlock || !document) return;

        const masterDocId = getMasterDocId(documents, document);
        const sorted = sortByOrder(blocks);

        // Find the target section heading and determine insert position
        const sectionIndex = sorted.findIndex(b => b.id === targetSectionId);
        if (sectionIndex < 0) return;

        // Find the last block in this section (before the next H1 or end)
        let insertAfterIndex = sectionIndex;
        for (let i = sectionIndex + 1; i < sorted.length; i++) {
            if (sorted[i].type === 'HEADING' && sorted[i].content?.level === 1) break;
            insertAfterIndex = i;
        }
        const insertAfterBlock = sorted[insertAfterIndex];

        const canvasSourceMeta: BlockMetadata = {
            canvasSource: {
                blockId: researchBlock.id,
                blockType: researchBlock.type,
                title: researchBlock.title,
                pushedAt: new Date().toISOString(),
            },
        };

        // Convert research block content to ScholarBlock(s) based on type
        const newBlocks: { type: BlockType; content: any }[] = [];

        switch (researchBlock.type) {
            case 'notes':
                newBlocks.push({
                    type: 'TEXT',
                    content: { text: researchBlock.content?.text || researchBlock.title, format: 'markdown' },
                });
                break;
            case 'literature-survey':
                newBlocks.push({
                    type: 'TEXT',
                    content: { text: researchBlock.content?.surveyText || '', format: 'markdown' },
                });
                break;
            case 'dataset':
                if (researchBlock.content?.headers && researchBlock.content?.rows) {
                    newBlocks.push({
                        type: 'TABLE',
                        content: {
                            headers: researchBlock.content.headers,
                            rows: researchBlock.content.rows,
                            caption: researchBlock.content.caption || researchBlock.title,
                        },
                    });
                } else {
                    newBlocks.push({
                        type: 'CODE',
                        content: {
                            code: typeof researchBlock.content === 'string'
                                ? researchBlock.content
                                : JSON.stringify(researchBlock.content, null, 2),
                            language: 'json',
                            showLineNumbers: true,
                        },
                    });
                }
                break;
            case 'analysis-result':
                if (researchBlock.content?.headers && researchBlock.content?.rows) {
                    newBlocks.push({
                        type: 'TABLE',
                        content: {
                            headers: researchBlock.content.headers,
                            rows: researchBlock.content.rows,
                            caption: researchBlock.content.caption || 'Analysis Result',
                        },
                    });
                } else {
                    newBlocks.push({
                        type: 'CODE',
                        content: {
                            code: typeof researchBlock.content?.result === 'string'
                                ? researchBlock.content.result
                                : JSON.stringify(researchBlock.content?.result || researchBlock.content, null, 2),
                            language: 'json',
                            showLineNumbers: true,
                        },
                    });
                }
                break;
            case 'reference-collection':
                // References are handled via the existing addLiteratureItemsBulk flow
                // Push a note block referencing the literature
                newBlocks.push({
                    type: 'TEXT',
                    content: {
                        text: `_References from: ${researchBlock.title}_`,
                        format: 'markdown',
                    },
                });
                break;
        }

        // Insert each new block after the target position
        let lastInsertId = insertAfterBlock.id;
        for (const nb of newBlocks) {
            const blockId = uuidv4();
            const currentSorted = sortByOrder(get().blocks);
            const afterBlock = currentSorted.find(b => b.id === lastInsertId);
            const orderIndex = afterBlock
                ? generateOrderAfter(afterBlock, currentSorted)
                : generateOrderAtEnd(currentSorted);

            const newBlock: ScholarBlock = {
                id: blockId,
                documentId: masterDocId,
                type: nb.type,
                content: nb.content,
                metadata: canvasSourceMeta,
                parentId: null,
                orderIndex,
            };

            set({ blocks: [...get().blocks, newBlock], isDirty: true });

            try {
                await client.models.ScholarBlock.create({
                    id: newBlock.id,
                    documentId: newBlock.documentId,
                    type: newBlock.type,
                    content: JSON.stringify(newBlock.content),
                    metadata: JSON.stringify(newBlock.metadata),
                    parentId: newBlock.parentId || undefined,
                    orderIndex: newBlock.orderIndex,
                });
            } catch (err) {
                console.error('Failed to persist pushed block:', err);
            }

            lastInsertId = blockId;
        }
    },

    saveCanvasLayout: async (projectId: string) => {
        const { documents, canvasLayout } = get();
        const masterDoc = documents.find(d => (d.metadata as any)?.isMaster);
        if (!masterDoc) return;

        const currentMeta = (masterDoc.metadata as any) || {};
        const updatedMeta = { ...currentMeta, canvasLayout };

        try {
            await client.models.ScholarDocument.update({
                id: masterDoc.id,
                metadata: JSON.stringify(updatedMeta),
            });

            const updatedDocs = documents.map(d =>
                d.id === masterDoc.id ? { ...d, metadata: updatedMeta } : d
            );
            set({ documents: updatedDocs });
        } catch (err) {
            console.error('Failed to save canvas layout:', err);
        }
    },

    loadCanvasLayout: (projectId: string) => {
        const { documents } = get();
        const masterDoc = documents.find(d => (d.metadata as any)?.isMaster);
        if (!masterDoc) return;

        const layout = parseCanvasLayout(masterDoc.metadata as any);
        set({
            canvasLayout: layout,
            researchBlocks: layout.researchBlocks || [],
        });
    },

    // ============================================
    // UI ACTIONS
    // ============================================

    setActivePanel: (panel) => set({ activePanel: panel }),
    toggleInspector: () => set(state => ({ inspectorOpen: !state.inspectorOpen })),

    // ============================================
    // HELPERS
    // ============================================

    getSortedBlocks: () => sortByOrder(get().blocks),
    getFocusedBlock: () => {
        const { blocks, focusedBlockId } = get();
        return blocks.find(b => b.id === focusedBlockId) || null;
    },
}));

// ============================================
// Default content for new blocks
// ============================================

function getDefaultContent(type: BlockType): any {
    switch (type) {
        case 'TEXT':
            return { text: '', format: 'markdown' };
        case 'HEADING':
            return { text: '', level: 2 };
        case 'EQUATION':
            return { latex: '', displayMode: true };
        case 'TABLE':
            return { headers: ['Column 1', 'Column 2', 'Column 3'], rows: [['', '', '']], caption: '' };
        case 'FIGURE':
            return { src: '', alt: '', caption: '' };
        case 'REFERENCE':
            return { literatureItemId: '', citationKey: '' };
        case 'CODE':
            return { code: '', language: 'python', showLineNumbers: true };
        case 'AI_PROMPT':
            return { prompt: '', contextBlockIds: [], generatedText: '' };
        case 'DIVIDER':
            return {};
        default:
            return {};
    }
}

function parseLiteratureItems(items: any[]): ScholarLiteratureItem[] {
    return items.map(item => {
        let authors = item.authors;
        let fullMetadata = item.fullMetadata;

        if (typeof authors === 'string') {
            try {
                authors = JSON.parse(authors);
            } catch (e) {
                console.error('Failed to parse authors:', e);
                authors = [];
            }
        }
        if (typeof fullMetadata === 'string') {
            try {
                fullMetadata = JSON.parse(fullMetadata);
            } catch (e) {
                console.error('Failed to parse fullMetadata:', e);
                fullMetadata = {};
            }
        }
        return {
            ...item,
            authors: authors || [],
            fullMetadata: fullMetadata || {},
        } as ScholarLiteratureItem;
    });
}
