'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useEditorStore } from '@/store/editor-store';
import { ScholarLiteratureItem } from '@/types';

interface Node {
    id: string;
    label: string;
    type: 'paper' | 'author' | 'topic';
    year?: number;
    citations?: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    item?: ScholarLiteratureItem;
}

interface Link {
    source: string;
    target: string;
    strength: number;
}

export function LiteratureVisualizer() {
    const { t } = useLanguage();
    const { literatureItems, addBlock } = useEditorStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [viewMode, setViewMode] = useState<'network' | 'timeline' | 'quadtree'>('network');
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [filterTag, setFilterTag] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isExporting, setIsExporting] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Filter controls
    const [showAuthors, setShowAuthors] = useState(false);
    const [nodeLimit, setNodeLimit] = useState<number>(35);

    // Zoom & Pan state
    const transformRef = useRef({ k: 1, x: 0, y: 0 });

    // Quadtree interactive simulation points
    const [quadPoints, setQuadPoints] = useState<{ x: number; y: number; label: string }[]>([
        { x: 180, y: 150, label: 'Deep Learning' },
        { x: 220, y: 180, label: 'Transformers' },
        { x: 450, y: 120, label: 'Computer Vision' },
        { x: 480, y: 160, label: 'Diffusion Models' },
        { x: 380, y: 340, label: 'NLP' },
        { x: 140, y: 380, label: 'Reinforcement Learning' },
    ]);
    const [maxCapacity, setMaxCapacity] = useState<number>(2);

    // Build Graph Data
    const { nodes, links, allTags } = useMemo(() => {
        const nList: Node[] = [];
        const lList: Link[] = [];
        const tags = new Set<string>();

        // Sort items by citation count or recency
        const sortedItems = [...literatureItems].sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));
        const activeItems = sortedItems.slice(0, nodeLimit);

        activeItems.forEach((item, index) => {
            const angle = (index / Math.max(1, activeItems.length)) * Math.PI * 2;
            const dist = 140 + (index % 4) * 60;
            const citations = item.citationCount || 10;
            const radius = Math.min(26, Math.max(10, Math.sqrt(citations) * 2));

            if (item.tags) {
                item.tags.forEach(tag => tags.add(tag));
            }

            nList.push({
                id: item.id,
                label: item.title,
                type: 'paper',
                year: item.year || 2024,
                citations: item.citationCount || 0,
                x: 350 + Math.cos(angle) * dist,
                y: 280 + Math.sin(angle) * dist,
                vx: 0,
                vy: 0,
                radius,
                color: '#f59e0b', // Amber primary
                item,
            });

            // Optional author nodes
            if (showAuthors && item.authors && Array.isArray(item.authors)) {
                item.authors.slice(0, 2).forEach(author => {
                    const authorId = `author-${author.name}`;
                    let authorNode = nList.find(n => n.id === authorId);
                    if (!authorNode) {
                        authorNode = {
                            id: authorId,
                            label: author.name,
                            type: 'author',
                            x: 350 + (Math.random() - 0.5) * 300,
                            y: 280 + (Math.random() - 0.5) * 300,
                            vx: 0,
                            vy: 0,
                            radius: 7,
                            color: '#38bdf8', // Sky blue
                        };
                        nList.push(authorNode);
                    }
                    lList.push({
                        source: item.id,
                        target: authorId,
                        strength: 0.4,
                    });
                });
            }
        });

        // Interconnect papers from same year or overlapping tags
        for (let i = 0; i < activeItems.length; i++) {
            for (let j = i + 1; j < activeItems.length; j++) {
                const itemA = activeItems[i];
                const itemB = activeItems[j];
                if (itemA.year && itemB.year && Math.abs(itemA.year - itemB.year) <= 1) {
                    lList.push({
                        source: itemA.id,
                        target: itemB.id,
                        strength: 0.15,
                    });
                }
            }
        }

        return { nodes: nList, links: lList, allTags: Array.from(tags) };
    }, [literatureItems, nodeLimit, showAuthors]);

    // Canvas Force Animation & Resizing
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Auto-fit canvas to container
        const updateCanvasSize = () => {
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        updateCanvasSize();

        let animationFrameId: number;
        let isDragging = false;
        let isPanning = false;
        let startPan = { x: 0, y: 0 };
        let draggedNode: Node | null = null;

        const render = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;

            ctx.clearRect(0, 0, width, height);
            ctx.save();
            ctx.translate(transformRef.current.x, transformRef.current.y);
            ctx.scale(transformRef.current.k, transformRef.current.k);

            if (viewMode === 'network') {
                // Physics Simulation step
                nodes.forEach((n1, i) => {
                    nodes.forEach((n2, j) => {
                        if (i === j) return;
                        const dx = n2.x - n1.x;
                        const dy = n2.y - n1.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const minDist = n1.radius + n2.radius + 60;
                        if (dist < minDist) {
                            const force = (minDist - dist) / minDist * 0.5;
                            n1.vx -= (dx / dist) * force;
                            n1.vy -= (dy / dist) * force;
                        }
                    });

                    // Center gravity
                    const cdx = width / 2 - n1.x;
                    const cdy = height / 2 - n1.y;
                    n1.vx += cdx * 0.001;
                    n1.vy += cdy * 0.001;

                    // Apply velocities
                    if (n1 !== draggedNode) {
                        n1.x += n1.vx;
                        n1.y += n1.vy;
                        n1.vx *= 0.85;
                        n1.vy *= 0.85;
                    }
                });

                // Spring links
                links.forEach(link => {
                    const sourceNode = nodes.find(n => n.id === link.source);
                    const targetNode = nodes.find(n => n.id === link.target);
                    if (sourceNode && targetNode) {
                        const dx = targetNode.x - sourceNode.x;
                        const dy = targetNode.y - sourceNode.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const force = (dist - 140) * 0.005 * link.strength;

                        if (sourceNode !== draggedNode) {
                            sourceNode.vx += (dx / dist) * force;
                            sourceNode.vy += (dy / dist) * force;
                        }
                        if (targetNode !== draggedNode) {
                            targetNode.vx -= (dx / dist) * force;
                            targetNode.vy -= (dy / dist) * force;
                        }

                        // Draw link
                        ctx.beginPath();
                        ctx.moveTo(sourceNode.x, sourceNode.y);
                        ctx.lineTo(targetNode.x, targetNode.y);
                        ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
                        ctx.lineWidth = 1.2;
                        ctx.stroke();
                    }
                });

                // Draw Nodes
                nodes.forEach(node => {
                    const matchesTag = filterTag === 'all' || (node.item?.tags && node.item.tags.includes(filterTag));
                    const matchesSearch = !searchQuery || node.label.toLowerCase().includes(searchQuery.toLowerCase());
                    const isHighlighted = selectedNode?.id === node.id;
                    const opacity = matchesTag && matchesSearch ? 1 : 0.15;

                    ctx.save();
                    ctx.globalAlpha = opacity;

                    // Outer Halo
                    if (isHighlighted) {
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
                        ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
                        ctx.fill();
                    }

                    // Node Circle
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                    ctx.fillStyle = node.color;
                    ctx.shadowColor = node.color;
                    ctx.shadowBlur = isHighlighted ? 14 : 6;
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    // Text Label (Always clean & readable)
                    if (transformRef.current.k >= 0.7 || isHighlighted) {
                        ctx.fillStyle = isHighlighted ? '#ffffff' : '#e2e8f0';
                        ctx.font = isHighlighted ? 'bold 11px sans-serif' : '10px sans-serif';
                        ctx.textAlign = 'center';
                        const maxLen = isHighlighted ? 40 : 22;
                        const shortLabel = node.label.length > maxLen ? node.label.substring(0, maxLen - 2) + '…' : node.label;
                        ctx.fillText(shortLabel, node.x, node.y + node.radius + 14);
                    }

                    ctx.restore();
                });
            } else if (viewMode === 'timeline') {
                // Timeline layout
                const startX = 80;
                const endX = width - 80;
                const years = nodes.filter(n => n.year).map(n => n.year!) || [2024];
                const minYear = Math.min(...years, 2018);
                const maxYear = Math.max(...years, 2025);
                const yearSpan = Math.max(1, maxYear - minYear);

                // Draw Timeline Axis
                ctx.beginPath();
                ctx.moveTo(startX, height / 2);
                ctx.lineTo(endX, height / 2);
                ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Year ticks
                for (let y = minYear; y <= maxYear; y++) {
                    const tx = startX + ((y - minYear) / yearSpan) * (endX - startX);
                    ctx.fillStyle = '#94a3b8';
                    ctx.font = '11px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(y.toString(), tx, height / 2 + 26);

                    ctx.beginPath();
                    ctx.arc(tx, height / 2, 4, 0, Math.PI * 2);
                    ctx.fillStyle = '#f59e0b';
                    ctx.fill();
                }

                // Plot Papers along timeline
                nodes.forEach((node, i) => {
                    if (node.type !== 'paper' || !node.year) return;
                    const tx = startX + ((node.year - minYear) / yearSpan) * (endX - startX);
                    const offsetY = (i % 2 === 0 ? -1 : 1) * (40 + (i % 4) * 35);
                    const py = height / 2 + offsetY;

                    ctx.beginPath();
                    ctx.moveTo(tx, height / 2);
                    ctx.lineTo(tx, py);
                    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(tx, py, node.radius, 0, Math.PI * 2);
                    ctx.fillStyle = node.color;
                    ctx.fill();

                    ctx.fillStyle = '#e2e8f0';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    const shortLabel = node.label.length > 20 ? node.label.substring(0, 18) + '…' : node.label;
                    ctx.fillText(shortLabel, tx, py + (offsetY < 0 ? -12 : 20));
                });
            } else if (viewMode === 'quadtree') {
                // Interactive Quadtree Visualization
                const drawQuad = (x: number, y: number, w: number, h: number, pts: typeof quadPoints, depth: number) => {
                    ctx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0.2, 0.8 - depth * 0.15)})`;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, w, h);

                    if (pts.length > maxCapacity && depth < 4) {
                        const hw = w / 2;
                        const hh = h / 2;

                        const nw = pts.filter(p => p.x >= x && p.x < x + hw && p.y >= y && p.y < y + hh);
                        const ne = pts.filter(p => p.x >= x + hw && p.x <= x + w && p.y >= y && p.y < y + hh);
                        const sw = pts.filter(p => p.x >= x && p.x < x + hw && p.y >= y + hh && p.y <= y + h);
                        const se = pts.filter(p => p.x >= x + hw && p.x <= x + w && p.y >= y + hh && p.y <= y + h);

                        drawQuad(x, y, hw, hh, nw, depth + 1);
                        drawQuad(x + hw, y, hw, hh, ne, depth + 1);
                        drawQuad(x, y + hh, hw, hh, sw, depth + 1);
                        drawQuad(x + hw, y + hh, hw, hh, se, depth + 1);
                    }
                };

                drawQuad(20, 20, width - 40, height - 40, quadPoints, 0);

                // Draw points
                quadPoints.forEach(pt => {
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
                    ctx.fillStyle = '#f59e0b';
                    ctx.shadowColor = '#f59e0b';
                    ctx.shadowBlur = 8;
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    ctx.fillStyle = '#cbd5e1';
                    ctx.font = '10px sans-serif';
                    ctx.fillText(pt.label, pt.x + 10, pt.y + 4);
                });
            }

            ctx.restore();
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        // Mouse Interactivity (Drag nodes or Pan canvas)
        const handleMouseDown = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left - transformRef.current.x) / transformRef.current.k;
            const mouseY = (e.clientY - rect.top - transformRef.current.y) / transformRef.current.k;

            if (viewMode === 'quadtree') {
                setQuadPoints(prev => [...prev, { x: mouseX, y: mouseY, label: `Node ${prev.length + 1}` }]);
                return;
            }

            const clicked = nodes.find(n => {
                const dx = n.x - mouseX;
                const dy = n.y - mouseY;
                return Math.sqrt(dx * dx + dy * dy) <= n.radius + 6;
            });

            if (clicked) {
                isDragging = true;
                draggedNode = clicked;
                setSelectedNode(clicked);
            } else {
                isPanning = true;
                startPan = { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y };
                setSelectedNode(null);
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging && draggedNode) {
                const rect = canvas.getBoundingClientRect();
                draggedNode.x = (e.clientX - rect.left - transformRef.current.x) / transformRef.current.k;
                draggedNode.y = (e.clientY - rect.top - transformRef.current.y) / transformRef.current.k;
            } else if (isPanning) {
                transformRef.current.x = e.clientX - startPan.x;
                transformRef.current.y = e.clientY - startPan.y;
            }
        };

        const handleMouseUp = () => {
            isDragging = false;
            isPanning = false;
            draggedNode = null;
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            const newScale = Math.min(2.5, Math.max(0.4, transformRef.current.k * zoomFactor));
            transformRef.current.k = newScale;
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('resize', updateCanvasSize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('wheel', handleWheel);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('resize', updateCanvasSize);
        };
    }, [nodes, links, viewMode, filterTag, searchQuery, quadPoints, maxCapacity, selectedNode, isFullscreen]);

    const handleExportToFigure = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setIsExporting(true);
        try {
            await addBlock('FIGURE', undefined);
        } catch (err) {
            console.error('Failed to export visualization:', err);
        } finally {
            setIsExporting(false);
        }
    };

    const resetView = () => {
        transformRef.current = { k: 1, x: 0, y: 0 };
    };

    return (
        <div 
            className={`flex flex-col bg-slate-950 text-slate-100 p-3 space-y-3 ${
                isFullscreen 
                    ? 'fixed inset-4 z-50 rounded-2xl border border-amber-500/40 shadow-2xl backdrop-blur-xl bg-slate-950/95' 
                    : 'h-full min-h-[500px]'
            }`}
        >
            {/* Header & Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-inner">
                    <button
                        onClick={() => setViewMode('network')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            viewMode === 'network' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        🕸️ {t('Network', 'شبكة العلاقات')}
                    </button>
                    <button
                        onClick={() => setViewMode('timeline')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            viewMode === 'timeline' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        ⏱️ {t('Timeline', 'المخطط الزمني')}
                    </button>
                    <button
                        onClick={() => setViewMode('quadtree')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            viewMode === 'quadtree' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        🔲 {t('Quadtree', 'شجرة الفرز المكاني')}
                    </button>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={resetView}
                        className="futuristic-btn-ghost py-1 px-2.5 text-xs text-slate-300 hover:text-white"
                        title={t('Reset View', 'إعادة ضبط العرض')}
                    >
                        🔄 {t('Reset', 'إعادة ضبط')}
                    </button>

                    <button
                        onClick={handleExportToFigure}
                        disabled={isExporting}
                        className="futuristic-btn-ghost py-1 px-2.5 text-xs text-slate-300 hover:text-white flex items-center gap-1"
                        title={t('Export as Document Figure', 'تصدير كشكل توضيحي')}
                    >
                        📷 {t('Capture', 'التقاط')}
                    </button>

                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className={`py-1 px-2.5 text-xs font-medium rounded-lg border transition-colors ${
                            isFullscreen 
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                        }`}
                        title={isFullscreen ? t('Exit Fullscreen', 'تصغير') : t('Fullscreen Explorer', 'عرض ملء الشاشة')}
                    >
                        {isFullscreen ? '↙️ Exit' : '⛶ Fullscreen'}
                    </button>
                </div>
            </div>

            {/* Network Filters & Controls */}
            {viewMode === 'network' && (
                <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <input
                        type="text"
                        placeholder={t('Search papers & topics...', 'بحث في الأوراق والمفاهيم...')}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="futuristic-input flex-1 min-w-[140px] text-xs py-1.5 px-2.5"
                    />

                    {allTags.length > 0 && (
                        <select
                            value={filterTag}
                            onChange={e => setFilterTag(e.target.value)}
                            className="futuristic-input text-xs py-1.5 px-2 max-w-[120px]"
                        >
                            <option value="all">{t('All Tags', 'كل التصنيفات')}</option>
                            {allTags.map(tag => (
                                <option key={tag} value={tag}>{tag}</option>
                            ))}
                        </select>
                    )}

                    {/* Nodes Density Control */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span>{t('Density', 'الكثافة')}:</span>
                        <select
                            value={nodeLimit}
                            onChange={e => setNodeLimit(parseInt(e.target.value))}
                            className="futuristic-input text-xs py-1 px-2"
                        >
                            <option value={20}>20</option>
                            <option value={35}>35</option>
                            <option value={60}>60</option>
                            <option value={100}>100</option>
                        </select>
                    </div>

                    <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={showAuthors}
                            onChange={e => setShowAuthors(e.target.checked)}
                            className="accent-amber-500 rounded"
                        />
                        <span>{t('Authors', 'المؤلفون')}</span>
                    </label>
                </div>
            )}

            {viewMode === 'quadtree' && (
                <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <span>{t('Click canvas to place spatial concept points • Drag to inspect', 'انقر لإضافة نقاط مفاهيمية • اسحب للتنقل')}</span>
                    <div className="flex items-center gap-2">
                        <span>{t('Capacity', 'السعة')}:</span>
                        <input
                            type="range"
                            min="1"
                            max="5"
                            value={maxCapacity}
                            onChange={e => setMaxCapacity(parseInt(e.target.value))}
                            className="w-20 h-1.5 accent-amber-500"
                        />
                        <span className="text-amber-400 font-mono font-bold">{maxCapacity}</span>
                    </div>
                </div>
            )}

            {/* Visualizer Canvas Area */}
            <div 
                ref={containerRef} 
                className="relative flex-1 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden min-h-[420px]"
            >
                <canvas
                    ref={canvasRef}
                    className="w-full h-full cursor-grab active:cursor-grabbing"
                />

                {/* Legend Overlay */}
                <div className="absolute top-3 left-3 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-3 backdrop-blur-md">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Papers</span>
                    {showAuthors && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Authors</span>}
                    <span className="text-slate-500">Scroll: Zoom | Drag: Pan</span>
                </div>

                {/* Inspect Card Overlay */}
                {selectedNode && (
                    <div className="absolute bottom-4 left-4 right-4 max-w-lg mx-auto p-3.5 rounded-xl bg-slate-900/95 border border-amber-500/40 backdrop-blur-xl text-xs shadow-2xl animate-fade-in">
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20">
                                    {selectedNode.type}
                                </span>
                                <h4 className="font-semibold text-white leading-snug">{selectedNode.label}</h4>
                                {selectedNode.item && (
                                    <div className="text-slate-400 text-[11px] space-y-0.5">
                                        <p>{selectedNode.item.journal || 'Journal Article'} • {selectedNode.year || 'N/A'}</p>
                                        <p className="text-amber-400/90 font-mono">🌟 {selectedNode.citations} {t('citations', 'استشهاد')}</p>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedNode(null)}
                                className="text-slate-400 hover:text-white p-1"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
