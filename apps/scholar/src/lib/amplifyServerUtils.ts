import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/data';
import outputs from '../../amplify_outputs.json';
import { type Schema } from '@/data-schema';

export const { runWithAmplifyServerContext } = createServerRunner({
  config: outputs as any
});

export const cookiesClient = generateServerClientUsingCookies<Schema>({
  config: outputs as any,
  cookies: require('next/headers').cookies
});
