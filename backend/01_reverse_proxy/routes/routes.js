import fastifyHttpProxy from '@fastify/http-proxy'

async function routesPlugin(fastify, options) {
	fastify.get('/ping', async (request, reply) => {
        return reply.code(200).send({
			hello: 'world',
			status: 'ok'
		});
    });

	// Forbidden routes
		// user
	fastify.put('/user/changestatus', async (request, reply) => {
		return reply.code(400).send({ error: 'Forbidden route.' });
	});
	fastify.put('/user/updatestats', async (request, reply) => {
		return reply.code(400).send({ error: 'Forbidden route.' });
	});
	fastify.post('/user/tournament', async (request, reply) => {
		return reply.code(400).send({ error: 'Forbidden route.' });
	});
	// get '/user/find/:name/status' ?

		// match
	fastify.post('/match/tournament', async (request, reply) => {
		return reply.code(400).send({ error: 'Forbidden route.' });
	});
	fastify.get('/match/history/tournament/:id', async (request, reply) => {
		return reply.code(400).send({ error: 'Forbidden route.' });
	});

		// twofa
	fastify.post('/twofa/sendcode', async (request, reply) => {
		return reply.code(400).send({ error: 'Forbidden route.' });
	});


	// Redirections
	fastify.register(fastifyHttpProxy, {
		upstream: "http://user-service:3000",
		prefix: '/user',
		rewritePrefix: '/',
	});
	fastify.register(fastifyHttpProxy, {
		upstream: "http://match-service:3000",
		prefix: '/match',
		rewritePrefix: '/',
	});
	fastify.register(fastifyHttpProxy, {
		upstream: "http://tournament-service:3000",
		prefix: '/tournament',
		rewritePrefix: '/',
	});
	fastify.register(fastifyHttpProxy, {
		upstream: "http://session-service:3000/refresh",
		prefix: '/refresh',
		rewritePrefix: '',
	});
	fastify.register(fastifyHttpProxy, {
		upstream: "http://twofa-service:3000",
		prefix: '/twofa',
		rewritePrefix: '/',
	});
	fastify.register(fastifyHttpProxy, {
		upstream: "http://pong-service:3000",
		prefix: '/pong',
		rewritePrefix: '/',
		websocket: true,
	});
	fastify.register(fastifyHttpProxy, {
		upstream: "http://blackjack-service:3000",
		prefix: '/blackjack',
		rewritePrefix: '/',
		websocket: true
	});
}

export default routesPlugin;

