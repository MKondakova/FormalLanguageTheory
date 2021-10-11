const fs = require('fs');
const { resourceUsage, exit } = require('process');

let error = null;
let constructors = {};
let variables = {};
let first = '';
let second = '';
const VAR = 'variable';
const CONSTR = 'constructor';

function Init(path) {
	let input = '';
	try {
		input = fs.readFileSync(path, 'utf8');
	} catch (err) {
		error = err.toString();
		return
	}
	input = input.split(/\r\n|\r|\n/);
	getConstructors(input[0]);
	if (error) {
		return
	}
	getVariables(input[1]);
	if (error) {
		return
	}
	getFirstAndSecond(input[2], input[3]);
	if (error) {
		return
	}
}

function getConstructors(line) {
	let constructorsStr = line.match(/constructors[ \t]*=[ \t]*(.*)/)[1];
	let constructorsArr = constructorsStr.replace(/[\(]|[\)\s*,?]/g, ' ').split(/ +/);
	if (constructorsArr[constructorsArr.length - 1] === '') {
		constructorsArr.pop()
	}
	constructorsArr.forEach((v, i, a) => {
		if (error) {
			return;
		}
		if (i % 2 == 0) {
			if (v in constructors) {
				error = 'Неверный формат конструкторов, конструкторы не уникальны.';
			}
			constructors[v] = { 'name': v, 'args': parseInt(a[i+1]) };
		}
	});
}

function getVariables(line) {
	const variablesStr = line.match(/variables[ \t]*=[ \t]*(.*)/)[1];
	const variablesList = variablesStr.split(',');
	variablesList.forEach(name => variables[name] = { name, 'usage': [] });
}

function getFirstAndSecond(line1, line2) {
	first = line1.match(/first[ \t]*=[ \t]*(.*)/)[1];
	second = line2.match(/second[ \t]*=[ \t]*(.*)/)[1];
}

function parseTerm(expr, pos) {
	if (error) {
		return null;
	}
	pos = skipSpace(expr, pos);
	if (!/^[0-9a-zA-Zа-яА-Я_-].*/.test(expr.split(pos))) {
		error = "Ошибка при обработке терма " + expr + " на позиции " + pos + ". Некорректный символ";
		return null;
	}
	const endOfName = getNameEnd(expr, pos);
	const name = expr.slice(pos, endOfName);
	pos = endOfName;

	if (name in variables) {
		return { name, 'type': VAR, pos };
	} else if (name in constructors) {
		if ((expr[pos] !== '(' && constructors[name].args !== 0) ||
			(expr[pos] === '(' && constructors[name].args === 0)) {
			error = "Ошибка при обработке терма " + expr + " на позиции " + pos + ". Неверное количество аргументов у " + name;
			return null;
		}
		const result = { name, 'type': CONSTR, 'args': []}
		if (constructors[name].args === 0) {
			result['pos'] = pos;
			return result;
		}
		pos ++;
		while (expr[pos] !== ')') {
			const argParseResult = parseTerm(expr, pos);
			if (error) {
				return null;
			}
			pos = argParseResult.pos;
			pos = skipSpace(expr, pos);
			if (expr[pos] !== ',' && expr[pos] !== ')'){
				error = "Ошибка при обработке терма " + expr + " на позиции " + pos + ". Неверный формат аргументов у " + name;
				return null;
			}
			if (expr[pos] === ',') pos++;
			result.args.push(argParseResult);
		}
		if (result.args.length !== constructors[name].args) {
			error = "Ошибка при обработке терма " + expr + " на позиции " + pos + ". Неверное количество аргументов у " + name;
			return null;	
		}
		pos++;
		result['pos'] = pos;
		return result;
	} else {
		error = "Ошибка при обработке терма " + expr + " на позиции " + pos + ". Имя не найдено";
		return null;
	}
}

function getNameEnd(line, start) {
	return line.slice(start).search(/[\(\), ]/) + start;
}

function skipSpace(line, start) {
	return line.slice(start).search(/\S/) + start;
}

function getUnificator(first, second) {
	if (first.type === CONSTR && second.type === CONSTR) {
		if (first.name !== second.name) {
			error = 'Ошибка при унификации, конструкторы ' + first.name + ' и ' + second.name + ' разные.';
			return;
		}
		first.args.forEach((arg, i) => {
			if (!error) {
				getUnificator(arg, second.args[i]);
			}
		});
		if (error) {
			return;
		}
	} else if (first.type === VAR && second.type === VAR) {
		first.name = second.name;
		variables[first.name].usage.push({ 'name': second.name });
	} else {
		if (first.type === VAR) {
			variables[first.name].usage.push({ 'name': second.name, 'args': second.args });
			first.name = second.name;
			first.args = second.args;
		} else {
			variables[second.name].usage.push({ 'name': first.name, 'args': first.args });
		}
	}
}

function getAnswer() {
	for (const i in variables) {
		const variable = variables[i];
		if (variable.usage && variable.usage.length > 0){
			variable.usage.forEach(usage => console.log(variable.name + ':=' + getStringFromTree(usage)));
		}
	}
	console.log(getStringFromTree(first));
}

function getStringFromTree(tree){
	let result = tree.name;
	if (tree.args && tree.args.length > 0){
		result += '(';
		tree.args.forEach(arg => result += getStringFromTree(arg) + ', ');
		result = result.slice(0, -2) + ')';
	}
	return result;
}

Init('unification_test1.txt');
if (error) {
	console.error(error);
	exit(1);
}

first = parseTerm(first, 0);
if (error) {
	console.error(error);
	exit(1);
}

second = parseTerm(second, 0);
if (error) {
	console.error(error);
	exit(1);
}

getUnificator(first, second);
if (error) {
	console.error(error);
	exit(1);
}

getAnswer();
if (error) {
	console.error(error);
	exit(1);
}