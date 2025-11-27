// tournament.controller.js

import { addNewPlayerToTournament } from './player.controller.js';
import { fetchChangeStatusUser, fetchUserTournament } from './user.controller.js';
import {
	fetchMatchForTournament,
	fetchHistoryMatchForTournament,
	fetchDeleteMatch
} from './match.controller.js';

import { fetchGetUserById , deleteGuest} from './user.controller.js';
// Recupere tout les tournoie gagnes par un user
export async function getTournamentWinUserId(request, reply){
	const { db } = request.server;
	const id = request.params.id;
	const userId = Number(id);
	if (!userId)
		return reply.code(400).send({ error: 'UserId is required' });

	const tournaments = await db.history.get('winnerID', userId);
	if (!tournaments)
		return reply.code(200).send({ tournaments: [], message: 'No tournament wins' });

	const ids = tournaments.map(({ id }) => id).join(';');
	return reply.code(200).send({ tournaments: ids, message: 'Tournaments winned' });
}

export async function launchTournament(request, reply) {
	const { db } = request.server;
	const user = request.user;

	const body = request.body;
	if (!body.nbPlayers || body.nbPlayers < 2)
		return reply.code(400).send({ error: 'Invalid  body' });

	// crée une ligne dans la table tournament
	const tmpTournament = await db.tournament.insert(body.nbPlayers, user.id);
	if (!tmpTournament)
		return reply.code(400).send({ error: 'Could not create tournament' });

	// let Tournament = await getTournament(tmpTournament.id);
	let Tournament = await db.tournament.get('id', tmpTournament.id);
	//console.log("################### TOURNAMENT\n", Tournament,
				// "\n###########################\n");
	// Tournament = await addPlayerToTournament(Tournament.id, user.id + ':' + user.type + ';');
	Tournament = await db.tournament.addPlayer(Tournament.id, user.id + ':' + user.type + ';');
	return reply.code(201).send({ Tournament, message: 'Tournament created. Waiting for players.' });
}

export async function endTournament(request, reply, tournamentId, user){
	const { db } = request.server;
	// ~schema: tournamentID, winnerID
	// insert in history
	// delete in tournament
	//console.log("tournamtentId winnerId0 ", tournamentId, user.id);
	if (tournamentId === 'undefined' || user.id === 'undefined'
		|| tournamentId === null || user.id === null	)
		return reply.code(400).send({ error: 'Invalid body' });

	let tournament = await db.tournament.get('id', tournamentId);
	if (!tournament)
		return reply.code(404).send({ error: 'Tournament not found' });

	await db.tournament.update('status', 'finished', tournamentId);

	
	//console.log("Tournament begin:", tournament);
	tournament = await db.history.update('winnerID', user.id, tournamentId);
	tournament = await db.history.update('winnerType', user.type, tournamentId);
	//console.log("Tournament ended:", tournament);
	// on recupere l'historique des matchs depuis le service match
	tournament = await fetchHistoryMatchForTournament(tournamentId);
	if (tournament.error)
		return reply.code(400).send({ error: 'Could not fetch tournament match history' });
	
	if (user.id === 0 || user.id === '0'){
		const iaUser = { id: 0, type: 'ia', name: 'normalAI' };
		return reply.code(200).send({ tournament, winner: iaUser, message: 'Tournament ended' });
	}
	tournament = await db.tournament.get('id', tournamentId);
	// a tester
	let users = tournament.players.split(';');
	for (let i = 0, n = users.length - 1; i < n; i++) {
		const split = users[i].split(':');
		const id = split[0];
		const type = split[1];
		if (type === 'guest' && i > 0)
			await deleteGuest(id);
		else{
			const user = await fetchGetUserById(id, type);
			const status = i === 0 ? 'available' : 'logged_out';
			await fetchChangeStatusUser(user, status);
		}
	}
	tournament = await fetchHistoryMatchForTournament(tournamentId);
	const winner = await fetchGetUserById(user.id, user.type);
	if (!winner)
		return reply.code(400).send({ error: 'Could not fetch winner info' });
	return reply.code(200).send({ tournament, winner,  message: 'Tournament ended' });
}

