// ./authentication/auth.js

export async function authenticateJWT(request, reply) {
	const { accessToken } = request.cookies;
	if (accessToken === undefined)
		return reply.code(401).send({
			error: 'Access token missing.'
		});
    const authRes = await fetch('http://session-service:3000/authenticate', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + accessToken}
    });
    const data = await authRes.json();
	if (data.verified === false)
		return reply.code(400).send({ error: 'User not verified.' });
    if (data.error)
        return reply.code(authRes.status).send({ error: data.error });

    request.user = data;
}
