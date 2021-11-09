function solveSystem(system){
	const names = Object.keys(system);
	names.sort((a, b) => Object.keys(system[a]).length - Object.keys(system[b]).length)
	for (let name of names) {
		let prefix = "";
		if (name in system[name]){
			prefix = getKleinRegex(system[name][name]);
		}
		// подставляем получившееся значение в другие уравнения
		for (let j in system){
			if (!(name in system[j]) || name === j) {
				continue;
			}
			for (let term in system[name]) {
				if (term === name) {
					continue;
				}
				if (!(term in system[j])) {
					system[j][term] = `${system[j][name]}${prefix}${system[name][term]}`;
				}
				system[j][term] = getOrRegex(system[j][term], system[j][name]+prefix+system[name][term]);
			}
			delete system[j][name];
		}
	}
	for (const name in system){
		let result = "";
		if (name in system[name]) {
			result = getKleinRegex(system[name][name]) + system[name][""];
		} else {
			result = system[name][""];
		}
		delete system[name];
		system[name] = result
	}
	
	return system;
}

function getOrRegex(a, b){
	if (exprInBrackets(a)) {
		a = a.slice(1, -1)
	}
	if (exprInBrackets(b)) {
		b = b.slice(1, -1)
	}
	if (a === b){
		return a;
	}
	return `(${a}|${b})`;
}

function getKleinRegex(a){
	if (exprInBrackets(a) ) {
		return a + '*';
	}
	return `(${a})*`
}

function exprInBrackets(expr){
	let depth = 0
	if (expr.charAt(0) === '(') {
		depth = 1
	} else {
		return false;
	}
	let i = 1;
	for (; i < expr.length; ++i){
		switch (expr[i]) {
			case '(': { depth++; break; }
			case ')': { depth--;}
		}
		if (depth === 0 && i !== expr.length - 1) {
			return false
		}
	}
	if (depth !== 0) {
		return false;
	}
	return true;
}

export {
	solveSystem,
	exprInBrackets
}