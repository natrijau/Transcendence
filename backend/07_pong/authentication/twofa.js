// ./authentification/twofa.js

export async function sendCode(user) {
	const genRes = await fetch('http://twofa-service:3000/sendcode', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(user)
	});
	const data = await genRes.json();
	return data;
}
