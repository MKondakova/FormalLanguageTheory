import * as process from 'process';
import { getExprEnd, getInput, getVarEnd, isExpr, isName, skipSpace } from './utils.js';
import { exprInBrackets, getOrRegex } from '../lab2/solve_system.js';
import { getRegexForGrammar, NOT_PRODUCTIVE } from '../lab2/RG_to_regex.js';

let error = null;
let grammar = {};
let startNterm = '[S]';

function Init(path) {
    const inputObj = getInput(path);
    if (inputObj.error !== null) {
        error = inputObj.error
    }
    const input = inputObj.input;
    getGrammar(input);
    if (error !== null) return;
    const names = new Set();
    for (const name in grammar) {
        grammar[name].names.forEach(n => names.add(n))
    }
    for (const name in grammar) {
        names.delete(name)
    }
    if (names.size > 0) {
        const needNames = [];
        names.forEach(n => needNames.push(n))
        error = `Не хватает уравнений для ${needNames}`;

    }
    if (!(startNterm in grammar) && Object.keys((grammar).length > 0)) {
        startNterm = Object.keys(grammar)[0];
    }
}

function getGrammar(input) {
    for (let i in input) {
        let line = input[i];
        let pos = 0;
        pos = skipSpace(line, pos);
        let varEnd = getVarEnd(line, pos);
        if (varEnd === null) {
            error = `Строка \'${line}\' неверного формата, сначала должно идти имя переменной.`;
            return;
        }
        const mainName = line.slice(pos, varEnd);
        if (!(mainName in grammar)) {
            grammar[mainName] = { 'names': new Set(), 'right_parts': [] };
        }
        pos = skipSpace(line, varEnd);
        const rightPart = [];
        //=========== "::=" =============
        if ((pos < line.length && line[pos] !== ':') || pos >= line.length) {
            error = `Строка \'${line}\' должна содержать \':\'.`;
            return;
        }
        pos++; // skip ":"
        pos = skipSpace(line, pos);
        if ((pos < line.length && line[pos] !== ':') || pos >= line.length) {
            error = `Строка \'${line}\' должна содержать \':\'.`;
            return;
        }
        pos++; // skip ":"
        if ((pos < line.length && line[pos] !== '=') || pos >= line.length) {
            error = `Строка \'${line}\' должна содержать \'=\'.`;
            return;
        }
        pos++; // skip "="
        //=========== END =============

        pos = skipSpace(line, pos);
        let endOfName = null;
        let endOfExpr = null;
        while (pos < line.length) {
            endOfExpr = getExprEnd(line, pos);
            if (endOfExpr === null) {
                endOfName = getVarEnd(line, pos);
                if (endOfName === null) {
                    error = `В строке \'${line}\' могут быть только терминалы и нетерминалы.`;
                    return;
                }
                const name = line.slice(pos, endOfName);
                grammar[mainName].names.add(name);
                rightPart.push(name);
                pos = endOfName;
            } else {
                rightPart.push(line.slice(pos, endOfExpr));
                pos = endOfExpr;
            }
        }
        grammar[mainName].right_parts.push(rightPart);
    }
}

function createUsageDictionary() {
    let result = {};
    for (const nterm in grammar) {
        grammar[nterm].names.forEach(name => {
            if (!(name in result)) {
                result[name] = new Set();
                result[name].add(nterm);
            } else {
                result[name].add(nterm);
            }
        })
    }
    for (const name in result) {
        result[name] = Array.from(result[name])
    }
    return result;
}

/**
 * @param usageDictionary {Object}
 * @param isRR {boolean} Праворегулярные ли термы нужны
 * @returns {string[]}
 */
function getRegularNTerms(usageDictionary, isRR) {
    let irregularNTerms = [];
    for (const nterm in grammar) {
        if (!isRegular(nterm, isRR)) {
            irregularNTerms.push(nterm)
        }
    }
    let stack = []
    irregularNTerms.forEach(n => stack.push(...(usageDictionary[n] || [])))
    while (stack.length > 0) {
        const nterm = stack.pop()
        if (irregularNTerms.includes(nterm)) continue;
        irregularNTerms.push(nterm);
        stack.push(...(usageDictionary[nterm] || []));
    }
    return Object.keys(grammar).filter(name => !irregularNTerms.includes(name));
}

