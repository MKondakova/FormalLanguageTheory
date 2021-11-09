import * as fs from 'fs';



const emptyStringRegexp = /^\s*$/;

function getVarEnd(line, pos) {
	return getEndByRegex(line, pos, /[^A-Z]/);
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
	input = input.split(/\r\n|\r|\n/).filter(line => !line.match(emptyStringRegexp));
	return { input, error };
}
export {
	skipSpace, 
	getExprEnd,
	getVarEnd, 
	emptyStringRegexp,
	getInput
}