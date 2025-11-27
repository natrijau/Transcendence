export function createChangeEmail(onConfirm: (password: string, newEmailConfirm: string) => void
): HTMLElement {
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
  title.textContent = 'Change your email';
  title.className = 'text-2xl font-bold mb-4 text-red-400';
  popup.appendChild(title);

  const warning = document.createElement('p');
  warning.textContent = 'Please confirm your actual  and your new password to change the password';
  warning.className = 'text-sm text-gray-300 mb-6';
  popup.appendChild(warning);

  // === Input helper ===
  const createInput = (type: string, placeholder: string ): HTMLInputElement => {
    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.className = `
      w-full p-2 mb-4 rounded-md text-black
      focus:outline-none focus:ring-2 focus:ring-[#535bf2]
    `;
    return input;
  };

  // === Inputs ===
  const passInput = createInput('password', 'Enter your password');
  const newEmailInput = createInput('newEmail', 'Enter your new email');
  const confirmEmailInput = createInput('newEmailConfirm', 'Confirm the new email');
  popup.appendChild(passInput) 
  popup.appendChild(newEmailInput);
  popup.appendChild(confirmEmailInput);

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
  confirmBtn.onclick = () => {
    const password = passInput.value;
    const newEmail: string = newEmailInput.value.trim();
    const newEmailConfirm: string = confirmEmailInput.value;

    if (!newEmail || !newEmailConfirm || !confirm) {
      errorMsg.textContent = 'All fields are required.';
      return;
    }
    if (newEmail !== newEmailConfirm){
        errorMsg.textContent = 'Email do not match.'
		return;
    }
    // Appelle le callback depuis Profile.ts
    onConfirm(password, newEmail);
    overlay.remove();
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = `
    bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg
    transition-all duration-200
  `;
  cancelBtn.onclick = () => overlay.remove();

  buttonWrapper.appendChild(confirmBtn);
  buttonWrapper.appendChild(cancelBtn);
  popup.appendChild(buttonWrapper);

  overlay.appendChild(popup);
  return overlay;
}
