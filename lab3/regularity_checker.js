import * as process from 'process';
import { skipSpace, getVarEnd, getExprEnd, getInput, isExpr, isName } from './utils.js'

let error = null;
let grammar = {};

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
		names.add(...grammar[name].names)
	}
	for (const name in grammar) {
		names.delete(name)
	}
	if (names.size > 0){
		const needNames = [];
		names.forEach(n => needNames.push(n))
		error = `Не хватает уравнений для ${needNames}`;
	}
	isRightRegular();
}

function getGrammar(input) {
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
		if (!(mainName in grammar)) {
			grammar[mainName] = {'names': new Set(), 'right_parts':[]};
		}
		const rightPart = [];
		pos = skipSpace(line, varEnd);
		if ((pos < line.length && line[pos] !== '-') || pos >= line.length) {
			error = `Строка \'${line}\' должна содержать \'-\'.`;
			return;
		}
		pos++; // skip "-"
		if ((pos < line.length && line[pos] !== '>') || pos >= line.length) {
			error = `Строка \'${line}\' должна содержать \'>\'.`;
			return;
		}
		pos++; // skip ">"
		pos = skipSpace(line, pos);
		let endOfName = null;
		let endOfExpr = getExprEnd(line, pos);
		if (endOfExpr === null) {
			error = `Строка \'${line}\' должна начинаться с буквы.`;
			return;
		}
		rightPart.push(line.slice(pos, endOfExpr));
		pos = endOfExpr;
		while (pos < line.length) {
			endOfExpr = getExprEnd(line, pos);
			if(endOfExpr === null) {
				endOfName = getVarEnd(line, pos);
				if (endOfName === null) {
					error = `В строке \'${line}\' могут быть только териналы и нетеминалы.`;
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

function isRightRegular() {
	for (const key in grammar) {
		const g = grammar[key];
		g['isRR'] = true;
		g.right_parts.forEach(part => 
			g.isRR = g.isRR && part.length <= 2 &&
			(part.length === 0 || 
			part.length === 1 && isExpr(part[0]) || 
			part.length === 2 && isExpr(part[0]) && isName(part[1])))
	}
}

let path = 'tests/cfg_test1.txt';
if (process.argv.length >= 3) {
	path = process.argv[2];
}

function getMaxNtermSets() {
	let sets = [];
	for (const key in grammar) {
		sets.push(new Set([key]));
	}
	for (const key in grammar) {
		const mainSetPos = sets.findIndex(s => s.has(key));
		const mainSet = sets[mainSetPos];
		grammar[key].names.forEach(n => {
			const setPos = sets.findIndex(s => s.has(n));
			if (setPos !== mainSetPos) {
				mainSet.add(...sets[setPos]);
				sets.splice(setPos, 1);
			}
		});
	}
	const result = sets.filter(s => {
		let isRegular = true;
		s.forEach(n => isRegular = isRegular && grammar[n].isRR);
		return isRegular;
	})

	return result;
}

function BuildNtermTree(name){
	
}



Init(path);
console.log(grammar);
const sets = getMaxNtermSets();
console.log(sets);
if (error) {
	console.log(error);
	process.exit(0);
}
