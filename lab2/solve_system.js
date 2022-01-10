function solveSystem(system) {
    const names = Object.keys(system);
    names.sort((a, b) => Object.keys(system[a]).length - Object.keys(system[b]).length)
    for (let name of names) {
        let prefix = "";
        if (name in system[name]) {
            prefix = getKleinRegex(system[name][name]);
        }
        // подставляем получившееся значение в другие уравнения
        for (let j in system) {
            if (!(name in system[j]) || name === j) {
                continue;
            }
            for (let term in system[name]) {
                if (term === name) {
                    continue;
                }
                if (!(term in system[j])) {
                    system[j][term] = `${system[j][name]}${prefix}${system[name][term]}`;
                }
                system[j][term] = getOrRegex(system[j][term], system[j][name] + prefix + system[name][term]);
            }
            delete system[j][name];
        }
    }
    for (const name in system) {
        let result = "";
        if (name in system[name]) {
            result = getKleinRegex(system[name][name]) + system[name][""];
        } else {
            result = system[name][""];
        }
        delete system[name];
        system[name] = result
    }

    return system;
}

function getOrRegex(...regexes) {
    regexes = [...new Set(regexes.map(e => {
        if (exprInBrackets(e) && e.length <= 3) return e.slice(1, -1);
        if (!exprInBrackets(e) && e.length > 1) return '(' + e + ')';
        if (isExprIsOrRegex(e)) return e.slice(1, -1);
        return e;
    }))];
    if (regexes.length === 0) return "";
    if (regexes.length === 1) return regexes[0];

    let result = regexes.reduce((acc, v) => acc += v + '|', '(');
    result = result.slice(0, -1);
    return result + ')';
}

function getKleinRegex(a) {
    if (exprInBrackets(a)) {
        return a + '*';
    }
    return `(${a})*`
}

function exprInBrackets(expr) {
    let depth = 0
    if (expr.charAt(0) === '(') {
        depth = 1
    } else {
        return false;
    }
    let i = 1;
    for (; i < expr.length; ++i) {
        switch (expr[i]) {
            case '(': {
                depth++;
                break;
            }
            case ')': {
                depth--;
            }
        }
        if (depth === 0 && i !== expr.length - 1) {
            return false
        }
    }
    return depth === 0;

}

function isExprIsOrRegex(expr) {
    let depth = 0
    if (expr.charAt(0) === '(') {
        depth = 1
    } else {
        return false;
    }
    let result = false;
    for (let i = 1; i < expr.length; ++i) {
        switch (expr[i]) {
            case '(': {
                depth++;
                break;
            }
            case ')': {
                depth--;
                break;
            }
            case '|': {
                result |= (depth === 1);
            }
        }
        if (depth === 0 && i !== expr.length - 1) {
            return false
        }
    }
    if (depth !== 0) {
        return false;
    }
    return result;
}

export {
    solveSystem,
    exprInBrackets,
    getOrRegex,
}