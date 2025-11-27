// player.controller.js

import { fetchGetUserById, fetchCreateGuest, fetchUserLogin, fetchChangeStatusUser } from './user.controller.js';

async function alreadyJoined(players, id, type) {

	if (!players)
		return false;

	const trimmedId = String(id).trim();
	const trimmedType = String(type).trim();

	const playerEntries = players
		.split(';')
		.map(it => it.trim())
		.filter(it => it !== '');

	//console.log("playerEntries: " , playerEntries);
	for (const player of playerEntries) {

		const [playerId, rawType] = player.split(':');
		const playerType = rawType.trim();
		//console.log(`Checking playerId: |${playerId}|, playerType: |${playerType}| against id: |${trimmedId}|, type: |${trimmedType}|`);
		if (playerId === trimmedId && playerType === trimmedType)
		{
			//console.log(`Player with ID ${trimmedId} and type ${trimmedType} has already joined.`);
			return true;
		}
	}

	return false;
}


export async function addNewPlayerToTournament(db, tournamentId, entry) {
	let tournament = await db.tournament.get('id', tournamentId);
	tournament = await db.tournament.addPlayer(tournamentId, entry);
	return tournament;
}

// rejoindre un tournoi en tant que 
//! pas utilisé en front
export async function joinTournamentSession(request, reply){
	const { tournamentId } = request.body;
	const guest = await fetchCreateGuest();
	if (guest.error)
		return reply.code(400).send({ error: 'Could not create guest' });

	const tournament = await addNewPlayerToTournament(request.server.db, tournamentId, guest.id, guest.type);
	return reply.code(200).send({ tournament, user: guest });
}

export async function joinTournamentRegistered(request, reply){
	const { db } = request.server;
	const { name, password } = request.body;
	if (!name || !password)
		return reply.code(400).send({ error: 'Name and password are required' });

	// tournamentId depuis URL
	const tournamentId = Number(request.params.id);
	if (!tournamentId || tournamentId <= 0)
		return reply.code(400).send({ error: 'TournamentId is required' });

	// Login du joueur
	const player2 = await fetchUserLogin(name, password);
	if (!player2 || player2.error)
		return reply.code(400).send({ error: 'Login failed' });

	// Verifie que le tournoi existe et places dispo
//	const tournament = await getTournament(tournamentId);
	const tournament = await db.tournament.get('id', tournamentId);
	if (!tournament)
		return reply.code(404).send({ error: 'Tournament not found' });
	if (tournament.remainingPlaces < 1)
		return reply.code(400).send({ error: 'Tournament is full or already joined' });

	// verifie que le joueur n'ai pas dans le tournoi
	if ( await alreadyJoined(tournament.players, String(player2.id).trim(), String(player2.type).trim()))
		return reply.code(400).send({ error: 'Player ' + player2.name + ' is already connected ' });

	// Récupère le joueur pour vérifier son statut
	const currentUser = await fetchGetUserById(player2.id, player2.type);
	if (!currentUser)
		return reply.code(400).send({ error: 'PlayerId does not exist' });
	if (player2.status !== 'available')
		return reply.code(400).send({ error: 'Player unavailable' });

	// Ajoute le joueur au tournoi
	const entry = `${player2.id}:${currentUser.type};`;
	await addNewPlayerToTournament(request.server.db, tournamentId, entry);

	// Met à jour le statut du joueur
	await fetchChangeStatusUser(currentUser, "in_game");

	return reply.code(200).send({ user: player2, message: 'Joined tournament' });
}

// rejoindre un tournoi en guest temporaire
export async function joinTournamentGuest(request, reply){
	const { db } = request.server;
	const tournamentId = request.params.id;
	if (!tournamentId || tournamentId <= 0)
		return reply.code(400).send({ error: 'TournamentId is required' });
	
	// creer un guest
	const guest = await fetchCreateGuest();
        if (!guest || guest.error)
            return reply.code(400).send({ error: 'Guest creation failed' });

	// Verifier que tournoi existe et places dispo
	// const tournament = await getTournament(tournamentId);
	const tournament = await db.tournament.get('id', tournamentId);
	if (!tournament)
		return reply.code(404).send({ error: 'Tournament not found' });
	if (tournament.remainingPlaces < 1)
		return reply.code(400).send({ error: 'Tournament is full' });

	// Ajoute le guest au tournoi
	// const addPlayer = guest.id.toString() + ':' + guest.type + ';';
	await addNewPlayerToTournament(db, tournamentId, `${guest.id}:${guest.type};`);
	await fetchChangeStatusUser(guest, "in_game");
	return reply.code(200).send({ user: guest, message: 'Joined tournament' });
}
