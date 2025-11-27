//./models/tournaments.js
import { getDB } from '../common_tools/getDB.js';	

const db = await getDB();


/******************/
/*TABLE tournament*/
/******************/

//! ajout le 20/09/2025
export async function createTournamentRow(nbPlayersTotal, creatorId) {

	const time = Math.floor(Date.now() / 1000);

	const result = await db.run(
		`INSERT INTO tournament (created_at, nbPlayersTotal, remainingPlaces, creatorId)
		VALUES (?, ?, ?, ?)`,
		[time, nbPlayersTotal, nbPlayersTotal, creatorId]
	);

	return await db.get(`SELECT * FROM tournament WHERE id = ?`, [result.lastID]);
}

export async function getTournament(id){
	return await db.get(`SELECT * FROM tournament WHERE id = ?`, [id]);
};

//lancer le tournoie
export async function startTournamentInternal(tournamentId) {
	const tournament = await getTournament(tournamentId);
	if (!tournament || tournament.status !== 'waiting')
		return null;

	await db.run(`UPDATE tournament SET status = 'started' WHERE id = ?`, [tournamentId]);
	return await getTournament(tournamentId);
}

// Récupère tous les tournois gagnés par un user
export async function getTournamentsWonByUser(userId) {
    if (!Number.isInteger(userId) || userId <= 0)
        return [];
	// //console.log(db.)
	return await db.all( 'SELECT * FROM tournament WHERE winnerId = ?', [userId] );
};

//ajoute un joueur a la db et enleve un joueur au nb places restantes
export async function addPlayerToTournament(tournamentId, addPlayer) {
	
	const tmpStr = (await db.get(`SELECT players FROM tournament WHERE id = ?`, [tournamentId])).players + addPlayer;
	await db.run(`UPDATE tournament SET players = ?, remainingPlaces = (remainingPlaces - 1) WHERE id = ?`, [tmpStr, tournamentId]);
	return await getTournament(tournamentId);
}

//! ajout le 22/09/2025
//pour matchsevice ?!!
export async function setMatchesForTournament(id, matchesString) {
	await db.run(`UPDATE tournament SET matchs = ? WHERE id = ?`, [matchesString, id]);
	return await getTournament(id);
}

//pour matchsevice ?!! // adapter
export async function setTournamentWinner(id, winnerId) {
	await db.run(`UPDATE tournament SET winnerId = ?, status = 'finished' WHERE id = ?`, [winnerId, id]);
	return await getTournament(id);
}


//pour matchsevice ?!!
export async function updateMatchAndPlaces(tournamentId, newMatches, newPlayers) {
	await db.run(`UPDATE tournament SET matchs = ?, nbPlayersTotal = nbPlayersTotal - 1, players = ? WHERE id = ?`, [newMatches, newPlayers, tournamentId]);
	return await getTournament(tournamentId);
};

//!ajout le 29/09/2025
export async function addMatchesStringToTournament(tournamentId, matchesString){
	await db.run(`UPDATE tournament SET matchs = ? WHERE id = ?`, [matchesString, tournamentId]);
	return await getTournament(tournamentId);
}

/***************/
/*TABLE history*/
/***************/

//!ajout le 29/09/2025

export async function getHistoryTournament(tournamentId) {
	return await db.get(`SELECT * FROM history WHERE id = ?`, [tournamentId]);
}

export async function addMatchesAndPlayersToHistory(tournamentId, matchesString, playersString){
	const time = Math.floor(Date.now() / 1000);
	await db.run(
		`INSERT INTO history (id, matchs, players, created_at)
		VALUES (?, ?, ?, ?)`,
		[tournamentId, matchesString, playersString, time]
	);
	return await getHistoryTournament(tournamentId);
}

/*************/
/*TABLE round*/
/*************/

//!ajout le 01/10/2021
export async function getRoundTable(tournamentId, roundNumber) {
	return await db.get(
		`SELECT * FROM round WHERE tournament_id = ? AND round = ?`,
		[tournamentId, roundNumber]
	);
}

//!ajout le 01/10/2025
export async function addDataRoundTable(tournamentId, roundNumber, matchsString, playersString) {
	await db.run(
		`INSERT INTO round (tournament_id, round, matchs, players) VALUES (?, ?, ?, ?)`,
		[tournamentId, roundNumber, matchsString, playersString]
	);
	return await getRoundTable(tournamentId, roundNumber);
}

export async function updateRoundData(tournamentId, roundNumber, matchsString, playersString) {
	await db.run(
		`UPDATE round SET matchs = ?, players = ? WHERE tournament_id = ? AND round = ?`,
		[matchsString, playersString, tournamentId, roundNumber]
	);
	return await getRoundTable(tournamentId, roundNumber);
}


export async function finishRound(tournamentId, roundNumber) {
	const newRound = roundNumber + 1;
	await db.run(`
		UPDATE round 
		SET statut = 'finish', round = ?
		WHERE tournament_id = ?`,
		[newRound, tournamentId]
	);
	return await getRoundTable(tournamentId, newRound);
}