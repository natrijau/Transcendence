import { defineRoutes, renderRoute, navigate} from './router';
import './style.css';
import Home from './pages/Home';
// import SelectGame from './pages/SelectGame';
import Pong from './pages/Pong';
import Blackjack from './pages/Blackjack';
import Tournament from './pages/Tournament';
import Profil from './pages/Profil';
import FriendProfil from './pages/FriendProfil';

defineRoutes([
	{ path: '/', render: () => Home() },
	{ path: '/register', render: () => Home("register") },
	{ path: '/login', render: () => Home("login") },
	{ path: '/2fa-verification', render: () => Home("2fa-verification") },
	{ path: '/select-game', render: () => Home("select-game") },
	{ path: '/pong', render: () => Pong() },
	{ path: '/blackjack', render: () => Blackjack() },
	{ path: '/tournament', render: () => Tournament() },
	{ path: '/profil', render: () => Profil() },
	{ path: '/profil/:id', render: (params) => FriendProfil(params?.id!) },
	//{ path: '/logout', render: () => Profil() },
]);

document.addEventListener('DOMContentLoaded', () => {
	renderRoute();
	// Interception des clics sur les liens
	document.body.addEventListener('click', (e) => {
		const target = e.target as HTMLElement;
		if (target.tagName === 'A') {
		const anchor = target as HTMLAnchorElement;
		if (anchor.hostname === location.hostname && anchor.pathname) {
			e.preventDefault();
			history.pushState({}, '', anchor.pathname);
			renderRoute();
		}
		}
	});
});