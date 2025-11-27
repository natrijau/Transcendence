// alertMessage : Confirm = message de confirmation, Error = message d'erreur
// message : Le message voulu passer en param

export function popUpAlert(alertMessage: string, message: string) {
	const overlay = document.createElement('div');
	overlay.className = `
		fixed inset-0 bg-black/70 backdrop-blur-sm
		flex justify-center items-center z-[60]
	`;

	const popup = document.createElement('div');
	popup.className = `
		bg-gray-900 p-8 rounded-2xl text-center shadow-2xl border`;

	const title = document.createElement('h2');
	title.textContent = alertMessage;
	title.className = 'text-2xl font-bold mb-4';
	popup.appendChild(title);

	const msg = document.createElement('p');
	msg.textContent = message;
	msg.className = 'text-sm text-gray-300 mb-6';
	popup.appendChild(msg);

	const btnWrapper = document.createElement('div');
	btnWrapper.className = 'flex justify-center gap-6';

	const yesBtn = document.createElement('button');
	yesBtn.textContent = 'Ok';
	yesBtn.className = `
		text-white font-semibold py-2 px-6 rounded-lg
	`;
	if (alertMessage == 'Confirm'){
		yesBtn.classList.add('bg-green-600');
		popup.classList.add('border-green-600');
		title.classList.add('text-green-500');
	} else if (alertMessage === 'Error') {
		yesBtn.classList.add('bg-red-600');
		popup.classList.add('border-red-700');
		title.classList.add('text-red-500');
	}
	yesBtn.onclick = () => {
		overlay.remove();
	};

	btnWrapper.appendChild(yesBtn);
	popup.appendChild(btnWrapper);  
	overlay.appendChild(popup);
	document.body.appendChild(overlay);
}