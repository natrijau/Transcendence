import { navigate } from '../router';
import { getUser} from '../tools/APIStorageManager';
import ContinueAs from '../tools/ContinueAs';
import Login from '../tools/Login';
import Register from '../tools/Register';
import GameSelection from '../tools/GameSelection';
import TwofaVerification from '../tools/2faVerification';

export default function Home(subPage?: string): HTMLElement {
	const container = document.createElement('div');
	if (!subPage && getUser()){
		navigate('/select-game');
		return container;
	}

	container.className = 'flex flex-col justify-center items-center w-screen h-screen min-h-screen bg-[url(/assets/background.png)] bg-cover bg-center bg-no-repeat';
	container.style.backgroundSize = '100% 100%';

	// Titre
	const title = document.createElement('h1');
	title.textContent = 'BlackPong';
	title.className = 'inline-block font-extrabold text-green-400 drop-shadow-[0_0_30px_#535bf2] text-6xl sm:text-8xl md:text-9xl lg:text-[12rem] cursor-pointer';
	if(getUser())
		title.onclick = () => navigate('/select-game'); // Retour à select game dans le cas ou user log
	else
		title.onclick = () => navigate('/'); // Retour à la home
	container.appendChild(title);

	const separator = document.createElement('hr'); // Ligne de séparation
	separator.className = 'w-3/4 border-t border-white/20 my-5';
	container.appendChild(separator);
	
	if (subPage === 'login') {
		container.appendChild(Login());
	} else if (subPage === 'register') {
		container.appendChild(Register());
	} else if (subPage === 'select-game') {
		container.appendChild(GameSelection());
	} else if (subPage === '2fa-verification') {
		container.appendChild(TwofaVerification());
	} else
		container.appendChild(ContinueAs());

  return container;
}