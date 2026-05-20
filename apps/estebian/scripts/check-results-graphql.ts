import fetch from "node-fetch";

const APPSYNC_URL = "https://62lknugo3jepljmsz2uhm2ov4i.appsync-api.us-east-1.amazonaws.com/graphql";
const API_KEY = "da2-as3ja3bzincflgwbxb5qdzuzvi";
const SURVEY_ID = "6df7003f-3408-445a-a8ff-da5da85bc01d";

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

async function check() {
    console.log(`Checking via GraphQL for Survey: ${SURVEY_ID}`);

    // Query all reports for this survey
    const listReportsQuery = `
        query ListReports($filter: ModelEstebianReportFilterInput) {
            listEstebianReports(filter: $filter) {
                items {
                    id
                    surveyId
                    type
                    status
                    errorMessage
                    pdfS3Key
                    createdAt
                    updatedAt
                }
            }
        }
    `;

    const reportsRes: any = await runQuery(listReportsQuery, {
        filter: { surveyId: { eq: SURVEY_ID } }
    });

    const reports = reportsRes.data?.listEstebianReports?.items || [];
    console.log(`\n📋 Reports found: ${reports.length}`);
    reports.forEach((rep: any, idx: number) => {
        console.log(`[${idx + 1}] ID: ${rep.id} | Type: ${rep.type} | Status: ${rep.status} | Key: ${rep.pdfS3Key || "None"} | Error: ${rep.errorMessage || "None"}`);
    });

    // Query all responses for this survey (handling pagination)
    const listResponsesQuery = `
        query ListResponses($filter: ModelEstebianResponseFilterInput, $nextToken: String) {
            listEstebianResponses(filter: $filter, nextToken: $nextToken) {
                items {
                    id
                    submittedAt
                }
                nextToken
            }
        }
    `;

    let allResponses: any[] = [];
    let nextToken = null;
    let pages = 0;

    do {
        pages++;
        const res: any = await runQuery(listResponsesQuery, {
            filter: { surveyId: { eq: SURVEY_ID } },
            nextToken
        });
        const items = res.data?.listEstebianResponses?.items || [];
        allResponses.push(...items);
        nextToken = res.data?.listEstebianResponses?.nextToken;
        console.log(`Page ${pages}: Found ${items.length} responses. Total so far: ${allResponses.length}`);
    } while (nextToken);

    console.log(`\n📊 Total responses retrieved via GraphQL: ${allResponses.length}`);
}

check().catch(console.error);
