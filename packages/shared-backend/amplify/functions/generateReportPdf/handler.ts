import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
    PageBreak, Header, Footer, PageNumber, NumberFormat, ImageRun
} from "docx";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";


const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: {
        removeUndefinedValues: true
    }
});
const s3Client = new S3Client({});

export const handler = async (event: any) => {
    console.log('Event:', JSON.stringify(event));

    const { reportId } = event;

    if (!reportId) {
        throw new Error("Missing reportId in event");
    }

    try {
        const reportTable = process.env.ESTEBIAN_REPORT_TABLE;
        const bucketName = process.env.REPORT_BUCKET_NAME;

        if (!reportTable || !bucketName) {
            throw new Error("Environment variables for reportTable or bucketName are missing");
        }

        // 1. Fetch the report data
        const getReport = await docClient.send(new GetCommand({
            TableName: reportTable,
            Key: { id: reportId }
        }));

        const report = getReport.Item;
        if (!report) throw new Error("Report not found");

        // 2. Generate Word Document using docx library
        const doc = await buildWordDocument(report, reportId);

        // 3. Write to local /tmp file
        const localFilePath = path.join(os.tmpdir(), `${reportId}.docx`);
        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(localFilePath, buffer);

        // 4. Stream to S3 (Body accepts a ReadStream)
        const s3Key = `reports/${report.owner || 'anonymous'}/${reportId}.docx`;
        const fileReadStream = fs.createReadStream(localFilePath);

        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: fileReadStream,
            ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }));

        // Clean up the local temporary file
        try {
            fs.unlinkSync(localFilePath);
        } catch (err) {
            console.warn("Failed to clean up local temp file:", err);
        }

        // 5. Finalize DynamoDB record
        await docClient.send(new UpdateCommand({
            TableName: reportTable,
            Key: { id: reportId },
            UpdateExpression: "SET #status = :s, pdfS3Key = :k, updatedAt = :t",
            ExpressionAttributeNames: { 
                "#status": "status"
            },
            ExpressionAttributeValues: {
                ":s": "completed",
                ":k": s3Key,
                ":t": new Date().toISOString()
            }
        }));

        return { 
            reportId, 
            status: 'completed',
            s3Key
        };

    } catch (error: any) {
        console.error('Word Document Generation Error:', error);
        
        if (reportId && process.env.ESTEBIAN_REPORT_TABLE) {
            try {
                await docClient.send(new UpdateCommand({
                    TableName: process.env.ESTEBIAN_REPORT_TABLE,
                    Key: { id: reportId },
                    UpdateExpression: "SET #status = :s, errorMessage = :e",
                    ExpressionAttributeNames: { "#status": "status" },
                    ExpressionAttributeValues: {
                        ":s": "computation_failed",
                        ":e": `Document Error: ${error.message || "Unknown error"}`
                    }
                }));
            } catch (updateErr) {
                console.error("Failed to update error status in DynamoDB:", updateErr);
            }
        }
        
        throw error;
    }
};

// ============================================
// WORD DOCUMENT BUILDER
// ============================================

