import * as process from 'process';
import { skipSpace, getVarEnd, getExprEnd, getInput, isExpr, isName, generateGraph } from './utils.js'

let error = null;
let grammar = {};
let negativeSuspected = [];
let positiveSuspected = [];
let regular = [];

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
		grammar[name].names.forEach(n=> names.add(n))
	}
	for (const name in grammar) {
		names.delete(name)
	}
	if (names.size > 0){
		const needNames = [];
		names.forEach(n => needNames.push(n))
		error = `Не хватает уравнений для ${needNames}`;
		return;
	}
	if (!('S' in grammar)) {
		error = 'Не хватает стартового нетерминала S'
		return;
	}
	isRightRegular();
	filterReachableNterms();
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

function filterReachableNterms() {
	const reachable = new Set();
	let queue = [];
	queue.push('S');
	while (queue.length > 0) {
		const elem = queue.pop();
		reachable.add(elem);
		grammar[elem].names.forEach(n => {
			if (!reachable.has(n)) {
				queue.push(n);
			}
		})
	}
	for (const n of Object.keys(grammar)){
		if (!reachable.has(n)){
			delete grammar[n];
		}
	}

}

function GetMaxNtermSets() {
	let wasChanged;
	do {
		wasChanged = false;
		for (const name in grammar) {
			if (grammar[name].isRR === false) continue;
			for (const p of grammar[name].right_parts) {
				for (const n of p) {
					if (isExpr(n)) continue;
					if (grammar[n].isRR === false) {
						grammar[name].isRR = false;
						wasChanged = true;
					}
				}
			}
		}
	} while (wasChanged);
	return Object.keys(grammar).filter(k => grammar[k].isRR)
}

function BuildNtermTree(name){
	if (maxRegularSet.includes(name)) {
		regular.push(name);
		return;
	}

	let queue = [];
	const firstCheckObject = { 'start': name, 'line': [name],  'prevNterms': [], 'f': true };
	queue.push(firstCheckObject);
	let F1AF2 = null;
	while (queue.length > 0) {
		const currentCheck = queue.shift();
		const firstNtermPos = currentCheck.line.findIndex(isName);
		if (firstNtermPos === -1) continue;
		const firstNterm = currentCheck.line[firstNtermPos];
		if (firstNterm === currentCheck.start && !currentCheck.f) {
			F1AF2 = currentCheck.line;
			//tree.push([currentCheck.prev_nterm, currentCheck.start]);
			break;
		}
		if (currentCheck.prevNterms.includes(firstNterm)) {
			continue;
		}
		currentCheck.prevNterms.push(firstNterm)
		//if (!currentCheck.f) tree.push([currentCheck.prev_nterm, firstNterm]);
		grammar[firstNterm].right_parts.forEach((p, i) => {
			let newLine = [...currentCheck.line];
			newLine.splice(firstNtermPos, 1, ...p);
			queue.push({ 'start': currentCheck.start, 'line': newLine, 'prevNterms': currentCheck.prevNterms, 'f': false })
		})
	}
	if (F1AF2 === null) return; // Накачки не встретилось
	const pumpIndex = F1AF2.findIndex(isName);
	let isGood = F1AF2.slice(pumpIndex + 1).every(l => isExpr(l) || isName(l) && grammar[l].isRR);
	if (!isGood) return;
	if (doesBelongToLanguage(F1AF2.slice(0, pumpIndex), F1AF2.slice(pumpIndex + 1))) {
		checkShortestTerminalScanning(name, F1AF2.slice(pumpIndex + 1))
	} else {
		negativeSuspected.push(name);
	}
	//generateGraph(tree, name)
}

