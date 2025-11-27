//app.js

import Fastify from 'fastify';
import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import nodemailer from 'nodemailer';
import { config } from 'dotenv';

import twoFARoutes from './routes/routes.js';
import { initDB } from './database/db.js';
import shutdown from './common_tools/shutdown.js';

await config();

const fastify = Fastify({ logger: false });

fastify.register(cookie);

fastify.register(fastifyCors, {
	origin: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
	allowedHeaders: ["Content-Type", "Authorization"],
	credentials: true
});

fastify.register(fp(initDB));

// check SMTP connexion
fastify.register( async () => {
	const transporter = await nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: process.env.USR_ADDR,
			pass: process.env.APP_PASS
		}
	});
	
	await transporter.verify((error, success) => {
		if (error) {
			console.error('Connexion error:', error.message);
			process.exit(1);
		} else
			transporter.close();
	});
});
	
fastify.register(twoFARoutes);
fastify.register(shutdown);

async function start() {
	try {
		await fastify.listen({ port: 3000, host: `0.0.0.0` });
		//console.log('2fa-service listening on port 3000');
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();
