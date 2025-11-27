import { navigate } from "../router";

function setUser(user: { [name: string]: string }) {
	localStorage.setItem('user', JSON.stringify(user));
}

function buildFinishPayload(scoreP1:number, scoreP2:number, match:any) {
  const createdAt = match.created_at
    ?? new Date().toLocaleString('fr-FR').split(' GMT')[0]; // même format que DB

  return {
    id: Number(match.id),
    p1_id: Number(match.player1?.id ?? match.p1_id ?? 0),
    p1_type: match.player1?.type ?? match.p1_type ?? 'guest',
    p2_id: Number(match.player2?.id ?? match.p2_id ?? 0),
    p2_type: match.player2?.type ?? match.p2_type ?? 'guest',
    scoreP1: Number(scoreP1),
    scoreP2: Number(scoreP2),
    created_at: createdAt,
    tournament_id: match.tournament_id ?? 0
  };
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>  {
	
	let response = await fetch(input, { ...init, credentials: 'include' });
	if (response.status === 404) {

		console.error("User not found", response);
		localStorage.removeItem('user');
		navigate("/");
		return response;
	}

	// Si token expiré ou invalide
	if (response.status === 401 || response.status === 403) {
		console.warn("Access token expiré, tentative de refresh...");

		let refreshToken = await fetchRefreshToken();
		if (!refreshToken) {
			console.error("Refresh token invalide. Déconnexion...");
			localStorage.removeItem('user');
			navigate("/");
			return response;
		}
		// Relance une seule fois la requête initiale
		response = await fetch(input, { ...init, credentials: 'include' });
	}
	return response;
}

export function getUser() {
	const jsonUser = localStorage.getItem('user');
	return jsonUser ? JSON.parse(jsonUser) : null;
}


export async function getUserById(id: number, type : string){

	const response = await apiFetch(`/api/user/${id}`, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({ type: type })
	});
	if (!response.ok) {
		console.warn("Erreur backend :", response.status);
		return null;
	}
	//console.log("reponse getUserById -> ", response);
	const data = await response.json();
	return data.user;
}

export async function Logout(){
	const response = await apiFetch('/api/user/logout', {
		method: 'PUT',
	});
	return response;
}

export async function updateInfo(password: string, toUpdate: string, newValue: string){

	//console.log("ooooo", password, toUpdate, newValue);

	const response = await apiFetch(`/api/user/update`, {
		method: "PUT",
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			password : password,
			toUpdate : toUpdate,
			newValue : newValue,
		}),
	});

	const data = await response.json();
	if (!response.ok) {
		console.error("Erreur updateInfo:", data.error);
		throw new Error(data.error || "Erreur lors de la mise à jour");
	}
	setUser(data.user);
	return data;
}

export async function updateAvatar(file: File) {
	const formData = new FormData();
	formData.append('file', file);

	const response = await apiFetch('/api/user/updateAvatar', {
		method: 'PUT',
		body: formData,
	});

	const json = await response.json();
	if (!response.ok) {
		console.error('Erreur updateAvatar:', json.error);
		throw new Error(json.error || 'Erreur lors de la mise à jour de l’avatar');
	}

	// MAJ du localStorage pour refleter le nouveau chemin
	const user = getUser();
	if (user) {
		user.picture = json.picture;
		localStorage.setItem('user', JSON.stringify(user));
	}
	return json;
}

export async function addNewFriend(friendName: string){
	const response = await apiFetch(`/api/user/addfriend/${encodeURIComponent(friendName)}`, {
		method: "POST",
	});

	//console.log("###########################", response);
	return response;
}

export async function getFriendsList(): Promise<{ friends: { name: string; status: string , id: number }[] } | null> {

	const response = await apiFetch('/api/user/getfriendsprofiles', {
		method: 'GET',
	});

	// Si le backend renvoie 204 No Content, on retourne []
	if (response.status === 204) {
    	//console.log("Aucun ami trouvé.");
		return { friends: [] };
  	};

	if (!response.ok) {
		console.warn("Erreur backend getFriendsList:", response.status);
		return null;
	}

	const data = await response.json() as { friends: { name: string; status: string, id: number }[] };
	return data;
}

export async function fetchRefreshToken(){

	const response = await fetch("/api/refresh", {
		method: 'POST',
		credentials: 'include',
	});

	if (response.status === 403) {
		//console.log("Impossible de mettre a jour le refresh token", response);
		return false;
	}
	
	const user = await response.json();
	//console.log("fetchRefreshToken user -> ", user);
	return true;
}

export async function removeFriend(friendId: string){

	const response = await apiFetch('/api/user/deleteFriend', {
		method: 'DELETE',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			id: friendId,
		}),
	});
	const json = await response.json();

	//console.log("removeFriend resonse -> ", json);
	if (!json.error) {
		//console.log("deleteFriend error here");
		return true;
	}
	return false;
}


export async function register(name: string, email: string, password: string) {
	const response = await apiFetch('/api/user/register', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, email, password }),
	});

	const json = await response.json();

	// Si le serveur renvoie erreur (400, 409, etc.)
	if (!response.ok)
		return { success: false, message: json.message || json.error || 'Unknown error' };

	if (json.user) {
		setUser(json.user);
		return { success: true };
	}
	return { success: false, message: json.error || 'Unknown error' };
}

