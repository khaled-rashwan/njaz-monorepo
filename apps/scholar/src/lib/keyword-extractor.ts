/**
 * Advanced local RAKE (Rapid Automatic Keyword Extraction) Algorithm in TypeScript.
 * Highly optimized for academic papers (Title + Abstract).
 */

export interface KeywordResult {
    phrase: string;
    score: number;
}

// English Stopwords & Academic Filler Words
const ENGLISH_STOPWORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'cant', 'cannot', 'could', 'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during',
    'each', 'few', 'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed',
    'hell', 'hes', 'her', 'here', 'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows',
    'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isnt', 'it', 'its', 'itself',
    'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
    'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
    'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such',
    'than', 'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these', 'they',
    'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
    'was', 'wasnt', 'we', 'wed', 'well', 'were', 'werent', 'weve', 'what', 'whats', 'when', 'whens', 'where', 'wheres',
    'which', 'while', 'who', 'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll',
    'youre', 'youve', 'your', 'yours', 'yourself', 'yourselves',

    // Academic Stopwords / Transition words / Filler Verbs
    'paper', 'study', 'research', 'article', 'review', 'analysis', 'method', 'methods', 'results', 'conclusion', 'conclusions',
    'proposed', 'discuss', 'discussed', 'discussing', 'propose', 'proposes', 'proposing', 'demonstrate', 'demonstrates',
    'demonstrated', 'demonstrating', 'investigate', 'investigates', 'investigated', 'investigating', 'furthermore',
    'consequently', 'moreover', 'therefore', 'however', 'although', 'hence', 'thus', 'indeed', 'now', 'still', 'highly',
    'recent', 'recently', 'slow', 'fast', 'rapid', 'rapidly', 'experience', 'experiences', 'experienced',
    'experiencing', 'remain', 'remains', 'remained', 'remaining', 'rely', 'relies', 'relied', 'relying', 'ensure', 'ensures',
    'ensured', 'ensuring', 'dominate', 'dominates', 'dominated', 'dominating', 'transition', 'transitions', 'transitioned',
    'transitioning', 'govern', 'governs', 'governed', 'governing', 'reveal', 'reveals', 'revealed', 'revealing',
    'use', 'uses', 'used', 'using', 'based', 'find', 'found', 'create', 'creates', 'created', 'creating', 'show', 'shows',
    'showed', 'showing', 'make', 'makes', 'made', 'making', 'need', 'needs', 'needed', 'needing', 'conclude', 'concludes',
    'concluded', 'concluding', 'anchor', 'anchors', 'anchored', 'significant', 'significantly', 'focus', 'focused', 'focusing',
    'implication', 'implications', 'understand', 'understanding', 'present', 'presents', 'presented', 'presenting',
    'require', 'requires', 'required', 'requiring', 'entail', 'entails', 'allow', 'allows'
]);

// Arabic Stopwords & Academic Fillers
const ARABIC_STOPWORDS = new Set([
    'في', 'من', 'على', 'إلى', 'أن', 'هذا', 'التي', 'الذي', 'عن', 'مع', 'هذه', 'كان', 'كانت', 'كل', 'بعد', 'بين', 'عند',
    'ثم', 'أو', 'لا', 'ما', 'هناك', 'تم', 'لقد', 'حيث', 'كيف', 'لماذا', 'منذ', 'وقد', 'علينا', 'إذ', 'إذا', 'بل', 'لكن',
    'أصحاب', 'بعض', 'غير', 'قبل', 'خلال', 'مثل', 'حول', 'بسبب', 'لأن', 'لكي', 'كي', 'الذين', 'اللاتي', 'اللواتي', 'اللذين',
    // Academic fillers in Arabic
    'ورقة', 'دراسة', 'بحث', 'مقال', 'مراجعة', 'تحليل', 'طريقة', 'طرق', 'نتائج', 'خاتمة', 'خلاصات', 'مقترح', 'ناقش', 'دراسات'
]);

function isNumber(str: string): boolean {
    return !isNaN(parseFloat(str)) && isFinite(Number(str));
}

/**
 * Basic English singular/plural normalization to prevent keyword score dilution.
 */
function normalizeWord(word: string): string {
    let w = word.toLowerCase().trim();

    // Lightweight Arabic Normalization: Strip leading "ال" (The)
    // Only strip if the word has more than 3 characters to avoid breaking short root words
    if (w.startsWith('ال') && w.length > 3) {
        w = w.slice(2);
    }

    // Basic English singular/plural normalization
    if (w.endsWith('sses')) return w.slice(0, -2);
    if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('is') && !w.endsWith('us') && !w.endsWith('as')) {
        return w.slice(0, -1);
    }

    return w;
}

/**
 * Extract keywords/keyphrases from Title and Abstract with academic weighting and normalizations.
 */
