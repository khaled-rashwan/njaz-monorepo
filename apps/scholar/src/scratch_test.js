function parseTextCitations(text) {
    const blocks = [];
    const parts = text.split(/(?:^|\r?\n)\s*(?:\[\d+\]|\d+\.)\s*/g);
    
    parts.forEach(part => {
        const trimmed = part.trim();
        if (trimmed) {
            blocks.push(trimmed);
        }
    });

    if (blocks.length <= 1 && parts.length <= 1) {
        text.split(/\r?\n\s*\r?\n/).forEach(block => {
            const trimmed = block.trim();
            if (trimmed) {
                blocks.push(trimmed);
            }
        });
    }

    return blocks.map(block => {
        const titleMatch = block.match(/["“]([^"”]+)["”]/);
        const parsedTitle = titleMatch ? titleMatch[1].trim() : undefined;

        const yearMatch = block.match(/\b(19\d{2}|20\d{2})\b/);
        const parsedYear = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

        let parsedAuthors = [];
        if (titleMatch && titleMatch.index !== undefined) {
            const beforeTitle = block.substring(0, titleMatch.index).trim();
            if (beforeTitle) {
                const cleanedNames = beforeTitle.replace(/,?\s+and\s+/gi, ', ').split(',');
                parsedAuthors = cleanedNames.map(n => n.trim()).filter(n => n.length > 2 && !/^\d+$/.test(n));
            }
        }

        return {
            rawText: block,
            parsedTitle,
            parsedYear,
            parsedAuthors: parsedAuthors.length > 0 ? parsedAuthors : undefined,
        };
    });
}

function parseDOIs(text) {
    const lines = text.split(/[\r\n,;]+/);
    const dois = [];
    const doiPattern = /(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i;

    for (const line of lines) {
        const match = line.match(doiPattern);
        if (match) {
            dois.push(match[1].trim());
        }
    }

    return dois;
}

const text = `[21] 
Y. Liu, X. Chen, B. Li, H. Li and Y. Ye, "WKS-type distributionally robust optimisation for optimal sub-hourly look-ahead economic dispatch," IET Research Journals, pp. 1-11, 2015. 
[22] 
Z. Zhou, C. Liu and A. Botterud, "Stochastic Methods Applied to Power System Operations with Renewable Energy: A Review," 2016.`;

console.log("DOIs:", parseDOIs(text));
console.log("Citations:", parseTextCitations(text));
