'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { Scale, Dimension, Statement, ScaleOption, getDefaultOptions } from '@/lib/types';
import { saveScale, generateId } from '@/lib/storage';
import { getDashboardUrl, getCurrentUrl } from '@njaz/shared-auth';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable statement row component
function SortableStatementRow({
    statement,
    dimensions,
    onUpdate,
    onRemove,
    scaleLanguage,
    t,
}: {
    statement: Statement & { dimensionId: string };
    dimensions: Dimension[];
    onUpdate: (id: string, field: string, value: any) => void;
    onRemove: (id: string) => void;
    scaleLanguage: 'ar' | 'en';
    t: (en: string, ar: string) => string;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: statement.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isRtl = scaleLanguage === 'ar';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`p-4 rounded-lg bg-slate-800/50 border border-slate-700 ${isDragging ? 'shadow-lg shadow-cyan-500/20' : ''}`}
        >
            <div className="flex items-start gap-3">
                {/* Drag Handle */}
                <button
                    {...attributes}
                    {...listeners}
                    className="mt-2 p-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-cyan-400 touch-none"
                    title={t('Drag to reorder', 'اسحب لإعادة الترتيب')}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                </button>

                <div className="flex-1 space-y-3">
                    {/* Statement Text */}
                    <textarea
                        value={statement.text}
                        onChange={(e) => onUpdate(statement.id, 'text', e.target.value)}
                        className="futuristic-input text-sm w-full min-h-[60px]"
                        placeholder={scaleLanguage === 'ar'
                            ? 'أشعر بالتوتر في المواقف الاجتماعية'
                            : 'I feel nervous in social situations'}
                        dir={isRtl ? 'rtl' : 'ltr'}
                    />

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Dimension Dropdown */}
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs text-slate-500 mb-1">
                                {t('Dimension', 'البُعد')}
                            </label>
                            <select
                                value={statement.dimensionId}
                                onChange={(e) => onUpdate(statement.id, 'dimensionId', e.target.value)}
                                className="futuristic-input text-sm w-full"
                                dir={isRtl ? 'rtl' : 'ltr'}
                            >
                                <option value="">{t('Select dimension...', 'اختر البُعد...')}</option>
                                {dimensions.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.name || t('Unnamed', 'بدون اسم')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Reversed Scoring */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={statement.isReversed}
                                onChange={(e) => onUpdate(statement.id, 'isReversed', e.target.checked)}
                                className="w-4 h-4 rounded bg-slate-700"
                            />
                            <span className={`text-xs ${statement.isReversed ? 'text-amber-400' : 'text-slate-500'}`}>
                                {t('Reversed', 'عكسي')}
                            </span>
                        </label>
                    </div>
                </div>

                {/* Remove Button */}
                <button
                    onClick={() => onRemove(statement.id)}
                    className="text-red-400 hover:text-red-300 p-1"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default function NewScalePage() {
    const { t, language: uiLanguage, direction } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('returnTo');

    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Scale language (separate from UI language)
    const [scaleLanguage, setScaleLanguage] = useState<'ar' | 'en'>('ar');

    // Scale form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [dimensions, setDimensions] = useState<Dimension[]>([]);
    const [statements, setStatements] = useState<(Statement & { dimensionId: string })[]>([]);
    const [options, setOptions] = useState<ScaleOption[]>(getDefaultOptions('ar'));

    // Drag and drop sensors with touch support
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        checkAuth();
    }, []);

    // Update default options when language changes
    useEffect(() => {
        setOptions(getDefaultOptions(scaleLanguage));
    }, [scaleLanguage]);

    async function checkAuth() {
        try {
            const user = await getCurrentUser();
            setUserId(user.username);
        } catch {
            setUserId(null);
        } finally {
            setIsLoading(false);
        }
    }

    // Dimension functions
    function addDimension() {
        const newDimension: Dimension = {
            id: generateId(),
            name: '',
        };
        setDimensions([...dimensions, newDimension]);
    }

    function updateDimension(id: string, name: string) {
        setDimensions(dimensions.map(d =>
            d.id === id ? { ...d, name } : d
        ));
    }

    function removeDimension(id: string) {
        // Also unassign statements from this dimension
        setStatements(statements.map(s =>
            s.dimensionId === id ? { ...s, dimensionId: '' } : s
        ));
        setDimensions(dimensions.filter(d => d.id !== id));
    }

    // Statement functions
    function addStatement() {
        const newStatement: Statement & { dimensionId: string } = {
            id: generateId(),
            text: '',
            isReversed: false,
            dimensionId: dimensions.length > 0 ? dimensions[0].id : ''
        };
        setStatements([...statements, newStatement]);
    }

    function updateStatement(id: string, field: string, value: any) {
        setStatements(statements.map(s =>
            s.id === id ? { ...s, [field]: value } : s
        ));
    }

    function removeStatement(id: string) {
        setStatements(statements.filter(s => s.id !== id));
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setStatements((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    // Option functions
    function addOption() {
        const newOption: ScaleOption = {
            id: generateId(),
            label: '',
            value: options.length + 1
        };
        setOptions([...options, newOption]);
    }

    function removeOption(id: string) {
        if (options.length <= 2) {
            alert(t('Minimum 2 options required', 'يجب وجود خيارين على الأقل'));
            return;
        }
        const newOptions = options.filter(o => o.id !== id);
        setOptions(newOptions.map((o, i) => ({ ...o, value: i + 1 })));
    }

    function updateOption(id: string, field: keyof ScaleOption, value: any) {
        setOptions(options.map(o =>
            o.id === id ? { ...o, [field]: value } : o
        ));
    }

    async function handleSave() {
        if (!userId || !title || dimensions.length === 0) {
            alert(t('Please fill in title and add at least one dimension', 'يرجى ملء العنوان وإضافة بُعد واحد على الأقل'));
            return;
        }

        if (options.some(o => !o.label.trim())) {
            alert(t('Please fill in all option labels', 'يرجى ملء جميع تسميات الخيارات'));
            return;
        }

        // Check for unassigned statements
        const unassigned = statements.filter(s => !s.dimensionId);
        if (unassigned.length > 0) {
            alert(t('Please assign all statements to a dimension', 'يرجى تعيين جميع العبارات لبُعد'));
            return;
        }

        setIsSaving(true);
        try {
            // Create scale object for backend (using flattened structure)
            const scale: any = {
                language: scaleLanguage,
                title,
                description,
                isPublic,
                dimensions: dimensions.map(d => ({ id: d.id, name: d.name })), // Only metadata
                statements, // Flat list in user-defined order
                options,
                createdBy: userId,
            };

            await saveScale(scale);

            // Return to survey builder if coming from there
            if (returnTo === 'survey') {
                router.push('/surveys/new');
            } else {
                router.push('/scales');
            }
        } catch (error) {
            console.error('Error saving scale:', error);
            alert(t('Error saving scale', 'خطأ في حفظ المقياس'));
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center futuristic-bg">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">{t('Loading...', 'جاري التحميل...')}</p>
                </div>
            </div>
        );
    }

    if (!userId) {
        return (
            <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
                <SharedHeader currentApp="estebian" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />
                <main className="flex-1 pt-24 pb-8 px-4 flex items-center justify-center">
                    <FuturisticPanel glowColor="cyan" size="lg">
                        <div className="text-center py-12 px-6">
                            <h2 className="text-2xl font-bold text-white mb-3">{t('Authentication Required', 'المصادقة مطلوبة')}</h2>
                            <p className="text-slate-400 mb-6">{t('Please sign in to create scales.', 'يرجى تسجيل الدخول لإنشاء مقاييس.')}</p>
                            <a href={getDashboardUrl(getCurrentUrl())} className="futuristic-btn-primary inline-flex items-center gap-2">
                                {t('Sign In', 'تسجيل الدخول')}
                            </a>
                        </div>
                    </FuturisticPanel>
                </main>
                <SharedFooter direction={direction} t={t} />
            </div>
        );
    }

    const isRtl = scaleLanguage === 'ar';

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader
                currentApp="estebian"
                showLanguageSwitcher={true}
                LanguageSwitcher={LanguageSwitcher}
            />

            <main className="flex-1 pt-24 pb-8 px-4 md:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <Link href={returnTo === 'survey' ? '/surveys/new' : '/scales'} className="futuristic-btn inline-flex items-center gap-2 text-sm mb-2">
                                {direction === 'rtl' ? (
                                    <>
                                        {returnTo === 'survey' ? t('Back to Survey', 'العودة للاستبيان') : t('Back to Library', 'العودة للمكتبة')}
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        {returnTo === 'survey' ? t('Back to Survey', 'العودة للاستبيان') : t('Back to Library', 'العودة للمكتبة')}
                                    </>
                                )}
                            </Link>
                            <h1 className="text-3xl font-bold text-white">
                                {t('Create New Scale', 'إنشاء مقياس جديد')}
                            </h1>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="futuristic-btn-primary"
                        >
                            {isSaving ? t('Saving...', 'جاري الحفظ...') : t('Save Scale', 'حفظ المقياس')}
                        </button>
                    </div>

                    {/* Language Selection */}
                    <FuturisticPanel glowColor="purple" size="md" className="mb-6">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {t('Scale Language', 'لغة المقياس')}
                        </h2>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setScaleLanguage('ar')}
                                className={`flex-1 py-3 px-4 rounded-lg border transition-all ${scaleLanguage === 'ar'
                                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                                    }`}
                            >
                                <span className="text-lg font-bold">العربية</span>
                            </button>
                            <button
                                onClick={() => setScaleLanguage('en')}
                                className={`flex-1 py-3 px-4 rounded-lg border transition-all ${scaleLanguage === 'en'
                                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                                    }`}
                            >
                                <span className="text-lg font-bold">English</span>
                            </button>
                        </div>
                    </FuturisticPanel>

                    {/* Basic Info */}
                    <FuturisticPanel glowColor="cyan" size="md" className="mb-6">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {t('Basic Information', 'المعلومات الأساسية')}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">
                                    {t('Scale Title', 'عنوان المقياس')} *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="futuristic-input"
                                    placeholder={scaleLanguage === 'ar' ? 'مقياس تقييم القلق' : 'Anxiety Assessment Scale'}
                                    dir={isRtl ? 'rtl' : 'ltr'}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">
                                    {t('Description', 'الوصف')}
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="futuristic-input min-h-[80px]"
                                    placeholder={scaleLanguage === 'ar' ? 'وصف المقياس وأهدافه...' : 'Description of the scale and its objectives...'}
                                    dir={isRtl ? 'rtl' : 'ltr'}
                                />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isPublic}
                                    onChange={(e) => setIsPublic(e.target.checked)}
                                    className="w-5 h-5 rounded bg-slate-700"
                                />
                                <span className="text-white">
                                    {t('Make this scale public', 'اجعل هذا المقياس عاماً')}
                                </span>
                            </label>
                        </div>
                    </FuturisticPanel>

                    {/* Response Options */}
                    <FuturisticPanel glowColor="gold" size="md" className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">
                                {t('Response Options', 'خيارات الاستجابة')}
                            </h2>
                            <button onClick={addOption} className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                {t('Add Option', 'إضافة خيار')}
                            </button>
                        </div>
                        <div className="space-y-3">
                            {options.map((option) => (
                                <div key={option.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50">
                                    <span className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                                        {option.value}
                                    </span>
                                    <input
                                        type="text"
                                        value={option.label}
                                        onChange={(e) => updateOption(option.id, 'label', e.target.value)}
                                        className="futuristic-input flex-1"
                                        placeholder={scaleLanguage === 'ar' ? 'تسمية الخيار' : 'Option label'}
                                        dir={isRtl ? 'rtl' : 'ltr'}
                                    />
                                    <button onClick={() => removeOption(option.id)} className="text-red-400 hover:text-red-300 p-1">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </FuturisticPanel>

                    {/* Dimensions Section */}
                    <FuturisticPanel glowColor="green" size="md" className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {t('Dimensions', 'الأبعاد')}
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    {t('Define the categories/subscales for your statements', 'حدد التصنيفات/المقاييس الفرعية لعباراتك')}
                                </p>
                            </div>
                            <button onClick={addDimension} className="futuristic-btn inline-flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                {t('Add Dimension', 'إضافة بُعد')}
                            </button>
                        </div>

                        {dimensions.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl">
                                <p className="text-slate-500">{t('No dimensions yet', 'لا توجد أبعاد بعد')}</p>
                                <p className="text-sm text-slate-600 mt-1">{t('Add dimensions to categorize statements', 'أضف أبعاداً لتصنيف العبارات')}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {dimensions.map((dimension, index) => (
                                    <div key={dimension.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                                        <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                                            {index + 1}
                                        </span>
                                        <input
                                            type="text"
                                            value={dimension.name}
                                            onChange={(e) => updateDimension(dimension.id, e.target.value)}
                                            className="futuristic-input flex-1"
                                            placeholder={scaleLanguage === 'ar' ? 'اسم البُعد (مثال: الأعراض الجسدية)' : 'Dimension name (e.g., Physical Symptoms)'}
                                            dir={isRtl ? 'rtl' : 'ltr'}
                                        />
                                        <span className="text-xs text-slate-500">
                                            {statements.filter(s => s.dimensionId === dimension.id).length} {t('statements', 'عبارات')}
                                        </span>
                                        <button onClick={() => removeDimension(dimension.id)} className="text-red-400 hover:text-red-300 p-1">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </FuturisticPanel>

                    {/* Statements Section */}
                    <FuturisticPanel glowColor="cyan" size="md" className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {t('Statements', 'العبارات')}
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    {t('Add statements and assign each to a dimension. Drag to reorder.', 'أضف العبارات وعيّن كل واحدة لبُعد. اسحب لإعادة الترتيب.')}
                                </p>
                            </div>
                            <button
                                onClick={addStatement}
                                disabled={dimensions.length === 0}
                                className={`futuristic-btn inline-flex items-center gap-2 ${dimensions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                {t('Add Statement', 'إضافة عبارة')}
                            </button>
                        </div>

                        {dimensions.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl">
                                <p className="text-slate-500">{t('Add dimensions first', 'أضف الأبعاد أولاً')}</p>
                            </div>
                        ) : statements.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl">
                                <p className="text-slate-500">{t('No statements yet', 'لا توجد عبارات بعد')}</p>
                                <p className="text-sm text-slate-600 mt-1">{t('Add statements for participants to respond to', 'أضف عبارات ليرد عليها المشاركون')}</p>
                            </div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={statements.map(s => s.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-3">
                                        {statements.map((statement) => (
                                            <SortableStatementRow
                                                key={statement.id}
                                                statement={statement}
                                                dimensions={dimensions}
                                                onUpdate={updateStatement}
                                                onRemove={removeStatement}
                                                scaleLanguage={scaleLanguage}
                                                t={t}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </FuturisticPanel>

                    {/* Save Button */}
                    <div className="flex justify-end gap-4">
                        <Link href={returnTo === 'survey' ? '/surveys/new' : '/scales'} className="futuristic-btn">
                            {t('Cancel', 'إلغاء')}
                        </Link>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="futuristic-btn-primary"
                        >
                            {isSaving ? t('Saving...', 'جاري الحفظ...') : t('Save Scale', 'حفظ المقياس')}
                        </button>
                    </div>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
