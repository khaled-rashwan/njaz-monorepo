'use client';

import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { useLanguage } from '@/components/LanguageContext';
import { useParams } from 'next/navigation';
import { getUrl } from 'aws-amplify/storage';
import { ScholarFigure } from '@/types';

function FigureThumbnail({ s3Key, alt }: { s3Key: string; alt: string }) {
    const [url, setUrl] = useState<string>('');
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        let active = true;
        getUrl({ 
            path: s3Key, 
            options: { 
                validateObjectExistence: false, 
                expiresIn: 3600 
            } 
        })
        .then(res => {
            if (active) setUrl(res.url.toString());
        })
        .catch(err => {
            console.error("Failed to sign thumbnail URL:", err);
            if (active) setIsError(true);
        });
        return () => { active = false; };
    }, [s3Key]);

    if (isError) {
        return (
            <div className="w-full h-full bg-red-950/20 border border-red-500/20 rounded-lg flex items-center justify-center text-[10px] text-red-400">
                Error Loading
            </div>
        );
    }

    if (!url) {
        return (
            <div className="w-full h-full bg-slate-800/50 animate-pulse rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-slate-700 border-t-amber-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <img 
            src={url} 
            alt={alt} 
            className="w-full h-full object-cover rounded-lg hover:scale-105 transition-transform duration-300" 
            loading="lazy"
        />
    );
}

