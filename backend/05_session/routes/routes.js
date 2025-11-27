// routes/routes.js
import { generateSchema } from "../schema/generateSchema.js";
import { generate, authenticate, refresh, deleteToken } from '../controllers/controllers.js'

export async function sessionRoutes(fastify, options) {
    fastify.post('/generate', { schema: generateSchema }, generate);
    fastify.get('/authenticate', (request, reply) => {
        return authenticate(fastify.db, request, reply);
    });
    fastify.post('/refresh', (request, reply) => {
        return refresh(fastify.db, request, reply);
    });
    fastify.delete('/delete', (request, reply) => {
        return deleteToken(fastify.db, request, reply);
    });
}