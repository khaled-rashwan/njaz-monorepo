import { defineFunction } from '@aws-amplify/backend';

export const verifyPayment = defineFunction({
    name: 'verifyPayment',
    entry: './handler.ts',
    timeoutSeconds: 30,
    memoryMB: 256,
    resourceGroupName: 'data'
});