export function extractKeywordsDetailed(
    title: string,
    abstract: string,
    options?: {
        maxKeywords?: number;
        titleWeight?: number;
        maxWordsPerPhrase?: number;
    }
): KeywordResult[] {
    const maxKeywords = options?.maxKeywords ?? 6;
    const titleWeight = options?.titleWeight ?? 3.0;
    const maxWordsPerPhrase = options?.maxWordsPerPhrase ?? 4;

    const fullText = `${title}. ${abstract}`;
    if (!fullText.trim()) return [];

    // Split text into candidate phrases using punctuation (excluding hyphen) and stopwords
    const punctuationRegex = /[.,\/#!$%\^&\*;:{}=_`~()?"“’،؟]/g;
    const textWithBoundaries = fullText.replace(punctuationRegex, '|');

    const rawChunks = textWithBoundaries.split(/[|\n\r\t]/);
    const candidatePhrases: string[] = [];

    rawChunks.forEach(chunk => {
        const words = chunk.split(/\s+/).map(w => w.trim()).filter(Boolean);
        let currentPhrase: string[] = [];

        words.forEach(word => {
            const lowerWord = word.toLowerCase();
            if (ENGLISH_STOPWORDS.has(lowerWord) || ARABIC_STOPWORDS.has(lowerWord) || isNumber(word) || word.length <= 2) {
                if (currentPhrase.length > 0) {
                    if (currentPhrase.length <= maxWordsPerPhrase) {
                        // Clean leading/trailing hyphens before adding
                        const cleanedPhrase = currentPhrase.join(' ').replace(/^-+|-+$/g, '').trim();
                        if (cleanedPhrase.length > 0) {
                            candidatePhrases.push(cleanedPhrase);
                        }
                    }
                    currentPhrase = [];
                }
            } else {
                currentPhrase.push(word);
            }
        });

        if (currentPhrase.length > 0) {
            if (currentPhrase.length <= maxWordsPerPhrase) {
                // Clean leading/trailing hyphens before adding
                const cleanedPhrase = currentPhrase.join(' ').replace(/^-+|-+$/g, '').trim();
                if (cleanedPhrase.length > 0) {
                    candidatePhrases.push(cleanedPhrase);
                }
            }
        }
    });

    const uniqueCandidates = Array.from(new Set(candidatePhrases.filter(Boolean)));
    if (uniqueCandidates.length === 0) return [];

    // Parse Title words for scoring weighting
    const titleWordsNormalized = new Set(
        title.toLowerCase()
            .replace(punctuationRegex, ' ')
            .split(/\s+/)
            .map(normalizeWord)
            .filter(w => w.length > 2 && !ENGLISH_STOPWORDS.has(w) && !ARABIC_STOPWORDS.has(w))
    );

    // Compute frequencies and co-occurrence degrees based on normalized word stems
    const wordFrequencies: Record<string, number> = {};
    const wordDegrees: Record<string, number> = {};

    uniqueCandidates.forEach(phrase => {
        const words = phrase.split(' ');
        const phraseWordCount = words.length;

        words.forEach(word => {
            const normalized = normalizeWord(word.toLowerCase());
            wordFrequencies[normalized] = (wordFrequencies[normalized] || 0) + 1;
            wordDegrees[normalized] = (wordDegrees[normalized] || 0) + phraseWordCount;
        });
    });

    // Compute word scores (Degree / Frequency) with Title Weighting
    const wordScores: Record<string, number> = {};
    Object.keys(wordFrequencies).forEach(normalizedWord => {
        let score = wordDegrees[normalizedWord] / wordFrequencies[normalizedWord];
        // Apply multiplier if this word stem appears in the title
        if (titleWordsNormalized.has(normalizedWord)) {
            score *= titleWeight;
        }
        wordScores[normalizedWord] = score;
    });

    // Score candidate phrases using their normalized word scores
    const phraseScores = uniqueCandidates.map(phrase => {
        const words = phrase.split(' ');
        const rawScore = words.reduce((sum, word) => sum + (wordScores[normalizeWord(word.toLowerCase())] || 0), 0);
        
        // Calculate the strict average word score to completely eliminate length bias
        const score = rawScore / words.length;

        const capitalizedPhrase = phrase.charAt(0).toUpperCase() + phrase.slice(1);
        return { phrase: capitalizedPhrase, score };
    });

    // Sort candidate phrases by score descending
    phraseScores.sort((a, b) => b.score - a.score);

    // Deduplicate phrases based on normalized stems to avoid redundancy (e.g. "Power System" vs "Power Systems", or subsets like "Grid Management" vs "Active Grid Management")
    const seenTokenSets: Set<string>[] = [];
    const finalResults: KeywordResult[] = [];

    for (const item of phraseScores) {
        const currentTokens = new Set(
            item.phrase.split(/\s+/).map(w => normalizeWord(w.toLowerCase()))
        );
        
        let isRedundant = false;

        for (const seenTokens of seenTokenSets) {
            const currentArray = Array.from(currentTokens);
            const seenArray = Array.from(seenTokens);

            // Check if the new phrase is a subset of an existing phrase, or vice versa
            const isSubset = currentArray.every(token => seenTokens.has(token));
            const isSuperset = seenArray.every(token => currentTokens.has(token));

            if (isSubset || isSuperset) {
                isRedundant = true;
                break;
            }
        }

        if (!isRedundant) {
            seenTokenSets.push(currentTokens);
            finalResults.push(item);
        }
        if (finalResults.length >= maxKeywords) {
            break;
        }
    }

    return finalResults;
}

/**
 * Convenience wrapper returning a comma-separated string of the highest scoring keywords.
 */
export function extractKeywords(
    title: string,
    abstract: string,
    options?: {
        maxKeywords?: number;
        titleWeight?: number;
        maxWordsPerPhrase?: number;
    }
): string {
    const results = extractKeywordsDetailed(title, abstract, options);
    return results.map(r => r.phrase).join(', ');
}
