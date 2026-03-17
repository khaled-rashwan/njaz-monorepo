'use client';

import { useCallback, useRef } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { STYLE_OPTIONS } from '@/lib/intake';
import type { IntakeFormData, UploadedFile, WizardAction } from '@/lib/intake';

interface StepBrandAssetsProps {
    formData: IntakeFormData;
    dispatch: React.Dispatch<WizardAction>;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
    'image/png', 'image/jpeg', 'image/svg+xml', 'image/webp',
    'application/pdf',
    'text/plain', 'text/markdown',
];

export default function StepBrandAssets({ formData, dispatch }: StepBrandAssetsProps) {
    const { t, direction } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files) return;

        const remaining = MAX_FILES - formData.uploadedFiles.length;
        const validFiles: UploadedFile[] = [];

        Array.from(files).slice(0, remaining).forEach(file => {
            if (file.size > MAX_FILE_SIZE) return;
            if (!ACCEPTED_TYPES.includes(file.type)) return;

            validFiles.push({
                name: file.name,
                size: file.size,
                type: file.type,
                previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
                file,
            });
        });

        if (validFiles.length > 0) {
            dispatch({ type: 'ADD_FILES', files: validFiles });
        }
    }, [formData.uploadedFiles.length, dispatch]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const removeFile = (index: number) => {
        dispatch({ type: 'REMOVE_FILE', index });
    };

    const toggleAssets = (has: boolean) => {
        dispatch({ type: 'UPDATE_DATA', payload: { hasBrandAssets: has } });
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return '🖼️';
        if (type === 'application/pdf') return '📄';
        return '📎';
    };

    return (
        <div className="wizard-step-enter">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                    {t('Do you have brand assets?', 'هل لديك أصول بصرية؟')}
                </h2>
                <p className="text-slate-400 text-sm">
                    {t(
                        'Upload existing logos, brand guides, or inspiration files. Or tell us about your preferences.',
                        'ارفع الشعارات أو أدلة العلامة التجارية أو ملفات الإلهام. أو أخبرنا عن تفضيلاتك.'
                    )}
                </p>
            </div>

            {/* Toggle: Yes / No */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                    { value: true, labelEn: 'Yes, I have assets', labelAr: 'نعم، لدي أصول', icon: '📁' },
                    { value: false, labelEn: 'No, start from scratch', labelAr: 'لا، ابدأ من الصفر', icon: '✨' },
                ].map((opt) => (
                    <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => toggleAssets(opt.value)}
                        className={`
                            p-4 rounded-xl border-2 text-center transition-all duration-300
                            ${formData.hasBrandAssets === opt.value
                                ? 'border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_20px_rgba(56,205,223,0.1)]'
                                : 'border-slate-700/50 hover:border-slate-600 bg-slate-800/30'
                            }
                        `}
                    >
                        <div className="text-2xl mb-2">{opt.icon}</div>
                        <span className={`text-sm font-medium ${
                            formData.hasBrandAssets === opt.value ? 'text-white' : 'text-slate-400'
                        }`}>
                            {t(opt.labelEn, opt.labelAr)}
                        </span>
                    </button>
                ))}
            </div>

            {/* If YES: File Upload Zone */}
            {formData.hasBrandAssets && (
                <div className="space-y-4 animate-fade-in">
                    {/* Drop zone */}
                    {formData.uploadedFiles.length < MAX_FILES && (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onClick={() => fileInputRef.current?.click()}
                            className="drop-zone border-2 border-dashed border-slate-600 hover:border-cyan-500/50 rounded-xl p-8 text-center cursor-pointer transition-all duration-300 hover:bg-cyan-500/5"
                        >
                            <div className="text-3xl mb-3 opacity-60">📎</div>
                            <p className="text-slate-400 text-sm mb-1">
                                {t(
                                    'Drag & drop files here, or click to browse',
                                    'اسحب وأفلت الملفات هنا، أو انقر للتصفح'
                                )}
                            </p>
                            <p className="text-slate-600 text-xs">
                                {t(
                                    `Images, PDFs, text files · Max ${MAX_FILES} files · 10MB each`,
                                    `صور، PDF، ملفات نصية · حد أقصى ${MAX_FILES} ملفات · ١٠ ميجا لكل ملف`
                                )}
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept={ACCEPTED_TYPES.join(',')}
                                onChange={(e) => handleFiles(e.target.files)}
                                className="hidden"
                            />
                        </div>
                    )}

                    {/* Uploaded files list */}
                    {formData.uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                            {formData.uploadedFiles.map((file, index) => (
                                <div
                                    key={`${file.name}-${index}`}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 group"
                                >
                                    {/* Preview or icon */}
                                    {file.previewUrl ? (
                                        <img
                                            src={file.previewUrl}
                                            alt={file.name}
                                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded bg-slate-700/50 flex items-center justify-center text-lg flex-shrink-0">
                                            {getFileIcon(file.type)}
                                        </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-white truncate">{file.name}</p>
                                        <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* If NO: Brand Questionnaire */}
            {!formData.hasBrandAssets && (
                <div className="space-y-5 animate-fade-in">
                    {/* Style Preference */}
                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">
                            {t('Design Style Preference', 'تفضيل أسلوب التصميم')}
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {STYLE_OPTIONS.map((style) => (
                                <button
                                    key={style.valueEn}
                                    type="button"
                                    onClick={() => dispatch({ type: 'UPDATE_DATA', payload: { stylePreference: style.valueEn } })}
                                    className={`
                                        p-3 rounded-lg border text-sm text-center transition-all
                                        ${formData.stylePreference === style.valueEn
                                            ? 'border-cyan-500/40 bg-cyan-500/10 text-white'
                                            : 'border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                                        }
                                    `}
                                >
                                    {t(style.labelEn, style.labelAr)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preferred Colors */}
                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">
                            {t('Preferred Colors (optional)', 'الألوان المفضلة (اختياري)')}
                        </label>
                        <input
                            type="text"
                            value={formData.preferredColors}
                            onChange={(e) => dispatch({ type: 'UPDATE_DATA', payload: { preferredColors: e.target.value } })}
                            className="futuristic-input"
                            placeholder={t('e.g., Blue and gold, Navy and white', 'مثال: أزرق وذهبي، كحلي وأبيض')}
                            dir={direction}
                        />
                    </div>

                    {/* Competitors / Inspiration */}
                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">
                            {t('Competitors or Inspiration Links', 'روابط المنافسين أو الإلهام')}
                        </label>
                        <textarea
                            value={formData.competitors}
                            onChange={(e) => dispatch({ type: 'UPDATE_DATA', payload: { competitors: e.target.value } })}
                            className="futuristic-textarea"
                            placeholder={t(
                                'Share links to websites, brands, or designs you admire...',
                                'شارك روابط مواقع أو علامات تجارية أو تصاميم تعجبك...'
                            )}
                            dir={direction}
                            rows={3}
                        />
                    </div>

                    {/* Brand Notes */}
                    <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">
                            {t('Additional Brand Notes', 'ملاحظات إضافية عن العلامة')}
                        </label>
                        <textarea
                            value={formData.brandNotes}
                            onChange={(e) => dispatch({ type: 'UPDATE_DATA', payload: { brandNotes: e.target.value } })}
                            className="futuristic-textarea"
                            placeholder={t(
                                'Anything else about your brand vision, values, or constraints...',
                                'أي شيء آخر عن رؤية علامتك التجارية أو قيمها أو قيودها...'
                            )}
                            dir={direction}
                            rows={3}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
