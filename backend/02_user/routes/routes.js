import { createGuest, register, logIn, logOut, deleteUser, getUserStatus,
	updateAvatar, updateInfo, addFriend, changeStatus, updateStats,
	getUserByIdToken, getUserById, getFriendsProfiles,
	getUsersTournament , deleteFriend, updateWallet, deleteGuest}
	from '../controllers/controllers.js';
import { registerInput, loginInput, updateSchema, guestTmp , deleteSchema, deleteFriendSchema} from '../schema/userInput.js';
import { userSchema, updateStatsSchema } from '../schema/userSchema.js';
import { authenticateJWT } from '../authentication/auth.js';

async function userRoutes(fastify, options) {
	fastify.get('/', (request, reply) => {
		reply.send({ message: 'Hello from user' });
	});

	fastify.post('/guest', { schema: guestTmp }, createGuest);
	fastify.post('/register', { schema: registerInput }, register);
	fastify.put('/login', { schema: loginInput }, logIn);

	fastify.put('/update',{ preHandler: authenticateJWT , schema: updateSchema },  updateInfo);
	fastify.put('/updateAvatar',{ preHandler: authenticateJWT },  updateAvatar);

	fastify.get('/id', { preHandler: authenticateJWT }, getUserByIdToken);
	fastify.post('/:id', getUserById);

	fastify.put('/logout', {preHandler: authenticateJWT }, logOut);
	fastify.delete('/delete',{preHandler: authenticateJWT , schema: deleteSchema },  deleteUser);
	fastify.delete('/deleteGuest',  deleteGuest);

	fastify.post('/addfriend/:friendName', {preHandler: authenticateJWT},  addFriend);
	fastify.delete('/deleteFriend',{preHandler: authenticateJWT , schema: deleteFriendSchema },  deleteFriend);
	fastify.get('/getfriendsprofiles', { preHandler: authenticateJWT }, getFriendsProfiles);

	// utilisee ?
	fastify.get('/find/:name/status', getUserStatus);

	fastify.post('/tournament', getUsersTournament);

	fastify.put('/changestatus',{schema: userSchema }, changeStatus);
	fastify.put('/updatestats', { schema: updateStatsSchema }, updateStats);
	fastify.put('/updatewallet', updateWallet);
}

export default userRoutes;

