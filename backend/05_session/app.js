// app.js

import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fp from 'fastify-plugin';
import fCron from 'fastify-cron';
import cookie from '@fastify/cookie';
import fastifyJWT from '@fastify/jwt';
import speakeasy from 'speakeasy';
import { initDB } from './database/db.js';
import { sessionRoutes } from './routes/routes.js';
import { generateSchema } from './schema/generateSchema.js';
import { pruneRevokedAccess } from './cron/cron.js';
import shutdownPlugin from './common_tools/shutdown.js';

const secretKey = (speakeasy.generateSecret({ length: 20 })).base32;

const fastify = Fastify({ logger: false });

// CORS configuration
fastify.register(fastifyCors, {
	origin: true,
	methods: ['GET', 'POST', 'DELETE'],
	allowedHeaders: ["Content-Type", "Authorization"],
	credentials: true
});

// cookies
fastify.register(cookie);

// JWT
fastify.register(fastifyJWT, { secret: secretKey });

// DB
fastify.register(fp(initDB));

// cron
fastify.register(fCron, {
	jobs: [
		{
			cronTime: '*/10 * * * *',
			onTick: () => pruneRevokedAccess(fastify.db.revokedAccess.erase),
			start: true,
			timeZone: 'Europe/Paris'
		}
	]
});

// Routes
fastify.register(sessionRoutes);

// Schema
fastify.addSchema(generateSchema);

fastify.register(shutdownPlugin);

const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
		//console.log('Session-service listening on port 3000');
    } catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();