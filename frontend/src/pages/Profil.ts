import { navigate } from '../router';
import { createDeleteAccount } from '../tools/DeleteAccount';
import { createChangePassword } from '../tools/ChangePassword';
import { createChangeEmail } from '../tools/ChangeEmail';
import { updateInfo, getUser, Logout, updateAvatar, getUserById} from '../tools/APIStorageManager';
import { popUpAlert } from '../tools/popup';

export default function Profile(): HTMLElement {

  if (!getUser()) {
		navigate('/');
		return document.createElement('div');
  }
  
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
  title.onclick = () => navigate('/select-game'); // Retour à la home
  container.appendChild(title);

  const profileCard = document.createElement('div');
  profileCard.className = 'relative z-10 flex justify-between items-start bg-gray-400/20 p-8 rounded-3xl shadow-2xl w-[900px] h-[450px]';
  
  const statsSection = document.createElement('div');
  statsSection.className = 'flex flex-col items-center gap-8 w-[70%]';
  
  const statsTitle = document.createElement('h2');
  statsTitle.textContent = 'statistiques of player';
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
  
  // Valeurs dynamiques
  const ratio = createStatCard('Ratio', '1.28');
  const gamesPlayed = createStatCard('Number of game played', '0');
  const wins = createStatCard('Number of victory', '0');
//  const bestStreak = createStatCard('Best win streak', '0');
  const wallet = createStatCard('Wallet', '0');
  const currentStreak = createStatCard('Current win streak', '0');

  // Ajout dans la grille
  [ratio, gamesPlayed, wins, wallet, currentStreak].forEach(c => statsGrid.appendChild(c));
  statsSection.appendChild(statsGrid);

  // Section Profil utilisateur
  const userSection = document.createElement('div');
  userSection.className = 'flex flex-col items-center justify-start bg-gray-500/ rounded-3xl w-[250px] h-[400px] p-6 gap-4 text-white';

  // Avatar
  const avatar = document.createElement('div');
  avatar.className = 'relative flex items-center justify-center bg-black rounded-full w-[120px] h-[120px] overflow-hidden cursor-pointer group transition hover:scale-105 hover:shadow-xl';
  userSection.appendChild(avatar);

	const currentUser = getUser();
	if (!currentUser){
    popUpAlert("Error", "User not found");
		navigate('/');
		localStorage.removeItem('user');
		return container;
	}
  // Image reelle de l’avatar
	const avatarImg = document.createElement('img');
  	avatarImg.src = currentUser.picture ? `/user/${currentUser.picture}` : '/user/pictures/avatar_1.jpg';
	avatarImg.alt = 'Avatar';
	avatarImg.className = 'object-cover w-full h-full bg-red';
	avatar.appendChild(avatarImg);

	// Overlay de changement
	const overlay = document.createElement('div');
	overlay.textContent = 'Change';
	overlay.className = `
	absolute inset-0 bg-black/60 text-white text-sm font-semibold
	flex items-center justify-center opacity-0 group-hover:opacity-100
	transition-opacity duration-200
	`;
	avatar.appendChild(overlay);

	// Input file caché
	const fileInput = document.createElement('input');
	fileInput.type = 'file';
	fileInput.accept = 'image/*';
	fileInput.className = 'hidden';
	userSection.appendChild(fileInput);

	// Au clique sur l'avatar --> ouvre le selecteur de fichier
	avatar.onclick = () => fileInput.click();

	// Quand un fichier est delectionné
	fileInput.onchange = async (e) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file)
			return;

		try {
			const res = await updateAvatar(file);
			//console.log("res", res);
			//avatarImg.src = `/user/${res.picture}`;
      popUpAlert("Confirm", "Avatar updated successfully!");
			navigate('/profil');
		} catch (err) {
			console.error('Erreur upload avatar :', err);
      popUpAlert("Error", "Error uploading avatar");
		}
	};

  // Pseudo et email du player
  const username = document.createElement('h3');
  username.textContent = getUser().name;
  username.className = 'text-xl font-bold drop-shadow-[0_0_10px_rgba(0,0,0,0.9)]';
  const email = document.createElement('button');
  email.textContent = getUser().email;
  email.className = 'text-sm font-bold bg-green-500 rounded-lg w-[200px] hover:bg-green-600 py-2';
  userSection.appendChild(username);
  if (getUser().type !== 'guest'){
    userSection.appendChild(email);
    
    // Modifier l'email de l'utilisateur
    email.onclick = () => {
      const popup = createChangeEmail(async (password, newEmail) => {
        updateInfo(password, 'email', newEmail)
          .then((res) => {
            popUpAlert("Confirm", "Email updated successfully!");
            //console.log('Update response:', res);
            navigate('/profil');
          })
          .catch(err => {
            popUpAlert("Error", "Error changing email");
            console.error(err);
          });
    });
      document.body.appendChild(popup);
    };

    // Modifier mot de passe
    const changePass = document.createElement('button');
    changePass.textContent = 'Change the password';
    changePass.className = 'text-sm font-bold text-white bg-purple-400 py-2 rounded-lg  w-[200px] hover:bg-purple-500';
    userSection.appendChild(changePass);
    changePass.onclick = () => {
      const popup = createChangePassword(async (oldPassword, newPassword) => {
        updateInfo(oldPassword, 'password', newPassword)
          .then((res) => {
            popUpAlert("Confirm", "Password updated successfully!");
            //console.log('Update response:', res);
          })
          .catch(err => {
            popUpAlert("Error", "Error changing password");
            console.error(err);
          });
    });

      document.body.appendChild(popup);
    };
  }
  // Supprimer le compte
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete account';
  deleteBtn.className = `text-xl font-bold text-white bg-red-500 hover:bg-red-700 py-2
  rounded-lg hover:rounded-full-black w-[200px]
  transition-all duration-600 hover:scale-110`;
  userSection.appendChild(deleteBtn);

  deleteBtn.onclick = () => {
   if (getUser().type !== 'guest'){
    const popup = createDeleteAccount(async () => {
      try {
        const response = await fetch('/api/user/delete', {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) throw new Error('Failed to delete account');

          
        //console.log('Account deleted successfully!');
        navigate('/'); // Retour à la home
      } catch (err) {
        console.error(err);
        popUpAlert("Error", "Error deleting account");
      }
    });
    // Affiche la popup par-dessus tout :
    document.body.appendChild(popup);
  }
  else{
    try{
     Logout()
			.then((response) => {
				if (response?.ok) {
					// Supprimer les infos d'utilisateur
					localStorage.removeItem("token");
					localStorage.removeItem("user");
					//console.log("go to logout");
					navigate("/");
				} else
          popUpAlert("Error", "Error during disconnection");
			})
			.catch((err) => {
				console.error("Erreur de connexion au serveur :", err);
        popUpAlert("Error", "Error during disconnection");
			});
    } catch (err) {
        console.error(err);
        popUpAlert("Error", "Error deleting account");
      }
  }
  };currentStreak

  // Ajout des sections principales
  profileCard.appendChild(statsSection);
  profileCard.appendChild(userSection);
  container.appendChild(profileCard);

	let user = getUser();
	getUserById(user.id, user.type).then(res => {
		user = res;

		if (!user) return;
		
		username.textContent = user.name;
		email.textContent = user.email;
		
		//avatar.className = user.picture || './pictures/default.webp';

		// --- Stats ---
		ratio.querySelector('p:nth-child(2)')!.textContent =
		user.win_rate?.toFixed(2) ?? '0.00';
		gamesPlayed.querySelector('p:nth-child(2)')!.textContent =
		user.played_matches ?? '0';
		wins.querySelector('p:nth-child(2)')!.textContent =
		user.match_wins ?? '0';
	//	bestStreak.querySelector('p:nth-child(2)')!.textContent =
//		user.wins_streak ?? '0';
		currentStreak.querySelector('p:nth-child(2)')!.textContent =
		user.wins_streak ?? '0';
		wallet.querySelector('p:nth-child(2)')!.textContent =
		`${user.wallet ?? 0} 🪙`;
	});

	avatarImg.src = user.picture ? `/user/${user.picture}` : '/user/pictures/avatar_1.jpg';

  return container;
}
