let debug = false;

export function setDebug(value: boolean) {
	debug = value;
}

export function log(message: string) {
	if (debug) {
		console.log(message);
	}
}
