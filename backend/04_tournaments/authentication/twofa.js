// ./authentification/twofa.js

export async function sendCode(user) {
	//console.log("############### USER in SendCode\n", user,
				"################################\n");
	const genRes = await fetch('http://twofa-service:3000/sendcode', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(user)
	});
	return genRes;
}
