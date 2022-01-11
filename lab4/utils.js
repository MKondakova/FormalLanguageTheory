import * as fs from 'fs';


const emptyStringRegexp = /^\s*$/;
const varRegex = /^\[[A-Z]+[a-z]*]/
const customVarRegex = /^\[[A-Za-z0-9_*+=()$;:]+]/
const exprRegex = /^[a-z0-9_*+=()$ ;:]/

function getVarEnd(line, pos = 0) {
    if (line.length === 0) {
        return null;
    }
    const matchResult = line.slice(pos).match(varRegex);
    if (matchResult === null || matchResult.index > 0) {
        return null;
    }
    return matchResult[0].length + pos;
}

/**
 * При внесении новых нетерминалов [;] становится корректным нетерминалом
 * @param line
 * @param isValidationStage На каком этапе выполняется проверка
 * @returns {boolean}
 */
function isName(line, isValidationStage = true) {
    if (isValidationStage === true) return varRegex.test(line);
    return customVarRegex.test(line);
}

function isExpr(line) {
    return exprRegex.test(line);
}

function getExprEnd(line, pos) {
    if (line.length === 0) {
        return null;
    }
    const matchResult = line.slice(pos).match(exprRegex);
    if (matchResult === null || matchResult.index > 0) {
        return null;
    }
    return matchResult[0].length + pos;
}

function skipSpace(line, start) {
    if (line.slice(start).match(emptyStringRegexp)) {
        return line.length;
    }
    const lastPos = line.slice(start).search(/\S/);
    return lastPos === -1 ? start : lastPos + start;
}

function getInput(path) {
    let input = '';
    let error = null;
    try {
        input = fs.readFileSync(path, 'utf8');
    } catch (err) {
        error = err.toString();
        return { input, error };
    }
    input = input.split(/\r\n|\r|\n/).filter(line => !line.match(emptyStringRegexp)).map(s => s.trim());
    return { input, error };
}


export {
    skipSpace,
    getExprEnd,
    getVarEnd,
    emptyStringRegexp,
    getInput,
    isName,
    isExpr,
}