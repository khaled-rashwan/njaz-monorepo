'use client';

/**
 * Converts LaTeX math strings into docx Math OMML objects.
 * 
 * This is a practical recursive-descent parser that handles the most common
 * LaTeX math constructs used in academic papers. It produces native Word
 * equation objects (OMML) rather than plaintext approximations.
 * 
 * Supported: fractions, superscripts, subscripts, combined sub/superscripts,
 * square roots, nth roots, summation, product, integral, Greek letters,
 * operators, norm/absolute/brackets, math fonts (mathbf, mathcal, mathbb, etc.),
 * text commands, and nested expressions.
 */

import {
    Math as DocxMath,
    MathRun,
    MathFraction,
    MathSuperScript,
    MathSubScript,
    MathSubSuperScript,
    MathRadical,
    XmlComponent,
    BuilderElement,
    createMathBase,
} from 'docx';

/**
 * Custom delimiter component for OMML (m:d) supporting arbitrary opening
 * and closing brackets/bars (e.g. norm ‖...‖, abs |...|, curly {...}, brackets [...], etc.).
 */
export class MathDelimiter extends XmlComponent {
    constructor(options: {
        beginningCharacter?: string;
        endingCharacter?: string;
        children: readonly any[];
    }) {
        super('m:d');
        const dPrChildren: XmlComponent[] = [];
        if (options.beginningCharacter !== undefined && options.beginningCharacter !== '') {
            dPrChildren.push(new BuilderElement({
                name: 'm:begChr',
                attributes: {
                    character: { key: 'm:val', value: options.beginningCharacter },
                },
            }));
        }
        if (options.endingCharacter !== undefined && options.endingCharacter !== '') {
            dPrChildren.push(new BuilderElement({
                name: 'm:endChr',
                attributes: {
                    character: { key: 'm:val', value: options.endingCharacter },
                },
            }));
        }
        this.root.push(new BuilderElement({
            name: 'm:dPr',
            children: dPrChildren,
        }));
        this.root.push(createMathBase({ children: options.children }));
    }
}

// Greek letter map: \alpha -> α etc.
const GREEK_MAP: Record<string, string> = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ',
    eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ',
    nu: 'ν', xi: 'ξ', omicron: 'ο', pi: 'π', rho: 'ρ', sigma: 'σ',
    tau: 'τ', upsilon: 'υ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Alpha: 'Α', Beta: 'Β', Gamma: 'Γ', Delta: 'Δ', Epsilon: 'Ε', Zeta: 'Ζ',
    Eta: 'Η', Theta: 'Θ', Iota: 'Ι', Kappa: 'Κ', Lambda: 'Λ', Mu: 'Μ',
    Nu: 'Ν', Xi: 'Ξ', Omicron: 'Ο', Pi: 'Π', Rho: 'Ρ', Sigma: 'Σ',
    Tau: 'Τ', Upsilon: 'Υ', Phi: 'Φ', Chi: 'Χ', Psi: 'Ψ', Omega: 'Ω',
    varepsilon: 'ε', varphi: 'φ', vartheta: 'ϑ', varrho: 'ϱ',
    partial: '∂', nabla: '∇', infty: '∞', forall: '∀', exists: '∃', nexists: '∄',
    emptyset: '∅', varnothing: '∅',
};

// Operator / symbol map
const SYMBOL_MAP: Record<string, string> = {
    times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓',
    leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠',
    approx: '≈', equiv: '≡', sim: '∼', propto: '∝', cong: '≅',
    in: '∈', notin: '∉', ni: '∋', subset: '⊂', supset: '⊃', subseteq: '⊆', supseteq: '⊇',
    cup: '∪', cap: '∩', setminus: '\\',
    to: '→', rightarrow: '→', leftarrow: '←', leftrightarrow: '↔',
    Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔', implies: '⇒', iff: '⇔',
    uparrow: '↑', downarrow: '↓',
    land: '∧', lor: '∨', neg: '¬', lnot: '¬',
    ldots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱',
    prime: '′', dprime: '″',
    quad: '  ', qquad: '    ',
    min: 'min', max: 'max', sup: 'sup', inf: 'inf',
    sin: 'sin', cos: 'cos', tan: 'tan', cot: 'cot', sec: 'sec', csc: 'csc',
    arcsin: 'arcsin', arccos: 'arccos', arctan: 'arctan',
    sinh: 'sinh', cosh: 'cosh', tanh: 'tanh',
    log: 'log', ln: 'ln', lg: 'lg', exp: 'exp', lim: 'lim',
    det: 'det', dim: 'dim', ker: 'ker', hom: 'hom',
    arg: 'arg', deg: 'deg', gcd: 'gcd', lcm: 'lcm',
    parallel: '‖', Vert: '‖', vert: '|', mid: '|',
    langle: '〈', rangle: '〉', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉',
};

