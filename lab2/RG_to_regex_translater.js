import * as process from 'process';
import { getInput, skipSpace } from './utils.js'
import { getRegexForGrammar } from './RG_to_regex.js'

let error = null;
let grammar = {};
let varRegex = /[A-Z]/
let exprRegex = /[a-z]/

function Init(path) {
    const inputObj = getInput(path);
    if (inputObj.error !== null) {
        error = inputObj.error
    }
    const input = inputObj.input;
    getGrammar(input);
}

function getGrammar(input) {
    input.forEach(line => {
        let pos = skipSpace(line, 0);
        if (!line.charAt(pos).match(varRegex)) {
            error = `Строка \'${line}\' неверного формата, сначала должно идти имя переменной.`;
            return;
        }
        const mainName = line.charAt(pos);
        if (!(mainName in grammar)) {
            grammar[mainName] = {
                'free': [],
                'names': {},
            };
        }
        pos = skipSpace(line, ++pos);
        if ((pos < line.length && line[pos] !== '-') || pos >= line.length) {
            error = `Строка \'${line}\' должна содержать \'->\'.`;
            return;
        }
        pos++; // skip "-"
        if ((pos < line.length && line[pos] !== '>') || pos >= line.length) {
            error = `Строка \'${line}\' должна содержать \'->\'.`;
            return;
        }
        pos++; // skip ">"
        pos = skipSpace(line, pos);
        if (!line.charAt(pos).match(exprRegex)) {
            error = `Ожидалось регулярное выражение на ${pos} позиции.`;
            return;
        }
        let regex = line.charAt(pos);
        pos = skipSpace(line, ++pos);

        if (!line.charAt(pos).match(varRegex) || pos >= line.length) {
            grammar[mainName].free.push(regex);
        } else {
            const name = line.charAt(pos);
            pos = skipSpace(line, ++pos);
            if (!(name in grammar[mainName])) {
                grammar[mainName].names[name] = [];
            }
            grammar[mainName].names[name].push(regex);
        }
        pos = skipSpace(line, pos);
        if (pos < line.length) {
            error = `В строке что-то лишнее после позиции ${pos}.`;

        }
    });
    if (!('S' in grammar)) {
        error = "Не хватает стартового нетерминала."
        return;
    }
    if (error !== null) return;
    const names = new Set();
    for (const name in grammar) {
        names.add(...Object.keys(grammar[name].names))
    }
    for (const name in grammar) {
        names.delete(name)
    }
    if (names.size > 0) {
        const needNames = [];
        names.forEach(n => needNames.push(n))
        error = `Не хватает правил для ${needNames}`;

    }
}

let path = 'tests/RG_test5.txt';
if (process.argv.length >= 3) {
    path = process.argv[2];
}
Init(path);
if (error) {
    console.log(error);
    process.exit(0);
}
console.log(getRegexForGrammar(grammar));
