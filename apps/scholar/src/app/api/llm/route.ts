import { NextRequest, NextResponse } from 'next/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { runWithAmplifyServerContext, cookiesClient } from '@/lib/amplifyServerUtils';

// Simple in-memory rate limiting (IP -> timestamps)
const rateLimits = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

export async function POST(req: NextRequest) {
    try {
        // 1. Rate Limiting Check
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        const now = Date.now();
        const timestamps = rateLimits.get(ip) || [];
        const recentTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
        if (recentTimestamps.length >= MAX_REQUESTS) {
            return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
        }
        recentTimestamps.push(now);
        rateLimits.set(ip, recentTimestamps);

        // 2. Auth Session Validation
        let session;
        let userId = 'dev-user';
        let isAuthorized = false;
        const isDevMode = process.env.NODE_ENV === 'development';

        try {
            session = await runWithAmplifyServerContext({
                nextServerContext: { request: req, response: new NextResponse() },
                operation: async (contextSpec) => {
                    return await fetchAuthSession(contextSpec);
                }
            });

            if (session && session.tokens && session.tokens.idToken) {
                const sub = session.tokens.idToken.payload.sub;
                if (sub && typeof sub === 'string') {
                    userId = sub;
                    // Check for scholar-access or admins group
                    const groups = (session.tokens.accessToken.payload['cognito:groups'] as string[]) || [];
                    if (groups.includes('scholar-access') || groups.includes('admins')) {
                        isAuthorized = true;
                    }
                }
            }
        } catch (e) {
            console.warn('[API/LLM] Auth check failed:', e);
        }

        if (!isAuthorized && !isDevMode) {
            return NextResponse.json({ error: 'Unauthorized. Invalid session or missing permissions.' }, { status: 401 });
        }

        // 3. Global AppSettings Check
        let settings = null;
        if (isAuthorized) {
            try {
                const { data } = await runWithAmplifyServerContext({
                    nextServerContext: { request: req, response: new NextResponse() },
                    operation: async () => {
                        return await cookiesClient.models.AppSettings.get({ id: 'GLOBAL_CONFIG' });
                    }
                });
                settings = data;
            } catch (e) {
                console.warn('[API/LLM] Settings fetch failed:', e);
            }
        }

        if (settings && settings.isScholarAiEnabled === false) {
            return NextResponse.json({ error: 'AI features are currently disabled globally.' }, { status: 403 });
        }

        // 4. User Profile Quota Check
        let profile = null;
        if (isAuthorized) {
            try {
                const { data } = await runWithAmplifyServerContext({
                    nextServerContext: { request: req, response: new NextResponse() },
                    operation: async () => {
                        return await cookiesClient.models.UserScholarProfile.get({ id: userId });
                    }
                });
                profile = data;
            } catch (e) {
                console.warn('[API/LLM] Profile fetch failed:', e);
            }
        }

        const credits = profile?.apiCreditsRemaining ?? 10; // Default if not found
        const isSuspended = profile?.isAiSuspended ?? false;

        if (isSuspended) {
            return NextResponse.json({ error: 'Your AI access has been suspended. Contact support.' }, { status: 403 });
        }

        if (credits <= 0 && !isDevMode) {
            return NextResponse.json({ error: 'Out of AI credits. Upgrade to continue using this feature.' }, { status: 402 });
        }

        // Parse Request body
        const { prompt, contextText } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
        }

        // 5. Execute LLM API (Google AI Studio Gemini API if key is present, fallback to Mock)
        const apiKey = settings?.geminiApiKey || process.env.GEMINI_API_KEY;
        let aiResponse = '';
        
        if (apiKey) {
            const modelsToTry = [
                'gemini-3.5-flash',
                'gemini-2.5-flash',
                'gemini-2.0-flash'
            ];
            
            let lastError = null;
            for (const model of modelsToTry) {
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contents: [
                                {
                                    role: 'user',
                                    parts: [
                                        {
                                            text: `You are an academic writing co-author. Assist the user with their academic document.\n\nContext from document:\n${contextText || '(No context provided)'}\n\nTask/Prompt:\n${prompt}`
                                        }
                                    ]
                                }
                            ],
                            generationConfig: {
                                temperature: 0.7,
                                maxOutputTokens: 4096,
                            }
                        })
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error?.message || `Google API error status ${response.status}`);
                    }
                    
                    const data = await response.json();
                    aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    
                    if (!aiResponse) {
                        throw new Error('Empty response from Google AI API');
                    }
                    
                    // Success! Clear error and stop trying fallbacks
                    lastError = null;
                    break;
                } catch (err: any) {
                    console.error(`Gemini API Error with ${model}:`, err);
                    lastError = err;
                }
            }
            
            if (lastError) {
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const logPath = path.join(process.cwd(), 'error_log.txt');
                    fs.writeFileSync(logPath, `Time: ${new Date().toISOString()}\nError: ${lastError.message || String(lastError)}\nStack: ${lastError.stack || 'No stack'}\n`);
                } catch (e) {
                    console.error('Failed to write log file:', e);
                }
                return NextResponse.json({ error: `AI service failed: ${lastError.message || String(lastError)}` }, { status: 502 });
            }
        } else {
            // Fallback mock response for testing/development
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
            aiResponse = `[Mock AI Response]: (Set GEMINI_API_KEY env variable in .env.local to enable real Google Gemini API) Based on your prompt "${prompt.substring(0, 50)}..." and the context provided, here is a generated text snippet.`;
        }

        // 6. Deduct Credit
        if (isAuthorized) {
            try {
                await runWithAmplifyServerContext({
                    nextServerContext: { request: req, response: new NextResponse() },
                    operation: async () => {
                        if (profile) {
                            await cookiesClient.models.UserScholarProfile.update({
                                id: userId,
                                apiCreditsRemaining: credits - 1
                            });
                        } else {
                            // Create if they didn't exist yet
                            await cookiesClient.models.UserScholarProfile.create({
                                id: userId,
                                apiCreditsRemaining: 9,
                                billingTier: 'FREE',
                                isAiSuspended: false
                            });
                        }
                    }
                });
            } catch (err) {
                console.warn('[API/LLM] Failed to deduct credits:', err);
            }
        }

        return NextResponse.json({ result: aiResponse, creditsRemaining: isAuthorized ? credits - 1 : 999 });

    } catch (error: any) {
        console.error('LLM API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
