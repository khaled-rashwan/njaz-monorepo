'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import { WorkflowPipelineNode } from './nodes/WorkflowPipelineNode';
import { StatisticalAnalysisNode } from './nodes/StatisticalAnalysisNode';
import { SimulationNode } from './nodes/SimulationNode';
import { ProcessingNode } from './nodes/ProcessingNode';
import { AnalysisNode } from './nodes/AnalysisNode';
import { ResultsTableNode } from './nodes/ResultsTableNode';
import { LiteratureSurvey } from '@/components/literature/LiteratureSurvey';
import { DataAnalysisPanel } from './DataAnalysisPanel';
import { SectionEditor } from '../editor/SectionEditor';
import { useEditorStore } from '@/store/editor-store';
import { useLanguage } from '@/components/LanguageContext';
import type { ResearchBlockType, ScholarBlock } from '@/types';
import Link from 'next/link';
import { client } from '@/lib/amplify-client';
import { v4 as uuidv4 } from 'uuid';
import { searchAllSources } from '@/lib/literature-api';
import { duplicateScholarProject } from '@/lib/duplicate-project';

const formatAuthors = (authors?: any[] | null) => {
  if (!authors || !Array.isArray(authors)) return 'Unknown Authors';
  const names = authors
    .map(a => {
      if (typeof a === 'string') return a.trim();
      if (a && typeof a === 'object') return (a.name || '').trim();
      return '';
    })
    .filter(name => name && name.toLowerCase() !== 'unknown' && name.toLowerCase() !== 'unknown author');
  if (names.length === 0) return 'Unknown Authors';
  return names.join(', ');
};

const nodeTypes = {
  phaseNode: PhaseNode,
  documentNode: DocumentNode,
  researchBlockNode: ResearchBlockNode,
  workflowPipelineNode: WorkflowPipelineNode,
  statisticalAnalysisNode: StatisticalAnalysisNode,
  simulationNode: SimulationNode,
  processingNode: ProcessingNode,
  analysisNode: AnalysisNode,
  resultsTableNode: ResultsTableNode,
};

