import { navigate } from "../router";
import { register } from "./APIStorageManager";
import { popUpAlert } from "./popup";

export default function Register(): HTMLElement {

  const form: { [name: string]: string} = {};

  const wrapper = document.createElement('div');
  wrapper.className = 'flex flex-col justify-center items-center gap-8 p-16 w-[30%] h-[60%] bg-[#0000000e] rounded-xl backdrop-blur-2xl';

  const title = document.createElement('h2');
  title.textContent = 'Register';
  title.className = 'text-4xl font-bold text-white';
  wrapper.appendChild(title);

  const createInput = (placeholder: string, key: string, type?: string): HTMLInputElement => {
    const input = document.createElement('input');
    input.placeholder = placeholder;
    input.type = type ? type : key;
    input.className = 'text-black p-2 rounded-md w-[70%] h-[10%] w-max-[200px] text-xl';
    input.oninput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      form[key] = target.value;
    }
    return input;
  };

  wrapper.appendChild(createInput('Enter your nickname', 'name', 'text'));
  wrapper.appendChild(createInput('Enter your email', 'email'));
  wrapper.appendChild(createInput('Enter your password', 'password'));
  wrapper.appendChild(createInput('Confirm your password', 'confirmPassword', 'password'));

  const buttonsWrapper = document.createElement('div');
  buttonsWrapper.className = 'flex justify-center w-full h-[10%] gap-10';

  const registerButton = document.createElement('button');
  registerButton.textContent = 'Register';
  registerButton.className = 'bg-[#646cff] text-xl text-whaddite rounded-full w-[50%] h-[100%] hover:bg-[#535bf2] hover:drop-shadow-[0_0_10px_#535bf2]';
  registerButton.onclick = () => {
    //console.log('Register Form:', form);

    if (!form.name || !form.email || !form.password || !form.confirmPassword){
      popUpAlert("Error", "All fields are required");
      return;
    }
	const nameRegex = /^[A-Za-z][A-Za-z0-9]*$/;
	if (!nameRegex.test(form.name)) {
    popUpAlert("Error", "Invalid name format. It must begin with a letter and contain only alphanumeric characters.");
		return;
	}
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(form.email) || form.email.length < 8) {
    popUpAlert("Error", "Invalid email format");
		return;
	}
    if (form.password !== form.confirmPassword){
      popUpAlert("Error", "The two passwords are different");
      return;
    }
	if (form.password.length < 8) {
    popUpAlert("Error", "Password must be at least 8 characters long");
		return;
	}
	if (!/[0-9]/.test(form.password)) {
    popUpAlert("Error", "Password must contain a number");
		return;
	}
    register(form.name, form.email, form.password).then( (res) => {
		if (!res.success) {
      popUpAlert("Error", "User creation failed, try again");
		}
		else{
			//console.log('User created successfully : ', res	);
			navigate('/2fa-verification');
		}
    })
  };
  buttonsWrapper.appendChild(registerButton);

  const loginButton = document.createElement('button');
  loginButton.textContent = 'Or Login';
  loginButton.className = 'bg-[#646cff] text-xl text-white rounded-full w-[50%] h-[100%] hover:bg-[#535bf2] hover:drop-shadow-[0_0_10px_#535bf2]';
  loginButton.onclick = () => {
    // //console.log('Login Form:', form);
    navigate('/login');
  };
  buttonsWrapper.appendChild(loginButton);

  wrapper.appendChild(buttonsWrapper);

  return wrapper;
}