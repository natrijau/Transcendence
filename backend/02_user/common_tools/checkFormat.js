// ./common_tools/checkNameFormat.js

async function checkEmailFormat(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function checkPasswordFormat(password) {
	const regex = /^[^<>{}"'`]*$/;
	return (
		typeof password === 'string' &&
		password.length >= 8 &&
		password.length <= 128 &&
		regex.test(password)
	);
}

async function checkNameFormat(name) {
	return /^[A-Z]$/i.test(name[0]) && /^[a-zA-Z0-9]+$/.test(name);
}

export { checkNameFormat, checkPasswordFormat, checkEmailFormat };
