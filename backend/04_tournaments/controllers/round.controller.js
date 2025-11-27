import { 
    fetchMatchForTournament, 
    fetchFinishMatchForTournament, 
    fetchHistoryMatchForTournament, 
    getMatchTournament 
} from './match.controller.js';

import { endTournament } from './tournament.controller.js';
import { formatMatchForFront } from './utils.js';
import { fetchGetUserById } from './user.controller.js';

/**
 * finishMatch wrapper — appelle le match-service pour finir un match
 */
async function finishMatch(matchBody, request, reply) {
    try {
        const matchFromDbRes = await getMatchTournament(matchBody.id);
        const matchFromDb = matchFromDbRes?.match || {};
        const finishPayload = { ...matchFromDb, scoreP1: matchBody.scoreP1, scoreP2: matchBody.scoreP2 };
//        //console.log("###\nHelper finishMatch: matchFromDbRes -->", matchFromDbRes, "\n###\n");
//        //console.log("###\nHelper finishMatch: matchFromDb -->", matchFromDb, "\n###\n");
//        //console.log("###\nHelper finishMatch: finishPayload -->", finishPayload, "\n###\n");

        const finishMatch = await fetchFinishMatchForTournament(finishPayload, request.cookies || {});
        if (!finishMatch) {
            //console.log("###\nHelper finishMatch: fetchFinishMatchForTournament returned falsy\n###\n");
            return { error: 'Impossible to finish match' };
        }
//       //console.log("###\nHelper finishMatch: finishMatch -->", finishMatch, "\n###\n");
        return finishMatch;
    } catch (err) {
        console.error('Helper finishMatch error:', err);
        return { error: 'Error finishing match' };
    }
}

/**
 * Transforme l'historique renvoyé par match-service en array formaté pour le front
 */
function normalizeHistory(matchHistoryRaw) {
    if (!matchHistoryRaw || !Array.isArray(matchHistoryRaw.tournamentData))
        return [];
    return matchHistoryRaw.tournamentData.map(formatMatchForFront);
}

/**
 * Crée les matchs du prochain round via match-service et retourne les objets match créés
 */
async function createMatchesForNextRound(arrayMatchesNextRound) {
    const matchsNextRound = [];
    for (const nextM of arrayMatchesNextRound) {
        const res = await fetchMatchForTournament(nextM);
        if (res.error) {
//            //console.log("###\ncreateMatchesForNextRound: fetchMatchForTournament error for", nextM, "\n###\n");
            return { error: 'Match creation failed' };
        }
        // res.match : forme du match créé par match-service
        matchsNextRound.push(res.match);
    }
    return { matchsNextRound };
}

/**
 * VALIDATION initiale de la requête / droit de l'user
 */
async function validateRequest(matchBody, user, reply, db) {
	if (!matchBody || !matchBody.tournamentID || matchBody.tournamentID <= 0)
		return reply.code(400).send({ error: 'TournamentId is required' });

	const tournamentId = Number(matchBody.tournamentID);
	const tournament = await db.tournament.get('id', tournamentId);

	if (!tournament)
		return reply.code(404).send({ error: 'TournamentId not found' });
	if (tournament.status !== 'started')
		return reply.code(400).send({ error: 'Tournament not started or finished' });

	// Vérifier que l'utilisateur fait partie du tournoi
	const toFind = `${user.id}:${user.type};`;
	if (!String(tournament.players || '').includes(toFind))
		return reply.code(403).send({ error: 'User not in tournament' });

	return tournament;
}

/**
 * Récupère round courant + historique formaté
 */
async function getCurrentRoundData(tournament, reply, db) {
    // Récupérer le round courant
    const round = await db.round.get(tournament.id, tournament.rounds);
    if (!round)
        return reply.code(404).send({ error: 'Impossible to get data round' });
//    //console.log("###\nFonction getCurrentRoundData: round -->", round, "\n###\n");

    let matchHistory = await fetchHistoryMatchForTournament(tournament.id);
    if (matchHistory.error)
        return reply.code(400).send({ error: 'Could not fetch match history' });
//    //console.log("###\nFonction getCurrentRoundData : matchHistory --> ", matchHistory, "\n###\n");

    const matchesArray = normalizeHistory(matchHistory);
    return { round, matchesArray };
}

/**
 * Vérifications du match dans le round et qu'il n'est pas déjà fini
 */
