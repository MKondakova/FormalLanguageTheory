import * as fs from 'fs';
import { spawn } from 'child_process';

const GRAPHVIZ_PATH = "C:\\Program Files (x86)\\Graphviz\\bin\\dot"

const emptyStringRegexp = /^\s*$/;
const varRegex = /^[A-Z][0-9]*/
const exprRegex = /^[a-z]+/

function getVarEnd(line, pos = 0) {
	if (line.length === 0) {
		return null;	
	}
	const matchResult = line.slice(pos).match(varRegex);
	if (matchResult === null || matchResult.index > 0) {
		return null;
	}
	const varEnd = matchResult[0].length + pos;
	return varEnd;
}

function isName(line) {
	return varRegex.test(line);
}

function isExpr(line) {
	return exprRegex.test(line);
}

function getExprEnd(line, pos) {
	return getEndByRegex(line, pos, /[^a-z]/)
}

function skipSpace(line, start) {
	if (line.slice(start).match(emptyStringRegexp)){
		return line.length;
	}
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

function generateGraph(tree, filename){
	let text = 'digraph G {\n';
	text += `0 [label="${tree[0]}"]\n`
	let heads = [0];
	for (let i = 2; i < tree.length; i++){
		if (tree[i] === 'Down'){
			heads.push(i-1);
		} else if (tree[i] === 'Up') {
			heads.pop();
		} else {
			text += `${i} [label="${tree[i]}"]\n`;
			text += `${heads[heads.length - 1]} -> ${i}\n`
		}
	}
	text += `}`;
	let p = spawn(GRAPHVIZ_PATH, ['-Tpng', `-o ${filename}.png`]);
	p.stdin.write(text);
	p.stdin.end();
}


export {
	skipSpace, 
	getExprEnd,
	getVarEnd, 
	emptyStringRegexp,
	getInput,
	isName,
	isExpr,
	generateGraph
}