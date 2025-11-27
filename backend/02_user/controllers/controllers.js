import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { generateJWT, revokeJWT } from '../authentication/auth.js';
import { sendCode } from '../authentication/twofa.js';
import { fetchAbortMatch } from './fetchFunctions.js';
import { checkNameFormat, checkEmailFormat, checkPasswordFormat } from '../common_tools/checkFormat.js';	

const secureCookieOptions = {
	httpOnly: true,
	secure: true,
	sameSite: 'none'
};

async function clearCookies(reply) {
	reply.clearCookie('accessToken', { ...secureCookieOptions, path: '/' })
		.clearCookie('refreshToken', { ...secureCookieOptions, path: '/api/refresh' });
}

// rout POST /guest
export async function createGuest(request, reply) {
	const { db } = request.server;
	const guests = await db.guest.getCol('id');
	////console.log("guests = ", guests);
	const len = guests.length;
	const newID = (len ? guests[len - 1].id + 1 : 1);
	const name = "Guest" + newID;
	const tmp = request.body.tmp;

	await db.guest.insert({ name: name });

	const user = await db.guest.getByName(name);
	user.verified = true;

	await clearCookies(reply);

	if (!tmp) {
		const { accessToken, refreshToken } = await generateJWT(user);
		reply.setCookie('accessToken', accessToken, {
			...secureCookieOptions,
			path :'/',
			path :'/',
			maxAge: 60 * 15
		})
		.setCookie('refreshToken', refreshToken, {
			...secureCookieOptions,
			maxAge: 604800,
			path: '/api/refresh'
		})
	}

	return reply.code(201).send({
		user,
		message: 'Guest created'
	});
}

// route POST /register
export async function register(request, reply) {
	const { db } = request.server;
	const { name, password, email} = request.body;

	if (!await checkNameFormat(name))
		return reply.code(400).send({ error: 'Name format is incorrect. It must begin with an alphabetic character and contain only alphanumeric characters.' });

	if (!await checkEmailFormat(email))
		return reply.code(400).send({ error: 'Email format is incorrect. It must be a valid email address.' });

	const exists = await db.registered.getByName(name);
	if (exists !== undefined)
		return reply.code(409).send({ error: 'User already exists' });
	
	const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt());

	await db.registered.insert({
		name: name,
		hashedPassword: hashedPassword,
		email: email,
	});

	const user = await db.registered.getByName(name);
	delete user.hashedPassword;

	const { accessToken } = await sendCode({
		name: name,
		email: email,
		id: user.id
	});
	
	await db.registered.updateCol('status', name, 'pending');

	await clearCookies(reply);

	return reply.code(201)
		.setCookie('accessToken', accessToken, {
			...secureCookieOptions,
			maxAge: 1800,
			path: '/api/twofa/verifycode'
		})
		.send({
			user,
			message: 'User ' + name + ' created'
		});
}

// route PUT /login
export async function logIn(request, reply) {
	const { db } = request.server;
	const { name, password, tmp } = request.body;

	const exists = await db.registered.getByName(name);

	// await clearCookies(reply);
	
	if (exists === undefined)
		return reply.code(400).send({ error: 'User is not in the database' });

//	await fetchAbortTournament(exists);
//	await fetchAbortMatch(exists);
	// abort Tournament

	if (await bcrypt.compare(password, exists.hashedPassword)) {
		await db.registered.updateCol('status', name, 'available');

		const user = await db.registered.getByName(name);
		delete user.hashedPassword;
		
		user.verified = true;
		if (tmp === undefined || tmp === false) {
			await clearCookies(reply);
			
			const { accessToken, refreshToken } = await generateJWT(user);
			reply.setCookie('accessToken', accessToken, {
				...secureCookieOptions,
				maxAge: 60 * 15,
				path: '/'
			})
			.setCookie('refreshToken', refreshToken, {
				...secureCookieOptions,
				maxAge: 604800,
				path: '/api/refresh'
			});
		}

		const body = {
			user: user,
			message: 'User ' + name + ' available.',
		};

		return reply.code(201).send(body);
	} else
		return reply.code(444).send({ error: 'Bad password' });
}

// Route PUT /logout
export async function logOut(request, reply) {
	const { db } = request.server;
	const { name, type } = request.user;
	const revRes = await revokeJWT(request.cookies);
	await clearCookies(reply);
	if (revRes.status == 200) {
		if (type == "guest")
			await db.guest.delete(name);
		else if (type == 'registered')
			await db.registered.updateCol('status', name, 'logged_out');
		
		return reply.code(201).send({ message: "Successfully logged out."});
	} else
		return revRes;
}

