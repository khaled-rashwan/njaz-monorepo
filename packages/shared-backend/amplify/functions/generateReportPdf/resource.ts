import { defineFunction } from '@aws-amplify/backend';

export const generateReportPdf = defineFunction({
    name: 'generateReportPdf',
    entry: './handler.ts',
    timeoutSeconds: 60,
    memoryMB: 512,
    resourceGroupName: 'data',
});