export function FiguresLibrary() {
    const { t, language } = useLanguage();
    const params = useParams();
    const projectId = params?.projectId as string;

    const { figures, uploadFigure, deleteFigure, loadFigures } = useEditorStore();

    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form inputs
    const [titleInput, setTitleInput] = useState('');
    const [captionInput, setCaptionInput] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            if (!titleInput) {
                // Default title to filename without extension
                const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                setTitleInput(nameWithoutExt);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
            if (!titleInput) {
                const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                setTitleInput(nameWithoutExt);
            }
        } else {
            setUploadError(t('Please drop an image file.', 'يرجى إفلات ملف صورة.'));
        }
    };

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !projectId) return;

        setIsUploading(true);
        setUploadError(null);
        try {
            await uploadFigure(projectId, titleInput || selectedFile.name, selectedFile, captionInput);
            // Reset form
            setSelectedFile(null);
            setTitleInput('');
            setCaptionInput('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err: any) {
            setUploadError(err.message || t('Failed to upload image', 'فشل تحميل الصورة'));
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (figId: string) => {
        if (!confirm(t('Are you sure you want to delete this figure from the library?', 'هل أنت متأكد من حذف هذا الشكل من المكتبة؟'))) {
            return;
        }
        try {
            await deleteFigure(figId);
        } catch (err) {
            console.error("Failed to delete figure:", err);
        }
    };

    const handleDownload = async (fig: ScholarFigure) => {
        try {
            const res = await getUrl({ 
                path: fig.s3Key, 
                options: { 
                    validateObjectExistence: false, 
                    expiresIn: 300 
                } 
            });
            window.open(res.url.toString(), '_blank');
        } catch (err) {
            console.error("Failed to get download URL:", err);
        }
    };

    const formatBytes = (bytes?: number) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const isLargeFile = selectedFile && selectedFile.size > 1024 * 1024;

    return (
        <div className="flex flex-col h-full gap-4 text-slate-200">
            {/* Upload Zone */}
            <form onSubmit={handleUploadSubmit} className="space-y-3 futuristic-card p-3.5 bg-slate-800/20 border border-slate-700/40 rounded-xl">
                <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    {t('Upload Image', 'رفع صورة جديدة')}
                </h3>

                {uploadError && (
                    <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                        {uploadError}
                    </div>
                )}

                {isLargeFile && (
                    <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-450 text-[10px] leading-relaxed">
                        ⚠️ {t('Large file. For optimal document loading and print speeds, we recommend keeping scientific figures under 1 MB (ideal: 200-500 KB) and compressing them.', 'ملف كبير. لتحسين سرعة التحميل وتوليد الملفات، نوصي بالحفاظ على الأشكال أقل من 1 ميجابايت وضغطها.')}
                    </div>
                )}

                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                        dragOver 
                            ? 'border-amber-500 bg-amber-500/5' 
                            : selectedFile 
                                ? 'border-emerald-500/50 bg-emerald-500/5' 
                                : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/20'
                    }`}
                >
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        className="hidden"
                    />
                    <svg className={`w-8 h-8 mx-auto mb-2 ${selectedFile ? 'text-emerald-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    
                    {selectedFile ? (
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-emerald-400 truncate max-w-full">{selectedFile.name}</p>
                            <p className="text-[10px] text-slate-500">{formatBytes(selectedFile.size)}</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs font-medium text-slate-400">{t('Drag image here, or click to browse', 'اسحب الصورة هنا، أو اضغط للتصفح')}</p>
                            <p className="text-[9.5px] text-slate-600 mt-1">{t('Supports PNG, JPG, GIF, WebP', 'يدعم ملفات PNG، JPG، GIF، WebP')}</p>
                        </div>
                    )}
                </div>

                {selectedFile && (
                    <div className="space-y-2 animate-fade-in">
                        <input
                            type="text"
                            value={titleInput}
                            onChange={(e) => setTitleInput(e.target.value)}
                            placeholder={t('Figure Title...', 'عنوان الشكل...')}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500/30"
                            required
                        />
                        <input
                            type="text"
                            value={captionInput}
                            onChange={(e) => setCaptionInput(e.target.value)}
                            placeholder={t('Optional Caption...', 'توضيح اختياري...')}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500/30"
                        />
                        <div className="flex gap-2 justify-end pt-1">
                            <button
                                type="button"
                                onClick={() => { setSelectedFile(null); setTitleInput(''); setCaptionInput(''); }}
                                className="px-2.5 py-1.5 rounded text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                            >
                                {t('Cancel', 'إلغاء')}
                            </button>
                            <button
                                type="submit"
                                disabled={isUploading}
                                className="px-3.5 py-1.5 rounded text-[11px] font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                            >
                                {isUploading && <div className="w-2.5 h-2.5 border-2 border-slate-950 border-t-amber-950 rounded-full animate-spin" />}
                                {isUploading ? t('Uploading...', 'جارٍ الرفع...') : t('Upload to Bank', 'رفع للمكتبة')}
                            </button>
                        </div>
                    </div>
                )}
            </form>

            {/* Figures Bank Grid */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                    {t(`Figure Bank (${figures.length})`, `مكتبة الأشكال (${figures.length})`)}
                </h3>

                {figures.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                        {figures.map(fig => (
                            <div key={fig.id} className="futuristic-card bg-slate-850/30 border border-slate-800/40 rounded-xl p-2 flex flex-col gap-2 relative group overflow-hidden">
                                {/* Thumbnail */}
                                <div className="aspect-video w-full relative bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                                    <FigureThumbnail s3Key={fig.metadata?.thumbnailS3Key || fig.s3Key} alt={fig.title} />
                                    
                                    {/* Action Hover Overlay */}
                                    <div className="absolute inset-0 bg-slate-950/45 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                        {/* Download */}
                                        <button
                                            type="button"
                                            onClick={() => handleDownload(fig)}
                                            className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-amber-400 rounded-lg border border-slate-700/50 transition-all pointer-events-auto shadow-md"
                                            title={t('Download original image', 'تحميل الصورة')}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Visible red X delete button in the top-right corner */}
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(fig.id)}
                                        className="absolute top-1.5 right-1.5 p-1 bg-red-600 hover:bg-red-500 text-white rounded-full transition-colors z-10 shadow-md flex items-center justify-center opacity-90 hover:opacity-100"
                                        title={t('Delete image from library', 'حذف الصورة من المكتبة')}
                                    >
                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Details */}
                                <div className="min-w-0">
                                    <h4 className="text-[11px] font-semibold text-slate-200 truncate" title={fig.title}>
                                        {fig.title}
                                    </h4>
                                    <div className="flex justify-between items-center text-[9px] text-slate-550 mt-0.5">
                                        <span>{formatBytes(fig.sizeBytes)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-650 text-xs italic">
                        {t('No figures uploaded yet. Upload images above to populate your library.', 'لا توجد أشكال مرفوعة بعد. ارفع صوراً بالأعلى لتظهر هنا.')}
                    </div>
                )}
            </div>
        </div>
    );
}