export async function asGuest(asPlayer2: Boolean = false) {
	const response = await apiFetch('/api/user/guest', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			tmp: asPlayer2,
		}),
	});
    if (!response.ok) {
        console.error("Erreur HTTP :", response.status);
        return false;
    }

    const json = await response.json();
    //console.log("#### Response asGuest -> ", json, "####");

    if (json.user) {
        setUser(json.user);
        return true;
    }
    return false;
}

export async function login(name: string, password: string) {
	const response = await apiFetch('/api/user/login', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json'},
		body: JSON.stringify({ name: name, password: password, tmp: false })
	});
	
	const json = await response.json();

	if (!response.ok)
		return { success: false, message: json.error || "Unknown error" };
	
	if (json.user) {
		setUser(json.user);
		return { success: true };
	}
	return { success: false, message: "Unexpected response from server" };
}

export async function deleteUser(password : string) {

	const response = await apiFetch('/api/user/delete', {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ password }),
	});
	const json = await response.json();

	//console.log("fetch deleteUser here");
	if (!json.error) {
		//console.log("deleteUser removeItem here");
		localStorage.removeItem('user');
		return true;
	}
	return false;
}

export async function verifyTwoFactorCode(code: string) {
	const user = getUser();

	const response = await apiFetch('/api/twofa/verifycode', {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			id: user?.id,
			name: user?.name,
			email: user?.email,
			type: user?.type,
			code
		}),
	});
	const json = await response.json();
	if (json.error)
		return false;
	//console.log("verify2fa -> ", json);
	return true;
}

export type Match = {
	id: number,
	player1: { id: string, name?: string , type: string },
	player2: { id: string, name?: string , type: string },
	tournament_id: any | undefined
}

export async function createMatch(playerType: string, name?: string, password?: string) {

	if (playerType == "registered" && !name && !password) return null;

	const res = await apiFetch(`/api/match/` + playerType, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({ playerType, ...(playerType == "registered" ? { name, password } : {}) })
	});
	const data = await res.json();
	if (data.error) return null;
	return {
		id: data.match.id,
		player1: {id: data.match.p1_id, type: data.match.p1_type, name: data.user1.name},
		player2: {id: data.match.p2_id, type: data.match.p2_type, name: data.user2.name}
	} as Match;
}

export async function deleteMatch(matchId: number): Promise<boolean> {

	const res = await apiFetch(`/api/match/${matchId}`, {
		method: 'DELETE',
	});
	const data = await res.json();
	if (data.error)
		return false;
	return true;
}

export async function updateMatchResult(scoreP1: number, scoreP2: number, match: Match) {
	const payload = buildFinishPayload(scoreP1, scoreP2, match);
	const res = await apiFetch(`/api/match/finish`, {
		method: 'PUT',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify(payload)
	});
	const data = await res.json();
	if (data.error) return false;
	return true;
}

export async function launchTournament(nbPlayers: number) {

	const res = await apiFetch('/api/tournament/launchtournament', {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({ nbPlayers })
	});
	const data = await res.json();
	//console.log("launchTournament data -> ", data);
	if (data.error) return null;
	return data.Tournament as Tournament;
}

export async function joinTournamentAsLogged(tournamentId: number, name: string, password: string): Promise<{id: string, name: string} | null> {

	const res = await apiFetch(`/api/tournament/jointournamentregistered/${tournamentId}`, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({ name, password })
	});

	const data = await res.json();
	
	if(data.error)
		throw new Error("Login failed please try again");

	if (data.error) return null;
	return { id: data.user.id, name: data.user.name };
}

export async function joinTournamentAsGuest(tournamentId: number) {

	const res = await apiFetch(`/api/tournament/jointournamentguest/${tournamentId}`, {
		method: 'POST',
	});
	const data = await res.json();
	if (data.error)
		return { error: data.error };
    return { 
        id: data.user.id,
        name: data.user.name, 
        message: data.message
    };
}

export type Tournament = {
	id: number,
	matches: Match[],
	nb_players: number,
	nbPlayersTotal: number,
}

export async function startTournament(tournamentId: number): Promise<Tournament | null> {

	const res = await apiFetch(`/api/tournament/starttournament/${tournamentId}`, {
		method: 'POST',
	});
	const data = await res.json();
	if (data.error)
		return null;
	return data.tournament as Tournament;
}

export async function deleteTournament(tournamentId: number): Promise<boolean> {

	const res = await apiFetch(`/api/tournament/${tournamentId}`, {
		method: 'DELETE',
	});
	const data = await res.json();
	if (data.error)
		return false;
	return true;
}

export async function nextTournamentMatch(scoreP1: number, scoreP2: number, match: Match): Promise<any | null> {

	const res = await apiFetch(`/api/tournament/next`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ scoreP1, scoreP2, ...match})
	});
	const data = await res.json();
	if (data.error){
		console.error(data.error);
		return null;
	}
	return data;
}
