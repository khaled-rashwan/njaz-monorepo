import { defineFunction } from '@aws-amplify/backend';

export const researchPipeline = defineFunction({
    name: 'researchPipeline',
    entry: './handler.ts',
    timeoutSeconds: 300,
});
