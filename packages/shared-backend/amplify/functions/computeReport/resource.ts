import { defineFunction } from '@aws-amplify/backend';

export const computeReport = defineFunction({
    name: 'computeReport',
    entry: './handler.ts',
    timeoutSeconds: 300, // 5 minutes for heavy computation
    memoryMB: 512,
    resourceGroupName: 'data'
});