// Route DELETE /delete
export async function deleteUser(request, reply) {
	const { db } = request.server;
	const { name, type } = request.user;

	const { password} = request.body;

	const exists = await db.registered.getByName(name);
	if (!exists)
		return reply.code(400).send({ error: 'User is not in the database' });

	const passwordMatch = await bcrypt.compare(password, exists.hashedPassword);
	if (!passwordMatch)
		return reply.code(444).send({ error: 'Bad password' });
	
	const revRes = await revokeJWT(request.cookies);
	if (revRes.status == 200) {
		if (type == "guest")
			await db.guest.delete(name);
		else if (type == 'registered')
			await db.registered.delete(name);

		await clearCookies(reply);

		return reply.code(200).send({
			message: "User successfully deleted."
		});
	}
	else{
		return revRes;
	}
}

// Route DELETE /deleteGuest pour tournament
export async function deleteGuest(request, reply) {
	const { db } = request.server;
	const { id} = request.body;

	const exists = await db.guest.getById(id);
	if (!exists)
		return reply.code(400).send({ error: 'User is not in the database' });

	//console.log("joueru a supprimer : ",exists);
	await db.guest.delete(exists.name);

	return reply.code(200).send({
		message: "User successfully deleted."
	});
}

// Route PUT /update
export async function updateInfo(request, reply) {
	const { db } = request.server;
	const { name } = request.user;
	const currentUser = await db.registered.getByName(name);
	if (!currentUser)
		return reply.code(401).send( { error : 'User not Authentified'});
		
	const { password, toUpdate, newValue } = request.body;
	if (!password || !toUpdate || !newValue)
		return reply.code(401).send( { error : 'Need all infos in body'});

	if (!['email', 'password'].includes(toUpdate))
		return reply.code(400).send({ error: "Only email and password can be updated" });
	
	const passwordMatch = await bcrypt.compare(password, currentUser.hashedPassword);
	if (!passwordMatch) 
		return reply.code(444).send({ error: "Bad password" });


	let columnToUpdate;
	let valueToUpdate;

	if (toUpdate === 'password') {
		columnToUpdate = 'hashedPassword';
		const salt = await bcrypt.genSalt();
		valueToUpdate = await bcrypt.hash(newValue, salt);
		if (!await checkPasswordFormat(newValue))
			return reply.code(401).send({ error: "Incorrect password format" });
	} else if (toUpdate === 'email'){
		if (!await checkEmailFormat(newValue))
			return reply.code(400).send({ error: "Invalid email format"});
		columnToUpdate = toUpdate;
		valueToUpdate = newValue;
	}

	const updatedUser = await db.registered.updateCol(columnToUpdate, name, valueToUpdate);
	if (updatedUser)
		delete updatedUser.hashedPassword;

	return reply.code(200).send({
		user: updatedUser,
		message: 'User info updated'
	});
}

// Route PUT /updateAvatar
export async function updateAvatar(request, reply) {
	const { db } = request.server;
	const { name } = request.user;

	let user;
	if (request.user.type == 'guest')
		user = await db.guest.getByName(name);
	else if (request.user.type == 'registered')
		user = await db.registered.getByName(name);

	if (!user)
		return reply.code(400).send({ error: 'Unauthorized' });

	const data = await request.file();
	if (!data)
		return reply.code(400).send({ error: 'No file uploaded' });

	const uploadDir = path.join(process.cwd(), 'pictures');
	if (!fs.existsSync(uploadDir))
		fs.mkdirSync(uploadDir, { recursive: true });

	if (user.picture && fs.existsSync(user.picture) && user.picture !== './pictures/BG.webp')
		fs.unlinkSync(user.picture);

	const ext = path.extname(data.filename);

	const fileName = `avatar_${user.id}_${Date.now()}${ext}`;
	const filePath = path.join(uploadDir, fileName);

	const buffer = await data.toBuffer();
	fs.writeFileSync(filePath, buffer);

	const relativePath = `pictures/${fileName}`;
	await db[request.user.type].updateCol('picture', name, relativePath);

	
	return reply.code(200).send({
		message: 'Avatar updated successfully',
		picture: relativePath
	});
}

