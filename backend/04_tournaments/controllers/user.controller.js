// user.controller.js

// Recupere les player d'un tournoi par une liste d'id et de type
export async function fetchUserTournament(ArrayIdAndType){
	const res = await fetch(`http://user-service:3000/tournament`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ArrayIdAndType })
	});

	if (!res.ok) {
		const error = await res.json();
		return { error: error.error || 'Users not found' };
	}

	const users = await res.json();
	const usersInfos = users.users;

	return usersInfos;
}

// recupere user par Id
export async function fetchGetUserById(id, type){
	const user = await fetch(`http://user-service:3000/${id}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ type: type })
	});
	if(!user.ok)
		return { error : 'User not found' };
	const currentUser = await user.json();
	return currentUser.user;
}

// supprimer un guest du tournoi
export async function deleteGuest(id){
	const user = await fetch(`http://user-service:3000/deleteGuest`, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ id: id })
	});

	const message = await user.json();
	if (message === 'User successfully deleted.')
		return true;

	return false;
}

// recupere un guest par son id
//! peut etre utile pour front
export async function fetchGetGuestById(id){
	const user = await fetch(`http://user-service:3000/getguest/${id}`, { method: 'GET' });
	if(!user.ok)
		return { error : 'User not found' };
	const currentUser = await user.json();
	return currentUser.user;
}


// Change le status d'un user
export async function fetchChangeStatusUser(user, newStatus){
	const res = await fetch(`http://user-service:3000/changestatus`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			name: user.name,
			status: newStatus,
			type: user.type
		})
	});

	const data = await res.json();
	if (!res.ok)
		return { error: data.error || 'Failed to update status' };
	return data.user;
}

// Login d'un user en temporaire pour le tournoi
export async function fetchUserLogin(name, password){
	const res = await fetch(`http://user-service:3000/login`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, password, tmp: true })
	});
	if(!res.ok)
		return { error : 'Login failed' };
	const loggedUser = await res.json();
	return loggedUser.user;
}

// Creer un user guest temporaire pour le tournoi
export async function fetchCreateGuest(){
	const res = await fetch(`http://user-service:3000/guest`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ tmp: true })
	});
	if(!res.ok)
		return { error : 'Login failed' };
	const guestUser = await res.json();
	return guestUser.user;
}
