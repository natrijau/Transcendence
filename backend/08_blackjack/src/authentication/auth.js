// ./authentication/auth.js

export async function generateJWT(user) {
	if (!user)
		return { status: 400, error: 'Bad Request: User information is incomplete' };

	const res = await fetch('http://session-service:3000/generate', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(user)
	});
	const data = await res.json();
	return data;
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
			'Authorization': 'Bearer ' + accessToken
		}
	});
	if (!authRes.ok) {
		return reply.code(authRes.status).send({ error: 'Unauthorized: Invalid token' });
	}
	const data = await authRes.json();
	if (data.verified === false)
		return reply.code(400).send({ error: 'User not verified.' });
	if (data.error)
		return reply.code(authRes.status).send({ error: data.error });

	request.user = data;
}

export async function revokeJWT(cookies) {
	const { accessToken } = cookies;
	if (!accessToken)
		return { status: 400, error: 'Unauthorized: No token provided' };
	const revRes = await fetch('http://session-service:3000/delete', {
		method: 'DELETE',
		headers: {
			'Authorization': 'Bearer ' + accessToken,
		},
	});
	return (revRes);
}

// Helper pour authentifier depuis un cookie (pour WebSocket)
export async function authenticateFromCookie(cookieString) {
	if (!cookieString) return null;

	const accessTokenMatch = cookieString.match(/accessToken=([^;]+)/);
	if (!accessTokenMatch) return null;

	const accessToken = accessTokenMatch[1];

	try {
		const authRes = await fetch('http://session-service:3000/authenticate', {
			method: 'GET',
			headers: { 'Authorization': 'Bearer ' + accessToken }
		});

		if (!authRes.ok) return null;

		const data = await authRes.json();
		if (data.verified === false || data.error) return null;

		return data; // { id, name, email, type, verified, ... }
	} catch (error) {
		console.error('[authenticateFromCookie] Error:', error);
		return null;
	}
}