async function checkMatchValidity(round, matchBody, matchesArray, reply) {
    // Vérifier que le match appartient bien au round
    const roundMatchIds = String(round.matchs || '').split(';').filter(Boolean);
    if (!roundMatchIds.includes(String(matchBody.id)))
        return reply.code(404).send({ error: 'Does not found match in round' });

    // Vérifier si le match est déjà fini dans l'historique
    const currentMatchHistory = matchesArray.find(m => String(m.id) === String(matchBody.id));
    if (currentMatchHistory && currentMatchHistory.winner_id !== null && currentMatchHistory.winner_id !== undefined)
        return reply.code(400).send({ error: 'Match already finish' });

    return roundMatchIds;
}

/**
 * Finir un match puis recharger l'historique (wrapper)
 */
async function finishMatchAndReload(matchBody, tournament, request, reply) {
	const finish = await finishMatch(matchBody, request, reply);
    if (finish?.error)
        return reply.code(400).send({ error: 'Impossible to finish match' });
//    //console.log("###\nFonction finishMatchAndReload: finish -->", finish, "\n###\n");

    // Recharger l'historique pour vérifier l'état des matchs du round
    const matchHistory = await fetchHistoryMatchForTournament(tournament.id);
    if (matchHistory.error)
        return reply.code(400).send({ error: 'Could not fetch match history' });

    return matchHistory;
}

/**
 * Preparer les paires pour le prochain round a partir des gagnants
 * Tous les matchs de ce round sont terminés -> on prepare le prochain round
 */
async function prepareNextRound(matchesInRound, tournament, reply) {
    // Recuperer les gagnants
    const winners = [];
    //console.log("matchinRound", matchesInRound);
    for (const m of matchesInRound) {
//        //console.log("########################### prepare m:\n", m,
//                    "\n######################################\n");
        const winnerId = Number(m.winner_id);
        let winnerType = m.winner_type;
        winners.push({ id: winnerId, type: winnerType });
    }
//	//console.log("###\nFonction prepareNextRound: winners -->", winners, "\n###\n");
    //console.log("winners.length", winners.length);

	if (winners.length === 1) {
		return {
			arrayMatchesNextRound: [],
			finalWinner: winners[0],
		};
	}
    // Construire les paires du prochain round
    const arrayMatchesNextRound = [];
    for (let i = 0; i < winners.length; i += 2) {
            const player1 = winners[i];
            const player2 = winners[i + 1];

			
	//		peutetre inutile si tournoi bien formé
            if (!player2) {
                // Nombre impair --> dernier joueur passe automatiquement au prochain round
                arrayMatchesNextRound.push({
                    player1: { id: player1.id, type: player1.type },
                    player2: null, // bye . ne devrait pas arriver dans un tournoi bien formé
                    tournamentID: tournament.id
                });
                continue;
            }

            const p1 = await fetchGetUserById(player1.id, player1.type);

            const p2 = await fetchGetUserById(player2.id, player2.type);

            //console.log("####################### P1\n", p1,
                        //"\n####################### P2\n", p2);
            arrayMatchesNextRound.push({
                player1: {
                    id: p1.id,
                    type: p1.type,
                    name: p1.name
                },
                player2: {
                    id: p2.id,
                    type: p2.type,
                    name: p2.name
                },
                tournamentID: tournament.id
            });
    }
//	//console.log("###\nFonction prepareNextRound: arrayMatchesNextRound -->", arrayMatchesNextRound, "\n###\n");

	return {
		arrayMatchesNextRound,
		finalWinner: undefined
	};
}

/**
 * MAJ la DB après la fin d'un round :
 *  - creer les matchs du prochain round via match-service
 *  - finishRound (round table)
 *  - ajoute history
 *  - MAJ tournament.matchs
 *  - MAJ round (nouveau round)
 *
 * Retourne les matchs formates pour le front
 */
async function updateTournamentAfterRound(request, reply, tournament, round, arrayMatchesNextRound) {
    const { db } = request.server;

    // Creer les matchs via match service
    const creationResult = await createMatchesForNextRound(arrayMatchesNextRound);
    if (creationResult.error)
		return reply.code(400).send({ error: 'Could not create matches for tournament' });
    const matchsNextRound = creationResult.matchsNextRound;

    // MAJ DB : finir le round courant et récupérer le nextRound
    const nextRound = await db.round.finishRound(tournament.id, round.round);
    const newRoundNumber = nextRound?.round || (round.round + 1);

    // Construire le string des nouveaux matchs
    const matchesString = matchsNextRound.map(m => m.id).join(';');
//    //console.log("###\nFonction updateTournamentAfterRound : tournament --> ", tournament, "\n###\n");

    // 1) ajouter à l'historique
    await db.history.addMatchesAndPlayers(tournament.id, matchesString, tournament.players);

    // 2) MAJ la colonne matchs du tournoi (concaténation)
    const newTournamentMatches = tournament.matchs
        ? `${tournament.matchs};${matchesString}`
        : matchesString;
    await db.tournament.setMatches(tournament.id, newTournamentMatches);

    // 3) MAJ la table round pour le nouveau round
    await db.round.updateRoundData(tournament.id, newRoundNumber, matchesString, tournament.players);

    // Formater les matchs pour le front avant de retourner
    const formattedMatches = matchsNextRound.map(formatMatchForFront);

    return { matches: formattedMatches };
}

