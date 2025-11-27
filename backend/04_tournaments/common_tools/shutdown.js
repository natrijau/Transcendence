
async function shutdownPlugin(fastify, options) {
	const shutdownHandler = async () => {
		try {
			await fastify.close();
			process.exit(0);
		} catch (err) {
			fastify.log.error(err);
			process.exit(1);
		}
	};
	process.on('SIGTERM', shutdownHandler);
	process.on('SIGINT', shutdownHandler);
}

export default shutdownPlugin;