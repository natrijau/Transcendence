import { navigate } from "../router";
import {login} from "./APIStorageManager";
import { popUpAlert } from "./popup";


export default function Login(): HTMLElement {

	const form: { [name: string]: string} = {};

	const wrapper = document.createElement('div');
	wrapper.className = 'flex flex-col justify-center items-center gap-8 p-16 w-[30%] h-[50%] bg-[#0000000e] rounded-xl backdrop-blur-2xl';

	const title = document.createElement('h2');
	title.textContent = 'Login';
	title.className = 'text-4xl font-bold text-white';
	title.onclick = () => navigate('/select-game');

	wrapper.appendChild(title);

	const createInput = (placeholder: string, key: string, type?: string): HTMLInputElement => {
		const input = document.createElement('input');
		input.placeholder = placeholder;
		input.type = type ? type : key;
		input.className = 'text-black p-2 rounded-md w-[70%] h-[12%] w-max-[200px] text-xl';
		input.oninput = (e: Event) => {
			const target = e.target as HTMLInputElement;
			form[key] = target.value;
		}
		return input;
	};

	wrapper.appendChild(createInput('Enter your nickname', 'name', 'text'));
	wrapper.appendChild(createInput('Enter your password', 'password'));

	const buttonsWrapper = document.createElement('div');
	buttonsWrapper.className = 'flex justify-center w-full h-[12%] gap-10';

	const loginButton = document.createElement('button');
	loginButton.textContent = 'Login';
	loginButton.className = 'bg-[#646cff] text-xl text-white rounded-full w-[50%] h-[100%] hover:bg-[#535bf2] hover:drop-shadow-[0_0_10px_#535bf2]';
	loginButton.onclick = () => {
		// //console.log('Login Form:', form);

		if (!form.name || !form.password){
			popUpAlert("Error", "Name and password required");
			return;
		}

		login(form.name, form.password).then( (res) => {
			if (!res.success){
				popUpAlert("Error", "Login failed");
				navigate('/login');
				return;
			}
			else
				navigate('/select-game');
		});
	};
	buttonsWrapper.appendChild(loginButton);

	const registerButton = document.createElement('button');
	registerButton.textContent = 'Or Register';
	registerButton.className = 'bg-[#646cff] text-xl text-white rounded-full w-[50%] h-[100%] hover:bg-[#535bf2] hover:drop-shadow-[0_0_10px_#535bf2]';
	registerButton.onclick = () => {
		// //console.log('Register Form:', form);
		navigate('/register');
	};
	buttonsWrapper.appendChild(registerButton);

	wrapper.appendChild(buttonsWrapper);

	return wrapper;
}