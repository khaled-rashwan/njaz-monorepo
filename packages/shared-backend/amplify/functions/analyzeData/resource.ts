import { defineFunction } from '@aws-amplify/backend';

export const analyzeData = defineFunction({
  name: 'analyzeData',
  entry: './handler.ts',
  timeoutSeconds: 30, // Analytics might take a bit longer
  environment: {
    // Add any necessary environment variables here
  }
});
