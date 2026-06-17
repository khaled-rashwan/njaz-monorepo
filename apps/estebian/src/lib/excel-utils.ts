import * as XLSX from 'xlsx';

export interface ParsedSheetData {
    headers: string[];
    rows: Record<string, any>[];
}

/**
 * Parses an Excel or CSV file in the browser and returns headers and rows.
 */
export async function parseExcelOrCsv(file: File): Promise<ParsedSheetData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                if (!data) {
                    throw new Error('Could not read file data');
                }
                
                const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Convert to JSON array of arrays first to easily extract headers and rows
                const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
                
                if (rawData.length === 0) {
                    resolve({ headers: [], rows: [] });
                    return;
                }
                
                // First row is the headers
                const headers = (rawData[0] as any[]).map((h, index) => {
                    const str = h !== undefined && h !== null ? String(h).trim() : '';
                    return str || `Column_${index + 1}`;
                });
                
                // Subsequent rows are the respondents data
                const rows: Record<string, any>[] = [];
                for (let i = 1; i < rawData.length; i++) {
                    const rowData = rawData[i];
                    if (!rowData || rowData.length === 0) continue;
                    
                    const rowObject: Record<string, any> = {};
                    let hasValue = false;
                    
                    headers.forEach((header, colIndex) => {
                        const cellValue = rowData[colIndex];
                        rowObject[header] = cellValue !== undefined ? cellValue : null;
                        if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
                            hasValue = true;
                        }
                    });
                    
                    if (hasValue) {
                        rows.push(rowObject);
                    }
                }
                
                resolve({ headers, rows });
            } catch (err) {
                reject(err);
            }
        };
        
        reader.onerror = (err) => reject(err);
        reader.readAsBinaryString(file);
    });
}

/**
 * Attempts to guess the classification of a column header.
 */
export function guessColumnClassification(header: string): 'metadata_id' | 'metadata_time' | 'demographic' | 'scale_statement' {
    const h = header.toLowerCase();
    
    if (h.includes('id') || h.includes('serial') || h.includes('الرقم') || h.includes('مسلسل') || h.includes('كود') || h.includes('code') || h === 'no' || h === 'm') {
        return 'metadata_id';
    }
    
    if (h.includes('date') || h.includes('time') || h.includes('timestamp') || h.includes('التاريخ') || h.includes('الوقت') || h.includes('طابع')) {
        return 'metadata_time';
    }
    
    // Common demographic terms
    if (
        h.includes('age') || h.includes('gender') || h.includes('sex') || h.includes('education') || h.includes('job') || 
        h.includes('العمر') || h.includes('الجنس') || h.includes('النوع') || h.includes('التعليم') || h.includes('الوظيفة') ||
        h.includes('سنة') || h.includes('سنوات') || h.includes('الخبرة') || h.includes('experience') || h.includes('البلد') || h.includes('country')
    ) {
        return 'demographic';
    }
    
    return 'scale_statement';
}

/**
 * Reverses a score given a min and max scale boundary.
 */
export function reverseScore(value: number, minVal: number, maxVal: number): number {
    return (maxVal + minVal) - value;
}
