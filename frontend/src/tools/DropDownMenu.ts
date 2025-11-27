import { getFriendsList, addNewFriend } from "./APIStorageManager";
import { Logout } from "./APIStorageManager";
import { getUser } from './APIStorageManager';
import { navigate } from '../router';
import { popUpAlert } from "./popup";

export default function DropDownMenu() {
	const wrapper = document.createElement('div');
	let UserCurrent = getUser();
	if (!UserCurrent){
		if (UserCurrent.status === 'pending')
			return wrapper;
		navigate('/');
		return wrapper;
	}
	wrapper.className = 'absolute top-5 right-0';

	// BUTTON PRINCIPAL
	const dropDownButton = document.createElement('button');
	dropDownButton.className = 'inline-flex justify-center w-40 gap-x-1.5 rounded-l-2xl bg-[#00FF668f] px-3 py-2 text-2xl font-semibold text-white inset-ring-1 inset-ring-white/5 hover:bg-[#00FF66bf] hover:drop-shadow-[0_0_10px_#646cff]';
	dropDownButton.textContent = 'Player';
	wrapper.appendChild(dropDownButton);

	// MENU DROPDOWN
	const dropdownMenu = document.createElement('div');
	dropdownMenu.className = 'hidden absolute right-0 mt-0.3 w-40 origin-top-right divide-y divide-white/10 rounded-l-xl bg-[#646cff8f] outline-1 -outline-offset-1 outline-white/10 transition transition-discrete';
	wrapper.appendChild(dropdownMenu);

	const menuClassName = 'block px-4 py-2 text-xl text-gray-300 hover:bg-white/5 hover:text-white hover:drop-shadow-[0_0_10px_#535bf2]';

	// SECTION PROFIL ET AMIS
	const menuSection1 = document.createElement('div');
	menuSection1.className = 'py-1';

	const profileLink = document.createElement('a');
	profileLink.href = '/profil';
	profileLink.className = menuClassName;
	profileLink.textContent = 'Profil';
	menuSection1.appendChild(profileLink);

	const friendButton = document.createElement('a');
	friendButton.className = menuClassName;
	friendButton.textContent = 'Friends';
	
	const dropDownFriendList = document.createElement('div');
	const friendsList: { name: string; status: string; picture?: string }[] = [];
	const friendsListContainer = document.createElement('div');
	if (getUser().type !== 'guest'){
		menuSection1.appendChild(friendButton);
		dropDownFriendList.className = 'hidden absolute top-0 right-40 mt-0.3 w-[220px] max-h-60 overflow-y-auto divide-y divide-white/10 rounded-xl bg-[#646cff8f] outline-1 -outline-offset-1 outline-white/10 transition transition-discrete';
		friendButton.appendChild(dropDownFriendList);

		friendsListContainer.className = 'py-1 flex flex-col';
		dropDownFriendList.appendChild(friendsListContainer);

		// FONCTION CRÉATION D'UN AMI
		function createFriendItem(friend: { name: string; status: string; picture?: string ; id: number}) {
			if (!friend)
				return;

			const friendItem = document.createElement('div');
			friendItem.className = 'flex items-center justify-between px-2 py-1';
			friendItem.style.cursor = 'pointer';
			
			// Photo
			const friendPic = document.createElement('img');
			friendPic.src = friend.picture ? `/user/${friend.picture}` : '/user/pictures/avatar_1.jpg';	 
			friendPic.className = 'w-8 h-8 rounded-full object-cover';
			friendItem.appendChild(friendPic);

			// Nom
			const friendName = document.createElement('span');
			friendName.className = 'text-lg text-gray-200';
			friendName.textContent = friend.name;
			friendItem.appendChild(friendName);

			// Statut
			const statusDot = document.createElement('span');
			statusDot.className = friend.status === 'available' ? 'text-green-500' : 'text-red-500';
			statusDot.textContent = '●';
			friendItem.appendChild(statusDot);
			friendItem.onclick = () => {
				navigate(`/profil/${friend.id}`);
			};
			friendsListContainer.appendChild(friendItem);
		}

		// Récupération depuis le backend
		getFriendsList()
			.then((value) => {
				if (!value || !Array.isArray(value.friends)) {
					// //console.log("Pas d'amis trouvés ou utilisateur non authentifié");
					return;
				}

				//console.log("getFriendsList -> ", value);

				value.friends.forEach((friend) => {
					friendsList.push(friend);
					createFriendItem(friend);
				});
			})
			.catch((err) => {
				console.error("Erreur lors de la récupération des amis :", err);
			});

		// Ajouter un ami
		const addFriendInput = document.createElement('input');
		addFriendInput.type = 'text';
		addFriendInput.placeholder = 'Add a friend...';
		addFriendInput.className = 'block px-2 py-1 w-[150px] text-xl text-gray-300 bg-transparent rounded-lg';

		const addFriendButton = document.createElement('button');
		addFriendButton.className = menuClassName + ' w-[50px] text-center';
		addFriendButton.textContent = '+';

		const addFriendContainer = document.createElement('div');
		addFriendContainer.className = 'flex justify-start gap-1 px-2 py-1';
		addFriendContainer.appendChild(addFriendInput);
		addFriendContainer.appendChild(addFriendButton);
		dropDownFriendList.prepend(addFriendContainer);

		async function addFriend() {
			const friendName = addFriendInput.value.trim();
			if (!friendName) return;

			if (friendName.length > 64) {
				popUpAlert("Error", "invalid name" );
				return;
			}

			addNewFriend(friendName)
				.then((response) => {
					if (!response) {
						popUpAlert("Error", "no response from server" );
						return null;
					}
					return response.json()
						.catch(() => ({}))
						.then((data) => ({ response, data }));
				})
				.then((result) => {
					if (!result)
						return;

					const { response, data } = result;

					if (!response.ok) {
						const errorMessage = data.error || `Erreur inconnue (${response.status})`;
						popUpAlert("Error", errorMessage );
						console.warn("Erreur backend:", errorMessage);
						addFriendInput.value = '';
						return;
					}

					popUpAlert("Confirm", data.message || `Friend ${friendName} added!`);

					const newFriend = { name: friendName, status: data.status, picture: data.picture, id: data.id };
					friendsList.push(newFriend);
					createFriendItem(newFriend);

					addFriendInput.value = '';
					navigate('/select-game');
					return;
				})
				.catch((err) => {
					popUpAlert("Error", "Error server" );
					console.error("Erreur front: ", err);
				}
			);
		}

		addFriendInput.onkeydown = (e) => { if (e.key === 'Enter') addFriend(); };
		addFriendButton.onclick = addFriend;

		// SHOW/HIDE MENU
		const showFriendList = () => dropDownFriendList.classList.remove('hidden');
		const hideFriendList = () => dropDownFriendList.classList.add('hidden');

		friendButton.onmouseenter = showFriendList;
		dropDownFriendList.onmouseenter = showFriendList;
		friendButton.onmouseleave = hideFriendList;
		dropDownFriendList.onmouseleave = hideFriendList;
	}
	dropdownMenu.appendChild(menuSection1);

	// LOGOUT
	const menuSection2 = document.createElement('div');
	menuSection2.className = 'py-1';
	const logoutLink = document.createElement('a');
	logoutLink.href = '#';
	logoutLink.className = menuClassName + ' hover:drop-shadow-[0_0_30px_#00FF00]';
	logoutLink.textContent = 'Logout';

	logoutLink.onclick = (e) => {
		e.preventDefault();

		Logout()
			.then((response) => {
				if (response?.ok) {
					// Supprimer les infos d'utilisateur
					localStorage.removeItem("token");
					localStorage.removeItem("user");

					// Vider liste amis et cacher menu
					if (UserCurrent.type !== 'guest'){
						friendsList.length = 0;
						friendsListContainer.innerHTML = '';
						dropDownFriendList.classList.add('hidden');
					}
					//console.log("go to logout");
					navigate("/");
				} else{
					//console.log("reponse", response);
					popUpAlert("Error", "Error during disconnection" );
				}

			})
			.catch((err) => {
				console.error("Erreur de connexion au serveur :", err);
				popUpAlert("Error", "no response from server" );
			});
	};

	menuSection2.appendChild(logoutLink);
	dropdownMenu.appendChild(menuSection2);

	dropDownButton.onmouseenter = () => dropdownMenu.classList.remove('hidden');
	dropDownButton.onclick = () => dropdownMenu.classList.toggle('hidden');
	dropdownMenu.onmouseleave = () => dropdownMenu.classList.add('hidden');

	document.addEventListener('click', (event) => {
		if (!wrapper.contains(event.target as Node)) {
			dropdownMenu.classList.add('hidden');
			if (UserCurrent.type !== 'guest')
				dropDownFriendList.classList.add('hidden');
		}
	});

 return wrapper;
}
