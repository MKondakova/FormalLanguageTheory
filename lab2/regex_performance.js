import * as process from 'process';
import ImageCharts from 'image-charts';


const academRegex = /5*4*3*2*1*/
const negativeRegex = /[^4321]*[^3215]*[^2154]*[^15432]*[^5432]*/
const lazyRegex = /5*?4*?3*?2*?1*?/

const MAX_LENGTH = 10000;
const TESTS_NUMBER = 10;
const regexList = [academRegex, negativeRegex, lazyRegex]; // для просмотра графиков без какого либо выражения убрать его тут
const cht='lxy';
const chco='F78589,8589F7,89F785'; // тут
const chdl = 'Academic|Negative|Lazy'; // и тут

function getRandomString(length = 100) {
    let result = "";
    const letters = '12345';
    const n_letters = letters.length;

    for (let i = 0; i < length; ++i) {
        const letter = letters[Math.floor((Math.random() * (n_letters - 1)))];
        result += letter;
    }

    return result;
}

function getTests() {
	let tests = [];
	for (let i = 0; i <= TESTS_NUMBER; ++i) {
		const len = Math.floor(Math.random()*MAX_LENGTH);
		tests.push(getRandomString(len));
	}
	tests.push(getRandomString());
	tests.push(getRandomString(MAX_LENGTH));
	return tests;
}


let chd="t:"

const result = {};
const tests = getTests().sort((a, b)=> a.length - b.length);
tests.forEach(t => result[t.length] = {})
for (const regex of regexList) {
	for (const test of tests) {
		chd += `${test.length},`;
	}
	chd = chd.slice(0, -1);
	chd += "|";
	let timeResults = []
	for (const test of tests) {
		const startTime = process.hrtime.bigint();
		test.match(regex);
		const endTime = process.hrtime.bigint();
		timeResults.push(endTime - startTime);
		result[test.length][regex] = endTime - startTime;
	}
	timeResults.forEach(l => chd += l + ',')
	chd = chd.slice(0, -1);
	chd += "|";
}
chd = chd.slice(0, -1);


const chart = ImageCharts().cht(cht).chd(chd).chco(chco).chdl(chdl).chs('999x400');
chart.toFile('result.png');

console.table(result);

