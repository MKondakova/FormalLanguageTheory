import * as process from 'process';
import { exprInBrackets, solveSystem } from './solve_system.js';
import { skipSpace, getVarEnd, getExprEnd, getInput } from './utils.js'

let error = null;
let system = {};

function Init(path) {
	const inputObj = getInput(path);
	if (inputObj.error !== null) {
		error = inputObj.error 
	}
	const input = inputObj.input;
	getSystem(input);
	if (error !== null) return;
	const names = new Set();
	for (const name in system) {
		names.add(...Object.keys(system[name]))
	}
	for (const name in system) {
		names.delete(name)
	}
	if (names.size > 0){
		const needNames = [];
		names.forEach(n => needNames.push(n))
		error = `Не хватает уравнений для ${needNames}`;
	}
}

function getSystem(input) {
	for (let i in input){
		let line = input[i];
		let pos = 0;
		pos = skipSpace(line, pos);
		let varEnd = getVarEnd(line, pos);
		if (varEnd === null) {
			error = `Строка \'${line}\' неверного формата, сначала должно идти имя переменной.`;
			return;
		}
		const mainName = line.slice(pos, varEnd);
		if (mainName in system) {
			error = `Строка \'${line}\' задает переменную, которую уже задала другая строка.`;
			return;
		}
		system[mainName] = {};
		pos = skipSpace(line, varEnd);
		if ((pos < line.length && line[pos] !== '=') || pos >= line.length) {
			error = `Строка \'${line}\' должна содержать \'=\'.`;
			return;
		}
		pos++; // skip "="
		pos = skipSpace(line, pos);
		let name = "init";
		while (name.length > 0) {
			let regex = null;
			[pos, regex] = getRegex(line, pos);
			if (error) {
				error = `В строке \'${line}\' не хватает регулярного выражения. ${error}`;
				return;
			}
			pos = skipSpace(line, pos);
			varEnd = getVarEnd(line, pos);
			if (varEnd === null) {
				name = "";
			} else {
				name = line.slice(pos, varEnd);
				pos = varEnd;
				pos = skipSpace(line, pos);
				++pos; // skip '+'
			}
			pos = skipSpace(line, pos);
			system[mainName][name] = regex;
		}
		if (pos < line.length) {
			error = `Строка \'${line}\' должна заканчиваться свободным регулярным выражением.`;
			return;
		}
	}
}

// парсим сперва сколько можем регексов с именем, потом последним пустой регекс, 
function getRegex(line, pos){
	if (pos >= line.length) {
		error = `Ожидалось регулярное выражение на ${pos} позиции.`;
		return [];
	}
	if (line[pos] === '(') {
		if (pos + 1 >= line.length) {
			error = `Ожидалось регулярное выражение на ${pos + 1} позиции.`;
			return [];
		}
		let expr = "";
		do {
			++pos; // skip '(' and '|'
			pos = skipSpace(line, pos);
			let exprEnd = getExprEnd(line, pos);
			if (exprEnd === null) {
				error = `Ожидалось регулярное выражение на ${pos} позиции.`;
				return [];
			}
			expr += line.slice(pos, exprEnd);
			expr += '|';
			pos = exprEnd;
			pos = skipSpace(line, pos);
		} while (pos < line.length && line[pos] === '|');
		if (pos <= line.length && line[pos] === ')') {
			++pos; // skip ')'
			expr = expr.slice(0, -1);
			expr = '(' + expr + ')';
			return [pos, expr];
		} else {
			error = `Ожидался символ \')\' на ${pos} позиции.`;
			return [];
		}
	} else {
		let exprEnd = getExprEnd(line, pos);
		if (exprEnd === null) {
			error = `Ожидалось регулярное выражение на ${pos} позиции.`;
			return [];
		}
		return [skipSpace(line, exprEnd), line.slice(pos, exprEnd)];
	}
	// в позиции должно быть начало названия пер
}


let path = 'tests/RS_test7.txt';
if (process.argv.length >= 3) {
	path = process.argv[2];
}

Init(path);
console.log(system);
if (error) {
	console.log(error);
	process.exit(0);
}
const res = solveSystem(system)
console.log(res);
if (error) {
	console.log(error);
	process.exit(0);
}