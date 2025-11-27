export type Route = {
	path: string;
	//render: () => HTMLElement;
	render: (params?: Record<string, string>) => HTMLElement;
};

const routes: Route[] = [];

export function defineRoutes(r: Route[]) {
	routes.push(...r);
}

export function navigate(path: string) {
	history.pushState({}, '', path);
	renderRoute();
}

export function renderRoute() {
	const path = window.location.pathname;
	const app = document.getElementById('app');
	if (!app) throw new Error("Element with id 'app' not found");

	// Nettoyer les connexions WebSocket avant de changer de page
	if ((window as any).__bjDisconnect) {
		try {
			(window as any).__bjDisconnect();
		} catch (e) {
			console.error('[Router] Error disconnecting Blackjack:', e);
		}
	}

	if ((window as any).__pongDisconnect) {
		try {
			(window as any).__pongDisconnect();
		} catch (e) {
			console.error('[Router] Error disconnecting Pong:', e);
		}
	}

	app.innerHTML = '';

	// Trouve une route exacte OU une route dynamique
	let match = routes.find(r => r.path === path);
	let params: Record<string, string> = {};

	if (!match) {
		// Recherche de routes avec paramètres (ex: /profil/:id)
		for (const route of routes) {
			const routeParts = route.path.split('/');
			const pathParts = path.split('/');

			if (routeParts.length !== pathParts.length)
				continue;

			let ok = true;
			const tmpParams: Record<string, string> = {};

			for (let i = 0; i < routeParts.length; i++) {
				if (routeParts[i].startsWith(':'))
				tmpParams[routeParts[i].slice(1)] = pathParts[i];
				else if (routeParts[i] !== pathParts[i])
				ok = false;
			}

			if (ok) {
				match = route;
				params = tmpParams;
				break;
			}
		}
	}

	if (match) {
		app.appendChild(match.render(params)); // ✅ params optionnel
	} else {
		const notFoundWrapper = document.createElement('div');
		notFoundWrapper.className = 'flex justify-center items-center h-screen text-white text-3xl';
		notFoundWrapper.textContent = '404 Not Found';
		app.appendChild(notFoundWrapper);
	}
}

window.addEventListener('popstate', () => {
	renderRoute();
});

//export function renderRoute() {

//	const path = window.location.pathname;
//	const match = routes.find(r => r.path === path);
//	const app = document.getElementById('app');
//	if (!app) throw new Error("Element with id 'app' not found");
//	app.innerHTML = '';
//	if (match)
//		app.appendChild(match.render());
//	else {
//		const notFoundWrapper = document.createElement('div');
//		notFoundWrapper.className = 'flex justify-center items-center h-screen';
//	}
//}