async function addUserNames(matches) {
	const matchesWithNames = [];
	for (const m of matches) {
		const p1Res = await fetchGetUserById(m.player1.id, m.player1.type);
		const p2Res = await fetchGetUserById(m.player2.id, m.player2.type);
		const p1Name = p1Res && !p1Res.error ? p1Res.name : 'Unknown';
		const p2Name = p2Res && !p2Res.error ? p2Res.name : 'Unknown';
		matchesWithNames.push({
			...m,
			player1: { ...m.player1, name: p1Name },
			player2: { ...m.player2, name: p2Name }
		});
	}
	return matchesWithNames;
}

/**
 * Route principale : nextRound
 */
export async function nextRound(request, reply) {
    const matchBody = request.body || {};
    const user = request.user;
//    //console.log("###\nFonction nextRound : matchbody --> ", matchBody, "\n###\n");

    // 1 : validation
    const tournament = await validateRequest(matchBody, user, reply, request.server.db);
    if (!tournament)
		return; // validateRequest a déjà envoyé la réponse
//    //console.log("###\nFonction nextRound : tournament -->", tournament, "\n###\n");

    // 2 : round + historique
    const currentData = await getCurrentRoundData(tournament, reply, request.server.db);
    if (!currentData)
		return; // getCurrentRoundData a déjà envoyé la réponse
    const { round, matchesArray } = currentData;
//    //console.log("###\nFonction nextRound : matchesArray --> ", matchesArray, "\n###\n");
//    //console.log("###\nFonction nextRound : round --> ", round, "\n###\n");


    // 4 : Verifie que le match est valide
    const roundMatchIds = await checkMatchValidity(round, matchBody, matchesArray, reply);
    if (!roundMatchIds)
		return; // checkMatchValidity a déjà envoyé la réponse
//    //console.log("###\nFonction nextRound : roundMatchIds --> ", roundMatchIds, "\n###\n");

    // 5 : terminer le match et recharger l’historique
    const matchHistory = await finishMatchAndReload(matchBody, tournament, request, reply);
    if (!matchHistory)
		return; // finishMatchAndReload a déjà envoyé la réponse
//    //console.log("###\nFonction nextRound, matchHistory --> ", matchHistory, "\n###\n");

    // 6 : Verifie si tous les matchs du round sont terminés
    const matchesInRound = (matchHistory.tournamentData || [])
            .filter(m => roundMatchIds.includes(String(m.id)));
    // Si tous les matchs du round ne sont pas terminés -> réponse informative
    if (roundMatchIds.length !== matchesInRound.length) {
        return reply.code(200).send({
            tournament,
            matchFinish: matchHistory,
            message: 'All matchs round not finished'
        });
    }

    // 7 : Preparer le prochain round
    const { arrayMatchesNextRound, finalWinner } = await prepareNextRound(matchesInRound, tournament, reply);
//    //console.log("###\nFonction nextRound, arrayMatchesNextRound --> ", arrayMatchesNextRound, "\n###\n");
    //console.log("finalWinner", finalWinner);
    if (finalWinner !== undefined) {
        //console.log("finalWinner", finalWinner);
        // Tournoi terminé
        //let finishedTournamentArr = await endTournament(request, reply, tournament.id, finalWinner);
		return await endTournament(request, reply, tournament.id, finalWinner);
    }

    // 8 : MAJ des DATA history, tournament et round
    const updateResult = await updateTournamentAfterRound(request , reply, tournament, round, arrayMatchesNextRound);
    if (!updateResult)
		return; // updateTournamentAfterRound a déjà envoyé la réponse en cas d'erreur

	// 9 : recupérer le nom de joueur pour yan
	// mon objet : {"matches":[{"id":3,"player1":{"id":2,"type":"guest"},"player2":{"id":4,"type":"guest"},"tournamentID":1,"created_at":"Mon Nov 10 2025 17:44:58"}],"matchFinish":{"tournamentData":[{"id":1,"p1_id":1,"p1_type":"guest","scoreP1":0,"p2_id":2,"p2_type":"guest","scoreP2":1,"tournament_id":1,"winner_id":2,"loser_id":1,"created_at":"Mon Nov 10 2025 17:44:06","ended_at":"Mon Nov 10 2025 17:44:16"},{"id":2,"p1_id":3,"p1_type":"guest","scoreP1":0,"p2_id":4,"p2_type":"guest","scoreP2":1,"tournament_id":1,"winner_id":4,"loser_id":3,"created_at":"Mon Nov 10 2025 17:44:06","ended_at":"Mon Nov 10 2025 17:44:58"}]},"message":"next round"}
	updateResult.matches = await addUserNames(updateResult.matches);

	return reply.code(200).send({
        matches: updateResult.matches,
        matchFinish: matchHistory,
        message: 'next round'
    });
}