export function toMathBold(str: string): string {
    let res = '';
    for (const char of str) {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) { // A-Z
            res += String.fromCodePoint(0x1D400 + (code - 65));
        } else if (code >= 97 && code <= 122) { // a-z
            res += String.fromCodePoint(0x1D41A + (code - 97));
        } else if (code >= 48 && code <= 57) { // 0-9
            res += String.fromCodePoint(0x1D7CE + (code - 48));
        } else {
            const greekBold: Record<string, string> = {
                'α': '𝛂', 'β': '𝛃', 'γ': '𝛄', 'δ': '𝛅', 'ε': '𝛆', 'ζ': '𝛇',
                'η': '𝛈', 'θ': '𝛉', 'ι': '𝛊', 'κ': '𝛋', 'λ': '𝛌', 'μ': '𝛍',
                'ν': '𝛎', 'ξ': '𝛏', 'ο': '𝛐', 'π': '𝛑', 'ρ': '𝛒', 'σ': '𝛔',
                'τ': '𝛕', 'υ': '𝛖', 'φ': '𝛗', 'χ': '𝛘', 'ψ': '𝛙', 'ω': '𝛚',
                'Α': '𝚨', 'Β': '𝚩', 'Γ': '𝚪', 'Δ': '𝚫', 'Ε': '𝚬', 'Ζ': '𝚭',
                'Η': '𝚮', 'Θ': '𝚯', 'Ι': '𝚰', 'Κ': '𝚱', 'Λ': '𝚲', 'Μ': '𝚳',
                'Ν': '𝚴', 'Ξ': '𝚵', 'Ο': '𝚶', 'Π': '𝚷', 'Ρ': '𝚸', 'Σ': '𝚹',
                'Τ': '𝚺', 'Υ': '𝚻', 'Φ': '𝚼', 'Χ': '𝚽', 'Ψ': '𝚾', 'Ω': '𝚿',
                '∇': '𝛁', '∂': '𝛛',
            };
            res += greekBold[char] || char;
        }
    }
    return res;
}

export function toMathCal(str: string): string {
    const calMap: Record<string, string> = {
        A: '𝒜', B: 'ℬ', C: '𝒞', D: '𝒟', E: 'ℰ', F: 'ℱ', G: '𝒢', H: 'ℋ',
        I: 'ℐ', J: '𝒥', K: '𝒦', L: 'ℒ', M: 'ℳ', N: '𝒩', O: '𝒪', P: '𝒫',
        Q: '𝒬', R: 'ℛ', S: '𝒮', T: '𝒯', U: '𝒰', V: '𝒱', W: '𝒲', X: '𝒳',
        Y: '𝒴', Z: '𝒵',
        a: '𝒶', b: '𝒷', c: '𝒸', d: '𝒹', e: 'ℯ', f: '𝒻', g: 'ℊ', h: '𝒽',
        i: '𝒾', j: '𝒿', k: '𝓀', l: '𝓁', m: '𝓂', n: '𝓃', o: 'ℴ', p: '𝓅',
        q: '𝓆', r: '𝓇', s: '𝓈', t: '𝓉', u: '𝓊', v: '𝓋', w: '𝓌', x: '𝓍',
        y: '𝓎', z: '𝓏'
    };
    let res = '';
    for (const char of str) {
        res += calMap[char] || char;
    }
    return res;
}

