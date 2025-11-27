// controllers/utils.js

export function formatMatchForFront(match) {
	if (!match)
		return null;

	// si deja fromate, renvoyer en verifiant les champs attendus
	if (match.player1 && match.player2) {
		return {
			id: match.id,
			player1: { id: match.player1.id, type: match.player1.type },
			player2: { id: match.player2.id, type: match.player2.type },
			tournamentID: match.tournamentID ?? match.tournament_id ?? match.tournamentId,
			created_at: match.created_at
		};
	}

	// cas standard : p1_id / p1_type
	return {
		id: match.id,
		player1: { id: match.p1_id ?? match.p1Id ?? null, type: match.p1_type ?? match.p1Type ?? null },
		player2: { id: match.p2_id ?? match.p2Id ?? null, type: match.p2_type ?? match.p2Type ?? null },
		tournamentID: match.tournament_id ?? match.tournamentID ?? match.tournamentId,
		created_at: match.created_at
	};
}
