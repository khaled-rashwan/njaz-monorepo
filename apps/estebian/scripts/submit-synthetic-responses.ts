import fetch from "node-fetch";

/**
 * Public Synthetic Response Submitter
 * 
 * This script uses the public AppSync API to submit 100 correlated responses
 * to a specific survey. No IAM permissions required.
 */

const APPSYNC_URL = "https://62lknugo3jepljmsz2uhm2ov4i.appsync-api.us-east-1.amazonaws.com/graphql";
const API_KEY = "da2-as3ja3bzincflgwbxb5qdzuzvi";

const SURVEY_ID = process.argv[2];

if (!SURVEY_ID) {
    console.error("❌ Error: Please provide a Survey ID as an argument.");
    console.log("Usage: npx ts-node apps/estebian/scripts/submit-synthetic-responses.ts <YOUR_SURVEY_ID>");
    process.exit(1);
}

async function runQuery(query: string, variables: any) {
    const response = await fetch(APPSYNC_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
        },
        body: JSON.stringify({ query, variables }),
    });
    return response.json();
}

async function submit() {
    console.log(`🔍 Fetching Survey metadata for: ${SURVEY_ID}...`);

    const getSurveyQuery = `
        query GetSurvey($id: ID!) {
            getEstebianSurvey(id: $id) {
                id
                scaleSnapshots
                demographics
            }
        }
    `;

    const surveyRes: any = await runQuery(getSurveyQuery, { id: SURVEY_ID });
    const survey = surveyRes.data?.getEstebianSurvey;

    if (!survey) {
        console.error("❌ Survey not found. Make sure the ID is correct and the survey is public.");
        console.log("Full Response:", JSON.stringify(surveyRes, null, 2));
        return;
    }

    const scales = JSON.parse(survey.scaleSnapshots || "[]");
    const demoFields = JSON.parse(survey.demographics || "[]");

    if (scales.length === 0) {
        console.error("❌ No scales found in this survey.");
        return;
    }

    console.log(`🚀 Submitting 100 correlated responses to survey: ${SURVEY_ID}`);

    const depts = ["IT", "HR", "Sales", "Marketing"];
    const genders = ["ذكر", "أنثى"];

    const mutation = `
        mutation SubmitResponse($surveyId: ID!, $answers: AWSJSON!, $demographics: AWSJSON) {
            submitResponse(surveyId: $surveyId, answers: $answers, demographics: $demographics)
        }
    `;

    for (let i = 0; i < 100; i++) {
        // Statistical Correlation Logic
        const latentFactorA = Math.random() * 2 + 3; // Positivity for Dim 1
        const latentFactorB = Math.random() * 2 + 2; // Positivity for Dim 2

        const answers: Record<string, number> = {};
        
        scales.forEach((scale: any) => {
            const statements = typeof scale.statements === 'string' ? JSON.parse(scale.statements) : scale.statements;
            statements.forEach((s: any, idx: number) => {
                const latent = (idx % 2 === 0) ? latentFactorA : latentFactorB;
                const noise = (Math.random() - 0.5) * 1.5;
                const val = Math.round(latent + noise);
                answers[s.id] = Math.max(1, Math.min(5, val));
            });
        });

        const demographics: Record<string, string> = {};
        demoFields.forEach((d: any) => {
            const label = d.label || "";
            // Use the actual ID from the survey demographics metadata
            if (label.includes("اسم") || label.includes("Name")) {
                demographics[d.id] = `المشارك_${i + 1}`;
            }
            else if (label.includes("عمر") || label.includes("Age") || d.type === 'number') {
                demographics[d.id] = String(Math.floor(Math.random() * 40) + 18);
            }
            else if (label.includes("نوع") || label.includes("جنس") || label.includes("Gender") || d.options) {
                const options = d.options || ["ذكر", "أنثى"];
                demographics[d.id] = options[Math.floor(Math.random() * options.length)];
            }
        });

        const variables = {
            surveyId: SURVEY_ID,
            answers: JSON.stringify(answers),
            demographics: JSON.stringify(demographics)
        };

        const res: any = await runQuery(mutation, variables);
        
        if (res.errors) {
            console.error(`❌ Submission ${i+1} failed:`, res.errors[0].message);
        } else if ((i + 1) % 20 === 0) {
            console.log(`   ... ${i + 1} responses processed`);
        }
    }

    console.log("\n✨ TEST DATA INJECTED SUCCESSFULLY! ✨");
    console.log(`\nNext Steps:`);
    console.log(`1. Go to: http://localhost:3002/surveys/${SURVEY_ID}/reports`);
    console.log(`2. Click 'Generate Report' (Comprehensive).`);
    console.log(`3. Wait for the computation and then open the Word document!`);
}

submit().catch(console.error);