async function buildWordDocument(report: any, reportId: string): Promise<Document> {
    const data = report.data || {};
    console.log("[DEBUG_BUILD] Report Data Keys:", Object.keys(data));
    console.log("[DEBUG_BUILD] Factor Analysis Count:", data.factorAnalysis?.length || 0);
    
    const isArabic = data.language === 'ar';
    const reportTypeLabels: Record<string, { en: string; ar: string }> = {
        demographic: { en: 'Demographic Report', ar: 'تقرير ديموغرافي' },
        scale: { en: 'Scale Analysis Report', ar: 'تقرير تحليل المقاييس' },
        comprehensive: { en: 'Comprehensive Report', ar: 'تقرير شامل' },
    };
    const typeLabel = reportTypeLabels[report.type] || reportTypeLabels.comprehensive;

    const sections: any[] = [];

    // ── COVER PAGE ──
    sections.push(
        createHeading(isArabic ? 'تقرير تحليل استبيان' : 'Estebian Analysis Report', HeadingLevel.TITLE, isArabic),
        // Decorative separator
        new Paragraph({
            bidirectional: isArabic,
            spacing: { after: 300 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "0369a1", space: 8 } },
            children: [],
        }),
        createHeading(data.surveyTitle || 'Survey Report', HeadingLevel.HEADING_1, isArabic),
        new Paragraph({ spacing: { after: 200 }, bidirectional: isArabic }),
        // Metadata block - each line with bold label + normal value
        ...[
            { label: isArabic ? 'النوع' : 'Type', value: isArabic ? typeLabel.ar : typeLabel.en },
            { label: isArabic ? 'حجم العينة' : 'Sample Size', value: String(data.sampleSize || 'N/A') },
            { label: isArabic ? 'تاريخ الإصدار' : 'Generated', value: new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
            { label: isArabic ? 'رقم التقرير' : 'Report ID', value: reportId },
        ].map(item => new Paragraph({
            bidirectional: isArabic,
            alignment: AlignmentType.START,
            spacing: { after: 80 },
            children: [
                new TextRun({ text: `${item.label}: `, bold: true, font: isArabic ? 'Arial' : 'Calibri', size: 22, color: "0f172a", rightToLeft: isArabic }),
                new TextRun({ text: item.value, font: isArabic ? 'Arial' : 'Calibri', size: 22, color: "334155", rightToLeft: isArabic }),
            ],
        })),
        new Paragraph({ children: [new PageBreak()], bidirectional: isArabic }),
    );

    // ── DEMOGRAPHICS SECTION ──
    if (data.demographics) {
        sections.push(
            createHeading(isArabic ? 'التوزيع الديموغرافي' : 'Demographic Distribution', HeadingLevel.HEADING_1, isArabic),
            createParagraph(`${isArabic ? 'إجمالي المشاركين' : 'Total Respondents'}: ${data.demographics.totalRespondents}`, isArabic),
            new Paragraph({ spacing: { after: 200 }, bidirectional: isArabic }),
        );

        for (const field of data.demographics.fields) {
            sections.push(
                createHeading(field.fieldLabel || field.fieldId, HeadingLevel.HEADING_2, isArabic),
            );

            // Numeric Stats & Distribution Curve
            if (field.numericStats) {
                const ns = field.numericStats;
                const statsRows = [
                    [isArabic ? 'العدد (N)' : 'N', String(ns.count)],
                    [isArabic ? 'المتوسط الحسابي' : 'Mean', String(ns.mean)],
                    [isArabic ? 'الانحراف المعياري' : 'Std. Dev', String(ns.std)],
                    [isArabic ? 'الوسيط' : 'Median', String(ns.median)],
                    [isArabic ? 'الحد الأدنى' : 'Min', String(ns.min)],
                    [isArabic ? 'الحد الأقصى' : 'Max', String(ns.max)],
                ];
                if (ns.skewness != null) statsRows.push([isArabic ? 'الالتواء' : 'Skewness', String(ns.skewness)]);
                if (ns.kurtosis != null) statsRows.push([isArabic ? 'التفرطح' : 'Kurtosis', String(ns.kurtosis)]);

                sections.push(
                    buildSimpleTable(
                        [isArabic ? 'الإحصاء' : 'Statistic', isArabic ? 'القيمة' : 'Value'],
                        statsRows,
                        isArabic
                    ),
                    new Paragraph({ spacing: { after: 100 }, bidirectional: isArabic })
                );


            }

            // Distribution Table (Binned for numeric questions, standard for categorical)
            if (field.binnedDistribution && field.binnedDistribution.length > 0) {
                // Render Sturges Binned Ranges
                const binnedRows = field.binnedDistribution.map((b: any) => [
                    b.rangeLabel,
                    String(b.count),
                    `${b.percentage}%`
                ]);
                sections.push(
                    buildSimpleTable(
                        [isArabic ? 'الفئة (المدى)' : 'Range Group', isArabic ? 'التكرار' : 'Count', isArabic ? 'النسبة' : '%'],
                        binnedRows,
                        isArabic
                    )
                );
            } else {
                // Fallback to standard discrete value distribution (Gender, Education, etc.)
                const dist = Object.entries(field.distribution || {})
                    .sort((a, b) => (b[1] as number) - (a[1] as number));

                if (dist.length > 0) {
                    const total = data.demographics.totalRespondents || 1;
                    const distRows = dist.map(([label, count]) => {
                        const pct = Math.round(((count as number) / total) * 100);
                        return [label, String(count), `${pct}%`];
                    });
                    sections.push(
                        buildSimpleTable(
                            [isArabic ? 'القيمة' : 'Value', isArabic ? 'التكرار' : 'Count', isArabic ? 'النسبة' : '%'],
                            distRows,
                            isArabic
                        )
                    );
                }
            }
            sections.push(new Paragraph({ spacing: { after: 200 }, bidirectional: isArabic }));
        }
        sections.push(new Paragraph({ children: [new PageBreak()], bidirectional: isArabic }));
    }

    // ── SCALE ANALYSIS SECTION ──
    if (data.scaleAnalysis && data.scaleAnalysis.length > 0) {
        sections.push(
            createHeading(isArabic ? 'تحليل المقاييس' : 'Scale Analysis', HeadingLevel.HEADING_1, isArabic),
        );

        for (const scale of data.scaleAnalysis) {
            sections.push(
                createHeading(scale.scaleName, HeadingLevel.HEADING_2, isArabic),
                createParagraph(
                    `${scale.statementCount} ${isArabic ? 'عبارة' : 'statements'} · ${scale.sampleSize} ${isArabic ? 'مشارك' : 'respondents'}`,
                    isArabic
                ),
            );

            // Descriptive Stats
            if (scale.descriptiveStats) {
                const ds = scale.descriptiveStats;
                sections.push(
                    createHeading(isArabic ? 'الإحصاءات الوصفية' : 'Descriptive Statistics', HeadingLevel.HEADING_3, isArabic),
                    buildSimpleTable(
                        [isArabic ? 'الإحصاء' : 'Statistic', isArabic ? 'القيمة' : 'Value'],
                        [
                            [isArabic ? 'المتوسط' : 'Mean', String(ds.mean)],
                            [isArabic ? 'الانحراف المعياري' : 'Std. Deviation', String(ds.std)],
                            [isArabic ? 'التباين' : 'Variance', String(ds.variance)],
                            [isArabic ? 'الوسيط' : 'Median', String(ds.median)],
                            [isArabic ? 'الحد الأدنى' : 'Min', String(ds.min)],
                            [isArabic ? 'الحد الأقصى' : 'Max', String(ds.max)],
                            [isArabic ? 'الالتواء' : 'Skewness', String(ds.skewness ?? 'N/A')],
                            [isArabic ? 'التفرطح' : 'Kurtosis', String(ds.kurtosis ?? 'N/A')],
                        ],
                        isArabic
                    ),
                );
            }

            // Reliability
            if (scale.reliability) {
                const rel = scale.reliability;
                const alphaInterpretation = (a: number) => {
                    if (a >= 0.9) return isArabic ? 'ممتاز' : 'Excellent';
                    if (a >= 0.8) return isArabic ? 'جيد' : 'Good';
                    if (a >= 0.7) return isArabic ? 'مقبول' : 'Acceptable';
                    if (a >= 0.6) return isArabic ? 'مشكوك فيه' : 'Questionable';
                    return isArabic ? 'ضعيف' : 'Poor';
                };

                sections.push(
                    createHeading(isArabic ? 'تحليل الثبات' : 'Reliability Analysis', HeadingLevel.HEADING_3, isArabic),
                    buildSimpleTable(
                        [isArabic ? 'المقياس' : 'Measure', isArabic ? 'القيمة' : 'Value', isArabic ? 'التفسير' : 'Interpretation'],
                        [
                            [isArabic ? 'ألفا كرونباخ' : "Cronbach's Alpha", (rel.cronbachAlpha ?? 0).toFixed(4), alphaInterpretation(rel.cronbachAlpha)],
                            [isArabic ? 'ألفا المعيارية' : 'Standardized Alpha', (rel.standardizedAlpha ?? 0).toFixed(4), ''],
                            [isArabic ? 'ارتباط النصفين' : 'Half Correlation', (rel.splitHalf?.rawCorrelation ?? 0).toFixed(4), ''],
                            [isArabic ? 'سبيرمان-براون' : 'Spearman-Brown', (rel.splitHalf?.spearmanBrown ?? 0).toFixed(4), ''],
                            [isArabic ? 'جتمان' : 'Guttman', (rel.splitHalf?.guttman ?? 0).toFixed(4), ''],
                        ],
                        isArabic
                    ),
                );
            }

            // Dimension Table
            if (scale.dimensions && scale.dimensions.length > 0) {
                const dimHeaders = [
                    isArabic ? 'البعد' : 'Dimension',
                    isArabic ? 'العبارات' : 'Items',
                    isArabic ? 'المتوسط' : 'Mean',
                    isArabic ? 'الانحراف' : 'Std',
                    isArabic ? 'الالتواء' : 'Skewness',
                    isArabic ? 'التفرطح' : 'Kurtosis',
                    isArabic ? 'ألفا (α)' : 'Alpha (α)',
                ];
                const dimRows = scale.dimensions.map((d: any) => [
                    d.dimensionName,
                    String(d.statementCount),
                    String(d.mean),
                    String(d.std),
                    String(d.skewness ?? 'N/A'),
                    String(d.kurtosis ?? 'N/A'),
                    d.cronbachAlpha != null ? d.cronbachAlpha.toFixed(4) : '—',
                ]);
                sections.push(
                    createHeading(isArabic ? 'تحليل الأبعاد' : 'Dimension Analysis', HeadingLevel.HEADING_3, isArabic),
                    buildSimpleTable(dimHeaders, dimRows, isArabic),
                );
            }

            // Item Statistics
            if (scale.itemStatistics && scale.itemStatistics.length > 0) {
                const itemHeaders = [
                    '#',
                    isArabic ? 'العبارة' : 'Statement',
                    isArabic ? 'المتوسط الحسابي (م)' : 'Mean (M)',
                    isArabic ? 'الانحراف المعياري (ع)' : 'Std Dev (SD)',
                    isArabic ? 'ارتباط البند بالكل (ر)' : 'Item-Total Correlation (r)',
                    isArabic ? 'معامل ألفا عند حذف العبارة (α)' : 'Cronbach\'s Alpha if Deleted (α)',
                ];
                const itemRows = scale.itemStatistics.map((item: any, idx: number) => [
                    String(idx + 1),
                    (item.statementText || '') + (item.isReversed ? ' *' : ''),
                    String(item.mean),
                    String(item.std),
                    (item.itemTotalCorrelation ?? 0).toFixed(4),
                    (item.alphaIfDeleted ?? 0).toFixed(4),
                ]);
                sections.push(
                    createHeading(isArabic ? 'إحصائيات العبارات' : 'Item Statistics', HeadingLevel.HEADING_3, isArabic),
                    buildSimpleTable(itemHeaders, itemRows, isArabic),
                    new Paragraph({
                        bidirectional: isArabic,
                        alignment: AlignmentType.START,
                        spacing: { before: 60, after: 150 },
                        children: [
                            new TextRun({
                                text: isArabic ? '* تشير إلى عبارات عكسية التوجيه.' : '* Indicates reverse-scored items.',
                                font: isArabic ? 'Arial' : 'Calibri',
                                size: 18,
                                italics: true,
                                color: "64748b",
                                rightToLeft: isArabic,
                            })
                        ]
                    })
                );
            }

            // Correlation Matrix
            if (scale.correlationMatrix && scale.correlationMatrix.length > 0) {
                const k = scale.correlationMatrix.length;
                const corrHeaders = ['', ...Array.from({ length: k }, (_, i) => `S${i + 1}`)];
                const corrRows = scale.correlationMatrix.map((row: any[], i: number) =>
                    [`S${i + 1}`, ...row.map((cell: any) => {
                        const r = cell.r?.toFixed(3) ?? '-';
                        const stars = cell.p < 0.001 ? '***' : cell.p < 0.01 ? '**' : cell.p < 0.05 ? '*' : '';
                        return i === row.indexOf(cell) ? '1.000' : `${r}${stars}`;
                    })]
                );
                sections.push(
                    createHeading(isArabic ? 'مصفوفة ارتباط بيرسون للعبارات' : 'Item Pearson Correlation Matrix', HeadingLevel.HEADING_3, isArabic),
                    createParagraph(isArabic ? '* p<0.05  ** p<0.01  *** p<0.001' : '* p<0.05  ** p<0.01  *** p<0.001', isArabic, 8),
                    buildSimpleTable(corrHeaders, corrRows, isArabic, 7),
                );
            }

            // ── FACTOR ANALYSIS SECTION (EFA / CFA) — Embedded directly inside Scale ──
            const fa = data.factorAnalysis?.find((f: any) => f.scaleId === scale.scaleId);
            if (fa) {
                // ── EFA SECTION ──
                sections.push(
                    createHeading(isArabic ? 'صدق التحليل العاملي الاستكشافي (EFA)' : 'Exploratory Factor Analysis (EFA) Validity', HeadingLevel.HEADING_3, isArabic),
                    createParagraph(
                        isArabic
                            ? 'تم تطبيق التحليل العاملي الاستكشافي للتحقق من الصدق العاملي للمقياس واستخلاص المكونات الكامنة. وقبل استخلاص العوامل، تم إجراء فحوصات كفاية حجم العينة وملاءمة البيانات.'
                            : 'Exploratory Factor Analysis (EFA) was conducted to verify the construct validity of the scale. Sampling adequacy and sphericity checks were performed prior to factor extraction.',
                        isArabic, 10
                    )
                );

                // KMO & Bartlett Table
                if (fa.efa.kmo !== undefined) {
                    const kmoVal = fa.efa.kmo;
                    const kmoInterp = kmoVal >= 0.90 ? (isArabic ? 'ممتاز (Excellent)' : 'Excellent')
                                    : kmoVal >= 0.80 ? (isArabic ? 'جيد جداً (Very Good)' : 'Very Good')
                                    : kmoVal >= 0.70 ? (isArabic ? 'جيد (Good)' : 'Good')
                                    : kmoVal >= 0.60 ? (isArabic ? 'مقبول (Acceptable)' : 'Acceptable')
                                    : (isArabic ? 'غير كافٍ (Poor)' : 'Poor');
                    
                    const kmoHeaders = [
                        isArabic ? 'الاختبار الإحصائي لملائمة البيانات' : 'Sampling Adequacy Test',
                        isArabic ? 'القيمة' : 'Value',
                        isArabic ? 'التفسير الإحصائي' : 'Interpretation'
                    ];

                    const kmoRows = [
                        [isArabic ? 'مقياس كيسر-ماير-أولكين (KMO)' : 'Kaiser-Meyer-Olkin (KMO) Measure', kmoVal.toFixed(3), kmoInterp]
                    ];

                    if (fa.efa.bartlett) {
                        const b = fa.efa.bartlett;
                        const sigInterp = b.pValue < 0.05 ? (isArabic ? 'دالة إحصائياً (p < 0.05)' : 'Significant (p < 0.05)') : (isArabic ? 'غير دالة' : 'Not Significant');
                        kmoRows.push(
                            [isArabic ? 'اختبار بارتليت للكروية: مربع كاي (χ²)' : 'Bartlett\'s Sphericity: Chi-Square (χ²)', b.chiSquare.toFixed(3), ''],
                            [isArabic ? 'درجات الحرية (df)' : 'Degrees of Freedom (df)', String(b.df), ''],
                            [isArabic ? 'مستوى الدلالة (p-value)' : 'Significance (p-value)', b.pValue.toFixed(4), sigInterp]
                        );
                    }

                    sections.push(
                        createHeading(isArabic ? 'مؤشرات كفاية العينة وملائمة البيانات (KMO & Bartlett)' : 'Sampling Adequacy & Sphericity Index', HeadingLevel.HEADING_3, isArabic),
                        buildSimpleTable(kmoHeaders, kmoRows, isArabic, 8),
                        new Paragraph({ spacing: { after: 150 }, bidirectional: isArabic })
                    );
                }

                // Eigenvalues & Scree Plot
                const rotLabel = fa.efa.rotated 
                    ? (isArabic ? `التدوير: ${fa.efa.rotationMethod}` : `Rotation: ${fa.efa.rotationMethod}`)
                    : (isArabic ? 'بدون تدوير' : 'No rotation');
                const methodLabel = fa.efa.factorMethod === 'eigenvalue'
                    ? (isArabic ? `استخلاص العوامل: حسب القيمة الذاتية ≥ ${fa.efa.eigenvalueThreshold}` : `Extraction: Eigenvalue ≥ ${fa.efa.eigenvalueThreshold}`)
                    : (isArabic ? `استخلاص العوامل: عدد ثابت (${fa.efa.componentsCount})` : `Extraction: Fixed (${fa.efa.componentsCount} factors)`);

                sections.push(
                    createHeading(isArabic ? 'القيم الذاتية والتباين المفسر (Eigenvalues)' : 'Eigenvalues & Variance Explained', HeadingLevel.HEADING_3, isArabic),
                    createParagraph(`${methodLabel} | ${rotLabel}`, isArabic, 9),
                );

                if (fa.efa.eigenvalues && fa.efa.eigenvalues.length > 0) {
                    const eigenHeaders = [
                        isArabic ? 'المكون' : 'Component',
                        isArabic ? 'القيمة الذاتية' : 'Eigenvalue',
                        isArabic ? 'التباين المفسر (%)' : 'Variance (%)',
                        isArabic ? 'التباين التراكمي (%)' : 'Cumulative (%)'
                    ];
                    const eigenRows = fa.efa.eigenvalues.slice(0, Math.max(fa.efa.componentsCount + 1, 5)).map((ev: number, idx: number) => [
                        String(idx + 1),
                        ev.toFixed(4),
                        fa.efa.varianceExplained?.[idx]?.toFixed(2) ?? '—',
                        fa.efa.cumulativeVariance?.[idx]?.toFixed(2) ?? '—'
                    ]);
                    sections.push(buildSimpleTable(eigenHeaders, eigenRows, isArabic, 8));
                    sections.push(new Paragraph({ spacing: { after: 100 }, bidirectional: isArabic }));

                    // QuickChart Scree Plot
                    try {
                        const chartConfig = {
                            type: 'line',
                            data: {
                                labels: fa.efa.eigenvalues.map((_: any, i: number) => String(i + 1)),
                                datasets: [{
                                    label: isArabic ? 'القيمة الذاتية' : 'Eigenvalue',
                                    data: fa.efa.eigenvalues,
                                    borderColor: '#0369a1',
                                    backgroundColor: '#0369a1',
                                    fill: false,
                                    pointRadius: 5
                                }, {
                                    label: 'Kaiser=1',
                                    data: fa.efa.eigenvalues.map(() => 1),
                                    borderColor: 'red',
                                    borderDash: [5, 5],
                                    fill: false,
                                    pointRadius: 0
                                }]
                            },
                            options: {
                                title: { 
                                    display: true, 
                                    text: isArabic ? 'منحنى الحصى (Scree Plot)' : 'Scree Plot',
                                    fontFamily: 'Noto Sans Arabic'
                                },
                                legend: {
                                    labels: {
                                        usePointStyle: true,
                                        fontSize: 12,
                                        fontFamily: 'Noto Sans Arabic'
                                    }
                                },
                                scales: {
                                    xAxes: [{ 
                                        ticks: {
                                            fontFamily: 'Noto Sans Arabic'
                                        },
                                        scaleLabel: { 
                                            display: true, 
                                            labelString: isArabic ? 'رقم المكون' : 'Component',
                                            fontFamily: 'Noto Sans Arabic'
                                        } 
                                    }],
                                    yAxes: [{ 
                                        ticks: {
                                            fontFamily: 'Noto Sans Arabic'
                                        },
                                        scaleLabel: { 
                                            display: true, 
                                            labelString: isArabic ? 'القيمة الذاتية' : 'Eigenvalue',
                                            fontFamily: 'Noto Sans Arabic'
                                        } 
                                    }]
                                }
                            }
                        };
                        
                        const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=500&height=300`;
                        const response = await fetch(url);
                        if (response.ok) {
                            const imageBuffer = Buffer.from(await response.arrayBuffer());
                            const signature = imageBuffer.slice(0, 4).toString('hex');
                            if (signature === "89504e47" && imageBuffer.length > 24) {
                                const pngWidth = imageBuffer.readUInt32BE(16);
                                const pngHeight = imageBuffer.readUInt32BE(20);
                                const maxWidth = 480;
                                let finalWidth = pngWidth;
                                let finalHeight = pngHeight;
                                if (pngWidth > maxWidth) {
                                    finalWidth = maxWidth;
                                    finalHeight = Math.round((pngHeight * maxWidth) / pngWidth);
                                }
                                sections.push(
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        bidirectional: isArabic,
                                        children: [
                                            new ImageRun({
                                                type: "png",
                                                data: imageBuffer,
                                                transformation: { width: finalWidth, height: finalHeight },
                                            }),
                                        ],
                                    }),
                                    new Paragraph({ spacing: { after: 150 }, bidirectional: isArabic })
                                );
                            }
                        }
                    } catch (e: any) {
                        console.error("[DEBUG_EFA] QuickChart Error:", e.message);
                    }
                }

                // Rotated Component Matrix
                const nFactors = fa.efa.componentsCount || fa.efa.loadings[0]?.length || 3;
                const efaHeaders = [
                    '#', 
                    isArabic ? 'العبارة' : 'Item', 
                    isArabic ? 'البعد النظري' : 'Theoretical Dimension'
                ];
                for (let f = 1; f <= nFactors; f++) efaHeaders.push(`F${f}`);
                
                const efaRows = fa.efa.loadings.map((row: number[], idx: number) => [
                    String(idx + 1),
                    fa.efa.itemLabels[idx] || '',
                    (fa.efa.itemDimensions && fa.efa.itemDimensions[idx]) || '—',
                    ...row.map((l: number) => l.toFixed(3))
                ]);

                sections.push(
                    createHeading(
                        fa.efa.rotated 
                            ? (isArabic ? 'مصفوفة المكونات بعد التدوير' : 'Rotated Component Matrix')
                            : (isArabic ? 'مصفوفة المكونات' : 'Component Matrix'),
                        HeadingLevel.HEADING_3, isArabic
                    ),
                    buildSimpleTable(efaHeaders, efaRows, isArabic, 7),
                    new Paragraph({ spacing: { after: 150 }, bidirectional: isArabic })
                );

                // Optimal Theoretical-Empirical Mapping Table
                if (fa.efa.factorMapping && fa.efa.factorMapping.length > 0) {
                    const mappingHeaders = [
                        isArabic ? 'البعد النظري' : 'Theoretical Dimension',
                        isArabic ? 'العامل الإمبيريقي المطابق' : 'Best Empirical Factor Match',
                        isArabic ? 'متوسط تشبع العبارات' : 'Average Absolute Loading',
                        isArabic ? 'قوة التطابق' : 'Congruence Strength'
                    ];
                    const mappingRows = fa.efa.factorMapping.map((m: any) => [
                        m.dimensionName,
                        isArabic ? `العامل ${m.factorIndex} (${m.factorName})` : `Factor ${m.factorIndex} (${m.factorName})`,
                        String(m.averageLoading),
                        isArabic ? m.strengthAr : m.strength
                    ]);
                    sections.push(
                        createHeading(
                            isArabic ? 'مواءمة الأبعاد النظرية مع العوامل المستخلصة رياضياً' : 'Theoretical-Empirical Factor Alignment Summary',
                            HeadingLevel.HEADING_3, isArabic
                        ),
                        buildSimpleTable(mappingHeaders, mappingRows, isArabic, 8),
                        new Paragraph({ spacing: { after: 200 }, bidirectional: isArabic })
                    );
                }

                // ── CFA SECTION ──
                sections.push(
                    createHeading(isArabic ? 'التحليل العاملي التوكيدي (CFA)' : 'Confirmatory Factor Analysis (CFA)', HeadingLevel.HEADING_3, isArabic),
                    createParagraph(
                        isArabic
                            ? 'تم إجراء التحليل العاملي التوكيدي للتحقق من مدى مطابقة الهيكل العاملي المفترض للمقياس مع بيانات العينة الفعلية وملاءمة النموذج للمجتمع.'
                            : 'Confirmatory Factor Analysis (CFA) was conducted to verify how well the hypothesized factor structure of the scale fits the empirical sample dataset.',
                        isArabic, 10
                    )
                );

                // Fit Indices Table
                if (fa.cfa.fitIndices) {
                    sections.push(createHeading(isArabic ? 'مؤشرات جودة المطابقة (Fit Indices)' : 'Model Goodness-of-Fit Indices', HeadingLevel.HEADING_3, isArabic));
                    const fitHeaders = [isArabic ? 'المؤشر' : 'Index', isArabic ? 'القيمة' : 'Value', isArabic ? 'معيار القبول' : 'Acceptance'];
                    const fitRows = [
                        ['Chi-Square (χ²)', `${fa.cfa.fitIndices.chiSquare} (df=${fa.cfa.fitIndices.df}, p=${fa.cfa.fitIndices.pValue})`, 'p > 0.05'],
                        ['RMSEA', String(fa.cfa.fitIndices.rmsea), '≤ 0.08'],
                        ['CFI', String(fa.cfa.fitIndices.cfi), '≥ 0.90'],
                        ['TLI', String(fa.cfa.fitIndices.tli), '≥ 0.90'],
                        ['SRMR', String(fa.cfa.fitIndices.srmr), '≤ 0.08']
                    ];
                    sections.push(buildSimpleTable(fitHeaders, fitRows, isArabic, 8));
                    sections.push(new Paragraph({ spacing: { after: 150 }, bidirectional: isArabic }));
                }

                // CFA Path Diagram
                if (fa.cfa.dimensions && fa.cfa.dimensions.length > 0) {
                    sections.push(createHeading(isArabic ? 'مخطط المسار البنائي (Path Diagram)' : 'Structural Path Diagram', HeadingLevel.HEADING_3, isArabic));
                    let imageEmbedded = false;
                    try {
                        let dot = 'digraph CFA {\n';
                        dot += isArabic ? '  rankdir=RL;\n' : '  rankdir=LR;\n';
                        dot += '  node [fontname="Noto Sans Arabic", fontsize=10, width=1.2, height=0.6];\n';
                        dot += '  edge [fontname="Noto Sans Arabic", fontsize=8, color="gray"];\n';
                        dot += '  charset="UTF-8";\n';
                        dot += '  ranksep=0.8;\n';
                        dot += '  nodesep=0.4;\n';

                        for (const dim of fa.cfa.dimensions) {
                            const latentId = `latent_${dim.dimensionId.replace(/[^a-zA-Z0-9]/g, '_')}`;
                            const dimName = dim.dimensionName.replace(/"/g, '\\"');
                            dot += `  ${latentId} [label="${dimName}", shape=ellipse, color="#0369a1", style=bold];\n`;
                            
                            for (let i = 0; i < dim.items.length; i++) {
                                const item = dim.items[i];
                                const itemId = `item_${latentId}_${i}`;
                                const label = item.index !== undefined ? String(item.index) : String(i + 1);
                                dot += `  ${itemId} [label="${label}", shape=box];\n`;
                                dot += `  ${latentId} -> ${itemId} [label="${item.loading.toFixed(2)}", color="red"];\n`;
                            }
                        }

                        const drawnCovariances = new Set<string>();
                        for (const dim of fa.cfa.dimensions) {
                            const latentId = `latent_${dim.dimensionId.replace(/[^a-zA-Z0-9]/g, '_')}`;
                            if (dim.covariances && Array.isArray(dim.covariances)) {
                                for (const cov of dim.covariances) {
                                    const otherLatentId = `latent_${cov.dimensionId.replace(/[^a-zA-Z0-9]/g, '_')}`;
                                    const pairKey = [latentId, otherLatentId].sort().join('_to_');
                                    if (!drawnCovariances.has(pairKey)) {
                                        drawnCovariances.add(pairKey);
                                        const correlation = typeof cov.correlation === 'number' ? cov.correlation.toFixed(2) : '0.00';
                                        dot += `  ${latentId} -> ${otherLatentId} [dir=both, label="${correlation}", color="#0284c7", style=dashed, constraint=false];\n`;
                                    }
                                }
                            }
                        }
                        dot += '}';
                        
                        const url = `https://quickchart.io/graphviz?format=png&graph=${encodeURIComponent(dot)}`;
                        const response = await fetch(url, { headers: { 'Accept': 'image/png' } });
                        if (response.ok) {
                            const imageBuffer = Buffer.from(await response.arrayBuffer());
                            const signature = imageBuffer.slice(0, 4).toString('hex');
                            if (signature === "89504e47" && imageBuffer.length > 24) {
                                const pngWidth = imageBuffer.readUInt32BE(16);
                                const pngHeight = imageBuffer.readUInt32BE(20);
                                const maxWidth = 480;
                                let finalWidth = pngWidth;
                                let finalHeight = pngHeight;
                                if (pngWidth > maxWidth) {
                                    finalWidth = maxWidth;
                                    finalHeight = Math.round((pngHeight * maxWidth) / pngWidth);
                                }
                                sections.push(
                                    new Paragraph({
                                        alignment: AlignmentType.CENTER,
                                        bidirectional: isArabic,
                                        children: [
                                            new ImageRun({
                                                type: "png",
                                                data: imageBuffer,
                                                transformation: { width: finalWidth, height: finalHeight },
                                            }),
                                        ],
                                    }),
                                    new Paragraph({ spacing: { after: 150 }, bidirectional: isArabic })
                                );
                                imageEmbedded = true;
                            }
                        }
                    } catch (e: any) {
                        console.error("[DEBUG_CFA] QuickChart/Graphviz Error:", e.message);
                    }

                    if (!imageEmbedded) {
                        for (const dim of fa.cfa.dimensions) {
                            const headerRow: any[] = [
                                { text: dim.dimensionName, bold: true },
                                { text: isArabic ? '← تشبعات الفقرات ←' : '← Item Loadings ←' },
                                { text: isArabic ? '↔ ارتباطات الأبعاد ↔' : '↔ Factor Covariances ↔' }
                            ];
                            const diagramRows: any[][] = [headerRow];
                            const maxRows = Math.max(dim.items.length, dim.covariances.length);
                            for (let i = 0; i < maxRows; i++) {
                                const item = dim.items[i];
                                const cov = dim.covariances[i];
                                diagramRows.push([
                                    item ? `${isArabic ? 'عبارة' : 'Item'} ${item.index !== undefined ? item.index : i + 1} (${item.loading})` : '',
                                    item ? '────→' : '',
                                    cov ? `↔ ${cov.dimensionName} (${cov.correlation})` : ''
                                ]);
                            }
                            sections.push(buildSimpleTable(
                                [isArabic ? 'الفقرات' : 'Items', '---', isArabic ? 'العلاقات' : 'Relations'],
                                diagramRows.map(r => r.map(c => typeof c === 'string' ? c : c.text)),
                                isArabic, 8
                            ));
                            sections.push(new Paragraph({ spacing: { after: 120 }, bidirectional: isArabic }));
                        }
                    }

                    // CFA Construct Validity Table (CR & AVE)
                    const cfaHeaders = [
                        isArabic ? 'البعد الفرعي' : 'Sub-dimension',
                        isArabic ? 'عدد العبارات' : 'Items Count',
                        isArabic ? 'ثبات المركب (CR)' : 'Composite Reliability (CR)',
                        isArabic ? 'متوسط التباين المستخلص (AVE)' : 'Average Variance Extracted (AVE)'
                    ];
                    const cfaRows = fa.cfa.dimensions.map((dim: any) => [
                        dim.dimensionName,
                        String(dim.itemCount),
                        dim.cr !== undefined ? dim.cr.toFixed(4) : '—',
                        dim.ave !== undefined ? dim.ave.toFixed(4) : '—'
                    ]);

                    sections.push(
                        createHeading(isArabic ? 'مؤشرات صدق التقارب والثبات البنائي (CR & AVE)' : 'Construct Validity & Composite Reliability (CR & AVE)', HeadingLevel.HEADING_3, isArabic),
                        createParagraph(
                            isArabic
                                ? 'يوضح الجدول التالي ثبات المركب (CR) ومتوسط التباين المستخلص (AVE) لكل بعد من أبعاد المقياس لإثبات صدق التقارب والاتساق البنائي (المعايير الأكاديمية: CR ≥ 0.70 و AVE ≥ 0.50).'
                                : 'The following table summarizes the Composite Reliability (CR) and Average Variance Extracted (AVE) for each sub-dimension to demonstrate convergent construct validity (Academic cutoffs: CR ≥ 0.70, AVE ≥ 0.50).',
                            isArabic, 9
                        ),
                        buildSimpleTable(cfaHeaders, cfaRows, isArabic, 8),
                        new Paragraph({ spacing: { after: 150 }, bidirectional: isArabic })
                    );

                    // Detailed dimension loadings details
                    sections.push(
                        createHeading(isArabic ? 'تفاصيل تشبعات الأبعاد' : 'Dimension Loading Details', HeadingLevel.HEADING_3, isArabic),
                        createParagraph(
                            `${isArabic ? 'متوسط التشبع الكلي (Congruence Score):' : 'Overall Avg. Loading (Congruence Score):'} ${fa.cfa.congruenceScore}`,
                            isArabic, 10
                        ),
                    );

                    for (const dim of fa.cfa.dimensions) {
                        const dimHeaders = [
                            isArabic ? 'الرقم' : 'No.', 
                            isArabic ? 'العبارة' : 'Item', 
                            isArabic ? 'التشبع' : 'Loading'
                        ];
                        const dimRows = dim.items.map((item: any, idx: number) => [
                            item.index !== undefined ? String(item.index) : String(idx + 1),
                            item.text,
                            item.loading.toFixed(3)
                        ]);
                        sections.push(
                            createParagraph(`${isArabic ? 'البعد الفرعي' : 'Sub-dimension'}: ${dim.dimensionName}`, isArabic, 9),
                            buildSimpleTable(dimHeaders, dimRows, isArabic, 8),
                            new Paragraph({ spacing: { after: 100 }, bidirectional: isArabic })
                        );
                    }
                }
            }

            sections.push(new Paragraph({ children: [new PageBreak()], bidirectional: isArabic }));
        }
    }

    // ── GROUP DIFFERENCES SECTION ──
    if (data.groupDifferences && data.groupDifferences.length > 0) {
        sections.push(
            createHeading(isArabic ? 'اختبار الفروق الجوهرية' : 'Group Differences Analysis', HeadingLevel.HEADING_1, isArabic),
            new Paragraph({ spacing: { after: 200 }, bidirectional: isArabic }),
        );

        for (const diff of data.groupDifferences) {
            sections.push(
                createHeading(`${isArabic ? 'حسب' : 'By'} ${diff.fieldLabel} (${diff.testType === 'ttest' ? (isArabic ? 'اختبار T' : 'T-test') : (isArabic ? 'اختبار ANOVA' : 'ANOVA')})`, HeadingLevel.HEADING_2, isArabic),
            );

            const groupNames = Object.keys(diff.results[0].groupMeans);
            const headers = [
                isArabic ? 'المقياس' : 'Scale',
                ...groupNames.map(name => `${name} (${isArabic ? 'م' : 'M'})`),
                diff.testType === 'ttest' ? (isArabic ? 'قيمة t' : 't-value') : (isArabic ? 'قيمة F' : 'F-value'),
                isArabic ? 'مستوى الدلالة (p)' : 'p-value',
                isArabic ? 'النتيجة' : 'Result'
            ];

            const rows = diff.results.map((res: any) => {
                const means = groupNames.map(name => String(res.groupMeans[name] ?? '—'));
                const resultText = res.significant 
                    ? (isArabic ? `دالة لصالح ${res.direction || ''}` : `Sig. (Higher for ${res.direction || ''})`)
                    : (isArabic ? 'غير دالة' : 'Not Sig.');
                
                return [
                    res.scaleName,
                    ...means,
                    String(res.statistic),
                    res.pValue.toFixed(4),
                    resultText
                ];
            });

            sections.push(buildSimpleTable(headers, rows, isArabic));
            sections.push(new Paragraph({ spacing: { after: 200 }, bidirectional: isArabic }));
        }
        sections.push(new Paragraph({ children: [new PageBreak()], bidirectional: isArabic }));
    }

    // ── INTER-SCALE CORRELATIONS (PEARSON) ──
    if (data.interScaleCorrelations && data.interScaleCorrelations.length > 0) {
        sections.push(
            createHeading(isArabic ? 'تحليل ارتباط بيرسون بين المقاييس' : 'Pearson Correlation Analysis', HeadingLevel.HEADING_1, isArabic),
            createParagraph(isArabic 
                ? 'يوضح الجدول التالي قوة واتجاه العلاقة بين إجمالي درجات المقاييس المختلفة.' 
                : 'The following table shows the strength and direction of the relationship between total scores of different scales.', 
                isArabic, 10),
            new Paragraph({ spacing: { after: 200 }, bidirectional: isArabic }),
        );

        const iscHeaders = [
            isArabic ? 'المقياس (أ)' : 'Scale (A)',
            isArabic ? 'المقياس (ب)' : 'Scale (B)',
            isArabic ? 'معامل الارتباط (r)' : 'Correlation (r)',
            isArabic ? 'مستوى الدلالة (p)' : 'Sig. (p)',
            isArabic ? 'تفسير العلاقة' : 'Interpretation',
        ];
        const iscRows = data.interScaleCorrelations.map((c: any) => [
            c.scaleAName,
            c.scaleBName,
            c.r?.toFixed(4),
            c.p?.toFixed(6),
            c.interpretation || '',
        ]);
        sections.push(buildSimpleTable(iscHeaders, iscRows, isArabic));
        sections.push(new Paragraph({ spacing: { after: 200 }, bidirectional: isArabic }));
    }



    // ── MEDIATION ANALYSIS (SOBEL TEST) ──
    if (data.mediationAnalysis && data.mediationAnalysis.length > 0) {
        sections.push(
            createHeading(isArabic ? 'تحليل الوساطة (اختبار سوبل)' : 'Mediation Analysis (Sobel Test)', HeadingLevel.HEADING_1, isArabic),
            createParagraph(isArabic 
                ? 'يختبر هذا التحليل ما إذا كان هناك مقياس يعمل كوسيط بين متغير مستقل ومتغير تابع.' 
                : 'This analysis tests if a scale acts as a mediator between an independent and a dependent variable.', 
                isArabic, 10),
        );

        const medHeaders = [
            isArabic ? 'المتغير المستقل (X)' : 'Independent (X)',
            isArabic ? 'الوسيط (M)' : 'Mediator (M)',
            isArabic ? 'المتغير التابع (Y)' : 'Dependent (Y)',
            'Sobel Z',
            'p-value',
            isArabic ? 'النتيجة' : 'Result'
        ];
        const medRows = data.mediationAnalysis.map((m: any) => [
            m.independentScaleName || 'X',
            m.mediatorScaleName || 'M',
            m.dependentScaleName || 'Y',
            String(m.z),
            String(m.p),
            m.significant ? (isArabic ? 'دالة (يوجد وساطة)' : 'Significant') : (isArabic ? 'غير دالة' : 'Not Significant')
        ]);
        sections.push(buildSimpleTable(medHeaders, medRows, isArabic));
        sections.push(new Paragraph({ spacing: { before: 150, after: 150 }, bidirectional: isArabic }));

        // Detailed Sobel Calculation Walkthrough
        sections.push(
            createHeading(isArabic ? 'خطوات التعويض وتفسير معادلة سوبل' : 'Step-by-Step Calculation & Formula Explanation', HeadingLevel.HEADING_3, isArabic),
        );

        for (const m of data.mediationAnalysis) {
            const aVal = m.a ?? 0;
            const saVal = m.sa ?? 0;
            const bVal = m.b ?? 0;
            const sbVal = m.sb ?? 0;
            const zVal = m.z ?? 0;
            const pVal = m.p ?? 0;

            if (isArabic) {
                sections.push(
                    createParagraph(`العلاقة المختبرة: مستقل (${m.independentScaleName}) ← وسيط (${m.mediatorScaleName}) ← تابع (${m.dependentScaleName})`, true, 10),
                    createParagraph(`معادلة اختبار سوبل (Sobel Formula):`, true, 10),
                    createParagraph(`Z = (a * b) / √[ (b² * sa²) + (a² * sb²) ]`, false, 10),
                    createParagraph(`حيث يتم حساب المعاملات كالتالي:`, true, 10),
                    createParagraph(`- a (معامل المسار الأول من المستقل للوسيط) = ${aVal}`, true, 9),
                    createParagraph(`- sa (الخطأ المعياري للمسار الأول) = ${saVal}`, true, 9),
                    createParagraph(`- b (معامل المسار الثاني من الوسيط للتابع مع التحكم في المستقل) = ${bVal}`, true, 9),
                    createParagraph(`- sb (الخطأ المعياري للمسار الثاني) = ${sbVal}`, true, 9),
                    createParagraph(`بالتعويض المباشر في المعادلة:`, true, 10),
                    createParagraph(`Z = (${aVal} * ${bVal}) / √[ (${bVal}² * ${saVal}²) + (${aVal}² * ${sbVal}²) ]`, false, 9),
                    createParagraph(`Z = (${(aVal * bVal).toFixed(4)}) / √[ ${(bVal * bVal * saVal * saVal).toFixed(6)} + ${(aVal * aVal * sbVal * sbVal).toFixed(6)} ]`, false, 9),
                    createParagraph(`Z = (${(aVal * bVal).toFixed(4)}) / ${(Math.sqrt(bVal * bVal * saVal * saVal + aVal * aVal * sbVal * sbVal)).toFixed(4)} = ${zVal}`, false, 9),
                    createParagraph(`قيمة Sobel Z الناتجة هي ${zVal} بقيمة احتمالية (p-value) تساوي ${pVal}. وبناءً على ذلك، تكون النتيجة ${m.significant ? 'دالة إحصائياً (يوجد تأثير وساطة)' : 'غير دالة إحصائياً (لا يوجد تأثير وساطة)'}.`, true, 10),
                    new Paragraph({ spacing: { after: 200 }, bidirectional: isArabic })
                );
            } else {
                sections.push(
                    createParagraph(`Tested Path: Independent (${m.independentScaleName}) → Mediator (${m.mediatorScaleName}) → Dependent (${m.dependentScaleName})`, false, 10),
                    createParagraph(`Sobel Test Equation:`, false, 10),
                    createParagraph(`Z = (a * b) / √[ (b² * sa²) + (a² * sb²) ]`, false, 10),
                    createParagraph(`Where the regression parameters are calculated as:`, false, 10),
                    createParagraph(`- a (Unstandardized coefficient for X → M) = ${aVal}`, false, 9),
                    createParagraph(`- sa (Standard error of a) = ${saVal}`, false, 9),
                    createParagraph(`- b (Unstandardized coefficient for M → Y, controlling for X) = ${bVal}`, false, 9),
                    createParagraph(`- sb (Standard error of b) = ${sbVal}`, false, 9),
                    createParagraph(`Substituting these parameters into the formula:`, false, 10),
                    createParagraph(`Z = (${aVal} * ${bVal}) / √[ (${bVal}² * ${saVal}²) + (${aVal}² * ${sbVal}²) ]`, false, 9),
                    createParagraph(`Z = (${(aVal * bVal).toFixed(4)}) / √[ ${(bVal * bVal * saVal * saVal).toFixed(6)} + ${(aVal * aVal * sbVal * sbVal).toFixed(6)} ]`, false, 9),
                    createParagraph(`Z = (${(aVal * bVal).toFixed(4)}) / ${(Math.sqrt(bVal * bVal * saVal * saVal + aVal * aVal * sbVal * sbVal)).toFixed(4)} = ${zVal}`, false, 9),
                    createParagraph(`The resulting Sobel Z is ${zVal} with a p-value of ${pVal}. Consequently, the mediation effect is ${m.significant ? 'statistically significant (Mediation confirmed)' : 'not statistically significant (No mediation)'}.`, false, 10),
                    new Paragraph({ spacing: { after: 200 }, bidirectional: isArabic })
                );
            }
        }
    }

    // ── FOOTER NOTE ──
    sections.push(
        new Paragraph({ spacing: { before: 400 }, bidirectional: isArabic }),
        createParagraph('© 2026 Njaz Platform (njaz.org) — All rights reserved.', false, 9),
    );

    const stylesConfig = {
        default: {
            document: {
                paragraph: {
                    alignment: AlignmentType.START,
                },
                run: {
                    font: isArabic ? 'Arial' : 'Calibri',
                    rightToLeft: isArabic,
                }
            },
            title: {
                run: {
                    bold: true,
                    size: 56,
                    font: isArabic ? 'Arial' : 'Calibri',
                    color: "0f172a",
                    rightToLeft: isArabic,
                },
                paragraph: {
                    alignment: AlignmentType.START,
                    bidirectional: isArabic,
                    spacing: { after: 200 },
                }
            },
            heading1: {
                run: {
                    bold: true,
                    size: 36,
                    font: isArabic ? 'Arial' : 'Calibri',
                    color: "0f172a",
                    rightToLeft: isArabic,
                },
                paragraph: {
                    alignment: AlignmentType.START,
                    bidirectional: isArabic,
                    spacing: { before: 400, after: 200 },
                    border: {
                        bottom: { style: BorderStyle.SINGLE, size: 6, color: "0369a1", space: 4 },
                    },
                }
            },
            heading2: {
                run: {
                    bold: true,
                    size: 28,
                    font: isArabic ? 'Arial' : 'Calibri',
                    color: "0369a1",
                    rightToLeft: isArabic,
                },
                paragraph: {
                    alignment: AlignmentType.START,
                    bidirectional: isArabic,
                    spacing: { before: 320, after: 160 },
                }
            },
            heading3: {
                run: {
                    bold: true,
                    size: 24,
                    font: isArabic ? 'Arial' : 'Calibri',
                    color: "334155",
                    rightToLeft: isArabic,
                },
                paragraph: {
                    alignment: AlignmentType.START,
                    bidirectional: isArabic,
                    spacing: { before: 240, after: 120 },
                }
            },
            heading4: {
                run: {
                    bold: true,
                    italics: true,
                    font: isArabic ? 'Arial' : 'Calibri',
                    color: "334155",
                    rightToLeft: isArabic,
                },
                paragraph: {
                    alignment: AlignmentType.START,
                    bidirectional: isArabic,
                }
            },
            heading5: {
                run: {
                    bold: true,
                    font: isArabic ? 'Arial' : 'Calibri',
                    color: "334155",
                    rightToLeft: isArabic,
                },
                paragraph: {
                    alignment: AlignmentType.START,
                    bidirectional: isArabic,
                }
            },
            heading6: {
                run: {
                    bold: true,
                    font: isArabic ? 'Arial' : 'Calibri',
                    color: "334155",
                    rightToLeft: isArabic,
                },
                paragraph: {
                    alignment: AlignmentType.START,
                    bidirectional: isArabic,
                }
            },
            strong: {
                run: {
                    bold: true,
                    font: isArabic ? 'Arial' : 'Calibri',
                    rightToLeft: isArabic,
                },
            },
            listParagraph: {
                run: {
                    font: isArabic ? 'Arial' : 'Calibri',
                    rightToLeft: isArabic,
                },
                paragraph: {
                    alignment: AlignmentType.START,
                    bidirectional: isArabic,
                }
            }
        },
        paragraphStyles: [
            {
                id: "Normal",
                name: "Normal",
                paragraph: {
                    alignment: AlignmentType.START,
                    bidirectional: isArabic,
                    spacing: { after: 120, line: 276 },
                },
                run: {
                    font: isArabic ? 'Arial' : 'Calibri',
                    size: 22,
                    color: "334155",
                    rightToLeft: isArabic,
                }
            }
        ]
    };

    return new Document({
        styles: stylesConfig,
        sections: [{
            properties: {
                page: {
                    margin: { top: 720, right: 720, bottom: 720, left: 720 },
                },
            },
            headers: {
                default: new Header({
                    children: [new Paragraph({
                        alignment: AlignmentType.START,
                        bidirectional: isArabic,
                        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "e2e8f0", space: 4 } },
                        children: [new TextRun({
                            text: isArabic ? 'تقرير إستبيان — منصة نجاز' : 'Estebian Report — Njaz Platform',
                            font: isArabic ? 'Arial' : 'Calibri',
                            size: 16,
                            color: "64748b",
                            italics: true,
                            rightToLeft: isArabic,
                        })],
                    })],
                }),
            },
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            bidirectional: isArabic,
                            children: [
                                new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
                            ],
                        }),
                    ],
                }),
            },
            children: sections,
        }],
    });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function createHeading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel], isArabic: boolean): Paragraph {
    const sizeMap: Record<string, number> = {
        [HeadingLevel.TITLE]: 56,
        [HeadingLevel.HEADING_1]: 36,
        [HeadingLevel.HEADING_2]: 28,
        [HeadingLevel.HEADING_3]: 24,
    };
    const colorMap: Record<string, string> = {
        [HeadingLevel.TITLE]: "0f172a",
        [HeadingLevel.HEADING_1]: "0f172a",
        [HeadingLevel.HEADING_2]: "0369a1",
        [HeadingLevel.HEADING_3]: "334155",
    };
    return new Paragraph({
        heading: level,
        bidirectional: isArabic,
        alignment: AlignmentType.START,
        children: [
            new TextRun({
                text,
                bold: true,
                font: isArabic ? 'Arial' : 'Calibri',
                size: sizeMap[level] || 22,
                color: colorMap[level] || "334155",
                rightToLeft: isArabic,
            }),
        ],
    });
}

