'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Node,
  Edge,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PhaseNode } from './PhaseNode';
import { DocumentNode } from './DocumentNode';
import { ResearchBlockNode } from './ResearchBlockNode';
import { LiteratureSurvey } from '@/components/literature/LiteratureSurvey';
import { DataAnalysisPanel } from './DataAnalysisPanel';
import { SectionEditor } from '../editor/SectionEditor';
import { useEditorStore } from '@/store/editor-store';
import { useLanguage } from '@/components/LanguageContext';
import type { ResearchBlockType } from '@/types';
import Link from 'next/link';

const nodeTypes = {
  phaseNode: PhaseNode,
  documentNode: DocumentNode,
  researchBlockNode: ResearchBlockNode,
};

export function ProjectCanvas({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const blocks = useEditorStore(state => state.blocks);
  const documents = useEditorStore(state => state.documents);
  const activeDocument = useEditorStore(state => state.document);
  const researchBlocks = useEditorStore(state => state.researchBlocks);
  const literatureItems = useEditorStore(state => state.literatureItems);
  
  const createProjectDocument = useEditorStore(state => state.createProjectDocument);
  const deleteProjectDocument = useEditorStore(state => state.deleteProjectDocument);
  const updateDocumentSections = useEditorStore(state => state.updateDocumentSections);
  const createResearchBlock = useEditorStore(state => state.createResearchBlock);
  const deleteResearchBlock = useEditorStore(state => state.deleteResearchBlock);
  const pushToSection = useEditorStore(state => state.pushToSection);
  const loadCanvasLayout = useEditorStore(state => state.loadCanvasLayout);
  const saveCanvasLayout = useEditorStore(state => state.saveCanvasLayout);

  const isDirty = useEditorStore(state => state.isDirty);
  const isSaving = useEditorStore(state => state.isSaving);
  const saveDocument = useEditorStore(state => state.saveDocument);
  const isLoading = useEditorStore(state => state.isLoading);

  const masterDoc = useMemo(() => documents.find(d => d.metadata?.isMaster), [documents]);

  const traceSectionChain = useCallback((currentEdges: Edge[]): string[] => {
      const chain: string[] = [];
      let currentId = `literature`;
      const visited = new Set<string>();
      
      while (currentId) {
          visited.add(currentId);
          const edge = currentEdges.find(e => e.source === currentId);
          if (edge && edge.target && !visited.has(edge.target)) {
              if (edge.target.startsWith('section-')) {
                  const sectionId = edge.target.replace('section-', '');
                  chain.push(sectionId);
              }
              currentId = edge.target;
          } else {
              break;
          }
      }
      return chain;
  }, []);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'pane' | 'node';
    nodeId?: string;
  } | null>(null);
  
  // Modal states for creating a new document
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocAbstract, setNewDocAbstract] = useState('');

  // Modal state for creating research block
  const [showResearchBlockModal, setShowResearchBlockModal] = useState(false);
  const [newRBType, setNewRBType] = useState<ResearchBlockType>('notes');
  const [newRBTitle, setNewRBTitle] = useState('');

  // Push-to-section modal
  const [pushModal, setPushModal] = useState<{ blockId: string } | null>(null);

  // Load canvas layout on mount
  useEffect(() => {
    loadCanvasLayout(projectId);
  }, [projectId, loadCanvasLayout]);

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDocument();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveDocument]);

  // Debounced auto-save (saves 2.5 seconds after editing stops)
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      saveDocument();
    }, 2500);
    return () => clearTimeout(timer);
  }, [isDirty, saveDocument]);

  // Dynamically compute nodes and edges based on documents, headings, and tools
  const dynamicNodesAndEdges = useMemo(() => {
    const sortedBlocks = [...blocks].sort((a, b) => a.orderIndex - b.orderIndex);
    const headingBlocks = sortedBlocks.filter(b => b.type === 'HEADING' && b.content?.level === 1);
    
    const calculatedNodes: Node[] = [];
    const calculatedEdges: Edge[] = [];

    // 1. Render all Document Nodes (Top / Left column)
    const masterDoc = documents.find(d => d.metadata?.isMaster);
    const customDocs = documents.filter(d => !d.metadata?.isMaster);

    // Render Master Document Node in the middle top
    if (masterDoc) {
      calculatedNodes.push({
        id: `document-${masterDoc.id}`,
        type: 'documentNode',
        position: { x: 250, y: -200 },
        data: { 
          label: masterDoc.title, 
          documentId: masterDoc.id,
          projectId,
          status: masterDoc.status,
          abstract: masterDoc.abstract,
          isMaster: true,
          sectionsCount: headingBlocks.length,
        },
      });
    }

    // Render Custom Document Nodes in the left column
    customDocs.forEach((doc, index) => {
      const docSections = doc.metadata?.sections || [];
      calculatedNodes.push({
        id: `document-${doc.id}`,
        type: 'documentNode',
        position: { x: -150, y: index * 280 },
        data: { 
          label: doc.title, 
          documentId: doc.id,
          projectId,
          status: doc.status,
          abstract: doc.abstract,
          isMaster: false,
          sectionsCount: docSections.length,
          onDelete: (id: string) => deleteProjectDocument(id),
        },
      });

      // Draw connection lines from mapped Section Nodes to this Document Node
      docSections.forEach((secId: string) => {
        calculatedEdges.push({
          id: `edge-mapping-${secId}-${doc.id}`,
          source: `section-${secId}`,
          target: `document-${doc.id}`,
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5,5' },
        });
      });
    });

    // 2. Literature Survey Tool Node
    calculatedNodes.push({
      id: 'literature',
      type: 'phaseNode',
      position: { x: 250, y: 150 },
      data: { 
        label: 'Literature Survey', 
        phase: 'Database Tool',
        icon: '📚',
        description: 'Search OpenAlex and collect references for the bibliography.',
        hasInput: true,
        hasOutput: true,
      },
    });

    // Connect Master Document to Literature Tool
    if (masterDoc) {
      calculatedEdges.push({ 
        id: 'e-master-lit', 
        source: `document-${masterDoc.id}`, 
        target: 'literature', 
        animated: true, 
        style: { stroke: '#f59e0b', strokeWidth: 2 } 
      });
    }

    // 3. Partition sections into Connected and Disconnected
    const connectedSectionIds = masterDoc?.metadata?.sections || [];
    const connectedHeadingBlocks = connectedSectionIds
      .map((id: string) => headingBlocks.find(hb => hb.id === id))
      .filter((hb: any): hb is typeof headingBlocks[0] => !!hb);

    const disconnectedHeadingBlocks = headingBlocks.filter(hb => !connectedSectionIds.includes(hb.id));

    // Render Connected sections in the middle column
    let currentY = 350;
    let lastNodeId = 'literature';

    connectedHeadingBlocks.forEach((block: any, index: number) => {
      const nodeId = `section-${block.id}`;
      const titleText = block.content?.text || `Section ${index + 1}`;
      
      calculatedNodes.push({
        id: nodeId,
        type: 'phaseNode',
        position: { x: 250, y: currentY },
        data: { 
          label: titleText, 
          phase: `Section ${index + 1}`,
          icon: '🖋️',
          description: "Edit this section's paragraphs, equations, and references.",
          hasInput: true,
          hasOutput: true,
          hasRightOutput: true,
        },
      });

      calculatedEdges.push({ 
        id: `e-${lastNodeId}-${nodeId}`, 
        source: lastNodeId, 
        target: nodeId, 
        animated: true, 
        style: { stroke: '#f59e0b', strokeWidth: 2 } 
      });

      lastNodeId = nodeId;
      currentY += 200;

      // Connect the Analytics node adjacent to Data Analysis or Methodology headings
      const normalizedTitle = titleText.toLowerCase();
      const hasAnalytics = normalizedTitle.includes('analysis') || normalizedTitle.includes('methodology') || normalizedTitle.includes('نتائج');
      if (hasAnalytics) {
        const analyticsNodeId = `analytics-${block.id}`;
        calculatedNodes.push({
          id: analyticsNodeId,
          type: 'phaseNode',
          position: { x: 650, y: currentY - 200 },
          data: { 
            label: 'Statistical Engine', 
            phase: 'Estebian Core',
            icon: '📊',
            description: 'Run Python statistical models on datasets.',
            hasInput: true,
            hasOutput: true,
          },
        });

        // Edge feeding from Analytics Tool into this section
        calculatedEdges.push({ 
          id: `e-analytics-${block.id}`, 
          source: analyticsNodeId, 
          target: nodeId, 
          animated: true, 
          style: { stroke: '#10b981', strokeWidth: 2 } 
        });
      }

      // Section-level Citation Nodes
      const nextHeading = connectedHeadingBlocks[index + 1];
      const sectionBlocks = sortedBlocks.filter(b => 
          b.orderIndex > block.orderIndex && 
          (!nextHeading || b.orderIndex < nextHeading.orderIndex)
      );

      const citationPattern = /\[\[ref:([a-f0-9-,\s]+)\]\]/g;
      const citedRefIds = new Set<string>();
      
      for (const sb of sectionBlocks) {
          let text = '';
          if (sb.content) {
              if (typeof sb.content === 'string') text = sb.content;
              else if (typeof sb.content.text === 'string') text = sb.content.text;
              else text = JSON.stringify(sb.content);
          }
          
          let match;
          citationPattern.lastIndex = 0;
          while ((match = citationPattern.exec(text)) !== null) {
              const ids = match[1].split(',').map(id => id.trim()).filter(Boolean);
              for (const id of ids) {
                  citedRefIds.add(id);
              }
          }
      }

      const sectionLiteratureItems = Array.from(citedRefIds).map(refId => {
          const refBlock = blocks.find(b => b.id === refId && b.type === 'REFERENCE');
          if (!refBlock || !refBlock.content?.literatureItemId) return null;
          return literatureItems.find(li => li.id === refBlock.content.literatureItemId);
      }).filter(Boolean);

      if (sectionLiteratureItems.length > 0) {
        const citationNodeId = `citations-section-${block.id}`;
        calculatedNodes.push({
          id: citationNodeId,
          type: 'researchBlockNode',
          position: { x: hasAnalytics ? 930 : 650, y: currentY - 200 },
          data: {
            label: `Citations (${sectionLiteratureItems.length} papers)`,
            blockType: 'reference-collection',
            blockId: citationNodeId,
            projectId,
            itemCount: sectionLiteratureItems.length,
            contentPreview: sectionLiteratureItems.slice(0, 3).map(li => li?.title).join(', '),
            onPush: () => setSelectedNodeId(citationNodeId),
            onDelete: () => {},
          }
        });

        // Edge feeding from Section Node to Citation Node
        calculatedEdges.push({ 
          id: `e-citations-${block.id}`, 
          source: nodeId, 
          sourceHandle: 'right',
          target: citationNodeId, 
          animated: false, 
          style: { stroke: '#818cf8', strokeWidth: 2, strokeDasharray: '3,3' } 
        });
      }
    });

    // Render Disconnected (floating) sections in the left-hand column
    let disconnectedY = 350;
    disconnectedHeadingBlocks.forEach((block: any, index: number) => {
      const nodeId = `section-${block.id}`;
      const titleText = block.content?.text || `Section (Floating)`;
      
      calculatedNodes.push({
        id: nodeId,
        type: 'phaseNode',
        position: { x: 20, y: disconnectedY },
        data: { 
          label: titleText, 
          phase: 'Unconnected Section',
          icon: '⚠️',
          description: 'Drag connection from literature or another section to include this section in the paper.',
          hasInput: true,
          hasOutput: true,
        },
      });
      
      disconnectedY += 200;
    });

    // 4. Research Block Nodes (Right column)
    researchBlocks.forEach((rb, index) => {
      calculatedNodes.push({
        id: `research-${rb.id}`,
        type: 'researchBlockNode',
        position: { x: 650, y: index * 200 },
        data: {
          label: rb.title,
          blockType: rb.type,
          blockId: rb.id,
          projectId,
          contentPreview: rb.content?.text || rb.content?.surveyText || undefined,
          itemCount: rb.content?.itemCount,
          onDelete: (id: string) => {
            deleteResearchBlock(id);
            saveCanvasLayout(projectId);
          },
          onPush: (blockId: string) => setPushModal({ blockId }),
        },
      });
    });

    return { nodes: calculatedNodes, edges: calculatedEdges };
  }, [blocks, documents, researchBlocks, projectId, deleteProjectDocument, deleteResearchBlock, saveCanvasLayout]);

  // Sync state whenever dynamic layout updates
  useEffect(() => {
    if (dynamicNodesAndEdges.nodes.length > 0) {
      setNodes(dynamicNodesAndEdges.nodes);
      setEdges(dynamicNodesAndEdges.edges);
    }
  }, [dynamicNodesAndEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  // Handle Edge Deletion
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const nextEds = applyEdgeChanges(changes, eds);
        
        // Check if any edge removal changed the chain
        const removed = changes.some(c => c.type === 'remove');
        if (removed && masterDoc) {
          const newChain = traceSectionChain(nextEds);
          updateDocumentSections(masterDoc.id, newChain);
        }
        return nextEds;
      });
    },
    [masterDoc, traceSectionChain, updateDocumentSections]
  );

  // Handle Edge Connection / Drag Connection
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!masterDoc) return;
      
      const source = connection.source;
      const target = connection.target;
      if (!source || !target) return;

      const currentSections = [...(masterDoc.metadata?.sections || [])];
      const sourceId = source.replace('section-', '');
      const targetId = target.replace('section-', '');

      let newSections = [...currentSections];

      if (source === 'literature') {
          // Put target section at the start
          newSections = newSections.filter(id => id !== targetId);
          newSections.unshift(targetId);
      } else if (source.startsWith('section-') && target.startsWith('section-')) {
          // Put target section right after source section
          newSections = newSections.filter(id => id !== targetId);
          const sourceIndex = newSections.indexOf(sourceId);
          if (sourceIndex !== -1) {
              newSections.splice(sourceIndex + 1, 0, targetId);
          } else {
              // Fallback: if source is not in the chain, maybe target is.
              const targetIndex = newSections.indexOf(targetId);
              if (targetIndex !== -1) {
                  // Put source right before target
                  newSections = newSections.filter(id => id !== sourceId);
                  const newTargetIndex = newSections.indexOf(targetId);
                  newSections.splice(newTargetIndex, 0, sourceId);
              } else {
                  // Both are floating, append source then target
                  newSections = newSections.filter(id => id !== sourceId && id !== targetId);
                  newSections.push(sourceId, targetId);
              }
          }
      }

      updateDocumentSections(masterDoc.id, newSections);
    },
    [masterDoc, updateDocumentSections]
  );

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      setContextMenu({
        x: (event as any).clientX,
        y: (event as any).clientY,
        type: 'pane'
      });
    },
    []
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
        x: (event as any).clientX,
        y: (event as any).clientY,
        type: 'node',
        nodeId: node.id
      });
    },
    []
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const onNodeDoubleClick = (_: React.MouseEvent, node: Node) => {
    if (node.id.startsWith('document-')) {
      const docId = node.id.replace('document-', '');
      router.push(`/projects/${projectId}/documents/${docId}`);
    }
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
    setContextMenu(null);
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    try {
      await createProjectDocument(projectId, newDocTitle, newDocAbstract);
      setNewDocTitle('');
      setNewDocAbstract('');
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateResearchBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRBTitle.trim()) return;
    try {
      await createResearchBlock(projectId, newRBType, newRBTitle);
      setNewRBTitle('');
      setNewRBType('notes');
      setShowResearchBlockModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const headingBlocks = blocks.filter(b => b.type === 'HEADING' && b.content?.level === 1);

  const handlePushToSection = async (sectionId: string) => {
    if (!pushModal) return;
    await pushToSection(pushModal.blockId, sectionId);
    setPushModal(null);
  };

  const renderSidePanel = () => {
    if (!selectedNodeId) return null;

    const isSectionNode = selectedNodeId.startsWith('section-');
    const isAnalyticsNode = selectedNodeId.startsWith('analytics-');
    const isResearchNode = selectedNodeId.startsWith('research-');
    const isCitationsSectionNode = selectedNodeId.startsWith('citations-section-');
    const sectionBlockId = isSectionNode 
        ? selectedNodeId.replace('section-', '') 
        : isCitationsSectionNode 
        ? selectedNodeId.replace('citations-section-', '') 
        : null;
    const researchBlockId = isResearchNode ? selectedNodeId.replace('research-', '') : null;

    // Get section title for panel header
    let panelTitle = selectedNodeId.replace('-', ' ');
    if ((isSectionNode || isCitationsSectionNode) && sectionBlockId) {
      const headingBlock = blocks.find(b => b.id === sectionBlockId);
      panelTitle = isCitationsSectionNode 
        ? `Citations: ${headingBlock?.content?.text || 'Section'}`
        : headingBlock?.content?.text || panelTitle;
    } else if (isAnalyticsNode) {
      panelTitle = 'Statistical Engine';
    } else if (isResearchNode && researchBlockId) {
      const rb = researchBlocks.find(b => b.id === researchBlockId);
      panelTitle = rb?.title || 'Research Block';
    }

    const updateResearchBlockContent = useEditorStore.getState().updateResearchBlockContent;

    return (
      <div className="absolute top-0 right-0 h-full w-[600px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 shadow-2xl z-50 flex flex-col transition-transform transform translate-x-0 overflow-hidden animate-slide-in">
        <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-sm font-bold text-amber-400 truncate max-w-[450px]">
            {panelTitle}
          </h2>
          <button 
            onClick={() => setSelectedNodeId(null)}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700/50 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {selectedNodeId === 'literature' && (
            <div className="p-4"><LiteratureSurvey projectId={projectId} /></div>
          )}

          {isAnalyticsNode && (
            <div className="p-4"><DataAnalysisPanel projectId={projectId} /></div>
          )}

          {isSectionNode && sectionBlockId && (
            <SectionEditor sectionBlockId={sectionBlockId} />
          )}

          {isCitationsSectionNode && sectionBlockId && (() => {
            const headingBlock = blocks.find(b => b.id === sectionBlockId);
            const headingBlocks = blocks.filter(b => b.type === 'HEADING' && b.content?.level === 1);
            const sortedBlocks = [...blocks].sort((a, b) => a.orderIndex - b.orderIndex);
            const sortedHeadings = headingBlocks.sort((a, b) => a.orderIndex - b.orderIndex);
            const nextHeading = sortedHeadings[sortedHeadings.findIndex(b => b.id === sectionBlockId) + 1];
            const sectionBlocks = sortedBlocks.filter(b => 
                b.orderIndex > headingBlock!.orderIndex && 
                (!nextHeading || b.orderIndex < nextHeading.orderIndex)
            );
            
            const citationPattern = /\[\[ref:([a-f0-9-,\s]+)\]\]/g;
            const citedRefIds = new Set<string>();
            for (const sb of sectionBlocks) {
                let text = '';
                if (sb.content) {
                    if (typeof sb.content === 'string') text = sb.content;
                    else if (typeof sb.content.text === 'string') text = sb.content.text;
                    else text = JSON.stringify(sb.content);
                }
                let match;
                citationPattern.lastIndex = 0;
                while ((match = citationPattern.exec(text)) !== null) {
                    const ids = match[1].split(',').map(id => id.trim()).filter(Boolean);
                    for (const id of ids) {
                        citedRefIds.add(id);
                    }
                }
            }
            
            const sectionLiteratureItems = Array.from(citedRefIds).map(refId => {
                const refBlock = blocks.find(b => b.id === refId && b.type === 'REFERENCE');
                if (!refBlock || !refBlock.content?.literatureItemId) return null;
                return literatureItems.find(li => li.id === refBlock.content.literatureItemId);
            }).filter(Boolean);

            return (
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-indigo-400 font-semibold">
                  <span>📚</span>
                  <span>Section Citations</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-3">
                  Cited in: {headingBlock?.content?.text || 'Section'}
                </h3>
                
                {sectionLiteratureItems.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No citations found in this section yet.</p>
                ) : (
                  <div className="space-y-3">
                    {sectionLiteratureItems.map((item, idx) => (
                      <div key={item!.id} className="p-3 bg-slate-800/40 border border-slate-700/30 rounded-lg hover:border-slate-700/60 transition-colors">
                        <h4 className="text-xs font-bold text-slate-200 line-clamp-2">{item!.title}</h4>
                        <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                          <span>
                            {item!.authors && (typeof item!.authors === 'string' ? JSON.parse(item!.authors) : item!.authors).slice(0, 2).map((a: any) => a.name || a).join(', ')} 
                            {item!.authors && (typeof item!.authors === 'string' ? JSON.parse(item!.authors) : item!.authors).length > 2 && ' et al.'}
                          </span>
                          <span>{item!.year || 'N/A'}</span>
                        </div>
                        {item!.doi && (
                          <div className="text-[9px] text-indigo-400 font-mono mt-1 truncate">
                            {item!.doi.startsWith('10.') ? 'DOI' : 'ISBN'}: {item!.doi}
                          </div>
                        )}
                        {item!.abstract && (
                          <details className="mt-2">
                            <summary className="text-[9px] text-amber-500/70 hover:text-amber-500 cursor-pointer outline-none">View Abstract</summary>
                            <p className="text-[10px] text-slate-400 leading-relaxed mt-1 italic pl-2 border-l border-slate-700">{item!.abstract}</p>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {selectedNodeId.startsWith('document-') && (() => {
            const docId = selectedNodeId.replace('document-', '');
            const docObj = documents.find(d => d.id === docId);
            if (!docObj) return null;

            const sortedBlocks = [...blocks].sort((a, b) => a.orderIndex - b.orderIndex);

            return (
              <div className="flex-1 bg-white overflow-y-auto p-8 shadow-inner font-serif select-text text-slate-900 border-t border-slate-200">
                <div className="max-w-[500px] mx-auto space-y-6">
                  {/* Title */}
                  <h1 className="text-xl font-bold text-center text-slate-900 border-b pb-4 mb-4">
                    {docObj.title}
                  </h1>

                  {/* Abstract */}
                  {docObj.abstract && (
                    <div className="mb-6 px-4 py-3 bg-slate-50 border-l-4 border-slate-350 italic text-[11px] leading-relaxed text-slate-700">
                      <span className="font-bold font-sans not-italic text-slate-900 block mb-1">Abstract</span>
                      {docObj.abstract}
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="space-y-4 text-xs text-justify">
                    {sortedBlocks.map(block => {
                      if (block.type === 'HEADING') {
                        const level = block.content?.level || 1;
                        const sizeClass = level === 1 ? 'text-sm font-bold mt-6 mb-2 text-slate-900 border-b pb-1' : 'text-xs font-semibold mt-4 mb-2 text-slate-800';
                        return (
                          <h2 key={block.id} className={sizeClass}>
                            {block.content?.text}
                          </h2>
                        );
                      }

                      if (block.type === 'TEXT') {
                        return (
                          <p key={block.id} className="text-slate-800 leading-relaxed indent-4">
                            {block.content?.text}
                          </p>
                        );
                      }

                      if (block.type === 'REFERENCE') {
                        const lit = literatureItems.find(li => li.id === block.content?.literatureItemId);
                        return (
                          <div key={block.id} className="pl-4 -indent-4 text-[10px] text-slate-600 mt-2">
                            {lit ? `${Array.isArray(lit.authors) ? lit.authors.map((a: any) => a.name || a).join(', ') : typeof lit.authors === 'string' ? JSON.parse(lit.authors).map((a: any) => a.name || a).join(', ') : ''}. "${lit.title}" (${lit.year || 'n.d.'}).` : 'Reference not found'}
                          </div>
                        );
                      }

                      if (block.type === 'FIGURE') {
                        return (
                          <div key={block.id} className="my-4 text-center">
                            <div className="inline-block p-1 bg-slate-50 border border-slate-200 rounded max-w-xs mx-auto">
                              <span className="text-[10px] text-slate-400 select-none block">🖼️ Figure Block</span>
                            </div>
                            {block.content?.caption && (
                              <p className="text-[10px] text-slate-500 italic mt-1.5">
                                Figure: {block.content.caption}
                              </p>
                            )}
                          </div>
                        );
                      }

                      if (block.type === 'TABLE') {
                        return (
                          <div key={block.id} className="my-4 text-center">
                            <div className="inline-block p-1 bg-slate-50 border border-slate-200 rounded max-w-xs mx-auto">
                              <span className="text-[10px] text-slate-400 select-none block">📊 Table Block</span>
                            </div>
                            {block.content?.caption && (
                              <p className="text-[10px] text-slate-500 italic mt-1.5">
                                Table: {block.content.caption}
                              </p>
                            )}
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {isResearchNode && researchBlockId && (() => {
            const rb = researchBlocks.find(b => b.id === researchBlockId);
            if (!rb) return null;

            return (
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <span>{rb.type === 'notes' ? '💡' : rb.type === 'reference-collection' ? '📚' : rb.type === 'literature-survey' ? '📝' : rb.type === 'dataset' ? '📊' : '🧮'}</span>
                  <span>{rb.type.replace('-', ' ')}</span>
                </div>

                {/* Notes editor */}
                {rb.type === 'notes' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-400">Content</label>
                    <textarea
                      value={rb.content?.text || ''}
                      onChange={(e) => updateResearchBlockContent(rb.id, { text: e.target.value })}
                      placeholder="Write your research notes here..."
                      className="w-full h-64 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-purple-500/50 resize-none font-mono"
                    />
                  </div>
                )}

                {/* Literature survey editor */}
                {rb.type === 'literature-survey' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-400">Survey Text (Markdown)</label>
                    <textarea
                      value={rb.content?.surveyText || ''}
                      onChange={(e) => updateResearchBlockContent(rb.id, { ...rb.content, surveyText: e.target.value })}
                      placeholder="Write or paste the literature survey text..."
                      className="w-full h-64 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50 resize-none font-mono"
                    />
                  </div>
                )}

                {/* Dataset editor */}
                {rb.type === 'dataset' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-400">Data (JSON format)</label>
                    <textarea
                      value={typeof rb.content === 'string' ? rb.content : JSON.stringify(rb.content || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          updateResearchBlockContent(rb.id, parsed);
                        } catch {
                          updateResearchBlockContent(rb.id, e.target.value);
                        }
                      }}
                      placeholder='{"headers": ["X", "Y"], "rows": [["1", "2"]]}'
                      className="w-full h-64 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500/50 resize-none font-mono"
                    />
                  </div>
                )}

                {/* Analysis result viewer */}
                {rb.type === 'analysis-result' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-400">Result Data (JSON)</label>
                    <textarea
                      value={typeof rb.content === 'string' ? rb.content : JSON.stringify(rb.content || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          updateResearchBlockContent(rb.id, parsed);
                        } catch {
                          updateResearchBlockContent(rb.id, e.target.value);
                        }
                      }}
                      placeholder='{"result": {...}}'
                      className="w-full h-64 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50 resize-none font-mono"
                    />
                  </div>
                )}

                {/* Reference collection info */}
                {rb.type === 'reference-collection' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">
                      This block references your project&apos;s literature library. Use the Literature Survey tool to search and collect papers, then push them here.
                    </p>
                    <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                      <p className="text-sm text-indigo-300 font-medium">
                        {rb.content?.itemCount || 0} references collected
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => setPushModal({ blockId: rb.id })}
                    className="flex-1 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm font-semibold hover:bg-indigo-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Push to Section →</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(t('Are you sure you want to delete this research block?', 'هل أنت متأكد من حذف هذه الكتلة البحثية؟'))) {
                        deleteResearchBlock(rb.id);
                        saveCanvasLayout(projectId);
                        setSelectedNodeId(null);
                      }
                    }}
                    className="px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/20 transition-colors flex items-center justify-center"
                    title={t('Delete Block', 'حذف الكتلة')}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <span className="text-sm text-slate-400 font-medium tracking-wider animate-pulse">
            {t('Loading Canvas Nodes...', 'جاري تحميل عقد لوحة العمل...')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative bg-slate-950 flex flex-col font-sans">
      {/* Canvas Header Navigation */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link 
            href="/projects" 
            className="futuristic-btn-ghost flex items-center gap-2 bg-slate-900/80 backdrop-blur-md shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Projects
          </Link>

          {/* Save Status & Button */}
          <div className="flex items-center gap-2.5 bg-slate-900/80 backdrop-blur-md rounded-lg border border-slate-700/30 p-1 px-3 shadow-md">
            {isDirty && (
              <span className="text-[11px] text-amber-400 flex items-center gap-1.5 font-medium select-none">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Unsaved changes
              </span>
            )}
            {isSaving && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium select-none">
                <div className="w-3 h-3 border-2 border-slate-650 border-t-amber-400 rounded-full animate-spin" />
                Saving...
              </span>
            )}
            {!isDirty && !isSaving && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium select-none">
                <span className="text-emerald-400">✓</span> Saved
              </span>
            )}
            <button
              onClick={() => saveDocument()}
              disabled={!isDirty || isSaving}
              className="ml-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 disabled:opacity-30 disabled:hover:text-amber-400 transition-colors cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="futuristic-btn-primary flex items-center gap-2 bg-amber-500 hover:bg-amber-600 pointer-events-auto shadow-lg text-slate-950 font-bold"
        >
          <span>➕</span>
          <span>Create New Paper</span>
        </button>

        <button
          onClick={() => setShowResearchBlockModal(true)}
          className="futuristic-btn-primary flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 pointer-events-auto shadow-lg text-white font-bold"
        >
          <span>🧪</span>
          <span>Add Research Block</span>
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onMoveStart={() => setContextMenu(null)}
        nodeTypes={nodeTypes}
        fitView
        className="bg-slate-950"
      >
        <Background color="#1e293b" gap={24} size={2} />
        <Controls className="bg-slate-800 border-slate-700 fill-slate-300" />
      </ReactFlow>

      {renderSidePanel()}

      {/* Context Menu Overlay */}
      {contextMenu && (
        <div 
          className="fixed z-[100] w-56 bg-slate-950/95 backdrop-blur-xl border border-slate-800/80 rounded-xl shadow-2xl p-1.5 text-slate-200 text-xs font-sans animate-fade-in"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {/* Pane options */}
          {contextMenu.type === 'pane' && (
            <div className="space-y-1">
              <button
                onClick={() => {
                  setContextMenu(null);
                  const title = prompt(t('Enter section title:', 'أدخل عنوان القسم:'));
                  if (!title?.trim()) return;
                  (async () => {
                    const addBlock = useEditorStore.getState().addBlock;
                    const updateBlockContent = useEditorStore.getState().updateBlockContent;
                    const newBlockId = await addBlock('HEADING');
                    await updateBlockContent(newBlockId, { text: title, level: 1 });
                  })();
                }}
                className="w-full text-left px-3.5 py-2 rounded-lg hover:bg-amber-500 hover:text-slate-950 transition-colors flex items-center gap-2.5 font-medium"
              >
                <span>➕</span>
                <span>{t('Create New Section', 'إنشاء قسم جديد')}</span>
              </button>
              <button
                onClick={() => {
                  setContextMenu(null);
                  setShowResearchBlockModal(true);
                }}
                className="w-full text-left px-3.5 py-2 rounded-lg hover:bg-amber-500 hover:text-slate-950 transition-colors flex items-center gap-2.5 font-medium"
              >
                <span>🧪</span>
                <span>{t('Add Research Block', 'إضافة كتلة بحث')}</span>
              </button>
            </div>
          )}

          {/* Node options */}
          {contextMenu.type === 'node' && contextMenu.nodeId && (() => {
            const nodeId = contextMenu.nodeId;
            const isLiterature = nodeId === 'literature';
            const isAnalytics = nodeId.startsWith('analytics-');
            const isCitations = nodeId.startsWith('citations-');
            
            if (isLiterature || isAnalytics || isCitations) {
              return (
                <div className="px-3.5 py-2 text-slate-500 italic">
                  {t('System Node (Read-only)', 'عقدة النظام (للقراءة فقط)')}
                </div>
              );
            }

            const isDoc = nodeId.startsWith('document-');
            const isSec = nodeId.startsWith('section-');
            const isRes = nodeId.startsWith('research-');

            return (
              <div className="space-y-1">
                {/* Delete option */}
                <button
                  onClick={() => {
                    setContextMenu(null);
                    if (isDoc) {
                      const docId = nodeId.replace('document-', '');
                      if (confirm(t('Are you sure you want to delete this document?', 'هل أنت متأكد من حذف هذا المستند؟'))) {
                        deleteProjectDocument(docId);
                      }
                    } else if (isSec) {
                      const sectionId = nodeId.replace('section-', '');
                      const headingBlock = blocks.find(b => b.id === sectionId);
                      if (confirm(t(`Are you sure you want to delete the section "${headingBlock?.content?.text || 'Section'}"?`, `هل أنت متأكد من حذف القسم "${headingBlock?.content?.text || 'قسم'}"؟`))) {
                        (async () => {
                          await useEditorStore.getState().deleteBlock(sectionId);
                          setEdges(eds => {
                            const nextEds = eds.filter(e => e.source !== nodeId && e.target !== nodeId);
                            if (masterDoc) {
                              const newChain = traceSectionChain(nextEds);
                              updateDocumentSections(masterDoc.id, newChain);
                            }
                            return nextEds;
                          });
                        })();
                      }
                    } else if (isRes) {
                      const rbId = nodeId.replace('research-', '');
                      const rb = researchBlocks.find(b => b.id === rbId);
                      if (confirm(t(`Are you sure you want to delete the research block "${rb?.title || 'Block'}"?`, `هل أنت متأكد من حذف الكتلة البحثية "${rb?.title || 'كتلة'}"؟`))) {
                        deleteResearchBlock(rbId);
                        setSelectedNodeId(null);
                      }
                    }
                  }}
                  className="w-full text-left px-3.5 py-2 rounded-lg hover:bg-red-650 hover:text-white transition-colors flex items-center gap-2.5 font-medium"
                >
                  <span>🗑️</span>
                  <span>{t('Delete Node', 'حذف العقدة')}</span>
                </button>

                {/* Disconnect option (only for sections) */}
                {isSec && (
                  <button
                    onClick={() => {
                      setContextMenu(null);
                      setEdges(eds => {
                        const nextEds = eds.filter(e => e.source !== nodeId && e.target !== nodeId);
                        if (masterDoc) {
                          const newChain = traceSectionChain(nextEds);
                          updateDocumentSections(masterDoc.id, newChain);
                        }
                        return nextEds;
                      });
                    }}
                    className="w-full text-left px-3.5 py-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors flex items-center gap-2.5 font-medium"
                  >
                    <span>🔌</span>
                    <span>{t('Disconnect Section', 'قطع اتصال القسم')}</span>
                  </button>
                )}

                {/* Quick Connect (only for sections/literature to sections) */}
                {isSec && (() => {
                  const sectionId = nodeId.replace('section-', '');
                  const availableSections = blocks.filter(b => 
                    b.type === 'HEADING' && 
                    b.content?.level === 1 && 
                    b.id !== sectionId
                  );

                  if (availableSections.length === 0) return null;

                  return (
                    <div className="border-t border-slate-800/80 my-1 pt-1">
                      <div className="px-3.5 py-1 text-[9px] text-slate-500 font-semibold uppercase tracking-wider">
                        {t('Connect Downstream To', 'توصيل هابط إلى')}
                      </div>
                      {availableSections.map(s => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setContextMenu(null);
                            const newEdge: Edge = {
                              id: `e-${nodeId}-section-${s.id}`,
                              source: nodeId,
                              target: `section-${s.id}`,
                              animated: true,
                              style: { stroke: '#f59e0b', strokeWidth: 2 }
                            };
                            setEdges(eds => {
                              const nextEds = [...eds.filter(e => e.source !== nodeId), newEdge];
                              if (masterDoc) {
                                const newChain = traceSectionChain(nextEds);
                                updateDocumentSections(masterDoc.id, newChain);
                              }
                              return nextEds;
                            });
                          }}
                          className="w-full text-left px-4 py-1.5 rounded-lg hover:bg-amber-500 hover:text-slate-950 transition-colors truncate block text-[11px]"
                        >
                          {s.content?.text || 'Section'}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>
      )}

      {/* Modal for Creating New Document */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Create New Paper View</h2>
            <form onSubmit={handleCreateDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Paper Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Journal Version - Final Draft"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Abstract (Optional)</label>
                <textarea
                  placeholder="A short summary of this specific version..."
                  value={newDocAbstract}
                  onChange={(e) => setNewDocAbstract(e.target.value)}
                  className="w-full h-24 bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white outline-none focus:border-amber-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-sm transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Creating Research Block */}
      {showResearchBlockModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Add Research Block</h2>
            <form onSubmit={handleCreateResearchBlock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Block Type</label>
                <select
                  value={newRBType}
                  onChange={(e) => setNewRBType(e.target.value as ResearchBlockType)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                >
                  <option value="notes">💡 Free-form Notes</option>
                  <option value="reference-collection">📚 Reference Collection</option>
                  <option value="literature-survey">📝 Literature Survey</option>
                  <option value="dataset">📊 Dataset</option>
                  <option value="analysis-result">🧮 Analysis Result</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Temporal Resolution Survey, Simulation Dataset"
                  value={newRBTitle}
                  onChange={(e) => setNewRBTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResearchBlockModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg text-sm transition-colors"
                >
                  Add Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Push-to-Section Modal */}
      {pushModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Push to Section</h2>
            <p className="text-xs text-slate-400 mb-4">Select which section to inject this block&apos;s content into:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {headingBlocks.length === 0 && (
                <p className="text-xs text-slate-500 italic">No sections found. Create headings in the document first.</p>
              )}
              {headingBlocks.map((hb) => (
                <button
                  key={hb.id}
                  onClick={() => handlePushToSection(hb.id)}
                  className="w-full text-left px-3 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 hover:bg-slate-800 text-sm text-slate-200 transition-all flex items-center gap-2"
                >
                  <span className="text-indigo-400">🔗</span>
                  <span className="truncate">{hb.content?.text || 'Untitled Section'}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setPushModal(null)}
                className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