function GetRegularNTerms() {
    const usageDictionary = createUsageDictionary();
    const rightRegular = getRegularNTerms(usageDictionary, true);
    const leftRegular = getRegularNTerms(usageDictionary, false);
    const allRegular = [...rightRegular];
    allRegular.push(...leftRegular.filter(n => !rightRegular.includes(n)));
    let closure = [];
    let changes;
    do {
        changes = false;
        for (const name in grammar) {
            if (!(allRegular.includes(name) || closure.includes(name))) {
                let regular = Array.from(grammar[name].names).every(n => allRegular.includes(n) || closure.includes(n))
                if (regular) {
                    closure.push(name);
                    changes = true;
                }
            }
        }
    } while (changes)
    return { 'all': [...allRegular, ...closure], rightRegular, leftRegular, closure };
}

/**
 * @param nterm {string}
 * @param isRR {boolean} определяем мы правую регулярность или левую
 * @returns {boolean}
 */
function isRegular(nterm, isRR) {
    let result = true;
    grammar[nterm].right_parts.forEach(part =>
                                           result = result && part.length <= 2 &&
                                               (part.length === 1 ||
                                                   part.length === 2 &&
                                                   (isRR && isExpr(part[0]) && isName(part[1]) ||
                                                       !isRR && isName(part[0]) && isExpr(part[1]))))
    return result;
}

function wrapTerminals(regularNTerms) {
    for (const nterm in grammar) {
        if (regularNTerms.all.includes(nterm)) continue;
        for (const part of grammar[nterm].right_parts) {
            for (let i = 0; i < part.length; ++i) {
                if (isExpr(part[i])) {
                    const newNterm = ("[" + part[i] + "]");
                    if (!(newNterm in grammar)) {
                        grammar[newNterm] = { 'names': new Set(), 'right_parts': [[part[i]]] }
                        regularNTerms.all.push(newNterm);
                        regularNTerms.rightRegular.push(newNterm);
                        regularNTerms.leftRegular.push(newNterm);
                    }
                    grammar[nterm].names.add(newNterm);
                    part[i] = newNterm;
                }
            }
        }
    }
    return regularNTerms;
}

function FindFirstOrLast(regularNTerms, isFirst = true) {
    const key = isFirst ? 'first' : 'last'
    for (const name in grammar) {
        grammar[name][key] = [];
    }
    let changes;
    do {
        changes = false;
        for (const nterm of regularNTerms) {
            for (const rule of grammar[nterm].right_parts) {
                const index = isFirst ? 0 : rule.length - 1;
                if (isExpr(rule[index]) && !grammar[nterm][key].includes(rule[index])) {
                    grammar[nterm][key].push(rule[index]);
                    changes = true;
                }
                if (isName(rule[index], false)) {
                    grammar[rule[index]][key].forEach(term => {
                        if (!grammar[nterm][key].includes(term)) {
                            grammar[nterm][key].push(term);
                            changes = true;
                        }
                    })
                }
            }
        }
    } while (changes)
}

function FindFollowOrPrecede(regularNTerms, isFollow = true) {
    const key = isFollow ? 'follow' : 'precede';
    for (const name in grammar) {
        grammar[name][key] = [];
    }
    grammar[startNterm][key].push(isFollow ? 'END' : '^');
    let changes;
    do {
        changes = false;
        for (const nterm in grammar) {
            for (const rule of grammar[nterm].right_parts) {
                for (let i = 0; i < rule.length; ++i) {
                    if (isExpr(rule[i])) continue;
                    const currNTerm = rule[i];
                    const nextIndex = isFollow ? i + 1 : i - 1;
                    if (nextIndex >= 0 && nextIndex < rule.length && isExpr(rule[nextIndex])) {
                        if (!grammar[currNTerm][key].includes(rule[nextIndex])) {
                            grammar[currNTerm][key].push(rule[nextIndex]);
                            changes = true;
                        }
                        continue;
                    }
                    let sourceArray = grammar[nterm][key]
                    if ((isFollow && i !== rule.length - 1) || (!isFollow && i !== 0)) {
                        sourceArray = isFollow ? grammar[rule[nextIndex]].first : grammar[rule[nextIndex]].last;
                    }
                    sourceArray.forEach(term => {
                        if (!grammar[currNTerm][key].includes(term)) {
                            grammar[currNTerm][key].push(term);
                            changes = true;
                        }
                    });
                }
            }
        }
    } while (changes)
}

