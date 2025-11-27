import PgGame from './PgGame.ts';
import shutdownPlugin from './common_tools/shutdown.js';
import WebSocket from 'ws';
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import '@fastify/cookie';

const fastify = Fastify({ logger: false });

fastify.register(shutdownPlugin);
fastify.register(fastifyWebsocket);

fastify.register(async function (fastify: any) {
  // Gestion des connexions authentifiées
  let ids: number = 0;
  const activeSessions = new Map<string, { ws: any; game: PgGame }>();
  fastify.get('/', { websocket: true }, (connection: any) => {
    const ws = connection.socket;

    const id = (ids++).toString();
    //console.log(`Session ${id} connected`);
    
    // Associer le WebSocket à l'utilisateur
    activeSessions.set(id, {
      ws: ws,
      game: new PgGame(ws, send),
    });
    
    ws.on('message', (rawData: any) => {
      try {
        const data = JSON.parse(rawData.toString());
        if (!validateMessage(data)) {
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
          return;
        }
        handleSessionAction(id, data);
      } catch (error) {
        console.error(`Error for user ${id}:`, error);
        ws.send(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });

    ws.on('close', () => {
      //console.log(`Session ${id} disconnected`);
      ws.close();
      activeSessions.delete(id);
    });
    
    // Heartbeat pour détecter les connexions mortes
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    function send(ws: any, data: any) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(data));
        } catch (error) {
          console.error('Error sending message:', error);
        }
      }
    }
  });

  // Heartbeat ping toutes les 30 secondes
  setInterval(() => {
    activeSessions.forEach((session) => {
      if (session.ws.isAlive === false) {
        return session.ws.terminate();
      }
      session.ws.isAlive = false;
      session.ws.ping();
    });
  }, 30000);

  function validateMessage(data: any) {
    const validTypes = ['start', 'ended', 'pause', 'resume', 'input', 'ready'];
    return data && typeof data.type === 'string' && validTypes.includes(data.type);
  }

  function handleSessionAction(id: string, data: any) {
    const session = activeSessions.get(id);

    if (!session) return;
    
    switch (data.type) {
      case 'start':
        session.game.start(data.data);
        break;
      case 'ended':
        session.game.ended();
        break;
      case 'pause':
        session.game.pause();
        break;
      case 'resume':
        session.game.resume();
        break;
      case 'input':
        session.game.keys = data.data;
        break;
      case 'ready':
        session.game.addObjects(data.data);
        break;
    }
  }
});

async function start() {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();