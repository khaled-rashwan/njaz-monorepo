import { defineFunction } from '@aws-amplify/backend';

export const initiateReport = defineFunction({
    name: 'initiateReport',
    entry: './handler.ts',
    timeoutSeconds: 30,
    memoryMB: 256,
    resourceGroupName: 'data'
});
