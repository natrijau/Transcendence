// ./authentification.auth.js

export async function generateJWT(user) {
	const genRes = await fetch('http://session-service:3000/generate', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(user)
	});
	return genRes;
}

export async function authenticateJWT(request, reply) {
	const { accessToken } = request.cookies;
	if (accessToken === undefined)
		return reply.code(401).send({
			error: 'Access token missing.'
		});
	const authRes = await fetch('http://session-service:3000/authenticate', {
		method: 'GET',
		headers: {
			'Authorization': 'Bearer ' + accessToken,
		},
	});
	const data = await authRes.json();
	if (data.verified === true)
		return reply.code(403).send({ error: 'User already verified.' });
	if (data.error)
		return reply.code(authRes.status).send({ error: data.error });
	request.user = data;
}