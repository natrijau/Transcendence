import {navigate} from '../router';
import {getUser} from './APIStorageManager';
import DropDownMenu from '../tools/DropDownMenu';

export default function GameSelection(): HTMLElement {
	const wrapper = document.createElement('div');
	if ( !getUser()){
		navigate('/');
		return wrapper;
	}

		wrapper.appendChild(DropDownMenu());
		wrapper.className = 'flex flex-col justify-center items-center w-[60%] h-[60%] gap-8 p-16';

		const createGameButton = (label: string, route: string): HTMLElement => {
			const button = document.createElement('button');
			button.className = 'flex items-center justify-center w-[80%] h-[100%] bg-[#646cff50] rounded-xl backdrop-blur-2xl \
			hover:w-[100%] hover:bg-[#535bf2] hover:drop-shadow-[0_0_10px_#535bf2] transition-all duration-1000';

			const p = document.createElement('p');
			p.textContent = label;
			p.className = 'text-white text-5xl font-bold';
			button.appendChild(p);

			button.onclick = () => navigate(route);
			return button;
		};

		wrapper.appendChild(createGameButton('Pong', '/pong'));
		wrapper.appendChild(createGameButton('Blackjack', '/blackjack'));
	// });
  	return wrapper;
}