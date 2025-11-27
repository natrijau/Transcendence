// match.controller.js

// Recupere un match dans le service match
export async function getMatchTournament(id){
	const res = await fetch(`http://match-service:3000/${id}`,
		{ method: 'GET' });
	if(!res.ok)
		return { error : 'Match not found' };
	const match = await res.json();
	return match;
}

// Init les matchs dans le service match
export async function fetchMatchForTournament(matchData){
	const res = await fetch(`http://match-service:3000/tournament`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(matchData)
	});
	if(!res.ok)
		return { error : 'Match creation failed' };
	const match = await res.json();
	return match;
}

// Recupere historique des matchs d'un tournoi
export async function fetchHistoryMatchForTournament(tournamentId){
	const res = await fetch(`http://match-service:3000/history/tournament/${tournamentId}`, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' }
	});
	if(!res.ok)
		return { error : 'Match history retrieval failed' };
	const matchHistory = await res.json();
	return matchHistory;
}


// Termine un match dans le service match
export async function fetchFinishMatchForTournament(match, cookies){
	const cookieHeader = `accessToken=${cookies.accessToken}`;
	const res = await fetch('http://match-service:3000/finish', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader },
		credentials: 'include',
		body: JSON.stringify(match)
	});
	if(!res.ok)
		return { error : 'Match creation failed' };
	const matchFinish = await res.json();
	return matchFinish;
}

export async function fetchDeleteMatch(id, cookies) {
	const cookieHeader = `accessToken=${cookies.accessToken}`;
	const res = await fetch(`http://match-service:3000/${id}`, {
		method: 'DELETE',
		headers: { 'Cookie': cookieHeader },
		credentials: 'include',
	});
	return res;
}