function createParagraph(text: string, isArabic: boolean, fontSize?: number): Paragraph {
    return new Paragraph({
        bidirectional: isArabic,
        alignment: AlignmentType.START,
        spacing: { after: 120 },
        children: [
            new TextRun({
                text,
                font: isArabic ? 'Arial' : 'Calibri',
                size: fontSize ? fontSize * 2 : 22,
                color: "334155",
                rightToLeft: isArabic,
            }),
        ],
    });
}

function buildSimpleTable(headers: string[], rows: string[][], isArabic: boolean, fontSize: number = 9): Table {
    const cellBorders = {
        top: { style: BorderStyle.SINGLE, size: 4, color: "e2e8f0" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "e2e8f0" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "e2e8f0" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "e2e8f0" },
    };
    const cellMargins = { top: 40, bottom: 40, left: 80, right: 80 };

    const headerRow = new TableRow({
        tableHeader: true,
        children: headers.map(h => new TableCell({
            borders: cellBorders,
            shading: { fill: "1e293b", type: ShadingType.SOLID, color: "1e293b" },
            width: { size: Math.floor(100 / (headers.length || 1)), type: WidthType.PERCENTAGE },
            margins: cellMargins,
            children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: isArabic,
                spacing: { before: 40, after: 40 },
                children: [new TextRun({
                    text: h,
                    bold: true,
                    font: isArabic ? 'Arial' : 'Calibri',
                    size: fontSize * 2,
                    color: "ffffff",
                    rightToLeft: isArabic,
                })],
            })],
        })),
    });

    const dataRows = rows.map((row, rIdx) => new TableRow({
        children: row.map((cell, cIdx) => new TableCell({
            borders: cellBorders,
            shading: rIdx % 2 === 0
                ? { fill: "f8fafc", type: ShadingType.SOLID, color: "f8fafc" }
                : { fill: "ffffff", type: ShadingType.SOLID, color: "ffffff" },
            width: { size: Math.floor(100 / (headers.length || 1)), type: WidthType.PERCENTAGE },
            margins: cellMargins,
            children: [new Paragraph({
                alignment: cIdx === 0 ? AlignmentType.START : AlignmentType.CENTER,
                bidirectional: isArabic,
                spacing: { before: 20, after: 20 },
                children: [new TextRun({
                    text: cell || '',
                    font: cIdx > 0 && !isArabic ? 'Consolas' : (isArabic ? 'Arial' : 'Calibri'),
                    size: fontSize * 2,
                    color: "334155",
                    rightToLeft: isArabic,
                })],
            })],
        })),
    }));

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.START,
        visuallyRightToLeft: isArabic,
        rows: [headerRow, ...dataRows],
    });
}

