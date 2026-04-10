import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { jsPDF } from "jspdf";

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
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

        // 2. Generate PDF using jsPDF
        // Note: unit 'mm', format 'a4'
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        // Add Header
        doc.setTextColor(15, 23, 42); // #0f172a
        doc.setFontSize(22);
        doc.text("Estebian Analysis Report", 105, 20, { align: "center" });
        
        doc.setTextColor(100, 116, 139); // #64748b
        doc.setFontSize(10);
        doc.text(`Report ID: ${reportId}`, 105, 30, { align: "center" });
        doc.text(`Generated At: ${new Date().toLocaleString()}`, 105, 35, { align: "center" });

        // Content
        doc.setTextColor(30, 41, 59); // #1e293b
        doc.setFontSize(16);
        doc.text("Survey Overview", 20, 50);
        doc.setLineWidth(0.5);
        doc.setDrawColor(226, 232, 240); // #e2e8f0
        doc.line(20, 52, 190, 52);

        doc.setFontSize(11);
        doc.text(`Type: ${report.type}`, 20, 60);
        doc.text(`Status: Completed`, 20, 67);

        if (report.data) {
            doc.setFontSize(16);
            doc.text("Analysis Results", 20, 85);
            
            doc.setFontSize(9);
            doc.setTextColor(51, 65, 85);
            // Split JSON string into lines to avoid overflow
            const dataStr = JSON.stringify(report.data, null, 2);
            const lines = doc.splitTextToSize(dataStr, 170);
            doc.text(lines, 20, 95);
        }

        // Footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setTextColor(148, 163, 184); // #94a3b8
        doc.setFontSize(9);
        doc.text("© 2026 Njaz Platform. All rights reserved.", 105, pageHeight - 10, { align: "center" });

        // Convert to ArrayBuffer
        const pdfArrayBuffer = doc.output('arraybuffer');
        const pdfBuffer = Buffer.from(pdfArrayBuffer);

        // 3. Upload to S3
        const s3Key = `reports/${report.owner || 'anonymous'}/${reportId}.pdf`;
        
        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: pdfBuffer,
            ContentType: 'application/pdf'
        }));

        // 4. Finalize DynamoDB record
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
        console.error('PDF Generation Error:', error);
        
        if (reportId && process.env.ESTEBIAN_REPORT_TABLE) {
            try {
                await docClient.send(new UpdateCommand({
                    TableName: process.env.ESTEBIAN_REPORT_TABLE,
                    Key: { id: reportId },
                    UpdateExpression: "SET #status = :s, errorMessage = :e",
                    ExpressionAttributeNames: { "#status": "status" },
                    ExpressionAttributeValues: {
                        ":s": "computation_failed",
                        ":e": `PDF Error: ${error.message || "Unknown error"}`
                    }
                }));
            } catch (updateErr) {
                console.error("Failed to update error status in DynamoDB:", updateErr);
            }
        }
        
        throw error;
    }
};
