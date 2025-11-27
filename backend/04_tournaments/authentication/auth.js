// ./authentification.auth.js

// export async function generateJWT(user) {

// 	//! ajout 16/09/2025
// 	if (!user)
// 		return { status: 400, error: 'Bad Request: User information is incomplete' };
	
// 	const genRes = await fetch('http://session-service:3000/generate', {
// 		method: 'POST',
// 		headers: {
// 			'Content-Type': 'application/json'
// 		},
// 		body: JSON.stringify(user)
// 	});
// 	//console.log("######## Function GENERATEJWT --> ", genRes, "\n#######\n");
// 	return genRes;
// }

export async function authenticateJWT(request, reply) {
//	//console.log("################# AUTH COOKIES\n", request.cookies,
//				"\n##############################\n");
	const { accessToken } = request.cookies;
	//console.log("Accestoken in tournament auth -->", accessToken);
	if (accessToken === undefined)
		return reply.code(401).send({
			error: 'Access token missing.'
		});

    const authRes = await fetch('http://session-service:3000/authenticate', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + accessToken }
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

//export async function authenticateJWT(request, reply) {
	//const { accessToken } = request.cookies;
	//if (accessToken === undefined)
		//return reply.code(400).send({
			//error: 'Access token missing.'
		//});
    //// Appel vers le session-service
    //const authRes = await fetch('http://session-service:3000/authenticate', {
        //method: 'GET',
        //headers: {
            //'Authorization': 'Bearer ' + accessToken
        //}
    //});
    //const data = await authRes.json();
    //if (data.verified === false)
		//return reply.code(400).send({ error: 'User not verified.' });
	//if (data.error)
		//return reply.code(authRes.status).send({ error: data.error });

	////! modifier le 17/09/2025 
    //const currentuser = data ; // fallback si le service renvoie "user"
    ////const currentuser = data.user || data.body.user; // fallback si le service renvoie "user"

    //request.user = data;
//}

