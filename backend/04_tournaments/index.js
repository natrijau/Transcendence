import Fastify from 'fastify';
import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import cookie from '@fastify/cookie';

import routesPlugin from './routes/routes.js';
import { initDB } from './database/db.js';
import shutdownPlugin from './common_tools/shutdown.js';

import { tournamentSchema } from './schema/tournamentSchema.js';

const fastify = Fastify({ logger: false });


// Middlewares / plugins
fastify.register(cookie);

fastify.register(fastifyCors, {
	origin: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
	allowedHeaders: ["Content-Type", "Authorization"],
	credentials: true
});

//DB
await fastify.register(fp(initDB));

// Schemas
fastify.addSchema(tournamentSchema);

// Routes
fastify.register(routesPlugin);

// Shutdown plugin
fastify.register(shutdownPlugin);

async function start() {
	try {
		const address = await fastify.listen({ port: 3000, host: '0.0.0.0' });
		//console.log(`Server listening on ${address}`);
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
}

start();
