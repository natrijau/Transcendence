import { navigate } from '../router';
import { asGuest } from "./APIStorageManager";

export default function ContinueAs() {
    const wrapper = document.createElement('div');
    wrapper.className =
        'flex flex-col justify-center items-center gap-4 p-8 sm:p-16 bg-[#0000000e] rounded-xl backdrop-blur-2xl w-full max-w-md mx-auto';

    const continueTitle = document.createElement('h2');
    continueTitle.textContent = 'Continue as...';
    continueTitle.className = 'text-2xl sm:text-4xl font-bold text-white text-center';
    wrapper.appendChild(continueTitle);

    wrapper.appendChild(document.createElement('hr'));

    const guestButton = document.createElement('button');
    guestButton.textContent = 'Guest';
    guestButton.className =
        'bg-[#646cff] text-white font-bold rounded-full h-12 sm:h-[60px] w-full sm:w-[200px] text-lg sm:text-2xl hover:bg-[#535bf2] hover:drop-shadow-[0_0_10px_#535bf2] transition-all';
    guestButton.onclick = () => {
        //console.log('Continue as Guest');
		asGuest(false)
			.then( res => {
				navigate('/select-game');
			})
			.catch( (err) => {
				//console.log('Guest connection:', err);
			})
    };
    wrapper.appendChild(guestButton);

    wrapper.appendChild(document.createElement('hr'));

    const orTitle = document.createElement('h2');
    orTitle.textContent = 'Or';
    orTitle.className = 'text-xl sm:text-3xl font-bold text-white text-center';
    wrapper.appendChild(orTitle);

    wrapper.appendChild(document.createElement('hr'));

    const loginButton = document.createElement('button');
    loginButton.textContent = 'Login';
    loginButton.className =
        'bg-[#646cff] text-white font-bold rounded-full h-12 sm:h-[60px] w-full sm:w-[200px] text-lg sm:text-2xl hover:bg-[#535bf2] hover:drop-shadow-[0_0_10px_#535bf2] transition-all';
    loginButton.onclick = () => {
        //console.log('Go to Login');
        navigate('/login');
    };
    wrapper.appendChild(loginButton);

    const registerButton = document.createElement('button');
    registerButton.textContent = 'Register';
    registerButton.className =
        'bg-[#646cff] text-white font-bold rounded-full h-12 sm:h-[60px] w-full sm:w-[200px] text-lg sm:text-2xl hover:bg-[#535bf2] hover:drop-shadow-[0_0_10px_#535bf2] transition-all mt-2';
    registerButton.onclick = () => {
        //console.log('Go to Register');
        navigate('/register');
    };
    wrapper.appendChild(registerButton);

    return wrapper;
}