import { defineFunction } from '@aws-amplify/backend';

export const simulationEngine = defineFunction({
    name: 'simulationEngine',
    entry: './handler.ts',
    timeoutSeconds: 300,
});