// Route GET /id
export	async function getUserByIdToken(request, reply){
	const { db } = request.server;
	const { id, type } = request.user;

	let userInfos;
	if (type == 'guest')
		userInfos = await db.guest.getById(id);
	else if (type == 'registered')
		userInfos = await db.registered.getById(id);
		
	if (!userInfos)
		return reply.code(404).send({ error : 'User not found'});
	delete userInfos.hashedPassword;

	return reply.code(200).send({
		user: userInfos
	});
};

// Route GET /:id
export	async function getUserById(request, reply){
	const { db } = request.server;
	const user = request.params;
	const { type } = request.body;
	if (!user)
		return reply.code(400).send({ error : 'Need param'});

	const userId = request.params.id;
	if (!userId)
		return reply.code(400).send({ error : 'Id of user required'});
	let userInfos;
	//console.log('type', type);
	if (type === 'ia') {
		userInfos = {
			id: 0,
			type: 'ia',
			name: 'normalAI'
		};
	} else{
		userInfos = await db[type].getById(userId);
		//console.log('userInfos', userInfos);
	}
	if (!userInfos)
		return reply.code(404).send({ error : 'User not found'});

	delete userInfos.hashedPassword;

	return reply.code(200).send({
		user: userInfos
	});
};

// Route POST /addfriend/(name)
export async function addFriend(request, reply) {
	const { db } = request.server;
	const currentUser = request.user;
	if(request.params.friendName.length > 64)
		return reply.code(401).send({ error: 'Invalid name' });

	if (currentUser.type !== 'registered')
		return reply.code(400).send({ error: 'Only registered users can add friends' });
	
	const user = await db.registered.getByName(currentUser.name);
	if (!user) 
		return reply.code(400).send({ error: 'User not found' });

	const { friendName } = request.params;
	if (friendName === undefined)
		return reply.code(400).send({ error: 'friendName is missing' });
	//console.log("friendName", friendName);

	const friend = await db.registered.getByName(friendName);
	if (!friend)
		return reply.code(400).send({ error: 'Username not found' });

	
	let friendListString = user.friends || "";
	const friendList = friendListString ? friendListString.split(";").filter(f => f) : [];

	if (friendList.includes(String(friend.id)))
		return reply.code(409).send({ error: 'Friend already in the list' });

	const val = friendListString + friend.id + ";";

	const updatedUser = await db.registered.updateCol('friends', user.name, val);

	delete friend.hashedPassword;
	delete friend.friends;

	return reply.code(200).send({user: updatedUser, newFriend : friend,  message: `Friend ${friendName} added.` });
}

// Route GET /getfriendsprofiles
export async function getFriendsProfiles(request, reply) {
	const { db } = request.server;
	const user = await db.registered.getById(request.user.id);

	const { friends } = user;
	if (friends === undefined || friends === null)
		return reply.code(204).send({ friends: [], message: "User has no friends" });

	const friendsIDs = await friends.split(';').filter(p => p);

	let friendsProfiles = [];

	for (let id of friendsIDs) {
		const profile = await db.registered.getById(id);
		if (!profile)
			continue;

		delete profile.hashedPassword;
		delete profile.email;

		friendsProfiles.push(profile);
	}
	return reply.code(200).send({
		friends: friendsProfiles,
		message: 'Friends profiles.'
	});
}

export async function deleteFriend(request, reply) {
	const { db } = request.server;
	const friendId = request.body.id;
	if (!friendId)
		return reply.code(400).send({ error: 'Need friend id to delete' });

	const friend = await db.registered.getById(friendId);
	if (!friend)
		return reply.code(404).send({ error: 'Friend user not found' });

	const user = await db.registered.getById(request.user.id);
	if (!user)
		return reply.code(401).send({ error: 'User not authenticated' });

	const { friends } = user;
	if (!friends)
		return reply.code(204).send({ friends: [], message: "User has no friends" });

	const friendList = friends.split(";").filter(f => f);

	if (!friendList.includes(String(friend.id)))
		return reply.code(409).send({ error: 'Friend not in the list' });

	const newFriendList = friendList.filter(id => id !== String(friend.id));

	await db.registered.updateCol('friends', user.name, newFriendList.join(";"));

	return reply.code(200).send({
		friends: newFriendList,
		message: `Friend ${friend.name || friend.id} deleted successfully.`,
	});
}

// Route GET /find/:name/status
export async function getUserStatus(request, reply) {
	const { db } = request.server;
	const { name } = request.params;
	const user = await db.registered.getByName(name);

	if (!user)
		return reply.code(404).send({ error: 'User not found' });

	return reply.send(user.status);
}

