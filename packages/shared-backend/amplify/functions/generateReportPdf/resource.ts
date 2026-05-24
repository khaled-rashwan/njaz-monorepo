import { defineFunction } from '@aws-amplify/backend';

export const generateReportPdf = defineFunction({
    name: 'generateReportPdf',
    entry: './handler.ts',
    timeoutSeconds: 120,
    memoryMB: 1024,
    resourceGroupName: 'data',
});
