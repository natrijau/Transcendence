//app.js

import Fastify from 'fastify';
import fastifyCron from 'fastify-cron';
import fp from 'fastify-plugin';
import path from 'path';
import cookie from '@fastify/cookie'
import fastifyMultipart from '@fastify/multipart';
import fastifyCors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';

import userRoutes from './routes/routes.js';
import { registerInput, loginInput, updateSchema } from './schema/userInput.js';
import { userSchema } from './schema/userSchema.js';
import { initDB } from './database/db.js';
import { prunePendingRegistered } from './cron/cronFunctions.js';
import shutdownPlugin from './common_tools/shutdown.js';

const fastify = Fastify({ logger: false });

fastify.register(cookie);

// CORS configuration
fastify.register(fastifyCors, {
    origin: 'https://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
	allowedHeaders: ["Content-Type", "Authorization", "Cross-Origin-Resource-Policy"],
	credentials: true
});

// DB
await fastify.register(fp(initDB));

fastify.register(fastifyStatic, {
	root: path.join(import.meta.dirname, 'pictures'),
	prefix: '/pictures/',
	setHeaders: (res) => {
    	res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  	}
});

await fastify.register(helmet, {
	global: true
});

fastify.register(fastifyCron, {
	jobs: [
		{
			cronTime: '*/10 * * * *',
			onTick: () => prunePendingRegistered(fastify.db.registered.deletePending),
			start: true,
			timeZone: 'Europe/Paris'
		}
	]
});

fastify.register(fastifyMultipart);

fastify.addSchema(registerInput);
fastify.addSchema(loginInput);

fastify.addSchema(updateSchema);
fastify.addSchema(userSchema);

fastify.register(userRoutes);
fastify.register(shutdownPlugin);

async function start() {
	try {
		await fastify.listen({ port: 3000, host: '0.0.0.0' });
		////console.log('User-service listening on port 3000');
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();