function FindTokens(regularNTerms) {
    let tokens = [];
    for (const nterm of regularNTerms) {
        let terminals = grammar[nterm].precede
        grammar[nterm].follow.forEach(n => {
            if (!terminals.includes(n)) {
                terminals.push(n)
            }
        });
        const singleTermLanguage = getSingleTermLanguage(nterm);
        let intersection = [];
        terminals.forEach(term => {
            if (singleTermLanguage.includes(term)) {
                intersection.push(term)
            }
        });
        if (intersection.length > 0) {
            console.log(`Конфликт языков у терма ${nterm}: ${intersection}`);
        } else {
            tokens.push(nterm);
        }
    }
    return tokens;
}

function getSingleTermLanguage(nterm) {
    let singleTermLanguage = [];
    let visited = [];
    let stack = [nterm];
    while (stack.length > 0) {
        const currentNterm = stack.pop();
        visited.push(currentNterm);
        for (const rule of grammar[currentNterm].right_parts) {
            if (rule.length > 1) continue;
            if (isExpr(rule[0])) {
                if (!singleTermLanguage.includes(rule[0])) {
                    singleTermLanguage.push(rule[0]);
                }
            } else {
                if (!visited.includes(rule[0]) && !stack.includes(rule[0])) {
                    stack.push(rule[0]);
                }
            }
        }
    }
    return singleTermLanguage;
}

function FindRegexes(regularNTerms, tokens) {
    let result = {};
    const RRGrammar = adaptRRGrammar(regularNTerms.rightRegular);
    regularNTerms.rightRegular
        .forEach(t => result[t] = getRegexForGrammar(RRGrammar, t));
    regularNTerms.leftRegular.filter(t => !regularNTerms.rightRegular.includes(t))
        .forEach(t => {
            const newGrammar = adaptLRGrammar(t);
            const startNterm = (t in newGrammar.additional_terms) ? newGrammar.additional_terms[t] : t;
            delete newGrammar['additional_terms'];
            result[t] = getRegexForGrammar(newGrammar, startNterm);
        });
    const productiveNterms = findProductiveNTerms(grammar);
    regularNTerms.closure.filter(t => !productiveNterms.includes(t))
        .forEach(t => result[t] = NOT_PRODUCTIVE);

    regularNTerms.closure.filter(t => productiveNterms.includes(t))
        .forEach(t => result = findClosureRegex(result, t));


    for (const n in result) {
        if (!tokens.includes(n)) {
            delete result[n];
            continue;
        }
        result[n] = exprInBrackets(result[n]) ? result[n].slice(1, -1) : result[n];
    }

    return result;
}

function findClosureRegex(regexes, nterm) {
    let result = "";
    let eachRuleRegex = [];
    for (const rule of grammar[nterm].right_parts) {
        let regex = "";
        for (const t of rule) {
            if (isExpr(t)) {
                regex += t;
            } else {
                if (!(t in regexes)) {
                    regexes = findClosureRegex(regexes, t);
                }
                if (regexes[t] === NOT_PRODUCTIVE) {
                    result = NOT_PRODUCTIVE;
                    break;
                }
                regex += regexes[t];
            }
        }
        if (result === NOT_PRODUCTIVE) {
            eachRuleRegex = [];
            break;
        } else {
            eachRuleRegex.push(regex);
        }
    }

    regexes[nterm] = eachRuleRegex.length > 0 ? getOrRegex(...eachRuleRegex) : result;

    return regexes;
}