export function ProjectCanvas({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const blocks = useEditorStore(state => state.blocks);
  const documents = useEditorStore(state => state.documents);
  const activeDocument = useEditorStore(state => state.document);
  const researchBlocks = useEditorStore(state => state.researchBlocks);
  const literatureItems = useEditorStore(state => state.literatureItems);
  const canvasLayout = useEditorStore(state => state.canvasLayout);
  
  const createProjectDocument = useEditorStore(state => state.createProjectDocument);
  const deleteProjectDocument = useEditorStore(state => state.deleteProjectDocument);
  const updateDocumentSections = useEditorStore(state => state.updateDocumentSections);
  const createResearchBlock = useEditorStore(state => state.createResearchBlock);
  const deleteResearchBlock = useEditorStore(state => state.deleteResearchBlock);
  const pushToSection = useEditorStore(state => state.pushToSection);
  const loadCanvasLayout = useEditorStore(state => state.loadCanvasLayout);
  const saveCanvasLayout = useEditorStore(state => state.saveCanvasLayout);
  const updateResearchBlockContent = useEditorStore(state => state.updateResearchBlockContent);
  const addLiteratureItem = useEditorStore(state => state.addLiteratureItem);
  const updateLiteratureItem = useEditorStore(state => state.updateLiteratureItem);

  const [sciHubCookie, setSciHubCookie] = useState(() => 
    typeof window !== 'undefined' ? localStorage.getItem('sci_hub_cookie') || '' : ''
  );

  // Citation surgical editing states
  const [editingPaperId, setEditingPaperId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthors, setEditAuthors] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editJournal, setEditJournal] = useState('');
  const [editDoi, setEditDoi] = useState('');
  const [editUrl, setEditUrl] = useState('');

  const [editSearchQuery, setEditSearchQuery] = useState('');
  const [editSearchResults, setEditSearchResults] = useState<any[]>([]);
  const [isSearchingEdit, setIsSearchingEdit] = useState(false);

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
  const edgesRef = useRef(edges);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
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

  // Manual paper form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthors, setManualAuthors] = useState('');
  const [manualYear, setManualYear] = useState('');
  const [manualDoi, setManualDoi] = useState('');
  const [manualUrl, setManualUrl] = useState('');

  // Duplicate project state
  const [isDuplicatingProject, setIsDuplicatingProject] = useState(false);

  const handleDuplicateProject = async () => {
    if (isDirty) {
      await saveDocument();
    }
    setIsDuplicatingProject(true);
    try {
      const copyTitle = `${activeDocument?.title || 'Research Project'} (Copy)`;
      const newProjId = await duplicateScholarProject(projectId, copyTitle);
      alert(t('Project duplicated successfully! Redirecting to the copy...', 'تم نسخ المشروع بنجاح! جارٍ الانتقال إلى النسخة...'));
      router.push(`/projects/${newProjId}`);
    } catch (err: any) {
      console.error('Failed to duplicate project from canvas:', err);
      alert(t('Failed to duplicate project: ', 'فشل في تكرار المشروع: ') + (err?.message || 'Error'));
    } finally {
      setIsDuplicatingProject(false);
    }
  };

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
    const getPosition = (nodeId: string, defaultPos: { x: number; y: number }) => {
      const saved = canvasLayout?.nodePositions?.find(p => p.id === nodeId);
      return saved ? saved.position : defaultPos;
    };

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
        position: getPosition(`document-${masterDoc.id}`, { x: 250, y: -200 }),
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
        position: getPosition(`document-${doc.id}`, { x: -150, y: index * 280 }),
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

    // 2. Reference Library Tool Node
    calculatedNodes.push({
      id: 'literature',
      type: 'phaseNode',
      position: getPosition('literature', { x: 650, y: -200 }),
      data: { 
        label: t('Reference Library', 'المكتبة المرجعية'), 
        phase: t('Master Bibliography', 'المراجع الرئيسية'),
        icon: '📚',
        description: t('Central repository of all referenced papers in the project.', 'المستودع المركزي لجميع الأوراق المرجعية في المشروع.'),
        hasInput: true,
        hasOutput: true,
      },
    });

    // Connect Master Document to Reference Library
    if (masterDoc) {
      calculatedEdges.push({ 
        id: 'e-master-lit', 
        source: `document-${masterDoc.id}`, 
        target: 'literature', 
        animated: true, 
        style: { stroke: '#818cf8', strokeWidth: 2, strokeDasharray: '4,4' } 
      });
    }

    // 3. Partition sections into Connected and Disconnected
    const connectedSectionIds = masterDoc?.metadata?.sections || [];
    const connectedHeadingBlocks = connectedSectionIds
      .map((id: string) => headingBlocks.find(hb => hb.id === id))
      .filter((hb: any): hb is typeof headingBlocks[0] => !!hb);

    const disconnectedHeadingBlocks = headingBlocks.filter(hb => !connectedSectionIds.includes(hb.id));

    // Render Connected sections in the middle column
    let currentY = 150;
    let lastNodeId = masterDoc ? `document-${masterDoc.id}` : 'literature';

    connectedHeadingBlocks.forEach((block: any, index: number) => {
      const nodeId = `section-${block.id}`;
      const titleText = block.content?.text || `Section ${index + 1}`;
      
      const isReferencesSec = titleText.trim().toLowerCase() === 'references';
      const isHidden = isReferencesSec && !!activeDocument?.metadata?.referencesHidden;

      calculatedNodes.push({
        id: nodeId,
        type: 'phaseNode',
        position: getPosition(nodeId, { x: 250, y: currentY }),
        data: { 
          label: titleText, 
          phase: `Section ${index + 1}`,
          icon: '🖋️',
          description: "Edit this section's paragraphs, equations, and references.",
          hasInput: true,
          hasOutput: true,
          hasRightOutput: true,
          isHidden,
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
          position: getPosition(citationNodeId, { x: 650, y: currentY - 200 }),
          data: {
            label: `Citations (${sectionLiteratureItems.length} papers)`,
            blockType: 'reference-collection',
            blockId: citationNodeId,
            projectId,
            itemCount: sectionLiteratureItems.length,
            contentPreview: sectionLiteratureItems.slice(0, 3).map(li => li?.title).join(', '),
            onPush: () => setSelectedNodeId(citationNodeId),
            onDelete: () => {},
            isHidden,
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
        position: getPosition(nodeId, { x: 20, y: disconnectedY }),
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
      let nodeType = 'researchBlockNode';
      if (rb.type === 'workflow-pipeline') nodeType = 'workflowPipelineNode';
      else if (rb.type === 'statistical-analysis') nodeType = 'statisticalAnalysisNode';
      else if (rb.type === 'simulation-engine') nodeType = 'simulationNode';
      else if (rb.type === 'processing-pipeline') nodeType = 'processingNode';
      else if (rb.type === 'llm-analysis') nodeType = 'analysisNode';
      else if (rb.type === 'results-table') nodeType = 'resultsTableNode';

      // Dynamically compute edges for block-to-block hierarchy
      if (rb.content?.sourceBlockId) {
        const sourceNodeId = rb.content.sourceBlockId === 'literature'
          ? 'literature'
          : rb.content.sourceBlockId.startsWith('section-')
          ? rb.content.sourceBlockId
          : `research-${rb.content.sourceBlockId}`;

        calculatedEdges.push({
          id: `e-rb-link-${rb.content.sourceBlockId}-${rb.id}`,
          source: sourceNodeId,
          target: `research-${rb.id}`,
          animated: true,
          style: { stroke: '#0ea5e9', strokeWidth: 2 } // sky blue stroke for provenance links
        });
      }

      calculatedNodes.push({
        id: `research-${rb.id}`,
        type: nodeType,
        position: getPosition(`research-${rb.id}`, { x: 650, y: index * 200 }),
        data: {
          label: rb.title,
          blockType: rb.type,
          blockId: rb.id,
          projectId,
          isHidden: rb.type === 'reference-collection' && !!activeDocument?.metadata?.referencesHidden,
          contentPreview: rb.content?.text || rb.content?.surveyText || undefined,
          itemCount: rb.content?.itemCount,
          pipelineVersion: rb.content?.pipelineVersion || 'V3',
          status: rb.content?.status || 'idle',
          confidenceAverage: rb.content?.outputs?.confidenceAverage,
          datasetPath: rb.content?.datasetPath,
          snapshotDelta: rb.content?.snapshotDelta,
          averageDelta: rb.content?.averageDelta,
          parameters: rb.content?.parameters,
          
          // Processing pipeline specific
          totalPapers: rb.content?.totalPapers,
          processedPapers: rb.content?.processedPapers,
          duplicatesRemoved: rb.content?.duplicatesRemoved,
          textsExtracted: rb.content?.textsExtracted,
          errorMessage: rb.content?.errorMessage,
          onProcess: async () => {
            updateResearchBlockContent(rb.id, {
              ...rb.content,
              status: 'processing',
              totalPapers: 0,
              processedPapers: 0,
              duplicatesRemoved: 0,
              textsExtracted: 0,
              errorMessage: undefined
            });

            // Find source papers
            const edge = edgesRef.current.find(e => e.target === `research-${rb.id}`);
            let papersToProcess: any[] = [];
            
            if (edge) {
              const sourceId = edge.source;
              if (sourceId === 'literature') {
                papersToProcess = literatureItems;
              } else if (sourceId.startsWith('research-')) {
                const sourceRbId = sourceId.replace('research-', '');
                const sourceRb = researchBlocks.find(b => b.id === sourceRbId);
                if (sourceRb?.type === 'literature-search') {
                  papersToProcess = sourceRb.content?.papers || [];
                } else if (sourceRb?.type === 'reference-collection') {
                  papersToProcess = sourceRb.content?.papers || [];
                }
              }
            } else {
              papersToProcess = literatureItems;
            }

            if (papersToProcess.length === 0) {
              updateResearchBlockContent(rb.id, {
                ...rb.content,
                status: 'failed',
                errorMessage: 'No papers found in source. Connect a search or reference collection node first.'
              });
              return;
            }

            // Deduplicate
            const seen = new Set<string>();
            const deduped: any[] = [];
            for (const paper of papersToProcess) {
              const titleKey = paper.title?.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
              const doiKey = paper.doi?.toLowerCase().trim();
              
              let isDuplicate = false;
              if (doiKey && seen.has(doiKey)) {
                isDuplicate = true;
              } else if (titleKey && seen.has(titleKey)) {
                isDuplicate = true;
              }
              
              if (!isDuplicate) {
                if (doiKey) seen.add(doiKey);
                if (titleKey) seen.add(titleKey);
                deduped.push(paper);
              }
            }

            const duplicatesRemovedCount = papersToProcess.length - deduped.length;

            updateResearchBlockContent(rb.id, {
              ...rb.content,
              status: 'processing',
              totalPapers: deduped.length,
              processedPapers: 0,
              duplicatesRemoved: duplicatesRemovedCount,
              textsExtracted: 0
            });

            // Extract texts
            let extractedCount = 0;
            const updatedFileStatus: Record<string, string> = {};

            for (let i = 0; i < deduped.length; i++) {
              const paper = deduped[i];
              const paperKey = paper.doi || paper.externalId || paper.id;
              
              try {
                const res = await fetch('/api/literature/download', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    projectId,
                    paperId: paperKey,
                    doi: paper.doi,
                    title: paper.title,
                    url: paper.url,
                    sciHubCookie: localStorage.getItem('sci_hub_cookie') || ''
                  })
                });

                if (res.ok) {
                  extractedCount++;
                  updatedFileStatus[paperKey] = 'full-text';
                } else {
                  updatedFileStatus[paperKey] = 'metadata-only';
                }
              } catch (err) {
                console.error("Failed to download paper:", paper.title, err);
                updatedFileStatus[paperKey] = 'metadata-only';
              }

              updateResearchBlockContent(rb.id, {
                ...rb.content,
                status: 'processing',
                totalPapers: deduped.length,
                processedPapers: i + 1,
                duplicatesRemoved: duplicatesRemovedCount,
                textsExtracted: extractedCount,
                fileStatus: updatedFileStatus
              });
            }

            // Save final result
            updateResearchBlockContent(rb.id, {
              ...rb.content,
              status: 'success',
              totalPapers: deduped.length,
              processedPapers: deduped.length,
              duplicatesRemoved: duplicatesRemovedCount,
              textsExtracted: extractedCount,
              papers: deduped,
              fileStatus: updatedFileStatus
            });

            setTimeout(() => {
              saveCanvasLayout(projectId);
            }, 500);
          },

          // LLM Analysis specific
          prompt: rb.content?.prompt,
          papersCount: rb.content?.papersCount,
          resultSummary: rb.content?.resultSummary,
          onAnalyze: async () => {
            const edge = edgesRef.current.find(e => e.target === `research-${rb.id}`);
            if (!edge) {
              updateResearchBlockContent(rb.id, {
                ...rb.content,
                status: 'failed',
                errorMessage: 'Please connect a Processing Pipeline node to the input of this Analysis node.'
              });
              return;
            }

            const sourceId = edge.source;
            const sourceRbId = sourceId.replace('research-', '');
            const sourceRb = researchBlocks.find(b => b.id === sourceRbId);

            if (!sourceRb || sourceRb.type !== 'processing-pipeline') {
              updateResearchBlockContent(rb.id, {
                ...rb.content,
                status: 'failed',
                errorMessage: 'The connected input must be a Processing Pipeline node.'
              });
              return;
            }

            const processedPapers = sourceRb.content?.papers || [];
            if (processedPapers.length === 0) {
              updateResearchBlockContent(rb.id, {
                ...rb.content,
                status: 'failed',
                errorMessage: 'The connected Processing Pipeline has no processed papers. Run it first.'
              });
              return;
            }

            updateResearchBlockContent(rb.id, {
              ...rb.content,
              status: 'analyzing',
              papersCount: processedPapers.length,
              errorMessage: undefined
            });

            try {
              const paperIds = processedPapers.map((p: any) => p.doi || p.externalId || p.id);
              const res = await fetch('/api/literature/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  projectId,
                  paperIds,
                  prompt: rb.content?.prompt || 'Classify these papers by methodology and security impact.',
                })
              });

              if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to analyze papers.');
              }

              const data = await res.json();

              // Update this node
              updateResearchBlockContent(rb.id, {
                ...rb.content,
                status: 'success',
                resultSummary: data.summary,
                columns: data.columns,
                rows: data.rows,
                summary: data.summary
              });

              // Push directly to connected results-table node if one exists
              const targetEdge = edgesRef.current.find(e => e.source === `research-${rb.id}`);
              if (targetEdge && targetEdge.target.startsWith('research-')) {
                const targetRbId = targetEdge.target.replace('research-', '');
                const targetRb = researchBlocks.find(b => b.id === targetRbId);
                if (targetRb && targetRb.type === 'results-table') {
                  updateResearchBlockContent(targetRb.id, {
                    ...targetRb.content,
                    status: 'ready',
                    columns: data.columns,
                    rows: data.rows,
                    summary: data.summary
                  });
                }
              }
            } catch (err: any) {
              updateResearchBlockContent(rb.id, {
                ...rb.content,
                status: 'failed',
                errorMessage: err.message || String(err)
              });
            }

            setTimeout(() => {
              saveCanvasLayout(projectId);
            }, 500);
          },

          // Results Table specific
          columns: rb.content?.columns,
          rows: rb.content?.rows,
          summary: rb.content?.summary,
          onExportCsv: () => {
            const columns = rb.content?.columns || [];
            const rows = rb.content?.rows || [];
            if (columns.length === 0 || rows.length === 0) return;
            
            const csvContent = [
              columns.join(','),
              ...rows.map((row: any) => columns.map((col: string) => `"${String(row[col] || '').replace(/"/g, '""')}"`).join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `${rb.title.toLowerCase().replace(/\s+/g, '_')}_results.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          },
          onExportMarkdown: () => {
            const columns = rb.content?.columns || [];
            const rows = rb.content?.rows || [];
            if (columns.length === 0 || rows.length === 0) return;

            const headerRow = `| ${columns.join(' | ')} |`;
            const separatorRow = `| ${columns.map(() => '---').join(' | ')} |`;
            const dataRows = rows.map((row: any) => `| ${columns.map((col: string) => String(row[col] || '').replace(/\|/g, '\\|')).join(' | ')} |`);
            
            const markdownContent = [headerRow, separatorRow, ...dataRows].join('\n');
            const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `${rb.title.toLowerCase().replace(/\s+/g, '_')}_results.md`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          },
          onPushToDoc: () => {
            setPushModal({ blockId: rb.id });
          },

          onDelete: (id: string) => {
            deleteResearchBlock(id);
            saveCanvasLayout(projectId);
          },
          onPush: (blockId: string) => setPushModal({ blockId }),
          onExecute: async () => {
            if (rb.type === 'workflow-pipeline') {
              updateResearchBlockContent(rb.id, { ...rb.content, status: 'extracting' });
              try {
                const response = await client.mutations.runResearchPipeline({
                  projectId,
                  pipelineVersion: rb.content?.pipelineVersion || 'V3',
                  inputs: JSON.stringify(rb.content?.inputs || {})
                });
                const resData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                updateResearchBlockContent(rb.id, {
                  ...rb.content,
                  status: 'success',
                  outputs: resData.outputs
                });
              } catch (err) {
                console.error("Pipeline run failed:", err);
                updateResearchBlockContent(rb.id, { ...rb.content, status: 'failed' });
              }
            } else if (rb.type === 'statistical-analysis') {
              updateResearchBlockContent(rb.id, { ...rb.content, status: 'running' });
              // Simulate python-like sandbox pandas aggregation
              setTimeout(() => {
                updateResearchBlockContent(rb.id, {
                  ...rb.content,
                  status: 'success',
                  datasetPath: `scholar-datasets/${projectId}/extracted_results.csv`,
                  resultCsvPath: `scholar-datasets/${projectId}/statistical_aggregates.csv`,
                  result: {
                    mean_confidence: 0.92,
                    total_papers: 2,
                    ita_violations_detected: true
                  }
                });
              }, 1500);
            } else if (rb.type === 'simulation-engine') {
              updateResearchBlockContent(rb.id, { ...rb.content, status: 'running' });
              try {
                const response = await client.mutations.runSimulationEngine({
                  projectId,
                  name: rb.title,
                  parameters: JSON.stringify(rb.content?.parameters || {})
                });
                const resData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                updateResearchBlockContent(rb.id, {
                  ...rb.content,
                  status: 'success',
                  snapshotDelta: resData.outputs.snapshotDelta,
                  averageDelta: resData.outputs.averageDelta,
                  trajectoryPoints: resData.outputs.trajectoryPoints,
                  trajectoryDataS3Key: resData.outputs.trajectoryDataS3Key
                });
              } catch (err) {
                console.error("Simulation run failed:", err);
                updateResearchBlockContent(rb.id, { ...rb.content, status: 'failed' });
              }
            }
            setTimeout(() => {
              saveCanvasLayout(projectId);
            }, 100);
          }
        },
      });
    });

    return { nodes: calculatedNodes, edges: calculatedEdges };
  }, [blocks, documents, researchBlocks, projectId, deleteProjectDocument, deleteResearchBlock, saveCanvasLayout, literatureItems, updateResearchBlockContent, canvasLayout]);

  // Sync state whenever dynamic layout updates
  useEffect(() => {
    if (dynamicNodesAndEdges.nodes.length > 0) {
      setNodes(dynamicNodesAndEdges.nodes);
      setEdges(dynamicNodesAndEdges.edges);
    }
  }, [dynamicNodesAndEdges]);

  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      const positions = [...(canvasLayout?.nodePositions || [])];
      const index = positions.findIndex(p => p.id === node.id);
      
      const newPos = { id: node.id, position: node.position || { x: 0, y: 0 } };
      if (index !== -1) {
        positions[index] = newPos;
      } else {
        positions.push(newPos);
      }

      useEditorStore.setState({
        canvasLayout: {
          ...canvasLayout,
          nodePositions: positions
        }
      });

      saveCanvasLayout(projectId);
    },
    [canvasLayout, projectId, saveCanvasLayout]
  );

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

      // Handle connections targeting a research block node
      if (target.startsWith('research-')) {
        const targetRbId = target.replace('research-', '');
        const targetRb = researchBlocks.find(b => b.id === targetRbId);
        if (targetRb) {
          const sourceId = source.startsWith('research-') ? source.replace('research-', '') : source;
          updateResearchBlockContent(targetRbId, {
            ...(targetRb.content || {}),
            sourceBlockId: sourceId
          });
          
          // Save canvas layout
          setTimeout(() => {
            saveCanvasLayout(projectId);
          }, 200);
          return;
        }
      }

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
    [masterDoc, updateDocumentSections, researchBlocks, updateResearchBlockContent, projectId, saveCanvasLayout]
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
                    {sectionLiteratureItems.map((item, idx) => {
                      const paper = item!;
                      const paperIdKey = paper.id;
                      const isEditing = editingPaperId === paperIdKey;

                      if (isEditing) {
                        return (
                          <div key={paperIdKey} className="p-3 bg-slate-900 border border-indigo-500/50 rounded-xl space-y-3">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 mb-1">
                              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Edit Reference Metadata</span>
                              <button 
                                onClick={() => {
                                  setEditingPaperId(null);
                                  setEditSearchResults([]);
                                }}
                                className="text-[10px] text-slate-500 hover:text-slate-350"
                              >
                                Cancel
                              </button>
                            </div>

                            {/* Online Auto-fill search box */}
                            <div className="p-2 bg-slate-950 rounded-lg space-y-1.5 border border-slate-850">
                              <label className="block text-[8px] text-amber-500 font-bold uppercase tracking-wider">Online Match & Fill</label>
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  placeholder="Search online to match paper..."
                                  value={editSearchQuery}
                                  onChange={(e) => setEditSearchQuery(e.target.value)}
                                  className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-white placeholder:text-slate-650 outline-none focus:border-amber-500/40"
                                />
                                <button
                                  type="button"
                                  disabled={isSearchingEdit}
                                  onClick={async () => {
                                    if (!editSearchQuery.trim()) return;
                                    setIsSearchingEdit(true);
                                    try {
                                      const results = await searchAllSources(editSearchQuery, ['openalex', 'semantic_scholar', 'crossref'], 3);
                                      setEditSearchResults(results);
                                    } catch (err) {
                                      console.error('Online match search failed:', err);
                                    } finally {
                                      setIsSearchingEdit(false);
                                    }
                                  }}
                                  className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-[9px] font-bold"
                                >
                                  {isSearchingEdit ? '...' : 'Search'}
                                </button>
                              </div>

                              {editSearchResults.length > 0 && (
                                <div className="space-y-1.5 max-h-28 overflow-y-auto pt-1.5 border-t border-slate-900">
                                  {editSearchResults.map((match: any, mIdx: number) => (
                                    <div key={mIdx} className="flex justify-between items-start gap-1.5 p-1 bg-slate-900/40 rounded text-[9px]">
                                      <div className="min-w-0 flex-1">
                                        <p className="text-slate-200 font-medium truncate" title={match.title}>{match.title}</p>
                                        <p className="text-slate-500 text-[8px]">
                                          {formatAuthors(match.authors)} ({match.year || 'N/A'})
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditTitle(match.title);
                                          setEditAuthors(formatAuthors(match.authors));
                                          setEditYear(match.year?.toString() || '');
                                          setEditJournal(match.journal || '');
                                          setEditDoi(match.doi || '');
                                          setEditUrl(match.url || '');
                                          setEditSearchResults([]);
                                        }}
                                        className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-[7px]"
                                      >
                                        Match
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Manual Fields */}
                            <div className="space-y-2">
                              <div>
                                <label className="block text-[8px] text-slate-550 uppercase font-semibold">Title</label>
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] text-slate-550 uppercase font-semibold">Authors (comma-separated)</label>
                                <input
                                  type="text"
                                  value={editAuthors}
                                  onChange={(e) => setEditAuthors(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[8px] text-slate-550 uppercase font-semibold">Year</label>
                                  <input
                                    type="number"
                                    value={editYear}
                                    onChange={(e) => setEditYear(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] text-slate-550 uppercase font-semibold">Journal</label>
                                  <input
                                    type="text"
                                    value={editJournal}
                                    onChange={(e) => setEditJournal(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[8px] text-slate-550 uppercase font-semibold">DOI</label>
                                  <input
                                    type="text"
                                    value={editDoi}
                                    onChange={(e) => setEditDoi(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] text-slate-550 uppercase font-semibold">URL</label>
                                  <input
                                    type="text"
                                    value={editUrl}
                                    onChange={(e) => setEditUrl(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-1.5 border-t border-slate-800">
                              <button
                                type="button"
                                onClick={async () => {
                                  const parsedAuthors = editAuthors.split(',').map(name => ({ name: name.trim() })).filter(a => a.name);
                                  const yearInt = parseInt(editYear) || new Date().getFullYear();
                                  
                                  // Update store literatureItems library
                                  await updateLiteratureItem(paper.id, {
                                    title: editTitle.trim(),
                                    authors: parsedAuthors,
                                    year: yearInt,
                                    journal: editJournal.trim() || undefined,
                                    doi: editDoi.trim() || undefined,
                                    url: editUrl.trim() || undefined
                                  });

                                  // Sync block in active document if exists
                                  const activeDoc = useEditorStore.getState().document;
                                  if (activeDoc) {
                                    const paperIdVal = paper.id || paper.externalId || paper.doi;
                                    const blockToUpdate = useEditorStore.getState().blocks.find(b => b.type === 'REFERENCE' && (b.content?.literatureItemId === paperIdVal || b.content?.literatureItemId === paper.id));
                                    if (blockToUpdate) {
                                      const firstAuthorName = parsedAuthors.length > 0 ? (parsedAuthors[0].name.split(' ').pop() || 'Unknown') : 'Unknown';
                                      const citationKey = `${firstAuthorName}, ${yearInt || 'n.d.'}`;
                                      const formattedCitation = `${formatAuthors(parsedAuthors)}, "${editTitle.trim()}", ${yearInt || 'n.d.'}.`;
                                      
                                      const { updateBlockContent } = useEditorStore.getState();
                                      updateBlockContent(blockToUpdate.id, {
                                        ...blockToUpdate.content,
                                        citationKey,
                                        formattedCitation
                                      });
                                    }
                                  }

                                  setEditingPaperId(null);
                                  setEditSearchResults([]);
                                }}
                                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold"
                              >
                                Save Changes
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPaperId(null);
                                  setEditSearchResults([]);
                                }}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-[10px]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={paper.id} className="p-3 bg-slate-800/40 border border-slate-700/30 rounded-lg hover:border-slate-700/60 transition-colors flex flex-col justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-slate-200 line-clamp-2">{paper.title}</h4>
                            <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                              <span>
                                {formatAuthors(paper.authors)}
                              </span>
                              <span>{paper.year || 'N/A'}</span>
                            </div>
                            {paper.doi && (
                              <div className="text-[9px] text-indigo-400 font-mono mt-1 truncate">
                                {paper.doi.startsWith('10.') ? 'DOI' : 'ISBN'}: {paper.doi}
                              </div>
                            )}
                            {paper.abstract && (
                              <details className="mt-2">
                                <summary className="text-[9px] text-amber-500/70 hover:text-amber-500 cursor-pointer outline-none">View Abstract</summary>
                                <p className="text-[10px] text-slate-400 leading-relaxed mt-1 italic pl-2 border-l border-slate-700">{paper.abstract}</p>
                              </details>
                            )}
                          </div>

                          <div className="flex justify-end gap-1.5 border-t border-slate-800/40 pt-1.5 mt-0.5">
                            <button
                              onClick={() => {
                                setEditingPaperId(paperIdKey);
                                setEditTitle(paper.title || '');
                                setEditAuthors(formatAuthors(paper.authors));
                                setEditYear(paper.year?.toString() || '');
                                setEditJournal(paper.journal || '');
                                setEditDoi(paper.doi || '');
                                setEditUrl(paper.url || '');
                                setEditSearchQuery(paper.title || '');
                                setEditSearchResults([]);
                              }}
                              className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors font-semibold"
                            >
                              ✏️ Edit Citation
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
                  <span>{rb.type === 'notes' ? '💡' : rb.type === 'reference-collection' ? '📚' : rb.type === 'literature-search' ? '🔍' : rb.type === 'literature-survey' ? '📝' : rb.type === 'dataset' ? '📊' : rb.type === 'analysis-result' ? '🧮' : rb.type === 'workflow-pipeline' ? '⚙️' : rb.type === 'statistical-analysis' ? '🧮' : '⚡'}</span>
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

                {/* Literature Search Block */}
                {rb.type === 'literature-search' && (
                  <div className="space-y-2">
                    <LiteratureSurvey projectId={projectId} blockId={rb.id} />
                  </div>
                )}

                {/* Reference collection info */}
                {rb.type === 'reference-collection' && (() => {
                  const papersList = rb.content?.papers || [];
                  const paperKeys = new Set(papersList.map((p: any) => p.doi || p.externalId || p.id));
                  const availableProjectPapers = literatureItems.filter((item: any) => !paperKeys.has(item.doi || item.externalId || item.id));

                  const handleAddManualPaper = async (e: React.FormEvent) => {
                    e.preventDefault();
                    if (!manualTitle.trim()) return;

                    const authorsArr = manualAuthors.split(',').map(name => ({ name: name.trim() })).filter(a => a.name);
                    const newPaper = {
                      id: uuidv4(),
                      title: manualTitle.trim(),
                      authors: authorsArr,
                      year: parseInt(manualYear) || new Date().getFullYear(),
                      doi: manualDoi.trim() || undefined,
                      url: manualUrl.trim() || undefined,
                      source: 'manual'
                    };

                    await addLiteratureItem({
                      id: newPaper.id,
                      projectId,
                      title: newPaper.title,
                      authors: newPaper.authors,
                      year: newPaper.year,
                      doi: newPaper.doi,
                      url: newPaper.url,
                      source: 'manual'
                    });

                    // Sync to document: Add REFERENCE block
                    const activeDoc = useEditorStore.getState().document;
                    if (activeDoc) {
                      const firstAuthorName = newPaper.authors.length > 0 ? (newPaper.authors[0].name.split(' ').pop() || 'Unknown') : 'Unknown';
                      const citationKey = `${firstAuthorName}, ${newPaper.year || 'n.d.'}`;
                      const formattedCitation = `${formatAuthors(newPaper.authors)}, "${newPaper.title}", ${newPaper.year || 'n.d.'}.`;
                      const orderIndex = Date.now();
                      const refBlock: ScholarBlock = {
                        id: uuidv4(),
                        documentId: activeDoc.id,
                        type: 'REFERENCE',
                        content: {
                          literatureItemId: newPaper.id,
                          citationKey,
                          formattedCitation,
                        },
                        metadata: {},
                        parentId: null,
                        orderIndex,
                      };
                      useEditorStore.setState(state => ({
                        blocks: [...state.blocks, refBlock]
                      }));
                      await client.models.ScholarBlock.create({
                        id: refBlock.id,
                        documentId: refBlock.documentId,
                        type: refBlock.type,
                        content: JSON.stringify(refBlock.content),
                        metadata: JSON.stringify(refBlock.metadata),
                        orderIndex: refBlock.orderIndex,
                      });
                    }

                    const updatedPapers = [...papersList, newPaper];
                    updateResearchBlockContent(rb.id, {
                      ...rb.content,
                      papers: updatedPapers
                    });

                    setManualTitle('');
                    setManualAuthors('');
                    setManualYear('');
                    setManualDoi('');
                    setManualUrl('');
                    setShowManualForm(false);
                  };

                  return (
                    <div className="space-y-4">
                      <p className="text-xs text-slate-400">
                        This block references your collected literature set. You can retrieve full texts, add/remove references, or configure inputs for LLM pipeline models below.
                      </p>
                      
                      <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-lg flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">Total Papers</span>
                        <span className="text-sm font-bold text-indigo-400">{papersList.length}</span>
                      </div>

                      <div className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-2">
                        <label className="block text-[10px] font-semibold text-slate-400">
                          {t('Sci-Hub Session Cookie (Optional)', 'ملفات تعريف ارتباط جلسة Sci-Hub (اختياري)')}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. __ddg1_=...; session=..."
                          value={sciHubCookie}
                          onChange={(e) => {
                            setSciHubCookie(e.target.value);
                            localStorage.setItem('sci_hub_cookie', e.target.value);
                          }}
                          className="futuristic-input w-full text-xs py-1"
                        />
                      </div>

                      {/* Add References Picker - Pick from bibliography library */}
                      {availableProjectPapers.length > 0 ? (
                        <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2.5">
                          <label className="block text-[10px] font-semibold text-slate-400">
                            {t('Add from Reference Library', 'إضافة من المكتبة المرجعية')}
                          </label>
                          <div className="flex gap-2">
                            <select
                              id="library-paper-picker"
                              className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500/50"
                            >
                              {availableProjectPapers.map((paper: any) => (
                                <option key={paper.id} value={paper.id}>
                                  {paper.title} ({paper.year || 'n.d.'})
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                const selectEl = document.getElementById('library-paper-picker') as HTMLSelectElement;
                                if (!selectEl) return;
                                const selectedId = selectEl.value;
                                const paperToAdd = availableProjectPapers.find(p => p.id === selectedId);
                                if (paperToAdd) {
                                  const updatedPapers = [...papersList, paperToAdd];
                                  updateResearchBlockContent(rb.id, {
                                    ...rb.content,
                                    papers: updatedPapers
                                  });
                                }
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-900/30 border border-slate-800/50 border-dashed rounded-xl text-center">
                          <p className="text-[10px] text-slate-500 italic">
                            {t('All Reference Library papers are already in this collection.', 'جميع أوراق المكتبة المرجعية موجودة بالفعل في هذه المجموعة.')}
                          </p>
                        </div>
                      )}

                      <div className="space-y-3">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Papers List</label>
                        {papersList.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">No papers collected in this set yet.</p>
                        ) : (
                          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                            {papersList.map((paper: any, idx: number) => {
                              const docStatus = rb.content?.fileStatus?.[paper.doi || paper.externalId || paper.id] || 'metadata-only';
                              const paperIdKey = paper.id || paper.doi || paper.externalId;
                              const isEditing = editingPaperId === paperIdKey;

                              if (isEditing) {
                                return (
                                  <div key={idx} className="p-3 bg-slate-900 border border-indigo-500/50 rounded-xl space-y-3">
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 mb-1">
                                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Edit Reference Metadata</span>
                                      <button 
                                        onClick={() => {
                                          setEditingPaperId(null);
                                          setEditSearchResults([]);
                                        }}
                                        className="text-[10px] text-slate-500 hover:text-slate-350"
                                      >
                                        Cancel
                                      </button>
                                    </div>

                                    {/* Online Auto-fill search box */}
                                    <div className="p-2 bg-slate-950 rounded-lg space-y-1.5 border border-slate-850">
                                      <label className="block text-[8px] text-amber-500 font-bold uppercase tracking-wider">Online Match & Fill</label>
                                      <div className="flex gap-1.5">
                                        <input
                                          type="text"
                                          placeholder="Search online to match paper..."
                                          value={editSearchQuery}
                                          onChange={(e) => setEditSearchQuery(e.target.value)}
                                          className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-white placeholder:text-slate-650 outline-none focus:border-amber-500/40"
                                        />
                                        <button
                                          type="button"
                                          disabled={isSearchingEdit}
                                          onClick={async () => {
                                            if (!editSearchQuery.trim()) return;
                                            setIsSearchingEdit(true);
                                            try {
                                              const results = await searchAllSources(editSearchQuery, ['openalex', 'semantic_scholar', 'crossref'], 3);
                                              setEditSearchResults(results);
                                            } catch (err) {
                                              console.error('Online match search failed:', err);
                                            } finally {
                                              setIsSearchingEdit(false);
                                            }
                                          }}
                                          className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-[9px] font-bold"
                                        >
                                          {isSearchingEdit ? '...' : 'Search'}
                                        </button>
                                      </div>

                                      {editSearchResults.length > 0 && (
                                        <div className="space-y-1.5 max-h-28 overflow-y-auto pt-1.5 border-t border-slate-900">
                                          {editSearchResults.map((match: any, mIdx: number) => (
                                            <div key={mIdx} className="flex justify-between items-start gap-1.5 p-1 bg-slate-900/40 rounded text-[9px]">
                                              <div className="min-w-0 flex-1">
                                                <p className="text-slate-200 font-medium truncate" title={match.title}>{match.title}</p>
                                                <p className="text-slate-500 text-[8px]">
                                                  {formatAuthors(match.authors)} ({match.year || 'N/A'})
                                                </p>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditTitle(match.title);
                                                  setEditAuthors(formatAuthors(match.authors));
                                                  setEditYear(match.year?.toString() || '');
                                                  setEditJournal(match.journal || '');
                                                  setEditDoi(match.doi || '');
                                                  setEditUrl(match.url || '');
                                                  setEditSearchResults([]);
                                                }}
                                                className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-[7px]"
                                              >
                                                Match
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Manual Fields */}
                                    <div className="space-y-2">
                                      <div>
                                        <label className="block text-[8px] text-slate-550 uppercase font-semibold">Title</label>
                                        <input
                                          type="text"
                                          value={editTitle}
                                          onChange={(e) => setEditTitle(e.target.value)}
                                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[8px] text-slate-550 uppercase font-semibold">Authors (comma-separated)</label>
                                        <input
                                          type="text"
                                          value={editAuthors}
                                          onChange={(e) => setEditAuthors(e.target.value)}
                                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[8px] text-slate-550 uppercase font-semibold">Year</label>
                                          <input
                                            type="number"
                                            value={editYear}
                                            onChange={(e) => setEditYear(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[8px] text-slate-550 uppercase font-semibold">Journal</label>
                                          <input
                                            type="text"
                                            value={editJournal}
                                            onChange={(e) => setEditJournal(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                                          />
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[8px] text-slate-550 uppercase font-semibold">DOI</label>
                                          <input
                                            type="text"
                                            value={editDoi}
                                            onChange={(e) => setEditDoi(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[8px] text-slate-550 uppercase font-semibold">URL</label>
                                          <input
                                            type="text"
                                            value={editUrl}
                                            onChange={(e) => setEditUrl(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex gap-2 pt-1.5 border-t border-slate-800">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const parsedAuthors = editAuthors.split(',').map(name => ({ name: name.trim() })).filter(a => a.name);
                                          const yearInt = parseInt(editYear) || new Date().getFullYear();
                                          
                                          // Update store literatureItems library
                                          await updateLiteratureItem(paper.id, {
                                            title: editTitle.trim(),
                                            authors: parsedAuthors,
                                            year: yearInt,
                                            journal: editJournal.trim() || undefined,
                                            doi: editDoi.trim() || undefined,
                                            url: editUrl.trim() || undefined
                                          });

                                          // Sync block in active document if exists
                                          const activeDoc = useEditorStore.getState().document;
                                          if (activeDoc) {
                                            const paperIdVal = paper.id || paper.externalId || paper.doi;
                                            const blockToUpdate = useEditorStore.getState().blocks.find(b => b.type === 'REFERENCE' && (b.content?.literatureItemId === paperIdVal || b.content?.literatureItemId === paper.id));
                                            if (blockToUpdate) {
                                              const firstAuthorName = parsedAuthors.length > 0 ? (parsedAuthors[0].name.split(' ').pop() || 'Unknown') : 'Unknown';
                                              const citationKey = `${firstAuthorName}, ${yearInt || 'n.d.'}`;
                                              const formattedCitation = `${formatAuthors(parsedAuthors)}, "${editTitle.trim()}", ${yearInt || 'n.d.'}.`;
                                              
                                              const { updateBlockContent } = useEditorStore.getState();
                                              updateBlockContent(blockToUpdate.id, {
                                                ...blockToUpdate.content,
                                                citationKey,
                                                formattedCitation
                                              });
                                            }
                                          }

                                          // Update local papers list inside Reference Collection block
                                          const updatedPaperObj = {
                                            ...paper,
                                            title: editTitle.trim(),
                                            authors: parsedAuthors,
                                            year: yearInt,
                                            journal: editJournal.trim() || undefined,
                                            doi: editDoi.trim() || undefined,
                                            url: editUrl.trim() || undefined
                                          };
                                          const updatedPapers = papersList.map((p: any) => (p.id === paper.id) ? updatedPaperObj : p);
                                          updateResearchBlockContent(rb.id, {
                                            ...rb.content,
                                            papers: updatedPapers
                                          });

                                          setEditingPaperId(null);
                                          setEditSearchResults([]);
                                        }}
                                        className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold"
                                      >
                                        Save Changes
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingPaperId(null);
                                          setEditSearchResults([]);
                                        }}
                                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-[10px]"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div key={idx} className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl space-y-2 flex flex-col justify-between">
                                  <div>
                                    <h4 className="text-xs font-bold text-indigo-200 line-clamp-2">{paper.title}</h4>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      {formatAuthors(paper.authors)} ({paper.year || 'N/A'})
                                    </p>
                                    {(paper.doi || paper.id) && (
                                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">ID/DOI: {paper.doi || paper.id}</p>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-850 mt-1">
                                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                                      docStatus === 'full-text' 
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                        : docStatus === 'downloading'
                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                                    }`}>
                                      {docStatus === 'full-text' ? '✓ Full Text' : docStatus === 'downloading' ? 'Downloading...' : 'Metadata Only'}
                                    </span>

                                    <div className="flex gap-1.5 items-center">
                                      <button
                                        onClick={async () => {
                                          const paperKey = paper.doi || paper.externalId || paper.id;
                                          if (!paperKey && !paper.url) return;
                                          const currentStatus = rb.content?.fileStatus || {};
                                          updateResearchBlockContent(rb.id, {
                                            ...rb.content,
                                            fileStatus: { ...currentStatus, [paperKey]: 'downloading' }
                                          });

                                          try {
                                            const res = await fetch(`/api/literature/download`, {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({
                                                projectId,
                                                paperId: paperKey,
                                                doi: paper.doi,
                                                title: paper.title,
                                                url: paper.url,
                                                sciHubCookie,
                                              })
                                            });
                                            if (res.ok) {
                                              const updatedStatus = rb.content?.fileStatus || {};
                                              updateResearchBlockContent(rb.id, {
                                                ...rb.content,
                                                fileStatus: { ...updatedStatus, [paperKey]: 'full-text' }
                                              });
                                            } else {
                                              throw new Error();
                                            }
                                          } catch {
                                            const updatedStatus = rb.content?.fileStatus || {};
                                            updateResearchBlockContent(rb.id, {
                                              ...rb.content,
                                              fileStatus: { ...updatedStatus, [paperKey]: 'metadata-only' }
                                            });
                                          }
                                        }}
                                        disabled={docStatus === 'downloading'}
                                        className="text-[9px] px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-colors font-semibold"
                                      >
                                        ⚡ Get Full Text
                                      </button>
                                      
                                      <button
                                        onClick={() => {
                                          setEditingPaperId(paperIdKey);
                                          setEditTitle(paper.title || '');
                                          setEditAuthors(formatAuthors(paper.authors));
                                          setEditYear(paper.year?.toString() || '');
                                          setEditJournal(paper.journal || '');
                                          setEditDoi(paper.doi || '');
                                          setEditUrl(paper.url || '');
                                          setEditSearchQuery(paper.title || '');
                                          setEditSearchResults([]);
                                        }}
                                        className="text-[9px] px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors font-semibold"
                                      >
                                        ✏️ Edit
                                      </button>

                                      <button
                                        onClick={async () => {
                                          // Sync to document: Delete REFERENCE block if exists
                                          const paperIdVal = paper.id || paper.externalId || paper.doi;
                                          const blockToDelete = useEditorStore.getState().blocks.find(b => b.type === 'REFERENCE' && (b.content?.literatureItemId === paperIdVal || b.content?.literatureItemId === paper.id));
                                          if (blockToDelete) {
                                            useEditorStore.setState(state => ({
                                              blocks: state.blocks.filter(b => b.id !== blockToDelete.id)
                                            }));
                                            try {
                                              await client.models.ScholarBlock.delete({ id: blockToDelete.id });
                                            } catch (err) {
                                              console.error('Failed to delete block from database:', err);
                                            }
                                          }

                                          const updatedPapers = papersList.filter((p: any) => (p.doi || p.externalId || p.id) !== (paper.doi || paper.externalId || paper.id));
                                          updateResearchBlockContent(rb.id, {
                                            ...rb.content,
                                            papers: updatedPapers
                                          });
                                        }}
                                        className="text-[9px] px-2 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors font-semibold"
                                      >
                                        ❌ Remove
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {rb.type === 'workflow-pipeline' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-800/40 border border-slate-700/30 rounded-lg">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Pipeline Version</label>
                      <select
                        value={rb.content?.pipelineVersion || 'V3'}
                        onChange={(e) => updateResearchBlockContent(rb.id, { ...rb.content, pipelineVersion: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 outline-none"
                      >
                        <option value="V1">V1: Standard Linear Truncation</option>
                        <option value="V3">V3: Smart Section-Aware Extraction</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-400">Search Query</label>
                      <input
                        type="text"
                        value={rb.content?.inputs?.query || ''}
                        onChange={(e) => updateResearchBlockContent(rb.id, {
                          ...rb.content,
                          inputs: { ...(rb.content?.inputs || {}), query: e.target.value }
                        })}
                        placeholder="e.g. Sub-hourly battery ramping anomalies"
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded px-3 py-1.5 text-xs text-slate-205 outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-400">Extraction Criteria (JSON)</label>
                      <textarea
                        value={rb.content?.inputs?.criteriaJson || '{}'}
                        onChange={(e) => updateResearchBlockContent(rb.id, {
                          ...rb.content,
                          inputs: { ...(rb.content?.inputs || {}), criteriaJson: e.target.value }
                        })}
                        className="w-full h-24 bg-slate-800/50 border border-slate-700/50 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono"
                      />
                    </div>

                    {rb.content?.outputs?.extractedPapers && (
                      <div className="space-y-3 pt-3 border-t border-slate-800">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Audit Trail (Extracted Papers)</h4>
                        {rb.content.outputs.extractedPapers.map((paper: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-850/50 border border-slate-750/30 rounded-lg space-y-2">
                            <div className="flex justify-between text-xs font-bold text-indigo-300">
                              <span className="truncate max-w-[350px]">{paper.title}</span>
                              <span className="text-emerald-400">{Math.round(paper.confidence_score * 100)}%</span>
                            </div>
                            <p className="text-[10px] text-slate-400">Authors: {paper.authors} ({paper.year})</p>
                            <div className="p-2 bg-slate-900/60 rounded border-l-2 border-indigo-500 italic text-[10px] text-slate-350">
                              "{paper.verbatim_quote}"
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {rb.type === 'statistical-analysis' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-400">Python Analysis Script</label>
                      <textarea
                        value={rb.content?.codeSource || ''}
                        onChange={(e) => updateResearchBlockContent(rb.id, { ...rb.content, codeSource: e.target.value })}
                        className="w-full h-64 bg-slate-800/50 border border-slate-700/50 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono"
                      />
                    </div>

                    {rb.content?.status === 'success' && (
                      <div className="space-y-2 pt-3 border-t border-slate-800">
                        <label className="block text-xs font-semibold text-slate-400 uppercase">Analysis Output Summary</label>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-3 bg-slate-800/60 rounded border border-slate-700/55">
                            <div className="text-slate-500">Mean Confidence</div>
                            <div className="text-base font-bold text-cyan-400">92%</div>
                          </div>
                          <div className="p-3 bg-slate-800/60 rounded border border-slate-700/55">
                            <div className="text-slate-500">Violations Detected</div>
                            <div className="text-base font-bold text-amber-400">YES</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {rb.type === 'simulation-engine' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-800/40 border border-slate-700/30 rounded-lg space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Asset Configuration Profile</label>
                        <select
                          value={rb.content?.parameters?.assetConfig || 'BESS'}
                          onChange={(e) => updateResearchBlockContent(rb.id, {
                            ...rb.content,
                            parameters: { ...(rb.content?.parameters || {}), assetConfig: e.target.value }
                          })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 outline-none"
                        >
                          <option value="BESS">BESS (Battery Energy Storage System)</option>
                          <option value="Solar PV">Solar Photovoltaic</option>
                          <option value="Wind Turbine">Wind Turbine Power Curve</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">
                          Timescale Step Resolution: {rb.content?.parameters?.timescale || 1} min
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="60"
                          value={rb.content?.parameters?.timescale || 1}
                          onChange={(e) => updateResearchBlockContent(rb.id, {
                            ...rb.content,
                            parameters: { ...(rb.content?.parameters || {}), timescale: parseInt(e.target.value) }
                          })}
                          className="w-full accent-amber-500"
                        />
                      </div>
                    </div>

                    {rb.content?.status === 'success' && rb.content?.trajectoryPoints && (
                      <div className="space-y-3 pt-3 border-t border-slate-800">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Snapshot vs Trajectory Verification (State of Charge %)
                        </h4>
                        
                        <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                          <svg viewBox="0 0 100 40" className="w-full h-32 overflow-visible">
                            <line x1="0" y1="20" x2="100" y2="20" stroke="#334155" strokeWidth="0.5" strokeDasharray="2,2" />
                            <line x1="0" y1="10" x2="100" y2="10" stroke="#334155" strokeWidth="0.5" strokeDasharray="2,2" />
                            <line x1="0" y1="30" x2="100" y2="30" stroke="#334155" strokeWidth="0.5" strokeDasharray="2,2" />
                            
                            <line x1="0" y1="20" x2="100" y2="20" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />
                            
                            <polyline
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="1.2"
                              points={rb.content.trajectoryPoints.map((p: any, i: number) => {
                                const x = (i / rb.content.trajectoryPoints.length) * 100;
                                const y = 38 - ((p.trajectorySoC) / 100) * 36;
                                return `${x},${y}`;
                              }).join(' ')}
                            />
                          </svg>
                          <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                            <span>0 min</span>
                            <span>30 min</span>
                            <span>60 min</span>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-900/60 rounded border border-slate-800 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Coarse Snapshot SoC:</span>
                            <span className="font-mono text-slate-350">50% constant</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Implicit Temporal Assumption Deviation:</span>
                            <span className="font-mono text-amber-500 font-bold">+{rb.content.snapshotDelta}% Anomaly</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {rb.type === 'processing-pipeline' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">
                      Deduplicate papers and extract full text from PDFs. Make sure you connect a Search or reference collection node to the input of this node.
                    </p>

                    <div className="p-3 bg-slate-800/40 border border-slate-700/30 rounded-lg space-y-2">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Status:</span>
                        <span className="font-bold uppercase text-cyan-400">{rb.content?.status || 'idle'}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Total Papers found:</span>
                        <span className="font-mono text-slate-200">{rb.content?.totalPapers || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Duplicates Removed:</span>
                        <span className="font-mono text-amber-400">{rb.content?.duplicatesRemoved || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Texts Extracted:</span>
                        <span className="font-mono text-emerald-400">{rb.content?.textsExtracted || 0}</span>
                      </div>
                    </div>

                    {rb.content?.errorMessage && (
                      <div className="p-3 bg-red-950/40 border border-red-800/30 rounded-lg text-xs text-red-300">
                        {rb.content.errorMessage}
                      </div>
                    )}

                    <button
                      onClick={async () => {
                        const node = nodes.find(n => n.id === `research-${rb.id}`);
                        if (node && node.data?.onProcess) {
                          (node.data.onProcess as any)();
                        }
                      }}
                      disabled={rb.content?.status === 'processing'}
                      className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors"
                    >
                      {rb.content?.status === 'processing' ? 'Processing...' : 'Run Pipeline'}
                    </button>
                  </div>
                )}

                {rb.type === 'llm-analysis' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">
                      Define your research classification or synthesis task. This node will run Gemini on the extracted text of all connected papers.
                    </p>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-400">Analysis Prompt</label>
                      <textarea
                        value={rb.content?.prompt || ''}
                        onChange={(e) => updateResearchBlockContent(rb.id, { ...rb.content, prompt: e.target.value })}
                        placeholder="e.g. Classify each paper by its primary cyber security methodology, extract a quote supporting this, and give a confidence rating."
                        className="w-full h-36 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500/50 resize-none font-mono"
                      />
                    </div>

                    <div className="p-3 bg-slate-800/40 border border-slate-700/30 rounded-lg space-y-2">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Status:</span>
                        <span className="font-bold uppercase text-violet-400">{rb.content?.status || 'idle'}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Papers Count:</span>
                        <span className="font-mono text-slate-200">{rb.content?.papersCount || 0}</span>
                      </div>
                    </div>

                    {rb.content?.resultSummary && (
                      <div className="p-3 bg-slate-850/50 border border-slate-800/50 rounded-lg space-y-1">
                        <label className="block text-[10px] uppercase font-bold text-violet-400">Synthesis Summary</label>
                        <p className="text-xs text-slate-300 leading-relaxed italic">"{rb.content.resultSummary}"</p>
                      </div>
                    )}

                    {rb.content?.errorMessage && (
                      <div className="p-3 bg-red-950/40 border border-red-800/30 rounded-lg text-xs text-red-300">
                        {rb.content.errorMessage}
                      </div>
                    )}

                    <button
                      onClick={async () => {
                        const node = nodes.find(n => n.id === `research-${rb.id}`);
                        if (node && node.data?.onAnalyze) {
                          (node.data.onAnalyze as any)();
                        }
                      }}
                      disabled={rb.content?.status === 'analyzing'}
                      className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors"
                    >
                      {rb.content?.status === 'analyzing' ? 'Analyzing...' : 'Run Analysis'}
                    </button>
                  </div>
                )}

                {rb.type === 'results-table' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">
                      Renders the final structured methodology and quote comparison table generated by LLM analysis.
                    </p>

                    {rb.content?.columns && rb.content?.rows && rb.content.rows.length > 0 ? (
                      <div className="space-y-4">
                        <div className="overflow-x-auto rounded-lg border border-slate-800/80 max-h-96">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="bg-slate-850 text-teal-400 border-b border-slate-800">
                                {rb.content.columns.map((col: string, i: number) => (
                                  <th key={i} className="px-3 py-2 font-bold whitespace-nowrap">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rb.content.rows.map((row: any, i: number) => (
                                <tr key={i} className="border-b border-slate-850 bg-slate-900/40 hover:bg-slate-850/30">
                                  {rb.content.columns.map((col: string, j: number) => {
                                    const val = row[col];
                                    const displayVal = typeof val === 'object' && val !== null 
                                      ? JSON.stringify(val) 
                                      : String(val || '');
                                    return (
                                      <td key={j} className="px-3 py-2 max-w-[200px] truncate" title={displayVal}>
                                        {displayVal || '—'}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {rb.content?.summary && (
                          <div className="p-3 bg-slate-800/20 border border-slate-800 rounded-lg">
                            <h4 className="text-[10px] font-bold text-teal-400 uppercase tracking-wide mb-1">Executive Summary</h4>
                            <p className="text-xs text-slate-300 leading-relaxed">{rb.content.summary}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const node = nodes.find(n => n.id === `research-${rb.id}`);
                              if (node && node.data?.onExportCsv) (node.data.onExportCsv as any)();
                            }}
                            className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700/50 text-xs font-semibold"
                          >
                            📥 Export CSV
                          </button>
                          <button
                            onClick={() => {
                              const node = nodes.find(n => n.id === `research-${rb.id}`);
                              if (node && node.data?.onExportMarkdown) (node.data.onExportMarkdown as any)();
                            }}
                            className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700/50 text-xs font-semibold"
                          >
                            📄 Export Markdown
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-500 italic bg-slate-950/20 border border-dashed border-slate-800 rounded-xl">
                        Awaiting data. Connect and run an LLM Analysis node.
                      </div>
                    )}
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

          {/* Duplicate Project (Reserve Status) Button */}
          <button
            onClick={handleDuplicateProject}
            disabled={isDuplicatingProject}
            className="futuristic-btn-ghost flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md text-[11px] font-medium text-slate-300 hover:text-cyan-300 border border-slate-700/40 hover:border-cyan-500/40 p-1 px-2.5 rounded-lg shadow-md transition-all"
            title={t('Duplicate project to preserve status before making edits', 'تكرار المشروع لحفظ حالته قبل التعديل')}
          >
            {isDuplicatingProject ? (
              <>
                <div className="w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                <span>{t('Duplicating...', 'جارٍ النسخ...')}</span>
              </>
            ) : (
              <>
                <span>📑</span>
                <span>{t('Duplicate Project', 'تكرار المشروع')}</span>
              </>
            )}
          </button>
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
        onNodeDragStop={onNodeDragStop}
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

            let isReferences = false;
            let referencesHidden = !!activeDocument?.metadata?.referencesHidden;
            if (isSec) {
              const sectionId = nodeId.replace('section-', '');
              const headingBlock = blocks.find(b => b.id === sectionId);
              isReferences = headingBlock?.content?.text?.trim().toLowerCase() === 'references';
            }

            return (
              <div className="space-y-1">
                {isReferences ? (
                  <button
                    onClick={() => {
                      setContextMenu(null);
                      useEditorStore.getState().toggleReferencesVisibility();
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-amber-400 hover:bg-slate-800 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>{referencesHidden ? '👁️' : '👁️‍🗨️'}</span>
                    <span>
                      {referencesHidden
                        ? t('Show References Section', 'إظهار قسم المراجع')
                        : t('Hide References Section', 'إخفاء قسم المراجع')}
                    </span>
                  </button>
                ) : (
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
                    className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/30 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>🗑️</span>
                    <span>{t('Delete', 'حذف')}</span>
                  </button>
                )}

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
                  <option value="reference-collection">📁 Reference Collection (Curated subset)</option>
                  <option value="literature-search">🔍 Literature Search Desk (Database Search)</option>
                  <option value="literature-survey">📝 (Legacy) Literature Survey Desk</option>
                  <option value="dataset">📊 Dataset</option>
                  <option value="analysis-result">🧮 Analysis Result</option>
                  <option value="workflow-pipeline">⚙️ Workflow Pipeline</option>
                  <option value="statistical-analysis">🧮 Statistical Analysis</option>
                  <option value="simulation-engine">⚡ Simulation Engine</option>
                  <option value="processing-pipeline">🔄 Processing Pipeline</option>
                  <option value="llm-analysis">🤖 LLM Analysis</option>
                  <option value="results-table">📋 Results Table</option>
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
