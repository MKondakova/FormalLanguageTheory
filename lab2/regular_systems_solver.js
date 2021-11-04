const fs = require('fs');
const { resourceUsage, exit } = require('process');
const { getSystemErrorMap } = require('util');

let error = null;
let system = {};
const emptyStringRegexp = /^\s*$/;

function Init(path) {
	let input = '';
	try {
		input = fs.readFileSync(path, 'utf8');
	} catch (err) {
		error = err.toString();
		return;
	}
	input = input.split(/\r\n|\r|\n/);
	getSystem(input);
}

function getSystem(input) {
	for (let i in input){
		let line = input[i];
		if (line.match(emptyStringRegexp)) continue;
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

function getVarEnd(line, pos) {
	return getEndByRegex(line, pos, /[^A-Z]/);
}

function getExprEnd(line, pos) {
	return getEndByRegex(line, pos, /[^a-z]/)
}

function skipSpace(line, start) {
	const lastPos = line.slice(start).search(/\S/);
	return lastPos === -1 ? start : lastPos + start;
}
/**
 * Положение первого неподходящего символа в line, начиная с pos
 * @param {RegExp} regex Определяет неподходящий под условие символ
 * @returns {null|number} Если на позиции pos символ неподходящий или строка пустая, возвращает null
 */
function getEndByRegex(line, pos, regex) {
	if (line.length === 0) {
		return null;	
	}
	const endPosition = line.slice(pos).search(regex);
	if (endPosition === -1) {
		return line.length;
	}
	const varEnd = endPosition + pos;
	if (varEnd === pos) {
		return null;
	}
	return varEnd;

}


let path = 'tests/RS_test1.txt';
if (process.argv.length >= 3) {
	path = process.argv[2];
}

Init(path);
console.log(system);
if (error) {
	console.log(error);
	exit(0);
}

tests = [
	"",
	"a",
	"  D",
	"FFFF", 
	"Fa", 
	"FFa"
];

// tests.forEach(v => console.log(v, getEndByRegex(v, 0, /^[A-Z]+$/)))
