// src/tools/DeletePopup.ts
import { navigate } from '../router';
import {  deleteUser, getUser} from './APIStorageManager'
export function createDeleteAccount(onConfirm: (email: string, password: string) => void): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = `
    fixed inset-0 bg-black/60 backdrop-blur-sm
    flex justify-center items-center z-50
  `;

  const popup = document.createElement('div');
  popup.className = `
    bg-gray-800/90 p-10 rounded-2xl text-center
    shadow-2xl border border-gray-700 scale-95
    animate-[fadeIn_0.2s_ease-out] w-[400px]
  `;

  const title = document.createElement('h2');
  title.textContent = 'Confirm Account Deletion';
  title.className = 'text-2xl font-bold mb-4 text-red-400';
  popup.appendChild(title);

  const warning = document.createElement('p');
  warning.textContent = 'Please confirm your email and password to permanently delete your account.';
  warning.className = 'text-sm text-gray-300 mb-6';
  popup.appendChild(warning);

  // === Input helper ===
  const createInput = (type: string, placeholder: string, id: string): HTMLInputElement => {
    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.id = id;
    input.className = `
      w-full p-2 mb-4 rounded-md text-black
      focus:outline-none focus:ring-2 focus:ring-[#535bf2]
    `;
    return input;
  };

  // === Inputs ===
  const emailInput = createInput('email', 'Enter your email', 'delete-email');
  const passInput = createInput('password', 'Enter your password', 'delete-password');
  const confirmPassInput = createInput('password', 'Confirm your password', 'delete-confirm');
  popup.appendChild(emailInput);
  popup.appendChild(passInput);
  popup.appendChild(confirmPassInput);

  const errorMsg = document.createElement('p');
  errorMsg.className = 'text-red-400 text-sm mb-4 h-[1.25rem]';
  popup.appendChild(errorMsg);

  // === Buttons ===
  const buttonWrapper = document.createElement('div');
  buttonWrapper.className = 'flex justify-center gap-6';

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = 'Confirm';
  confirmBtn.className = `
    bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg
    transition-all duration-200
  `;

  let currentEmail = '';

    const user = getUser();
    currentEmail = user.email;

  confirmBtn.onclick = () => {
    const email = emailInput.value.trim();
    const password = passInput.value;
    const confirm = confirmPassInput.value;

    if (email !== currentEmail){
      
      errorMsg.textContent = 'Email do not match';
      return;
    }

    if (!email || !password || !confirm) {
      errorMsg.textContent = 'All fields are required.';
      return;
    }
    if (password !== confirm) {
      errorMsg.textContent = 'Passwords do not match.';
      return;
    }

    overlay.remove();
    FinalConfirmation(email, password);
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = `
    bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg
    transition-all duration-200
  `;
  cancelBtn.onclick = () => overlay.remove();

  buttonWrapper.appendChild(confirmBtn);popup
  buttonWrapper.appendChild(cancelBtn);
  popup.appendChild(buttonWrapper);

  overlay.appendChild(popup);
  return overlay;
}

function FinalConfirmation(email: string, password: string) {
  const overlay = document.createElement('div');
  overlay.className = `
    fixed inset-0 bg-black backdrop-blur-sm
    flex justify-center items-center z-50
  `;

  const popup = document.createElement('div');
  popup.className = `
    bg-gray-900 p-8 rounded-2xl text-center shadow-2xl border border-red-700
    animate-[fadeIn_0.2s_ease-out]
  `;

  const title = document.createElement('h2');
  title.textContent = 'Are you sure?';
  title.className = 'text-2xl font-bold mb-4 text-red-500';
  popup.appendChild(title);

  const msg = document.createElement('p');
  msg.textContent = 'This action is irreversible. Your account will be permanently deleted.';
  msg.className = 'text-sm text-gray-300 mb-6';
  popup.appendChild(msg);

  const btnWrapper = document.createElement('div');
  btnWrapper.className = 'flex justify-center gap-6';

  const yesBtn = document.createElement('button');
  yesBtn.textContent = 'Yes, delete it';
  yesBtn.className = `
    bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg
    transition-all duration-200
  `;
  // yesBtn.onclick = async () => {
  yesBtn.onclick = () => {
    overlay.remove();
    deleteUser(password).then( (res) => {
      //console.log("Res of deleteUser");
      if (!res){
        console.error('User delete failed');
        history.back();
        return;
      }
      else
        navigate('/');
    });
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = `
    bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg
    transition-all duration-200
  `;
  cancelBtn.onclick = () => overlay.remove();

  btnWrapper.appendChild(yesBtn);
  btnWrapper.appendChild(cancelBtn);
  popup.appendChild(btnWrapper);

  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}
