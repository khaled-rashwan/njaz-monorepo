import { defineFunction } from '@aws-amplify/backend';

export const submitResponse = defineFunction({
    name: 'submitResponse',
    entry: './handler.ts',
    timeoutSeconds: 30,
    memoryMB: 256,
    resourceGroupName: 'data'
});
