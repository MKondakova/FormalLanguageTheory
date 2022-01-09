import * as process from 'process';
import { exprInBrackets, solveSystem } from './solve_system.js';
import { skipSpace, getInput} from './utils.js'


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
	input.forEach( line => {
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
			return;
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
	if (names.size > 0){
		const needNames = [];
		names.forEach(n => needNames.push(n))
		error = `Не хватает правил для ${needNames}`;
		return;
	}
}

function clearGrammar() {
	for (const g in grammar) {
		grammar[g].good = (grammar[g].free.length > 0); //то есть существуют правила вида A->bB | A->b
	}
	const rules = new Set();
	isRuleGood('S', rules);
	for (const name in grammar){
		if (grammar[name].good){
			delete grammar[name]['good'];
		} else {
			for (const n in grammar) {
				delete grammar[n].names[name];
			}
			delete grammar[name];
		}
	}	
}

function isRuleGood(name, stack) {
	if (stack.has(name)){
		return grammar[name].good;
	}
	stack.add(name);
	let isOuterGood = false;
	for (const term in grammar[name].names){
		isOuterGood = isOuterGood || isRuleGood(term, stack);
	}
	if (isOuterGood && !grammar[name].good) {
		grammar[name].good = true;
		stack.delete(name);
		isRuleGood(name, stack);
	}
	grammar[name].good = grammar[name].good || isOuterGood;
	return (grammar[name].good || isOuterGood);
}

function getSystemFromGrammar() {
	const system = {};
	for (const name in grammar) {
		system[name] = {};
		let expr =  getExprFromArray(grammar[name].free)
		if (expr.length > 0) {
			system[name][''] = expr
		}
		for (const n in grammar[name].names) {
			system[name][n] = getExprFromArray(grammar[name].names[n])
		}
	}
	return system;
}

function getExprFromArray(names) {
	if (names.length === 0) {
		return "";
	}
	if (names.length === 1) {
		return names[0];
	}
	let result = '('+names[0];
	for (let i = 1;i < names.length; ++i) {
		result += `|${names[i]}`;
	}
	return result + ')';
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
clearGrammar();
const system = getSystemFromGrammar();
console.log(solveSystem(system)['S'])
