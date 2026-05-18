import { observeAuthState } from './firebase-config.js';

function redirectToLogin() {
    const loginPath = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
    window.location.href = loginPath;
}

function renderProfile(user) {
    const nameField = document.getElementById('profile-name');
    const emailField = document.getElementById('profile-email');
    const avatar = document.getElementById('profile-avatar');

    if (!nameField || !emailField || !avatar) return;

    nameField.textContent = user.displayName || 'Usuário';
    emailField.textContent = user.email || 'Sem e-mail';
    avatar.src = '../usuario.png';
}

window.addEventListener('DOMContentLoaded', () => {
    observeAuthState((user) => {
        if (user) {
            renderProfile(user);
        } else {
            redirectToLogin();
        }
    });
});
