import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/data-schema';

/**
 * Amplify Data client for Scholar
 * 
 * Uses the shared Amplify backend schema.
 * Default auth mode is userPool (Cognito).
 */
export const client = generateClient<Schema>();
