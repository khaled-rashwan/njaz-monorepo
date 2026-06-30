'use client';

import { BlockProps } from '@/types';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useEditorStore } from '@/store/editor-store';
import { buildCounterMap } from '@/lib/cross-reference';
import { getUrl } from 'aws-amplify/storage';

interface ExtendedFigureContent {
    src: string;
    alt: string;
    caption: string;
    mode?: 'static' | 'code';
    code?: string;
    showCodeInDocument?: boolean;
    s3Key?: string;
}

export function FigureBlock({ block, isFocused, onContentChange, onFocus }: BlockProps) {
    const { t } = useLanguage();
    const content = (block.content || { src: '', alt: '', caption: '', mode: 'static', code: '', showCodeInDocument: false }) as ExtendedFigureContent;

    const blocks = useEditorStore((state) => state.blocks);
    const counterMap = buildCounterMap(blocks);
    const figEntry = counterMap.get(block.id);
    const figNumber = figEntry ? figEntry.counter : 1;

    const { figures, uploadFigure, document: doc } = useEditorStore();

    const [isRunning, setIsRunning] = useState(false);
    const [pyodideStatus, setPyodideStatus] = useState<string | null>(null);
    const [errorOutput, setErrorOutput] = useState<string | null>(null);

    const [resolvedSrc, setResolvedSrc] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (content.s3Key) {
            let active = true;
            getUrl({ 
                path: content.s3Key, 
                options: { 
                    validateObjectExistence: false, 
                    expiresIn: 3600 
                } 
            })
            .then(res => {
                if (active) setResolvedSrc(res.url.toString());
            })
            .catch(err => {
                console.error("Failed to sign image inside FigureBlock:", err);
            });
            return () => { active = false; };
        } else {
            setResolvedSrc(content.src || '');
        }
    }, [content.s3Key, content.src]);

    const handleSelectBankImage = (s3Key: string) => {
        const selected = figures.find(f => f.s3Key === s3Key);
        if (selected) {
            onContentChange({
                ...content,
                s3Key: selected.s3Key,
                src: '',
                alt: selected.title,
                caption: selected.caption || content.caption,
            });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !doc) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            const figId = await uploadFigure(doc.projectId, file.name, file, content.caption);
            const loadedFigures = useEditorStore.getState().figures;
            const newFig = loadedFigures.find(f => f.id === figId);
            if (newFig) {
                onContentChange({
                    ...content,
                    s3Key: newFig.s3Key,
                    src: '',
                    alt: newFig.title,
                    caption: newFig.caption || content.caption,
                });
            }
        } catch (err: any) {
            setUploadError(err.message || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const runPythonLocal = async (codeStr: string) => {
        setIsRunning(true);
        setErrorOutput(null);
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
            if (codeStr.includes('numpy')) packagesToLoad.push('numpy');
            if (codeStr.includes('pandas')) packagesToLoad.push('pandas');
            if (codeStr.includes('matplotlib')) packagesToLoad.push('matplotlib');
            if (codeStr.includes('scipy')) packagesToLoad.push('scipy');
            
            if (packagesToLoad.length > 0) {
                setPyodideStatus(t(`Loading packages (${packagesToLoad.join(', ')})...`, `جارٍ تحميل المكتبات (${packagesToLoad.join(', ')})...`));
                await pyInstance.loadPackage(packagesToLoad);
            }

            setPyodideStatus(t('Generating plot...', 'جارٍ إنشاء الرسم البياني...'));

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

${codeStr}

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
            
            if (imgData) {
                const base64Src = `data:image/png;base64,${imgData}`;
                onContentChange({
                    ...content,
                    src: base64Src,
                });
            } else {
                throw new Error(t('No matplotlib figure was generated. Please ensure your code plots a figure.', 'لم يتم إنشاء أي رسم بياني. يرجى التأكد من أن الكود الخاص بك يرسم شكلاً.'));
            }

            if (errors.length > 0) {
                setErrorOutput(errors.join('\n'));
            }

        } catch (err: any) {
            setErrorOutput(err.message || 'Execution error');
        } finally {
            setIsRunning(false);
            setPyodideStatus(null);
        }
    };

    const hasImage = !!content.src || !!content.s3Key;
    const mode = content.mode || 'static';

    return (
        <div className="w-full" onClick={onFocus}>
            {/* Header / Mode Switcher */}
            {isFocused && (
                <div className="flex items-center justify-between border-b border-slate-700/30 pb-2 mb-3">
                    <div className="flex items-center rounded-lg border border-slate-700/40 bg-slate-800/40 p-0.5">
                        <button
                            onClick={() => onContentChange({ ...content, mode: 'static' })}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                mode === 'static'
                                    ? 'bg-amber-500/15 text-amber-400 font-semibold'
                                    : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            {t('Static Image (URL)', 'صورة ثابتة (رابط)')}
                        </button>
                        <button
                            onClick={() => onContentChange({ ...content, mode: 'code' })}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                mode === 'code'
                                    ? 'bg-amber-500/15 text-amber-400 font-semibold'
                                    : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            {t('Python Code (WASM)', 'كود بايثون')}
                        </button>
                    </div>

                    {mode === 'code' && (
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-slate-400 hover:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={content.showCodeInDocument || false}
                                    onChange={(e) => onContentChange({ ...content, showCodeInDocument: e.target.checked })}
                                    className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0 focus:ring-offset-0"
                                />
                                {t('Show code in document', 'عرض الكود في المستند')}
                            </label>
                            
                            <button
                                onClick={() => runPythonLocal(content.code || '')}
                                disabled={isRunning || !content.code?.trim()}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                    isRunning
                                        ? 'bg-amber-500/20 text-amber-400 cursor-wait'
                                        : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                                } disabled:opacity-50`}
                            >
                                {isRunning ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
                                        <span>{pyodideStatus || t('Running...', 'جارٍ التشغيل...')}</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                        {t('Generate Plot', 'توليد الرسم')}
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Read-only Code View */}
            {!isFocused && mode === 'code' && content.showCodeInDocument && content.code && (
                <div className="mb-3 rounded-lg overflow-hidden border border-slate-700/30 bg-[#0d1117]/60 max-w-full">
                    <pre className="p-3 text-xs font-mono text-slate-400 overflow-x-auto whitespace-pre-wrap">
                        {content.code}
                    </pre>
                </div>
            )}

            {/* Python Code Editor */}
            {isFocused && mode === 'code' && (
                <div className="mb-4 rounded-lg overflow-hidden border border-slate-700/60 bg-[#0d1117]">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/40 border-b border-slate-700/40">
                        <span className="text-[10px] text-slate-500 font-mono">python (WASM)</span>
                    </div>
                    <textarea
                        value={content.code || ''}
                        onChange={(e) => onContentChange({ ...content, code: e.target.value })}
                        placeholder={t('# Write Python plotting code here...\nimport matplotlib.pyplot as plt\nimport numpy as np\n...', '# اكتب كود الرسم هنا...')}
                        className="w-full bg-[#0d1117] text-slate-200 p-3 outline-none resize-y min-h-[140px] text-xs font-mono"
                        spellCheck={false}
                    />
                    {errorOutput && (
                        <pre className="p-3 text-xs font-mono bg-red-950/20 border-t border-slate-800/40 text-red-400 overflow-auto max-h-[120px]">
                            {errorOutput}
                        </pre>
                    )}
                </div>
            )}

            {/* Display Figure/Static UI */}
            {hasImage ? (
                <figure className="flex flex-col items-center gap-2">
                    <div className="relative group rounded-lg overflow-hidden border border-slate-700/50 bg-[#0d1117]">
                        <img
                            src={resolvedSrc || content.src}
                            alt={content.alt}
                            className="max-w-full h-auto rounded-lg"
                            style={{ maxHeight: '400px' }}
                        />
                        {isFocused && (
                            <button
                                type="button"
                                onClick={() => onContentChange({ ...content, src: '', s3Key: '', alt: '' })}
                                className="absolute top-2 right-2 p-1.5 bg-red-650/90 hover:bg-red-600 text-white rounded-full transition-colors z-10 shadow-md flex items-center justify-center opacity-85 hover:opacity-100"
                                title={t('Remove image from block', 'إزالة الصورة من الكتلة')}
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                        {isFocused && mode === 'static' && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <span className="text-white text-xs bg-black/60 px-2.5 py-1 rounded-lg">
                                    {t('Focused Block', 'الكتلة المحددة')}
                                </span>
                            </div>
                        )}
                    </div>

                    {isFocused && mode === 'static' && (
                        <div className="w-full flex flex-col items-center gap-2.5 mt-2 bg-slate-950/20 border border-slate-800/65 rounded-lg p-2.5 max-w-md">
                            {uploadError && (
                                <div className="text-[10px] text-red-400 bg-red-950/20 border border-red-500/25 rounded px-2 py-1 w-full text-center">
                                    {uploadError}
                                </div>
                            )}
                            
                            <div className="flex gap-2 w-full justify-center">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                >
                                    {isUploading ? (
                                        <div className="w-2.5 h-2.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                    )}
                                    {t('Upload File', 'رفع ملف')}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept="image/*"
                                    className="hidden"
                                />

                                {figures.length > 0 && (
                                    <select
                                        onChange={(e) => handleSelectBankImage(e.target.value)}
                                        value=""
                                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-400 outline-none focus:border-amber-500/30 max-w-[150px]"
                                    >
                                        <option value="" disabled>{t('Select Bank Image...', 'اختر من المكتبة...')}</option>
                                        {figures.map(fig => (
                                            <option key={fig.id} value={fig.s3Key}>{fig.title}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <input
                                type="url"
                                value={content.src || ''}
                                onChange={(e) => onContentChange({ ...content, src: e.target.value, s3Key: '' })}
                                placeholder={t('Or paste image URL...', 'أو الصق رابط الصورة...')}
                                className="w-full bg-slate-950 border border-slate-805 rounded px-2.5 py-1 text-[10px] text-slate-400 outline-none focus:border-amber-500/30 text-center transition-colors"
                            />
                        </div>
                    )}

                    {isFocused ? (
                        <div className="flex flex-col items-center gap-1 w-full mt-2">
                            <span className="text-xs text-amber-500/70 font-mono select-none">
                                {t(`Figure ${figNumber}`, `شكل ${figNumber}`)}
                            </span>
                            <input
                                value={content.caption || ''}
                                onChange={(e) => onContentChange({ ...content, caption: e.target.value })}
                                placeholder={t('Figure caption...', 'عنوان الشكل...')}
                                className="w-full bg-transparent text-sm text-slate-400 italic outline-none text-center focus:text-slate-300 transition-colors"
                            />
                        </div>
                    ) : (
                        <figcaption className="text-sm text-slate-500 italic text-center mt-1">
                            <span className="text-amber-400 font-semibold">{t(`Figure ${figNumber}`, `شكل ${figNumber}`)}</span>
                            {content.caption ? `: ${content.caption}` : ''}
                        </figcaption>
                    )}
                </figure>
            ) : (
                <div className="w-full">
                    {mode === 'static' ? (
                        <div className="flex flex-col items-center gap-4 py-8 px-4 rounded-xl border-2 border-dashed border-slate-700/50 hover:border-amber-500/30 transition-all bg-slate-900/10">
                            {uploadError && (
                                <div className="text-xs text-red-400 bg-red-950/20 border border-red-500/25 rounded px-3 py-1.5 w-full text-center">
                                    {uploadError}
                                </div>
                            )}

                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <svg className="w-6 h-6 text-amber-500/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>

                            <div className="text-center">
                                <p className="text-sm text-slate-400 font-semibold">{t('Add an Image to Figure', 'أضف صورة للشكل')}</p>
                                <p className="text-xs text-slate-500 mt-1">{t('Upload from device, select from Figure Bank, or paste a URL below', 'ارفع من جهازك، اختر من مكتبة الأشكال، أو الصق الرابط بالأسفل')}</p>
                            </div>

                            <div className="flex flex-wrap justify-center gap-3">
                                {/* Upload Button */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="px-4 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/20 text-amber-400 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {isUploading ? (
                                        <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                    )}
                                    {isUploading ? t('Uploading...', 'جارٍ الرفع...') : t('Upload Photo', 'رفع صورة')}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept="image/*"
                                    className="hidden"
                                />

                                {/* Choose from Bank select */}
                                {figures.length > 0 && (
                                    <select
                                        onChange={(e) => handleSelectBankImage(e.target.value)}
                                        value=""
                                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-350 outline-none focus:border-amber-500/30 max-w-[200px]"
                                    >
                                        <option value="" disabled>{t('Choose from Bank...', 'اختر من المكتبة...')}</option>
                                        {figures.map(fig => (
                                            <option key={fig.id} value={fig.s3Key}>{fig.title}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Separator */}
                            <div className="flex items-center gap-2 w-full max-w-xs text-[10px] text-slate-650 uppercase font-mono">
                                <hr className="flex-1 border-slate-800" />
                                <span>{t('OR', 'أو')}</span>
                                <hr className="flex-1 border-slate-800" />
                            </div>

                            {/* Plain URL Input */}
                            <div className="w-full max-w-sm">
                                <input
                                    type="url"
                                    value={content.src || ''}
                                    onChange={(e) => onContentChange({ ...content, src: e.target.value, s3Key: '' })}
                                    placeholder={t('Paste image URL here...', 'الصق رابط الصورة هنا...')}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-center text-slate-350 outline-none focus:border-amber-500/30 transition-colors"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 py-12 px-4 rounded-xl border-2 border-dashed border-slate-700/50">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <svg className="w-6 h-6 text-amber-500/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-slate-400">{t('No plot generated yet', 'لم يتم إنشاء رسم بياني بعد')}</p>
                                <p className="text-xs text-slate-600 mt-1">{t('Write Python code above and click Generate Plot', 'اكتب كود بايثون أعلاه وانقر على توليد الرسم')}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
