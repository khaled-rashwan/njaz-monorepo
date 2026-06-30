'use client';

import { BlockProps, CodeContent as CodeContentType } from '@/types';
import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageContext';

const LANGUAGES = [
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'r', label: 'R' },
    { value: 'julia', label: 'Julia' },
    { value: 'octave', label: 'Octave (MATLAB)' },
    { value: 'cpp', label: 'C++' },
    { value: 'java', label: 'Java' },
    { value: 'rust', label: 'Rust' },
    { value: 'go', label: 'Go' },
    { value: 'bash', label: 'Bash' },
];

export function CodeBlock({ block, isFocused, onContentChange, onFocus }: BlockProps) {
    const { t } = useLanguage();
    const content = { code: '', language: 'python', showLineNumbers: true, ...block.content } as CodeContentType;
    const [output, setOutput] = useState<{ 
        stdout?: string; 
        stderr?: string; 
        exitCode?: number; 
        visualContainer?: HTMLDivElement;
    } | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [pyodideStatus, setPyodideStatus] = useState<string | null>(null);
    const visualRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (visualRef.current) {
            visualRef.current.innerHTML = '';
            if (output?.visualContainer) {
                visualRef.current.appendChild(output.visualContainer);
            }
        }
    }, [output?.visualContainer, isFocused]);

    const runPythonLocal = async (code: string) => {
        setPyodideStatus(t('Loading Pyodide runtime (WASM)...', 'جارٍ تحميل بيئة عمل Pyodide (WASM)...'));
        try {
            if (typeof window === 'undefined') return;
            if (!(window as any).loadPyodide) {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error('Failed to load Pyodide runtime script.'));
                    document.head.appendChild(script);
                });
            }

            let pyInstance = (window as any)._pyodideInstance;
            if (!pyInstance) {
                pyInstance = await (window as any).loadPyodide({
                    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
                });
                (window as any)._pyodideInstance = pyInstance;
            }

            const packagesToLoad: string[] = [];
            if (code.includes('numpy')) packagesToLoad.push('numpy');
            if (code.includes('pandas')) packagesToLoad.push('pandas');
            if (code.includes('matplotlib')) packagesToLoad.push('matplotlib');
            if (code.includes('scipy')) packagesToLoad.push('scipy');
            
            if (packagesToLoad.length > 0) {
                setPyodideStatus(t(`Loading packages (${packagesToLoad.join(', ')})...`, `جارٍ تحميل المكتبات (${packagesToLoad.join(', ')})...`));
                await pyInstance.loadPackage(packagesToLoad);
            }

            setPyodideStatus(t('Running Python script...', 'جارٍ تشغيل كود بايثون...'));

            const logs: string[] = [];
            const errors: string[] = [];
            pyInstance.setStdout({
                batched: (text: string) => {
                    logs.push(text);
                }
            });
            pyInstance.setStderr({
                batched: (text: string) => {
                    errors.push(text);
                }
            });

            let wrappedCode = `
import sys
import io
import base64

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
except ImportError:
    pass

${code}

img_data = None
try:
    import matplotlib.pyplot as plt
    if plt.get_fignums():
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close('all')
        buf.seek(0)
        img_data = base64.b64encode(buf.read()).decode('utf-8')
except Exception as e:
    print("Matplotlib export warning:", str(e), file=sys.stderr)
`;

            await pyInstance.runPythonAsync(wrappedCode);

            const imgData = pyInstance.globals.get('img_data');
            
            let outputVisual = undefined;
            if (imgData) {
                const imgElement = document.createElement('img');
                imgElement.src = `data:image/png;base64,${imgData}`;
                imgElement.className = "max-w-full h-auto rounded shadow bg-white border border-slate-700/30";
                
                const wrapper = document.createElement('div');
                wrapper.className = "flex justify-center p-2 bg-[#0d1117] w-full";
                wrapper.appendChild(imgElement);
                outputVisual = wrapper;
            }

            setOutput({
                stdout: logs.join('\n'),
                stderr: errors.join('\n'),
                exitCode: errors.length === 0 ? 0 : 1,
                visualContainer: outputVisual,
            });

        } catch (err: any) {
            setOutput({
                stderr: err.message || 'Execution error',
                exitCode: 1,
            });
        } finally {
            setPyodideStatus(null);
        }
    };

    const runJavaScript = (code: string) => {
        const logs: string[] = [];
        const errors: string[] = [];
        
        const originalLog = console.log;
        const originalError = console.error;
        
        console.log = (...args) => {
            logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '));
            originalLog(...args);
        };
        console.error = (...args) => {
            errors.push(args.map(arg => String(arg)).join(' '));
            originalError(...args);
        };

        const containerElement = document.createElement('div');
        containerElement.className = "empty:hidden mt-2 p-2 rounded bg-slate-950/20 border border-slate-800/50 flex flex-col justify-center items-center overflow-auto gap-2";
        
        try {
            let executableCode = code;
            if (content.language === 'typescript') {
                // Strip basic type annotations to run simple TS as JS
                executableCode = code
                    .replace(/:\s*(string|number|boolean|any|void|object|unknown|never)/g, '')
                    .replace(/\bas\s+(string|number|boolean|any|void|object|unknown|never)/g, '');
            }

            const helperCode = `
                const createCanvas = (w = 400, h = 250) => {
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    canvas.className = "bg-white rounded shadow-sm max-w-full";
                    container.appendChild(canvas);
                    return canvas;
                };
                const createSVG = (w = 300, h = 150) => {
                    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    svg.setAttribute("width", w);
                    svg.setAttribute("height", h);
                    svg.className = "bg-slate-900 rounded max-w-full";
                    container.appendChild(svg);
                    return svg;
                };
                const plotEquation = (fn, minX = -10, maxX = 10, minY = null, maxY = null) => {
                    const canvas = createCanvas(400, 240);
                    const ctx = canvas.getContext('2d');
                    const w = canvas.width;
                    const h = canvas.height;
                    const pad = 30;
                    
                    const points = [];
                    const steps = 200;
                    let computedMinY = Infinity;
                    let computedMaxY = -Infinity;
                    
                    for (let i = 0; i <= steps; i++) {
                        const x = minX + (i / steps) * (maxX - minX);
                        const y = fn(x);
                        points.push({ x, y });
                        if (y < computedMinY) computedMinY = y;
                        if (y > computedMaxY) computedMaxY = y;
                    }
                    
                    const yMin = minY !== null ? minY : computedMinY;
                    const yMax = maxY !== null ? maxY : computedMaxY;
                    
                    const mapX = (x) => pad + ((x - minX) / (maxX - minX)) * (w - 2 * pad);
                    const mapY = (y) => h - pad - ((y - yMin) / (yMax - yMin)) * (h - 2 * pad);
                    
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 1;
                    ctx.fillStyle = '#64748b';
                    ctx.font = '10px sans-serif';
                    
                    const xZero = Math.max(minX, Math.min(maxX, 0));
                    const canvasXZero = mapX(xZero);
                    ctx.beginPath();
                    ctx.moveTo(canvasXZero, pad);
                    ctx.lineTo(canvasXZero, h - pad);
                    ctx.stroke();
                    
                    const yZero = Math.max(yMin, Math.min(yMax, 0));
                    const canvasYZero = mapY(yZero);
                    ctx.beginPath();
                    ctx.moveTo(pad, canvasYZero);
                    ctx.lineTo(w - pad, canvasYZero);
                    ctx.stroke();
                    
                    ctx.strokeStyle = '#3b82f6';
                    ctx.lineWidth = 1.5;
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
                    
                    ctx.strokeStyle = '#f59e0b';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    points.forEach((p, idx) => {
                        const cx = mapX(p.x);
                        const cy = mapY(p.y);
                        if (idx === 0) ctx.moveTo(cx, cy);
                        else ctx.lineTo(cx, cy);
                    });
                    ctx.stroke();
                    
                    ctx.fillStyle = '#475569';
                    ctx.fillText(minX.toFixed(1), pad, canvasYZero + 12);
                    ctx.fillText(maxX.toFixed(1), w - pad - 20, canvasYZero + 12);
                    ctx.fillText(yMax.toFixed(1), canvasXZero + 5, pad + 10);
                    ctx.fillText(yMin.toFixed(1), canvasXZero + 5, h - pad - 2);
                };
                const plotPoints = (points, minX = null, maxX = null, minY = null, maxY = null) => {
                    if (!points || points.length === 0) return;
                    let computedMinX = Infinity, computedMaxX = -Infinity;
                    let computedMinY = Infinity, computedMaxY = -Infinity;
                    
                    points.forEach(p => {
                        if (p.x < computedMinX) computedMinX = p.x;
                        if (p.x > computedMaxX) computedMaxX = p.x;
                        if (p.y < computedMinY) computedMinY = p.y;
                        if (p.y > computedMaxY) computedMaxY = p.y;
                    });
                    
                    const xMin = minX !== null ? minX : computedMinX;
                    const xMax = maxX !== null ? maxX : computedMaxX;
                    const yMin = minY !== null ? minY : computedMinY;
                    const yMax = maxY !== null ? maxY : computedMaxY;
                    
                    const canvas = createCanvas(400, 240);
                    const ctx = canvas.getContext('2d');
                    const w = canvas.width;
                    const h = canvas.height;
                    const pad = 30;
                    
                    const mapX = (x) => pad + ((x - xMin) / (xMax - xMin)) * (w - 2 * pad);
                    const mapY = (y) => h - pad - ((y - yMin) / (yMax - yMin)) * (h - 2 * pad);
                    
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 1;
                    
                    const xZero = Math.max(xMin, Math.min(xMax, 0));
                    const canvasXZero = mapX(xZero);
                    ctx.beginPath();
                    ctx.moveTo(canvasXZero, pad);
                    ctx.lineTo(canvasXZero, h - pad);
                    ctx.stroke();
                    
                    const yZero = Math.max(yMin, Math.min(yMax, 0));
                    const canvasYZero = mapY(yZero);
                    ctx.beginPath();
                    ctx.moveTo(pad, canvasYZero);
                    ctx.lineTo(w - pad, canvasYZero);
                    ctx.stroke();
                    
                    ctx.strokeStyle = '#ef4444';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    points.forEach((p, idx) => {
                        const cx = mapX(p.x);
                        const cy = mapY(p.y);
                        if (idx === 0) ctx.moveTo(cx, cy);
                        else ctx.lineTo(cx, cy);
                    });
                    ctx.stroke();
                    
                    ctx.fillStyle = '#ef4444';
                    points.forEach(p => {
                        ctx.beginPath();
                        ctx.arc(mapX(p.x), mapY(p.y), 4, 0, 2 * Math.PI);
                        ctx.fill();
                    });
                    
                    ctx.fillStyle = '#475569';
                    ctx.font = '10px sans-serif';
                    ctx.fillText(xMin.toFixed(1), pad, canvasYZero + 12);
                    ctx.fillText(xMax.toFixed(1), w - pad - 20, canvasYZero + 12);
                    ctx.fillText(yMax.toFixed(1), canvasXZero + 5, pad + 10);
                    ctx.fillText(yMin.toFixed(1), canvasXZero + 5, h - pad - 2);
                };
                ${executableCode}
            `;

            const runFn = new Function('container', helperCode);
            const result = runFn(containerElement);
            
            if (result instanceof HTMLElement || result instanceof SVGElement) {
                if (!containerElement.contains(result)) {
                    containerElement.appendChild(result);
                }
            }
            
            if (result !== undefined && logs.length === 0 && containerElement.childNodes.length === 0) {
                logs.push(String(result));
            }
            
            setOutput({
                stdout: logs.join('\n'),
                stderr: errors.join('\n'),
                exitCode: errors.length === 0 ? 0 : 1,
                visualContainer: containerElement,
            });
        } catch (err: any) {
            setOutput({
                stdout: logs.join('\n'),
                stderr: `${errors.join('\n')}\nError: ${err.message}`.trim(),
                exitCode: 1,
            });
        } finally {
            console.log = originalLog;
            console.error = originalError;
        }
    };

    const handleRun = async () => {
        setIsRunning(true);
        setOutput(null);

        const lang = content.language.toLowerCase();
        if (lang === 'javascript' || lang === 'typescript') {
            runJavaScript(content.code);
            setIsRunning(false);
            return;
        }

        if (lang === 'python') {
            await runPythonLocal(content.code);
            setIsRunning(false);
            return;
        }

        try {
            let response;
            try {
                // Try local Piston container first
                response = await fetch('http://localhost:2000/api/v2/piston/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        language: content.language,
                        version: '*',
                        files: [{ content: content.code }],
                    }),
                });
            } catch (localErr) {
                // Fall back to public Piston API
                response = await fetch('https://emkc.org/api/v2/piston/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        language: content.language,
                        version: '*',
                        files: [{ content: content.code }],
                    }),
                });
            }

            if (response.status === 401) {
                setOutput({
                    stderr: `Piston API 401 Unauthorized.\n\nAs of Feb 2026, the public Piston API is restricted.\nTo run ${content.language} code, please start a local Piston instance using Docker:\n\n  docker run -d -p 2000:2000 engineer-man/piston\n\n(Tip: JavaScript and TypeScript run directly in your browser with no setup required!)`,
                    exitCode: 401,
                });
                return;
            }

            const result = await response.json();
            setOutput({
                stdout: result.run?.stdout || '',
                stderr: result.run?.stderr || '',
                exitCode: result.run?.code ?? -1,
            });
        } catch (error: any) {
            setOutput({ stderr: `Execution failed: ${error.message}`, exitCode: -1 });
        } finally {
            setIsRunning(false);
        }
    };

    if (!isFocused) {
        if (output) {
            return (
                <div className="w-full cursor-pointer hover:bg-slate-800/10 p-2 rounded transition-colors" onClick={onFocus}>
                    <pre className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                        {output.stdout && <span className="text-emerald-400">{output.stdout}</span>}
                        {output.stderr && <span className="text-red-400">{output.stderr}</span>}
                        {!output.stdout && !output.stderr && !output.visualContainer && (
                            <span className="text-slate-600 italic">(no output)</span>
                        )}
                    </pre>
                    {output.visualContainer && (
                        <div ref={visualRef} className="mt-1" onClick={(e) => e.stopPropagation()} />
                    )}
                </div>
            );
        }

        return (
            <div className="w-full cursor-pointer py-2 px-3 hover:bg-slate-800/10 rounded transition-colors" onClick={onFocus}>
                <pre className="text-xs font-mono text-slate-500 truncate opacity-60">
                    {content.code ? content.code.split('\n')[0] + (content.code.split('\n').length > 1 ? ' ...' : '') : t('Write code here...', 'اكتب الكود هنا...')}
                </pre>
            </div>
        );
    }

    return (
        <div className="w-full rounded-lg overflow-hidden border border-slate-700/60" onClick={onFocus}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-800/70 border-b border-slate-700/40">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                    </div>
                    <select
                        value={content.language}
                        onChange={(e) => onContentChange({ ...content, language: e.target.value })}
                        className="bg-transparent text-xs text-slate-400 outline-none cursor-pointer hover:text-slate-300"
                    >
                        {LANGUAGES.map(lang => (
                            <option key={lang.value} value={lang.value} className="bg-slate-800">
                                {lang.label}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleRun}
                    disabled={isRunning || !content.code.trim()}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all
                        ${isRunning
                            ? 'bg-amber-500/20 text-amber-400 cursor-wait'
                            : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-300'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isRunning ? (
                        <>
                            <div className="w-3 h-3 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
                            <span>{pyodideStatus || t('Running...', '...جارٍ التنفيذ')}</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                            {t('Run', 'تشغيل')}
                        </>
                    )}
                </button>
            </div>

            {/* Code Editor */}
            <textarea
                value={content.code}
                onChange={(e) => onContentChange({ ...content, code: e.target.value })}
                className="w-full bg-[#0d1117] text-slate-200 p-4 outline-none resize-y
                           code-editor-area min-h-[120px]"
                placeholder={`# Write your ${content.language} code here...`}
                spellCheck={false}
            />

            {/* Output */}
            {output && (
                <div className="border-t border-slate-700/40">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/50">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">{t('Output', 'الخرج')}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                                output.exitCode === 0
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-red-500/10 text-red-400'
                            }`}>
                                {output.exitCode === 0 ? '✓ Success' : `✗ Exit ${output.exitCode}`}
                            </span>
                        </div>
                    </div>
                    {(output.stdout || output.stderr || (!output.stdout && !output.stderr && !output.visualContainer)) && (
                        <pre className="p-3 text-xs font-mono bg-[#0d1117] max-h-[200px] overflow-auto border-b border-slate-800/40">
                            {output.stdout && <span className="text-emerald-300">{output.stdout}</span>}
                            {output.stderr && <span className="text-red-400">{output.stderr}</span>}
                            {!output.stdout && !output.stderr && <span className="text-slate-600">(no output)</span>}
                        </pre>
                    )}
                    {output.visualContainer && (
                        <div ref={visualRef} className="p-3 bg-[#0d1117] flex justify-center items-center" />
                    )}
                </div>
            )}
        </div>
    );
}
