import { defineFunction } from '@aws-amplify/backend';

export const manageUsers = defineFunction({
    name: 'manageUsers',
    entry: './handler.ts',
    timeoutSeconds: 30,
    memoryMB: 256,
});
