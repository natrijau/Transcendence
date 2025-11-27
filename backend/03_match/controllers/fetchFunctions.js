// controllers/fetchFunctions.js

// Requete a user-service pour update le status d'un joueur
export async function fetchChangeStatus(player, status) {
    const body = JSON.stringify({
        name: player.name,
        status: status,
        type: player.type,
    });

    const res = await fetch('http://user-service:3000/changestatus', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: body,
    });
    if (!res.ok)
        return res;
    return ((await res.json()).user);
}

// Requete a user-service pour mettre a jour les stats d'un ou deux joueurs
export async function fetchUpdateStats(p1_id, p1_type, p2_id, p2_type, winner_id) {
    const body = JSON.stringify({
        p1_id: p1_id,
        p1_type: p1_type,
        p2_id: p2_id,
        p2_type: p2_type,
        winner_id: winner_id,
    });

    const res = await fetch('http://user-service:3000/updatestats', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: body,
    });
    const resBody = await res.json();
    const { user1, user2 } = resBody;
    return ({ user1, user2 });
}

// creer un guest (P2+) en base de donnees
export async function fetchCreateGuest() {
    const body = JSON.stringify({
        tmp: true
    });
    const res = await fetch('http://user-service:3000/guest', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: body,
    });
    const guest = (await res.json()).user;
    return (guest);
}