export function toMathBb(str: string): string {
    const bbMap: Record<string, string> = {
        A: '𝔸', B: '𝔹', C: 'ℂ', D: '𝔻', E: '𝔼', F: '𝔽', G: '𝔾', H: 'ℍ',
        I: '𝕀', J: '𝕁', K: '𝕂', L: '𝕃', M: '𝕄', N: 'ℕ', O: '𝕆', P: 'ℙ',
        Q: 'ℚ', R: 'ℝ', S: '𝕊', T: '𝕋', U: '𝕌', V: '𝕍', W: '𝕎', X: '𝕏',
        Y: '𝕐', Z: 'ℤ',
        '0': '𝟘', '1': '𝟙', '2': '𝟚', '3': '𝟛', '4': '𝟜', '5': '𝟝',
        '6': '𝟞', '7': '𝟟', '8': '𝟠', '9': '𝟡'
    };
    let res = '';
    for (const char of str) {
        if (bbMap[char]) {
            res += bbMap[char];
        } else {
            const code = char.charCodeAt(0);
            if (code >= 97 && code <= 122) { // a-z
                res += String.fromCodePoint(0x1D552 + (code - 97));
            } else {
                res += char;
            }
        }
    }
    return res;
}

export function toMathFrak(str: string): string {
    const frakMap: Record<string, string> = { C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ' };
    let res = '';
    for (const char of str) {
        if (frakMap[char]) {
            res += frakMap[char];
        } else {
            const code = char.charCodeAt(0);
            if (code >= 65 && code <= 90) {
                res += String.fromCodePoint(0x1D56C + (code - 65));
            } else if (code >= 97 && code <= 122) {
                res += String.fromCodePoint(0x1D586 + (code - 97));
            } else {
                res += char;
            }
        }
    }
    return res;
}

type MathFontStyle = 'bold' | 'cal' | 'bb' | 'frak' | null;

type MathChild = MathRun | MathFraction | MathSuperScript | MathSubScript |
    MathSubSuperScript | MathRadical | MathDelimiter;

/**
 * Parse a LaTeX string and return an array of docx Math children.
 */
export function parseLatexTokens(latex: string, fontStyle: MathFontStyle = null): MathChild[] {
    const children: MathChild[] = [];
    let i = 0;
    const len = latex.length;

    function skipSpaces() {
        while (i < len && latex[i] === ' ') i++;
    }

    function readBracedGroup(): string {
        if (i >= len || latex[i] !== '{') return '';
        let depth = 1;
        i++; // skip opening {
        let start = i;
        while (i < len && depth > 0) {
            if (latex[i] === '{') depth++;
            else if (latex[i] === '}') depth--;
            if (depth > 0) i++;
        }
        const content = latex.substring(start, i);
        if (i < len) i++; // skip closing }
        return content;
    }

    function readCommand(): string {
        // Assumes latex[i] === '\\'
        i++; // skip backslash
        if (i >= len) return '\\';
        let start = i;
        while (i < len && /[a-zA-Z]/.test(latex[i])) i++;
        if (i === start) {
            // Single non-letter char command like \{, \}, \, \|
            return '\\' + latex[i++];
        }
        return '\\' + latex.substring(start, i);
    }

    // Helper: read a single argument (either {braced group} or single char)
    function readArg(): string {
        skipSpaces();
        if (i >= len) return '';
        if (latex[i] === '{') {
            return readBracedGroup();
        }
        if (latex[i] === '\\') {
            return readCommand();
        }
        return latex[i++];
    }

    function parseDelimChar(): string {
        skipSpaces();
        if (i >= len) return '';
        if (latex[i] === '\\') {
            const cmd = readCommand();
            const name = cmd.slice(1);
            if (name === '|' || name === 'Vert' || name === 'parallel') return '‖';
            if (name === 'vert' || name === 'mid') return '|';
            if (name === '{' || name === 'lbrace') return '{';
            if (name === '}' || name === 'rbrace') return '}';
            if (name === 'langle') return '〈';
            if (name === 'rangle') return '〉';
            if (name === 'lfloor') return '⌊';
            if (name === 'rfloor') return '⌋';
            if (name === 'lceil') return '⌈';
            if (name === 'rceil') return '⌉';
            if (name === 'backslash') return '\\';
            return '';
        }
        const ch = latex[i++];
        if (ch === '.') return ''; // invisible delimiter
        if (ch === '|' && i < len && latex[i] === '|') {
            i++;
            return '‖';
        }
        return ch;
    }

    function transformText(t: string): string {
        if (!fontStyle) return t;
        if (fontStyle === 'bold') return toMathBold(t);
        if (fontStyle === 'cal') return toMathCal(t);
        if (fontStyle === 'bb') return toMathBb(t);
        if (fontStyle === 'frak') return toMathFrak(t);
        return t;
    }

    // Peek ahead for ^ or _ after current position
    function peekSuperSub(): { hasSup: boolean; hasSub: boolean; supArg: string; subArg: string } {
        const saved = i;
        skipSpaces();
        let hasSup = false, hasSub = false;
        let supArg = '', subArg = '';

        for (let pass = 0; pass < 2; pass++) {
            skipSpaces();
            if (i < len && latex[i] === '^' && !hasSup) {
                hasSup = true;
                i++;
                supArg = readArg();
            } else if (i < len && latex[i] === '_' && !hasSub) {
                hasSub = true;
                i++;
                subArg = readArg();
            }
        }

        if (!hasSup && !hasSub) {
            i = saved;
        }
        return { hasSup, hasSub, supArg, subArg };
    }

    function wrapWithSuperSub(base: MathChild[]): MathChild[] {
        const { hasSup, hasSub, supArg, subArg } = peekSuperSub();

        if (hasSup && hasSub) {
            return [new MathSubSuperScript({
                children: base,
                superScript: parseLatexTokens(supArg),
                subScript: parseLatexTokens(subArg),
            })];
        }
        if (hasSup) {
            return [new MathSuperScript({
                children: base,
                superScript: parseLatexTokens(supArg),
            })];
        }
        if (hasSub) {
            return [new MathSubScript({
                children: base,
                subScript: parseLatexTokens(subArg),
            })];
        }
        return base;
    }

    while (i < len) {
        const ch = latex[i];

        if (ch === ' ') {
            i++;
            continue;
        }

        // Standalone superscript / subscript
        if (ch === '^' || ch === '_') {
            const isSuper = ch === '^';
            i++;
            const arg = readArg();
            if (isSuper) {
                children.push(new MathSuperScript({
                    children: [new MathRun('')],
                    superScript: parseLatexTokens(arg),
                }));
            } else {
                children.push(new MathSubScript({
                    children: [new MathRun('')],
                    subScript: parseLatexTokens(arg),
                }));
            }
            continue;
        }

        if (ch === '{') {
            const group = readBracedGroup();
            const parsed = parseLatexTokens(group, fontStyle);
            const wrapped = wrapWithSuperSub(parsed);
            children.push(...wrapped);
            continue;
        }

        if (ch === '\\') {
            const cmd = readCommand();
            const cmdName = cmd.slice(1); // without backslash

            // \frac{num}{den}
            if (cmdName === 'frac' || cmdName === 'dfrac' || cmdName === 'tfrac') {
                const num = readArg();
                const den = readArg();
                const frac = new MathFraction({
                    numerator: parseLatexTokens(num, fontStyle),
                    denominator: parseLatexTokens(den, fontStyle),
                });
                const wrapped = wrapWithSuperSub([frac]);
                children.push(...wrapped);
                continue;
            }

            // \sqrt[n]{x} or \sqrt{x}
            if (cmdName === 'sqrt') {
                skipSpaces();
                let degree: string | undefined;
                if (i < len && latex[i] === '[') {
                    i++; // skip [
                    let start = i;
                    while (i < len && latex[i] !== ']') i++;
                    degree = latex.substring(start, i);
                    if (i < len) i++; // skip ]
                }
                const radicand = readArg();
                const radical = new MathRadical({
                    children: parseLatexTokens(radicand, fontStyle),
                    ...(degree ? { degree: parseLatexTokens(degree) } : {}),
                });
                const wrapped = wrapWithSuperSub([radical]);
                children.push(...wrapped);
                continue;
            }

            // \sum, \prod, \coprod
            if (cmdName === 'sum' || cmdName === 'prod' || cmdName === 'coprod') {
                const sym = cmdName === 'sum' ? '∑' : (cmdName === 'prod' ? '∏' : '∐');
                const run = new MathRun(sym);
                const wrapped = wrapWithSuperSub([run]);
                children.push(...wrapped);
                continue;
            }

            // \int, \iint, \iiint, \oint
            if (cmdName === 'int' || cmdName === 'iint' || cmdName === 'iiint' || cmdName === 'oint') {
                const symMap: Record<string, string> = { int: '∫', iint: '∬', iiint: '∭', oint: '∮' };
                const run = new MathRun(symMap[cmdName] || '∫');
                const wrapped = wrapWithSuperSub([run]);
                children.push(...wrapped);
                continue;
            }

            // \left ... \right delimiters (e.g. \left\| \frac{dx}{dt} \right\|)
            if (cmdName === 'left') {
                const openDelim = parseDelimChar();
                let depth = 1;
                let start = i;
                let closeDelim = '';
                let foundMatch = false;

                while (i < len && depth > 0) {
                    if (latex[i] === '\\') {
                        const savedPos = i;
                        const innerCmd = readCommand();
                        if (innerCmd === '\\left') {
                            parseDelimChar();
                            depth++;
                        } else if (innerCmd === '\\right') {
                            depth--;
                            if (depth === 0) {
                                const innerContent = latex.substring(start, savedPos);
                                closeDelim = parseDelimChar();
                                const innerParsed = parseLatexTokens(innerContent, fontStyle);
                                const delimNode = new MathDelimiter({
                                    beginningCharacter: openDelim,
                                    endingCharacter: closeDelim,
                                    children: innerParsed,
                                });
                                const wrapped = wrapWithSuperSub([delimNode]);
                                children.push(...wrapped);
                                foundMatch = true;
                                break;
                            } else {
                                parseDelimChar();
                            }
                        }
                    } else {
                        i++;
                    }
                }
                if (!foundMatch) {
                    const innerContent = latex.substring(start, i);
                    children.push(...parseLatexTokens(innerContent, fontStyle));
                }
                continue;
            }

            // \mathbf, \boldsymbol, \bm, \textbf
            if (['mathbf', 'boldsymbol', 'bm', 'textbf'].includes(cmdName)) {
                const arg = readArg();
                const innerParsed = parseLatexTokens(arg, 'bold');
                const wrapped = wrapWithSuperSub(innerParsed);
                children.push(...wrapped);
                continue;
            }

            // \mathcal, \mathscr
            if (['mathcal', 'mathscr'].includes(cmdName)) {
                const arg = readArg();
                const innerParsed = parseLatexTokens(arg, 'cal');
                const wrapped = wrapWithSuperSub(innerParsed);
                children.push(...wrapped);
                continue;
            }

            // \mathbb, \Bbb
            if (['mathbb', 'Bbb'].includes(cmdName)) {
                const arg = readArg();
                const innerParsed = parseLatexTokens(arg, 'bb');
                const wrapped = wrapWithSuperSub(innerParsed);
                children.push(...wrapped);
                continue;
            }

            // \mathfrak
            if (cmdName === 'mathfrak') {
                const arg = readArg();
                const innerParsed = parseLatexTokens(arg, 'frak');
                const wrapped = wrapWithSuperSub(innerParsed);
                children.push(...wrapped);
                continue;
            }

            // \mathrm, \text, \textrm, \operatorname, \mathit, \textit, etc.
            if (['mathrm', 'text', 'textrm', 'operatorname', 'mathit', 'textit', 'mathsf', 'textsf', 'mathtt', 'texttt'].includes(cmdName)) {
                const arg = readArg();
                const innerParsed = parseLatexTokens(arg, null);
                const wrapped = wrapWithSuperSub(innerParsed);
                children.push(...wrapped);
                continue;
            }

            // \bar{x}, \hat{x}, \tilde{x}, \vec{x}, \dot{x}, \ddot{x}, \overline{x}
            if (['bar', 'hat', 'tilde', 'vec', 'dot', 'ddot', 'overline', 'underline', 'widehat', 'widetilde'].includes(cmdName)) {
                const arg = readArg();
                const accentMap: Record<string, string> = {
                    bar: '\u0304', hat: '\u0302', tilde: '\u0303', vec: '\u20D7',
                    dot: '\u0307', ddot: '\u0308', overline: '\u0305',
                    underline: '\u0332', widehat: '\u0302', widetilde: '\u0303',
                };
                const accent = accentMap[cmdName] || '';
                const parsedInner = parseLatexTokens(arg, fontStyle);
                children.push(...parsedInner);
                children.push(new MathRun(accent));
                continue;
            }

            // Standalone \right skip
            if (cmdName === 'right') {
                parseDelimChar();
                continue;
            }

            // Standalone \| or \parallel or \Vert
            if (cmd === '\\|' || cmdName === 'Vert' || cmdName === 'parallel') {
                const run = new MathRun('‖');
                const wrapped = wrapWithSuperSub([run]);
                children.push(...wrapped);
                continue;
            }

            // bracket size modifiers — skip, OMML handles sizing automatically
            if (['big', 'Big', 'bigg', 'Bigg', 'bigl', 'bigr', 'Bigl', 'Bigr', 'biggl', 'biggr', 'Biggl', 'Biggr'].includes(cmdName)) {
                continue;
            }

            // \, \; \: \! \quad \qquad — thin / wide spaces
            if (cmd === '\\,' || cmd === '\\;' || cmd === '\\:' || cmd === '\\!' || cmd === '\\ ') {
                children.push(new MathRun(' '));
                continue;
            }

            // \{ and \}
            if (cmd === '\\{') { children.push(new MathRun('{')); continue; }
            if (cmd === '\\}') { children.push(new MathRun('}')); continue; }

            // Greek letters
            if (GREEK_MAP[cmdName]) {
                const sym = transformText(GREEK_MAP[cmdName]);
                const run = new MathRun(sym);
                const wrapped = wrapWithSuperSub([run]);
                children.push(...wrapped);
                continue;
            }

            // Known symbols / operators
            if (SYMBOL_MAP[cmdName]) {
                const sym = SYMBOL_MAP[cmdName];
                const run = new MathRun(sym);
                const wrapped = wrapWithSuperSub([run]);
                children.push(...wrapped);
                continue;
            }

            // Unknown command — render as text
            const txt = transformText(cmdName);
            const run = new MathRun(txt);
            const wrapped = wrapWithSuperSub([run]);
            children.push(...wrapped);
            continue;
        }

        // Handle unescaped [ and ( for automatic sizing
        if (ch === '[' || ch === '(') {
            const closingCh = ch === '[' ? ']' : ')';
            let depth = 1;
            let j = i + 1;
            while (j < len && depth > 0) {
                if (latex[j] === '\\') {
                    j += 2;
                    continue;
                }
                if (latex[j] === ch) depth++;
                else if (latex[j] === closingCh) depth--;
                if (depth === 0) break;
                j++;
            }
            if (depth === 0) {
                const innerContent = latex.substring(i + 1, j);
                const innerParsed = parseLatexTokens(innerContent, fontStyle);
                const bracketNode = new MathDelimiter({
                    beginningCharacter: ch,
                    endingCharacter: closingCh,
                    children: innerParsed,
                });
                const wrapped = wrapWithSuperSub([bracketNode]);
                children.push(...wrapped);
                i = j + 1; // skip past the closing bracket
                continue;
            }
        }

        // Regular character (digit, letter, operator like +, -, =, etc.)
        let text = '';
        while (i < len && !'\\{}^_$[]()'.includes(latex[i]) && latex[i] !== ' ') {
            text += latex[i];
            i++;
        }
        if (text) {
            const transformed = transformText(text);
            const run = new MathRun(transformed);
            const wrapped = wrapWithSuperSub([run]);
            children.push(...wrapped);
        }
    }

    return children;
}

/**
 * Convert a LaTeX string into a docx Math object suitable for
 * inclusion in a Paragraph's children array.
 */
export function latexToDocxMath(latex: string): DocxMath {
    const children = parseLatexTokens(latex);
    // Fallback: if parsing produced nothing, emit raw text
    if (children.length === 0) {
        return new DocxMath({
            children: [new MathRun(latex || ' ')],
        });
    }
    return new DocxMath({ children });
}
