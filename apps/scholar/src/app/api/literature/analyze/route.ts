import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { runWithAmplifyServerContext, cookiesClient } from '@/lib/amplifyServerUtils';

export async function POST(req: NextRequest) {
    try {
        const { projectId, paperIds, prompt } = await req.json();

        if (!projectId || !paperIds || !Array.isArray(paperIds) || !prompt) {
            return NextResponse.json({ error: 'Missing projectId, paperIds (array), or prompt' }, { status: 400 });
        }

        // 1. Resolve API Settings
        let settings = null;
        let isAuthorized = false;
        let userId = 'dev-user';
        const isDevMode = process.env.NODE_ENV === 'development';

        try {
            const { data } = await runWithAmplifyServerContext({
                nextServerContext: { request: req, response: new NextResponse() },
                operation: async () => {
                    return await cookiesClient.models.AppSettings.get({ id: 'GLOBAL_CONFIG' });
                }
            });
            settings = data;
            isAuthorized = true;
        } catch (e) {
            console.warn('[API/Literature/Analyze] Settings/auth fetch failed:', e);
        }

        const apiKey = settings?.geminiApiKey || process.env.GEMINI_API_KEY;

        // 2. Load paper text contents
        const papersData = [];
        const textsDir = path.join(process.cwd(), 'storage', 'texts', projectId);

        for (const paperId of paperIds) {
            const fileName = `${paperId.replace(/[^a-z0-9]/gi, '_')}.txt`;
            const filePath = path.join(textsDir, fileName);
            let content = '';

            if (fs.existsSync(filePath)) {
                content = fs.readFileSync(filePath, 'utf-8');
            } else {
                console.warn(`[Analyze] No text file found for paper: ${paperId} at path: ${filePath}`);
            }

            // We also want to fetch metadata to display the title nicely in the LLM context
            papersData.push({
                id: paperId,
                text: content.slice(0, 15000), // Truncate text to avoid token limits per paper
            });
        }

        const activePapers = papersData.filter(p => p.text.length > 0);
        if (activePapers.length === 0) {
            return NextResponse.json({ error: 'No extracted paper text found. Please process papers first to extract text.' }, { status: 400 });
        }

        // 3. Formulate the LLM Prompt
        const systemInstruction = `You are an advanced academic research assistant.
Analyze the provided texts of academic papers and categorize/classify/summarize them according to the user's research prompt.
You MUST respond with a single valid JSON object. Do not wrap in markdown \`\`\`json blocks.
The JSON object MUST follow this schema:
{
  "columns": ["Title", "Classification", "Key Quote / Evidence", "Frequency Of Occurrence", "Confidence Score"],
  "rows": [
    {
      "Title": "The paper title or identifier",
      "Classification": "Detailed category/classification value",
      "Key Quote / Evidence": "Direct exact quote from text that supports this classification",
      "Frequency Of Occurrence": "High/Medium/Low representation of how often this topic/method occurs in the paper text",
      "Confidence Score": "0.0 to 1.0 AI confidence index"
    }
  ],
  "summary": "A 2-3 sentence overview of the findings and trends across the analyzed literature"
}
Ensure all keys matches exactly. The columns array must contain the column headers, and each row object keys must exactly match the header names in columns.`;

        const userPrompt = `Research Task Prompt: "${prompt}"

Below is the text contents of the ${activePapers.length} papers to analyze:

${activePapers.map((p, idx) => `--- PAPER ${idx + 1} (ID: ${p.id}) ---\n${p.text}\n--- END PAPER ${idx + 1} ---`).join('\n\n')}`;

        let aiResponseText = '';
        if (apiKey) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.2,
                        responseMimeType: "application/json",
                        maxOutputTokens: 8192,
                    }
                })
            });

            if (response.ok) {
                const resJson = await response.json();
                aiResponseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
            } else {
                const errText = await response.text();
                throw new Error(`Google Gemini API responded with status ${response.status}: ${errText}`);
            }
        } else {
            // Mock Response
            await new Promise(resolve => setTimeout(resolve, 2000));
            const mockRows = activePapers.map((p, idx) => ({
                "Title": `Paper (ID: ${p.id.slice(0, 10)}...)`,
                "Classification": "Cyber-Physical Power System Security",
                "Key Quote / Evidence": "This paper establishes a robust analytical method for system cyber security.",
                "Frequency Of Occurrence": "High",
                "Confidence Score": "0.90"
            }));
            aiResponseText = JSON.stringify({
                columns: ["Title", "Classification", "Key Quote / Evidence", "Frequency Of Occurrence", "Confidence Score"],
                rows: mockRows,
                summary: "Mock analysis results since no GEMINI_API_KEY was found. Add key to app configuration to use real LLM analysis."
            });
        }

        // Parse and return JSON
        let parsedResult;
        try {
            parsedResult = JSON.parse(aiResponseText.trim());
        } catch (parseErr) {
            console.error('[Analyze] Failed to parse LLM JSON:', aiResponseText);
            // Fallback packaging if JSON is malformed
            parsedResult = {
                columns: ["Title", "LLM Output"],
                rows: activePapers.map(p => ({ "Title": p.id, "LLM Output": aiResponseText.slice(0, 300) })),
                summary: "Error parsing LLM response as JSON. Raw output returned."
            };
        }

        return NextResponse.json({ success: true, ...parsedResult });

    } catch (error: any) {
        console.error('[Analyze] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