function generateNormalCurveSvg(mean: number, sd: number, min: number, max: number, isArabic: boolean): string {
    const width = 450;
    const height = 150;
    const padding = 25;
    
    // We want to draw from -3.5 SD to +3.5 SD
    const startX = mean - 3.5 * sd;
    const endX = mean + 3.5 * sd;
    const xRange = endX - startX;
    
    const points: string[] = [];
    
    for (let i = 0; i <= 100; i++) {
        const xVal = startX + (i / 100) * xRange;
        // Normal distribution density function
        const exponent = -0.5 * Math.pow((xVal - mean) / sd, 2);
        const yVal = (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
        
        // Map xVal and yVal to SVG coordinate grid
        const svgX = padding + (i / 100) * (width - 2 * padding);
        // Max value of PDF is at xVal = mean, where yVal = 1 / (sd * sqrt(2*pi))
        const maxY = 1 / (sd * Math.sqrt(2 * Math.PI));
        const svgY = height - padding - (yVal / maxY) * (height - 2 * padding);
        
        points.push(`${svgX.toFixed(1)},${svgY.toFixed(1)}`);
    }
    
    // Mean line X position
    const meanSvgX = padding + ((mean - startX) / xRange) * (width - 2 * padding);
    
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <!-- Background Grid -->
        <rect width="${width}" height="${height}" fill="#0a0f1a" rx="12" stroke="#1e293b" stroke-width="1.5" />
        <path d="M ${padding},${height - padding} L ${width - padding},${height - padding}" stroke="#334155" stroke-dasharray="4 4" stroke-width="1" />
        
        <!-- Shaded Area Under Curve -->
        <path d="M ${padding},${height - padding} L ${points.join(' L ')} L ${width - padding},${height - padding} Z" fill="#06b6d4" fill-opacity="0.15" />
        
        <!-- Bell Curve Outline -->
        <path d="M ${points.join(' L ')}" fill="none" stroke="#38cddf" stroke-width="2.5" />
        
        <!-- Mean Vertical Reference Line -->
        <line x1="${meanSvgX}" y1="${padding}" x2="${meanSvgX}" y2="${height - padding}" stroke="#f59e0b" stroke-dasharray="3 3" stroke-width="1.5" />
        
        <!-- Labels -->
        <text x="${meanSvgX}" y="${padding - 8}" fill="#f59e0b" font-family="'Cairo', 'Arial', sans-serif" font-size="11" font-weight="bold" text-anchor="middle">
            ${isArabic ? 'المتوسط الحسابي' : 'Mean'}: ${mean.toFixed(2)}
        </text>
        
        <text x="${padding}" y="${height - 8}" fill="#94a3b8" font-family="'Cairo', 'Arial', sans-serif" font-size="10" text-anchor="start">
            -${(3 * sd).toFixed(1)} SD
        </text>
        
        <text x="${width - padding}" y="${height - 8}" fill="#94a3b8" font-family="'Cairo', 'Arial', sans-serif" font-size="10" text-anchor="end">
            +${(3 * sd).toFixed(1)} SD
        </text>
    </svg>`;
}
