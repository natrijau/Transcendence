import { 
	launchTournament, 
	getTournamentWinUserId, 
	endTournament, 
	startTournament, 
	getTournamentById, 
	getAllTournaments,
	deleteTournament
} from '../controllers/tournament.controller.js';

import { 
	joinTournamentSession, 
	joinTournamentRegistered, 
	joinTournamentGuest 
} from '../controllers/player.controller.js';

import { 
	nextRound, 
	updateMatchAndRemainingPlaces 
} from '../controllers/round.controller.js';

import { authenticateJWT } from '../authentication/auth.js';
import { tournamentSchema, nextSchema } from '../schema/tournamentSchema.js';
import { loginInput } from '../schema/userInput.js';

export default async function routesPlugin(fastify, options) {
	fastify.get('/', async (request, reply) => {
		return { hello: 'from tournament' };
	});

	// route a supprimer // appelee dans /next
	fastify.post('/endtournament', { preHandler: authenticateJWT }, endTournament);
	//! ajout le 19/19/2025
	//route pour recuperer les tournois(pour participer aux tournois)
	//? sert a quelque chose ? // a supprimer
	fastify.get('/winnertournament/:id', /*shcema de tournoi a determiner*/ getTournamentWinUserId);

	//! ajout le 19/09/2025
	// Si un joueur veux creer un tournois(remplie automatiquement avec ia, attente de 2 min pour qu'un autre user se connecte au tournoie)
	 fastify.post('/launchtournament',{preHandler: authenticateJWT , schema: tournamentSchema }, launchTournament);

	//! ajout le 22/09/2025
	fastify.post('/jointournamentsession/:id', { preHandler: authenticateJWT }, joinTournamentSession);
	fastify.post('/jointournamentregistered/:id', { preHandler: authenticateJWT, schema: loginInput }, joinTournamentRegistered);
	fastify.post('/jointournamentguest/:id', { preHandler: authenticateJWT }, joinTournamentGuest);


	fastify.post('/starttournament/:id', { preHandler: authenticateJWT }, startTournament);
	fastify.get('/:id', getTournamentById);
	fastify.get('/all', getAllTournaments);

//	fastify.delete('/abort', abort); // schema
	fastify.delete('/:id', { preHandler: authenticateJWT }, deleteTournament);

	//! ajout le 30/09/2025
	// route PUT pour generer les matchs du prochain round, et MAJ les data de tournoi
	fastify.put('/next', { preHandler: authenticateJWT, schema: nextSchema }, nextRound);


	//! ajout le 22/09/2025
	//pour louis
	fastify.put('/updateMatchAndPlaces', { preHandler: authenticateJWT }, updateMatchAndRemainingPlaces);

}
