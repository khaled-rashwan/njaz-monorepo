import { useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { client } from '@/lib/amplify-client';
import { useEditorStore } from '@/store/editor-store';

export function DataAnalysisPanel({ projectId }: { projectId: string }) {
    const { t } = useLanguage();
    const [dataset, setDataset] = useState('[\n  {"x": 1, "y": 2},\n  {"x": 2, "y": 4},\n  {"x": 3, "y": 5}\n]');
    const [analysisType, setAnalysisType] = useState('descriptive');
    const [result, setResult] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pushed, setPushed] = useState(false);

    const createResearchBlock = useEditorStore(state => state.createResearchBlock);
    const updateResearchBlockContent = useEditorStore(state => state.updateResearchBlockContent);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setError(null);
        setResult(null);
        setPushed(false);

        try {
            // Verify valid JSON
            JSON.parse(dataset);

            const { data, errors } = await client.mutations.analyzeData({
                dataset,
                analysisType,
            });

            if (errors) {
                throw new Error(errors[0].message);
            }

            if (data) {
                const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                if (!parsedData.success) {
                    throw new Error(parsedData.error || 'Unknown analysis error');
                }
                setResult(parsedData.result);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handlePushToCanvas = async () => {
        if (!result) return;
        try {
            const blockId = await createResearchBlock(
                projectId,
                'analysis-result',
                `${analysisType} analysis`
            );
            updateResearchBlockContent(blockId, { result, analysisType });
            setPushed(true);
        } catch (err) {
            console.error('Failed to push analysis to canvas:', err);
        }
    };

    return (
        <div className="p-4 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500/70">
                {t('Data Analysis Engine', 'محرك تحليل البيانات')}
            </h3>
            
            <p className="text-xs text-slate-400">
                {t('Run statistical analysis via the Shared Engine API (Estebian core).', 'قم بتشغيل التحليل الإحصائي عبر واجهة برمجة التطبيقات المشتركة (Estebian core).')}
            </p>

            <div className="space-y-2">
                <label className="block text-xs text-slate-300">Analysis Type</label>
                <select 
                    value={analysisType} 
                    onChange={(e) => setAnalysisType(e.target.value)}
                    className="futuristic-input w-full text-sm"
                >
                    <option value="descriptive">Descriptive Statistics</option>
                    <option value="correlation">Correlation Matrix</option>
                </select>
            </div>

            <div className="space-y-2">
                <label className="block text-xs text-slate-300">Dataset (JSON format)</label>
                <textarea
                    value={dataset}
                    onChange={(e) => setDataset(e.target.value)}
                    rows={6}
                    className="futuristic-input w-full font-mono text-xs"
                    placeholder='[{"col1": 1, "col2": 2}]'
                />
            </div>

            <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="futuristic-btn-primary w-full py-2"
            >
                {isAnalyzing ? t('Analyzing...', 'جاري التحليل...') : t('Run Analysis', 'تشغيل التحليل')}
            </button>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-4 space-y-2">
                    <h4 className="text-xs font-medium text-amber-400">Results</h4>
                    <pre className="p-3 bg-[#0a0a0e] border border-slate-700/50 rounded-lg text-xs text-slate-300 overflow-x-auto">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                    <button
                        onClick={handlePushToCanvas}
                        disabled={pushed}
                        className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${
                            pushed
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 cursor-default'
                                : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
                        }`}
                    >
                        {pushed ? (
                            <><span>✓</span><span>Added to Canvas</span></>
                        ) : (
                            <><span>🧮</span><span>Push Result to Canvas</span></>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