/**
 * Route utilitaire : updateMatchAndRemainingPlaces
 * (conserve tout le flow existant, mais utilise finishMatch helper)
 */
export async function updateMatchAndRemainingPlaces(request, reply) {
    const body = request.body;
    if (!body)
		return reply.code(400).send({ error: 'Invalid body' });

    const { db } = request.server;
    const tournamentId = Number(body.tournamentId);
    const matchId = Number(body.matchId);
    const playerId = Number(body.playerId);

    if (!tournamentId || tournamentId <= 0)
        return reply.code(400).send({ error: 'tournamentId invalid' });
    if (!matchId || matchId <= 0)
        return reply.code(400).send({ error: 'matchId invalid' });
    if (!playerId || playerId <= 0)
        return reply.code(400).send({ error: 'playerId invalid' });

    // Récupérer le tournoi
    const tournament = await db.tournament.get('id', tournamentId);
    if (!tournament)
		return reply.code(404).send({ error: 'Tournament not found' });

    // players existants
    const playersStr = String(tournament.players || '');
    const playersArray = playersStr.split(';').filter(Boolean);
    if (playersArray.length <= 1)
        return reply.code(400).send({ error: 'Not enough players in tournament' });

    // matchs existants
    const matchsStr = String(tournament.matchs || '');
    const matchsArray = matchsStr.split(';').filter(Boolean);

    // Vérifier que le player est bien dans tournament
    const playerExists = playersArray.some(p => String(p).split(':')[0] === String(playerId));
    if (!playerExists)
		return reply.code(400).send({ error: 'Player not in tournament' });

    // Vérifier que le match est bien dans tournament
    const matchExists = matchsArray.includes(String(matchId));
    if (!matchExists)
		return reply.code(400).send({ error: 'Match not in tournament' });

    // 1) terminer le match via match-service si nécessaire
    try {
        const finishRes = await finishMatch({ id: matchId, scoreP1: body.scoreP1, scoreP2: body.scoreP2 }, request, reply);
        if (finishRes?.error) {
            console.error('fetchFinishMatchForTournament failed:', finishRes);
            return reply.code(400).send({ error: 'Could not finish match' });
        }
    } catch (err) {
        console.error('Error while finishing match:', err);
        return reply.code(400).send({ error: 'Error finishing match' });
    }

    // 2) construire les nouvelles strings players et matchs (on enlève playerId et matchId)
    const newPlayersArray = playersArray.filter(p => String(p).split(':')[0] !== String(playerId));
    const newPlayersStr = newPlayersArray.length ? newPlayersArray.join(';') + ';' : '';

    const newMatchsArray = matchsArray.filter(m => String(m) !== String(matchId));
    const newMatchsStr = newMatchsArray.join(';');

    // 3) MAJ la DB via updateMatchAndPlaces
    const updatedTournament = await db.tournament.updateMatchesAndPlaces(tournamentId, newMatchsStr, newPlayersStr);
    if (!updatedTournament)
        return reply.code(400).send({ error: 'Could not update match and remaining places' });

    // 4) si tournoi terminé (<=1 joueur restant), set winner
    if (Number(updatedTournament.nbPlayersTotal) <= 1) {
        const remainingPlayers = String(updatedTournament.players || '').split(';').filter(Boolean);
        if (remainingPlayers.length > 0) {
            const first = remainingPlayers[0];
            const winnerId = Number(first.split(':')[0]);
            if (winnerId && winnerId > 0) {
                // terminer le tournoi dans le fichier tournoi.controller.js
                const finalTournamentArr = await endTournament(updatedTournament.id, reply, winnerId);
                return reply.code(200).send({ tournament: finalTournamentArr, message: 'Tournament finished' });
            }
        }
    }

    return reply.code(200).send({ tournament: updatedTournament, message: 'Match and remaining places updated' });
}