function doesBelongToLanguage(word, languageString, remainingString = '') {
	if (word.length === 0 && remainingString.length === 0) return true;
	if (word.length === 0 && remainingString.length !== 0) return false;
	if (remainingString.length === 0) remainingString = [...languageString];
	if (isName(remainingString[0])) {
		if (isName(word[0])) {
			if (remainingString[0] !== word[0]) return false;
			word.shift();
			remainingString.shift();
			return doesBelongToLanguage(word, languageString, remainingString);
		};
		const nterm = remainingString.shift();
		let belong = false;
		grammar[nterm].right_parts.forEach(p => {
			let newLine = [...remainingString];
			[...p].reverse().forEach(n => {
				if (isName(n)) { 
					newLine.unshift(n) 
				} else { 
					newLine.unshift(...n.split("").reverse()) 
				}
			});
			belong = belong || doesBelongToLanguage(word, languageString, newLine);
		});
		return belong;
	}
	while (remainingString.length >= 0 && word.length > 0) {
		if (remainingString.length === 0) remainingString = languageString;
		if (isName(remainingString[0])) break;
		if (remainingString[0] !== word[0]) return false;
		remainingString.shift();
		word.shift();
	}
	return doesBelongToLanguage(word, languageString, remainingString);
}

function checkShortestTerminalScanning(name, languageString) {
	let queue = [];
	const firstCheckObject = [name]
	queue.push(firstCheckObject);
	let isWordsInLanguage = true;
	while (queue.length > 0 && isWordsInLanguage) {
		const currentLine = queue.shift();
		const firstNtermPos = currentLine.findIndex(isName);
		if (firstNtermPos === -1) {
			isWordsInLanguage = isWordsInLanguage && doesBelongToLanguage(currentLine, languageString)
		} else {
			let firstNterm = currentLine[firstNtermPos];
			grammar[firstNterm].right_parts.forEach(p => {
				let newLine = [...currentLine];
				newLine.splice(firstNtermPos, 1, ...p);
				queue.push(newLine)
			})
		}
	}
	if (isWordsInLanguage && grammar[name].isRR) {
		regular.push(name);
	} else if (isWordsInLanguage) {
		positiveSuspected.push(name);
	}
}

function lastRegularityCheck() {
	// isRR: 0 - unknown; 1 - possibly regular; 2 - regular;
	for (const key in grammar) {
		grammar[key].isRR = 0;
	}

	recursiveClosureRegularityCheck();

	if (regular.includes('S')){
		console.log('Язык регулярен');
	} else if (positiveSuspected.includes('S')){
		console.log('Язык возможно регулярен');
	} else if (!(negativeSuspected.includes('S'))) {
		console.log('Регулярность языка определить не удалось');
	} else {
		console.log('Язык подозрительный на нерегулярность');
	}
}

function recursiveClosureRegularityCheck() {
	let wasChanged;
	do {
		wasChanged = false;
		for (const name in grammar) {
			grammar[name].isRR = 2;
			if (regular.includes(name) || positiveSuspected.includes(name)) continue;
			for (const p of grammar[name].right_parts) {
				for (const n of p) {
					if (isExpr(n)) continue;
					if (!(regular.includes(n) || positiveSuspected.includes(n))) {
						grammar[name].isRR = 0;
						break;
					}
					if (!(regular.includes(n))) {
						grammar[name].isRR = 1;
					}
				}
				if (grammar[name].isRR === 0) break;
			}
			if (grammar[name].isRR === 2) {
				regular.push(name);
				wasChanged = true;
			}
			if (grammar[name].isRR === 1) {
				positiveSuspected.push(name);
				wasChanged = true;
			}
		}
	} while (wasChanged);
}



let path = 'tests/t6.txt';
if (process.argv.length >= 3) {
	path = process.argv[2];
}

Init(path);
if (error) {
	console.log(error);
	process.exit(0);
}

const maxRegularSet = GetMaxNtermSets();

if (maxRegularSet.includes('S')) {
	console.log('Язык регулярен');
	process.exit(0);
}


if (error) {
	console.log(error);
	process.exit(0);
}

for (const name in grammar) {
	BuildNtermTree(name);
}

if (regular.includes('S')) {
	console.log('Язык регулярен');
} else {
	lastRegularityCheck()
}