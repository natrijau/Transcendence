import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import routesPlugin from './routes/routes.js';
import cookie from '@fastify/cookie'
import shutdown from './common_tools/shutdown.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const httpsOptions = {
    key: fs.readFileSync(path.join(dirname, 'ssl/proxy.key')),
    cert: fs.readFileSync(path.join(dirname, 'ssl/proxy.crt'))
};

const server = Fastify({ logger: false, https: httpsOptions });

server.register(fastifyCors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
	allowedHeaders: ["Content-Type", "Authorization", "Cross-Origin-Resource-Policy"],
	credentials: true,
    webscoket: true,
});

server.register(cookie);

server.register(routesPlugin);
server.register(shutdown);

server.listen({ port: 443, host: '0.0.0.0' }, (err) => {
    if (err) {
        server.log.error(err);
        process.exit(1);
    }
});
