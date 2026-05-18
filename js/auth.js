import { loginUser, registerUser, observeAuthState } from './firebase-config.js';

function showMessage(element, message, type = 'error') {
    element.textContent = message;
    element.style.color = type === 'error' ? '#bb2525' : '#0f6d2f';
    element.style.marginTop = '1rem';
}

function clearMessage(element) {
    element.textContent = '';
}

function redirectToHome() {
    window.location.href = window.location.pathname.includes('/pages/') ? '../index.html' : './index.html';
}

function getProfilePagePath() {
    return window.location.pathname.includes('/pages/') ? 'perfil.html' : 'pages/perfil.html';
}

function getProfileImagePath() {
    return window.location.pathname.includes('/pages/') ? '../usuario.png' : 'usuario.png';
}

function getLoginPagePath() {
    return window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
}

function showLoggedInHeader() {
    const authMenu = document.getElementById('auth-menu');
    if (!authMenu) return;

    const profileLink = document.createElement('a');
    profileLink.href = getProfilePagePath();
    profileLink.title = 'Meu perfil';
    profileLink.className = 'profile-avatar-link';

    const profileImage = document.createElement('img');
    profileImage.src = getProfileImagePath();
    profileImage.alt = 'Perfil do usuário';
    profileImage.className = 'profile-avatar';

    profileLink.appendChild(profileImage);
    authMenu.innerHTML = '';
    authMenu.appendChild(profileLink);
}

function setupHeaderDefault() {
    const authMenu = document.getElementById('auth-menu');
    if (!authMenu) return;
    authMenu.innerHTML = `<a href="${getLoginPagePath()}" class="btn-login">Entrar</a>`;
}

function renderLoggedInAuthCard(user) {
    const authForm = document.querySelector('.auth-form');
    if (!authForm) return;

    authForm.innerHTML = `
        <div class="auth-logged-in">
            <img src="${getProfileImagePath()}" alt="Perfil" class="profile-avatar-large">
            <div>
                <h3>Olá, ${user.displayName || user.email}</h3>
                <p>Você já está logado. Acesse seu perfil para ver os dados.</p>
            </div>
            <a href="${getProfilePagePath()}" class="btn-submit">Ver perfil</a>
        </div>
    `;
}

function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    const messageElement = document.getElementById('auth-message');

    if (!loginForm || !messageElement) return;

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage(messageElement);

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        try {
            await loginUser(email, password);
            showMessage(messageElement, 'Login realizado com sucesso! Redirecionando...', 'success');
            setTimeout(redirectToHome, 1000);
        } catch (error) {
            const errorCode = error.code || '';
            let errorMessage = 'Não foi possível fazer login. Verifique seus dados.';

            if (errorCode.includes('user-not-found')) {
                errorMessage = 'Usuário não encontrado. Verifique o e-mail.';
            } else if (errorCode.includes('wrong-password')) {
                errorMessage = 'Senha incorreta. Tente novamente.';
            } else if (errorCode.includes('invalid-email')) {
                errorMessage = 'E-mail inválido. Verifique o formato.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            showMessage(messageElement, errorMessage, 'error');
            console.error('Login falhou:', error);
        }
    });
}

function setupRegisterForm() {
    const registerForm = document.getElementById('register-form');
    const messageElement = document.getElementById('auth-message');

    if (!registerForm || !messageElement) return;

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage(messageElement);

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        try {
            await registerUser(name, email, password);
            showMessage(messageElement, 'Cadastro realizado com sucesso! Redirecionando...', 'success');
            setTimeout(redirectToHome, 1000);
        } catch (error) {
            const errorCode = error.code || '';
            let errorMessage = 'Não foi possível cadastrar. Verifique seus dados.';

            if (errorCode.includes('email-already-in-use')) {
                errorMessage = 'Este e-mail já está em uso. Faça login ou use outro e-mail.';
            } else if (errorCode.includes('weak-password')) {
                errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
            } else if (errorCode.includes('invalid-email')) {
                errorMessage = 'E-mail inválido. Verifique o formato.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            showMessage(messageElement, errorMessage, 'error');
            console.error('Registro falhou:', error);
        }
    });
}

function initAuthPage() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        setupLoginForm();
    }
    if (registerForm) {
        setupRegisterForm();
    }
    setupHeaderDefault();

    observeAuthState((user) => {
        if (user) {
            showLoggedInHeader();
            if (loginForm || registerForm) {
                renderLoggedInAuthCard(user);
            }
        } else {
            setupHeaderDefault();
        }
    });
}

window.addEventListener('DOMContentLoaded', initAuthPage);
