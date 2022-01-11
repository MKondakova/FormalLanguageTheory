import { getOrRegex, solveSystem } from './solve_system.js';

const NOT_PRODUCTIVE = "Не порождает";

function clearGrammar(grammar, startNterm = 'S') {
    for (const g in grammar) {
        grammar[g].productive = (grammar[g].free.length > 0); //то есть существуют правила вида A->b
    }
    const rules = new Set();
    isNTermProductive(grammar, startNterm, rules);
    for (const name in grammar) {
        if (grammar[name].productive) {
            delete grammar[name]['productive'];
        } else {
            for (const n in grammar) {
                delete grammar[n].names[name];
            }
            delete grammar[name];
        }
    }
    return grammar;
}

function isNTermProductive(grammar, name, stack = new Set()) {
    if (stack.has(name)) {
        return grammar[name].productive;
    }
    stack.add(name);
    let isOuterProductive = false;
    for (const term in grammar[name].names) {
        isOuterProductive = isOuterProductive || isNTermProductive(grammar, term, stack);
    }
    if (isOuterProductive && !grammar[name].productive) {
        grammar[name].productive = true;
        stack.delete(name);
    }
    grammar[name].productive = grammar[name].productive || isOuterProductive;
    return grammar[name].productive;
}

function getSystemFromGrammar(grammar) {
    const system = {};
    for (const name in grammar) {
        system[name] = {};
        let expr = getOrRegex(...grammar[name].free);
        if (expr.length > 0) {
            system[name][''] = expr
        }
        for (const n in grammar[name].names) {
            system[name][n] = getOrRegex(...grammar[name].names[n])
        }
    }
    return system;
}

export function getRegexForGrammar(grammar, startNterm = 'S') {
    grammar = clearGrammar(grammar, startNterm);
    if (!(startNterm in grammar)) {
        return NOT_PRODUCTIVE;
    }
    const system = getSystemFromGrammar(grammar);
    return solveSystem(system)[startNterm];
}

export {
    getSystemFromGrammar,
    NOT_PRODUCTIVE,
    isNTermProductive
}