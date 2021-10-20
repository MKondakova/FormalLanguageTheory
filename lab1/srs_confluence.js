const fs = require('fs');
const { resourceUsage, exit } = require('process');

let error = null;
let resultText = 'SRS конфлюэнтная';
let rulesLeftSides = [];


function Init(path) {
	let input = '';
	try {
		input = fs.readFileSync(path, 'utf8');
	} catch (err) {
		error = err.toString();
		return
	}
	input = input.split(/\r\n|\r|\n/);
	
	rulesLeftSides = getLeftSides(input);
	if (error) {
		return
	}
}

function getLeftSides(input) {
	const result = [];
	input.forEach(line => {
		if (error) return;
		if (line.match(emptyStringRegexp)) return;
		const regexpResult = line.match(/[ \t]*([a-zA-z]*)[ \t]*[->|→].*/);
		if (!regexpResult) {
			error = 'Строка ' + line + ' не соответствует формату';
			return;
		}
		result.push(regexpResult[1])
	});
	return result;
}

const emptyStringRegexp = /^\s+$/;

function prefixFunction(s) {
	const result = [0];
	for (let i = 1; i < s.length; ++i) {
		let k = result[i-1];
		while (k > 0 && s[i] != s[k]) {
			k = result[k - 1];
		}
		if (s[i] == s[k]) k++;
		result[i] = k;
	}
	return result;
}

function checkOverlap(words) {
	let text = '';
	words.forEach(word => text += word);
	let overlap = false;
	words.forEach((word, i) => {
		if (overlap) return;
		const prefixFunctionResult = prefixFunction(word + '#' + text);
		
		if (prefixFunctionResult[word.length - 1] > 0) {
			resultText = 'Внутри терма ' + word + ' есть перекрытие.';
			overlap = true;
			return;
		}

		let pos = word.length;
		let j = -1;
		do {
			++j;
			if (j < words.length) {
				pos += words[j].length;
			}
		} while (j < words.length && (prefixFunctionResult[pos] === 0 || !word.localeCompare(words[j])))
		if (j !== words.length) {
			resultText = word + ' и ' + words[j] + ' перекрываются';
			overlap = true;
		}
	})
	return overlap;
}


let path = 'tests/unification_test3.txt';
if (process.argv.length >= 3) {
	path = process.argv[2];
}


Init(path);
checkOverlap(rulesLeftSides);
console.log(resultText);
