// pages/FriendProfil.ts
import { navigate } from '../router';
import { getUserById, removeFriend } from '../tools/APIStorageManager';
import { popUpAlert } from '../tools/popup';


export default function FriendProfil(id: string): HTMLElement {
	const container = document.createElement('div');
	container.className = 'flex items-center justify-center h-screen bg-gray-300 text-black';

	const bg = document.createElement('div');
	bg.className = 'absolute inset-0 bg-[url(/assets/background.png)] bg-cover bg-center blur-sm brightness-75';
	container.appendChild(bg);

	const title = document.createElement('h1');
	title.textContent = 'BLACKPONG';
	title.className = `
	  fixed top-12 left-1/2 -translate-x-1/2
	  text-[5rem] font-extrabold text-green-400
	  drop-shadow-[0_0_25px_#535bf2]
	  hover:drop-shadow-[0_0_40px_#535bf2]
	  hover:scale-105 transition-all duration-300
	  cursor-pointer select-none z-20`;
	title.onclick = () => navigate('/select-game'); // Retour au profil
	container.appendChild(title);

	const profileCard = document.createElement('div');
	profileCard.className = 'relative z-10 flex justify-between items-start bg-gray-400/20 p-8 rounded-3xl shadow-2xl w-[900px] h-[450px]';

	const statsSection = document.createElement('div');
	statsSection.className = 'flex flex-col items-center gap-8 w-[70%]';

	const statsTitle = document.createElement('h2');
	statsTitle.textContent = `Statistiques de l'ami`;
	statsTitle.className = 'text-xl font-bold text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.9)]';
	statsSection.appendChild(statsTitle);

	// Conteneur des stats
	const statsGrid = document.createElement('div');
	statsGrid.className = 'grid grid-cols-2 gap-4 w-full justify-items-center';

	// Helper pour créer une carte de statistique
	const createStatCard = (label: string, value: string): HTMLElement => {
		const card = document.createElement('div');
		card.className = 'flex flex-col items-center justify-center bg-gray-500/20 text-white rounded-3xl w-[250px] h-[70px]';
		const labelEl = document.createElement('p');
		labelEl.textContent = label;
		labelEl.className = 'text-sm';
		const valueEl = document.createElement('p');
		valueEl.textContent = value;
		valueEl.className = 'text-xl font-semibold';
		card.appendChild(labelEl);
		card.appendChild(valueEl);
		return card;
	};

	// Valeurs par défaut (seront remplacées par fetch)
	const ratio = createStatCard('Ratio', '0.00');
	const gamesPlayed = createStatCard('Nombre de parties', '0');
	const wins = createStatCard('Victoires', '0');
//	const bestStreak = createStatCard('Meilleure série', '0');
	const currentStreak = createStatCard('Série actuelle', '0');
	const wallet = createStatCard('Wallet', '0');

	[ratio, gamesPlayed, wins, currentStreak, wallet].forEach(c => statsGrid.appendChild(c));
	statsSection.appendChild(statsGrid);

	// Section Profil utilisateur
	const userSection = document.createElement('div');
	userSection.className = 'flex flex-col items-center justify-start bg-gray-500/ rounded-3xl w-[250px] h-[400px] p-6 gap-4 text-white';

	// Avatar
	const avatar = document.createElement('div');
	avatar.className = 'flex items-center justify-center bg-black rounded-full w-[120px] h-[120px]';
	const icon = document.createElement('span');
	icon.textContent = '👤';
	icon.className = 'text-3xl';
	avatar.appendChild(icon);
	userSection.appendChild(avatar);

	const username = document.createElement('h3');
	username.textContent = 'Pseudo';
	username.className = 'text-xl font-bold drop-shadow-[0_0_10px_rgba(0,0,0,0.9)]';

	userSection.appendChild(username);

	// Bouton pour supprimer l'ami
	const removeFriendBtn = document.createElement('button');
	removeFriendBtn.textContent = 'Supprimer l’ami';
	removeFriendBtn.className = `text-xl font-bold text-white bg-red-500 hover:bg-red-700 py-2
	rounded-lg w-[200px] transition-all duration-300 hover:scale-110`;
	userSection.appendChild(removeFriendBtn);

	removeFriendBtn.onclick = async () => {
		try {
			removeFriend(id).then((response) =>{
				if (!response)
					return;
				//if (!response?.ok) throw new Error('Impossible de supprimer l’ami');
			});
			//const response = await removeFriend(Number(id));
			popUpAlert("Confirm", "Friend deleted successfully");
			
			navigate('/select-game'); // Retour au profil principal
		} catch (err) {
			console.error(err);
			popUpAlert("Error", "Error deleting friend");
		}
	};

	profileCard.appendChild(statsSection);
	profileCard.appendChild(userSection);
	container.appendChild(profileCard);

	// Récupérer les infos de l'ami
	try {
		let data;
		getUserById(Number(id), 'registered').then((response) =>{
			data = response;
			if (!data) {
				popUpAlert("Error", "User not found");
				navigate('/profil');
				return container;
			}
			
			const user = data;
			username.textContent = user.name;
			// jai avatarImg.src = currentUser.picture ? `/user/${currentUser.picture}` : '/user/pictures/avatar_1.jpg';
			// dans profil.ts

			if(user.picture){
				avatar.innerHTML = '';
				const avatarImg = document.createElement('img');
				avatarImg.src = `/user/${user.picture}`;
				avatarImg.alt = 'Avatar';
				avatarImg.className = 'object-cover w-full h-full bg-red';
				avatar.appendChild(avatarImg);
			}
			else{
				avatar.innerHTML = '';
				const avatarImg = document.createElement('img');
				avatarImg.src = '/user/pictures/avatar_1.jpg';
				avatarImg.alt = 'Avatar';
				avatarImg.className = 'object-cover w-full h-full bg-red';
				avatar.appendChild(avatarImg);
			}
			

			ratio.querySelector('p:nth-child(2)')!.textContent = (user.win_rate?.toFixed(2)) ?? '0.00';
			gamesPlayed.querySelector('p:nth-child(2)')!.textContent = user.played_matches ?? '0';
			wins.querySelector('p:nth-child(2)')!.textContent = user.match_wins ?? '0';
		//	bestStreak.querySelector('p:nth-child(2)')!.textContent = user.wins_streak ?? '0';
			currentStreak.querySelector('p:nth-child(2)')!.textContent = user.wins_streak ?? '0';
			wallet.querySelector('p:nth-child(2)')!.textContent = `${user.wallet ?? 0} 🪙`;
		})
	} catch (err) {
		console.error(err);
		popUpAlert("Error", "Error retrieving friend's profile");
	}

	return container;
}