function adaptLRGrammar(startNTerm) {
    let newGrammar = { 'additional_terms': {} };
    let queue = [startNTerm];
    let i = 0;
    while (i < queue.length) {
        const name = queue[i];
        for (const rule of grammar[name].right_parts) {
            if (rule.length === 1 && !isExpr(rule[0])) {
                if (!(rule[0] in newGrammar)) {
                    newGrammar[rule[0]] = { 'free': [], 'names': {} };
                }

                if (!(name in newGrammar[rule[0]].names)) {
                    newGrammar[rule[0]].names[name] = [];
                }
                newGrammar[rule[0]].names[name].push("");

            } else if (rule.length === 1 && isExpr(rule[0])) {
                const star_name = getAdditionalTermName(name);
                if (!(star_name in newGrammar.additional_terms)) {
                    newGrammar.additional_terms[name] = star_name;
                    newGrammar[star_name] = { 'free': [], 'names': {} };
                }

                if (!(name in newGrammar[star_name].names)) {
                    newGrammar[star_name].names[name] = [];
                }
                newGrammar[star_name].names[name].push(rule[0]);
                if (name === startNTerm) {
                    newGrammar[star_name].free.push(rule[0])
                }

            } else {
                if (!(rule[0] in newGrammar)) {
                    newGrammar[rule[0]] = { 'free': [], 'names': {} };
                }

                if (!(name in newGrammar[rule[0]].names)) {
                    newGrammar[rule[0]].names[name] = [];
                }
                newGrammar[rule[0]].names[name].push(rule[1]);

                if (rule[0] === startNTerm) {
                    newGrammar[rule[0]].free.push(rule[1]);
                }
            }
            if (isName(rule[0], false) && !queue.includes(rule[0])) {
                queue.push(rule[0]);
            }
        }
        ++i;
    }
    return newGrammar;
}

function findProductiveNTerms(grammar) {
    let productive = [];
    let changes;
    do {
        changes = false;
        for (const name in grammar) {
            if (productive.includes(name)) continue;
            let ntermProductive = false;
            for (const rule of grammar[name].right_parts) {
                let isRuleProduct = true;
                rule.forEach(t => {
                    if (isName(t, false)) {
                        isRuleProduct &= productive.includes(t);
                    }
                });
                ntermProductive |= isRuleProduct;
            }
            if (ntermProductive) {
                productive.push(name);
                changes = true;
            }
        }
    } while (changes);
    return productive;
}

function getAdditionalTermName(name) {
    return name.slice(0, -1) + '*]';
}

function adaptRRGrammar(regularNTerms) {
    let newGrammar = {};
    for (const name of regularNTerms) {
        newGrammar[name] = { 'free': [], 'names': {} };
        for (const rule of grammar[name].right_parts) {
            if (rule.length === 1 && isExpr(rule[0])) {
                newGrammar[name].free.push(rule[0]);
                continue;
            }
            if (rule.length === 1) {
                if (!(rule[0] in newGrammar[name].names)) {
                    newGrammar[name].names[rule[0]] = [];
                }
                newGrammar[name].names[rule[0]].push("");
            } else {
                if (!(rule[1] in newGrammar[name].names)) {
                    newGrammar[name].names[rule[1]] = [];
                }
                newGrammar[name].names[rule[1]].push(rule[0]);
            }
        }
    }
    return newGrammar;
}

let path = 'tests/autolex_test3.txt';
if (process.argv.length >= 3) {
    path = process.argv[2];
}

Init(path);
if (error) {
    console.log(error);
    process.exit(0);
}

let regularNTerms = GetRegularNTerms();
regularNTerms = wrapTerminals(regularNTerms);
FindFirstOrLast(regularNTerms.all);
FindFollowOrPrecede(regularNTerms.all);
FindFirstOrLast(regularNTerms.all, false);
FindFollowOrPrecede(regularNTerms.all, false)
const tokens = FindTokens(regularNTerms.all);
const regexes = FindRegexes(regularNTerms, tokens);


console.log("grammar", grammar, regularNTerms.all);
console.log("grammar", grammar, regularNTerms.all);
console.log("grammar", grammar);