// Route PUT /changestatus
export async function changeStatus(request, reply) {
	const { db } = request.server;
	const { name, status, type } = request.body;
	if (name === undefined)
		return reply.code(400).send({ error: 'Name is required' });
	if (status === undefined)
		return reply.code(400).send({ error: 'Status is required' });
	
	let user;
	if (type == 'guest')
		user = await db.guest.updateCol('status', name, status);
	else if (type == 'registered')
		user = await db.registered.updateCol('status', name, status);

	delete user.hashedPassword;
	delete user.telephone;
	delete user.email;
	return reply.code(201).send({
		user: user,
		message : 'Status updated!',
	});
}

// Route PUT /updatewallet - Pour mettre à jour le wallet depuis les services de jeu
export async function updateWallet(request, reply) {
	const { db } = request.server;
	const { name, wallet, type } = request.body;
	if (name === undefined)
		return reply.code(400).send({ error: 'Name is required' });
	if (wallet === undefined)
		return reply.code(400).send({ error: 'Wallet is required' });
	if (type === undefined)
		return reply.code(400).send({ error: 'Type is required' });

	let user;
	if (type == 'guest')
		user = await db.guest.updateCol('wallet', name, wallet);
	else if (type == 'registered')
		user = await db.registered.updateCol('wallet', name, wallet);

	if (!user)
		return reply.code(404).send({ error: 'User not found' });

	delete user.hashedPassword;
	delete user.telephone;
	delete user.email;
	return reply.code(200).send({
		user: user,
		message : 'Wallet updated!',
	});
}

export async function updateStats(request, reply) {
	const { db } = request.server;
	const { p1_id, p1_type, p2_id, p2_type, winner_id } = request.body;

	let winner_type, loser_id, loser_type;
	if (winner_id === p1_id) {
		winner_type = p1_type;
		loser_id = p2_id;
		loser_type = p2_type;
	} else {
		winner_type = p2_type;
		loser_id = p1_id;
		loser_type = p1_type;
	}

	if (winner_id > 0) {
		if (winner_type == 'guest')
			await db.guest.updateStatsW(winner_id);
		else if (winner_type == 'registered')
			await db.registered.updateStatsW(winner_id);
	}

	if (loser_id > 0) {
	   if (loser_type == 'guest')
			await db.guest.updateStatsL(loser_id);
		else if (loser_type == 'registered')
			await db.registered.updateStatsL(loser_id);
	}

	let user1, user2;
	if (p1_type == 'guest')
		user1 = await db.guest.getById(p1_id);
	else if (p1_type == 'registered')
		user1 = await db.registered.getById(p1_id);
	else {
		user1 = {
			id: 0,
			type: 'ia'
		};
	}

	if (p2_type == 'guest')
		user2 = await db.guest.getById(p2_id);
	else if (p2_type == 'registered')
		user2 = await db.registered.getById(p2_id);
	else {
		user2 = {
			id: 0,
			type: 'ia'
		};
	}

	delete user1.hashedPassword;
	delete user2.hashedPassword;
	delete user1.email;
	delete user2.email;
	delete user1.telephone;
	delete user2.telephone;

	return reply.code(200).send({
		user1: user1,
		user2: user2,
		message: 'Stats updated.'
	});
}

// Route GET / tournament
export async function getUsersTournament(request, reply) {
	const { db } = request.server;
	const listUsers = request.body.ArrayIdAndType;
	if (!listUsers || listUsers.length === 0)
		return reply.code(400).send({ error: 'List of users is required' });
	
	let listLogin = new Array();
	let listGuests = new Array();
	for (let i = 0; i < listUsers.length; i++){
		if (listUsers[i].type === 'registered')
			listLogin.push(listUsers[i].id);
		else if (listUsers[i].type === 'guest')
			listGuests.push(listUsers[i].id);
		else
			return reply.code(400).send({ error: 'Type of user is not correct' });
	};
	const usersInfos = await db.tournament.getUsers(listLogin, listGuests);
	if (!usersInfos || usersInfos.length === 0)
		return reply.code(404).send({ error: 'Users not found' });

	usersInfos.registered.forEach(u => {
		delete u.hashedPassword;
		delete u.email;
		delete u.friend_ship;
	});
	usersInfos.guests.forEach(u => {
		delete u.hashedPassword;
		delete u.email;
		delete u.friend_ship;
	});


	return reply.code(200).send({
		users: usersInfos,
		message: 'Users found'
	});
}