export async function startTournament(request, reply){
	const { db } = request.server;
	const user = request.user;
	const tournamentId = request.params.id;
	// let tournament = await getTournament(tournamentId);
	let tournament = await db.tournament.get('id', tournamentId);
	if (!tournament)
		return reply.code(404).send({ error: 'Tournament not found' });
	if (tournament.status !== 'waiting') {
		//console.log("Not waiting\n");
		return reply.code(400).send({ error: 'Tournament already started or finished' });
	}
	if (tournament.creatorId != user.id) {
		//console.log("creatorId not good\n");
		return reply.code(400).send({ error: 'Only creator of tournament can start tournament' });
	}
	//console.log("tournament -> ",tournament);
	// Ajout IA si nécessaire
	let countIa = 0;
	for (; tournament.remainingPlaces > 0;) {
		countIa++;
		tournament = await addNewPlayerToTournament(db, tournamentId, '0:ia;');
	}

	const playersArray = tournament.players.split(';');
	//Data des joueur
	let playersInfos = new Array(playersArray.length - 1 - countIa);

	for (let i = 0, j = 0; i < playersArray.length - 1; i++) {
		if (playersArray[i] !== '0:ia') {
			const [id, type] = playersArray[i].toString().split(':');
			//liste d'objet a envoyé au service match apres
			playersInfos[j] = { id: Number(id), type: type };
			j++;
		}
	}

	// Recupere les player d'un tournoi par une liste d'id et de type
	let listPlayers = await fetchUserTournament(playersInfos);
	if (listPlayers.error)
		return reply.code(400).send({ error: 'Could not fetch users for tournament' });

	// Tri par win_rate
	let rankedUsers = [...listPlayers.registered, ...listPlayers.guests].sort((a, b) => a.win_rate - b.win_rate);

	let finalPlayers = [];
	for (let i = 0; i < tournament.nbPlayersTotal; i++) {
		if (rankedUsers[i])
			finalPlayers.push(`${rankedUsers[i].id}:${rankedUsers[i].type}:${rankedUsers[i].name}`);
		if (countIa > 0) {
			finalPlayers.push('0:ia');
			countIa--;
		}
	}

	//console.log("finalPlayers --> ", finalPlayers);
	// Création des matchs
	let matches = [];
	for (let i = 0; i < finalPlayers.length; i += 2) {
		const [p1Id, p1Type, p1Name] = finalPlayers[i].split(':');
		const [p2Id, p2Type, p2Name] = finalPlayers[i + 1].split(':');
		matches.push({ player1: { id: Number(p1Id), type: p1Type, name: p1Name }, player2: { id: Number(p2Id), type: p2Type, name: p2Name }, tournamentID: tournamentId });
	}

	let tournamentMatchData = [];
	for (let m of matches) {
		const res = await fetchMatchForTournament(m);
		if (res.error)
			return reply.code(400).send({ error: 'Could not create matches for tournament' });
		tournamentMatchData.push(res.match);
		m.id = res.match.id;
		//console.log("Created match for tournament:", m);
	}
	//console.log("matches for tournament created:", matches);

	// Mettre à jour l'historique
	let matchesString = tournamentMatchData.map(m => m.id).join(';');
	await db.history.insert(tournamentId, matchesString, tournament.players);
	await db.tournament.update('matchs', matchesString, tournamentId);
	await db.round.insert(tournamentId, tournament.rounds, matchesString, tournament.players);
	let updatedTournament = await db.tournament.update('status', 'started', tournamentId);

//	//console.log("######################################## STARTTOURNAMENT\n",
//				"######### updatedTournament\n", updatedTournament,
//				"\n#########\n######### matches\n", matches,
//				"\n#########\n",
//				"########################################################\n");

	return reply.code(200).send({ tournament: { ...updatedTournament, matches }, message: 'Tournament started' });
}

export async function getTournamentById(request, reply){
	const { db } = request.server;
	const tournamentId = Number(request.params.id);
	const tournament = await db.tournament.get('id', tournamentId);
	if (!tournament)
		return reply.code(404).send({ error: 'Tournament not found' });

	return reply.code(200).send({ tournament, message: 'Tournament info' });
}

export async function getAllTournaments(request, reply) {
	const { db } = request.server;
	const tournaments = await db.all(`SELECT * FROM tournament`);
	return reply.code(200).send({ tournaments, message: 'All tournaments' });
}

// export async function abort(request, reply) {
// 	const { db } = request.server;
// 	const { user_id } = request.body;
// 	// delete tournois

// 	// delete rounds
// }

async function LogoutPLayers(players) {
	//ne pas delog le premier (hote)
	for (let i = 0, n = players.length - 1; i < n; i++) {
		const [id , type] = players[i].split(':');
		//console.log("id du guest a supprimer :", id);
		if (type === 'guest' && i > 0)
			deleteGuest(id);
		// GERER les login ?
	}
}

export async function deleteTournament(request, reply) {
	const { db } = request.server;
	const { id } = request.params;
	const tournament = await db.tournament.get('id', id);
	if (tournament !== undefined) {
		const matchs = tournament.matchs.split(';');
		for (let i = 0, n = matchs.length; i < n; i++) {
		//	//console.log("i = ", i, "\tmatches[i] = ", matchs[i], "\n");
			const res = await fetchDeleteMatch(matchs[i], request.cookies);
			if (!res.ok)
				return reply.code(400).send({ error: 'deleteMatch error' });
		}

		const players = tournament.players.split(';');
		if (players.length !== 0)
			await LogoutPLayers(players);
	}
	// supprimer rounds
	await db.round.delete('tournament_id', id);
	await db.tournament.delete('id', id);
	return reply.code(200).send({ ok: true });
}