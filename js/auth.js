import { loginUser, registerUser, observeAuthState, auth, listarPets, db, addUserNotification } from './firebase-config.js';
import { getProfileImagePath, getDefaultProfileImagePath } from './avatar.js';
import { collection, query, orderBy, onSnapshot, doc, getDoc, getDocs, updateDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

function getLoginPagePath() {
    return window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
}

function waitForAuthenticatedUser() {
    return new Promise((resolve) => {
        const unsubscribe = observeAuthState((user) => {
            if (user) {
                unsubscribe();
                resolve(user);
            }
        });
    });
}

async function getUserPostsCount(user) {
    if (!user?.uid && !user?.email) return 0;

    try {
        const pets = await listarPets();
        const normalizedEmail = String(user.email || '').trim().toLowerCase();
        return pets.filter((pet) => {
            const isSameUid = Boolean(user?.uid && String(pet.ownerUid || pet.ownerId || pet.userId || pet.uid || '') === String(user.uid));
            const isSameEmail = Boolean(normalizedEmail && String(pet.ownerEmail || '').trim().toLowerCase() === normalizedEmail);
            return isSameUid || isSameEmail;
        }).length;
    } catch (error) {
        console.warn('Erro ao contar posts do usuário:', error);
        return 0;
    }
}

function getNotificationBellSvg() {
    return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6.5V11a7 7 0 1 0-14 0v4.5L3 18v1h18v-1l-2-2.5Z"/>
        </svg>
    `;
}

async function markNotificationsAsViewed(uid, notifications = []) {
    if (!uid || !Array.isArray(notifications) || notifications.length === 0) return;

    const unseen = notifications.filter((notification) => !notification.viewed);
    if (unseen.length === 0) return;

    await Promise.all(
        unseen.map(async (notification) => {
            try {
                await updateDoc(doc(db, 'users', uid, 'notifications', notification.id), {
                    viewed: true,
                    viewedAt: new Date().toISOString()
                });
            } catch (error) {
                console.warn('Não foi possível marcar notificação como lida:', error);
            }
        })
    );
}

async function toggleFollowFromNotification(targetUid) {
    if (!auth.currentUser?.uid || !targetUid || String(targetUid) === String(auth.currentUser.uid)) {
        return;
    }

    const currentUserId = auth.currentUser.uid;
    const currentProfileRef = doc(db, 'users', currentUserId);
    const currentSnapshot = await getDoc(currentProfileRef);
    const currentFollowing = currentSnapshot.exists() && Array.isArray(currentSnapshot.data()?.following)
        ? currentSnapshot.data().following
        : [];
    const normalizedFollowing = Array.from(new Set(currentFollowing.map((item) => String(item).trim()).filter(Boolean)));
    const isNowFollowing = !normalizedFollowing.includes(String(targetUid));
    const nextFollowing = isNowFollowing
        ? [...normalizedFollowing, String(targetUid)]
        : normalizedFollowing.filter((item) => item !== String(targetUid));

    await setDoc(currentProfileRef, {
        following: nextFollowing,
        followingUpdatedAt: new Date().toISOString()
    }, { merge: true });

    const targetProfileRef = doc(db, 'users', targetUid);
    const targetSnapshot = await getDoc(targetProfileRef);
    const currentFollowers = targetSnapshot.exists() && Array.isArray(targetSnapshot.data()?.followers)
        ? targetSnapshot.data().followers
        : [];
    const normalizedFollowers = Array.from(new Set(currentFollowers.map((item) => String(item).trim()).filter(Boolean)));
    const nextFollowers = isNowFollowing
        ? [...new Set([...normalizedFollowers, String(currentUserId)])]
        : normalizedFollowers.filter((item) => item !== String(currentUserId));

    await setDoc(targetProfileRef, {
        followers: nextFollowers,
        followersUpdatedAt: new Date().toISOString()
    }, { merge: true });

    if (isNowFollowing) {
        const actorName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Usuário';
        await addUserNotification(targetUid, {
            type: 'follow',
            actorUid: currentUserId,
            actorName,
            actorAvatar: auth.currentUser?.photoURL || '',
            targetUid,
        });
    }
}

function renderNotificationsList(items, uid) {
    const popup = document.getElementById('notification-panel');
    if (!popup) return;

    const list = popup.querySelector('.notification-list');
    if (!list) return;

    const sorted = [...items].sort((a, b) => {
        const aTime = a.createdAt?.seconds ? a.createdAt.seconds : 0;
        const bTime = b.createdAt?.seconds ? b.createdAt.seconds : 0;
        return bTime - aTime;
    });

    if (sorted.length === 0) {
        list.innerHTML = '<div class="notification-empty">Nenhuma notificação ainda.</div>';
        return;
    }

    list.innerHTML = sorted.map((notification) => {
        const isNew = !notification.viewed;
        const actorImage = notification.actorAvatar || getDefaultProfileImagePath();
        const actorName = notification.actorName || 'Usuário';
        const isLike = notification.type === 'like';
        const postThumb = notification.postImage ? `<img class="notification-post-thumb" src="${notification.postImage}" alt="Post relacionado">` : '';
        const actionText = isLike
            ? `<span class="notification-text-main"><strong>${actorName}</strong> curtiu seu post</span>`
            : `<span class="notification-text-main"><strong>${actorName}</strong> começou a seguir você</span>`;

        const followButton = isLike ? '' : `
            <button type="button" class="notification-follow-btn" data-follow-notification-id="${notification.actorUid}">
                Seguir
            </button>
        `;

        return `
            <div class="notification-item ${isNew ? 'is-new' : ''}" data-notification-id="${notification.id || ''}">
                <div class="notification-user-block">
                    <img src="${actorImage}" alt="${actorName}" class="notification-user-avatar" loading="lazy">
                    <div class="notification-copy-wrap">
                        <div class="notification-copy-row">
                            ${actionText}
                            ${postThumb}
                        </div>
                        ${followButton}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const followButtons = list.querySelectorAll('.notification-follow-btn');
    followButtons.forEach((button) => {
        button.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            const targetUid = button.dataset.followNotificationId;
            if (!targetUid) return;
            await toggleFollowFromNotification(targetUid);
            button.textContent = 'Seguindo';
            button.classList.add('is-following');
        });
    });

    const badge = document.querySelector('.notification-badge');
    if (badge) {
        const newCount = sorted.filter((notification) => !notification.viewed).length;
        badge.textContent = newCount > 0 ? String(newCount) : '0';
        badge.style.display = newCount > 0 ? 'flex' : 'none';
    }
}

async function bindNotificationPanel(uid) {
    const notificationButton = document.getElementById('notification-button');
    const notificationPanel = document.getElementById('notification-panel');
    if (!notificationButton || !notificationPanel || !uid) return;

    const notificationsRef = query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'));

    onSnapshot(notificationsRef, async (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        renderNotificationsList(items, uid);

        const newCount = items.filter((notification) => !notification.viewed).length;
        const badge = notificationButton.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = newCount > 0 ? String(newCount) : '0';
            badge.style.display = newCount > 0 ? 'flex' : 'none';
        }
    }, (error) => {
        console.warn('Não foi possível carregar notificações:', error);
        renderNotificationsList([], uid);
        const badge = notificationButton.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = '0';
            badge.style.display = 'none';
        }
    });

    notificationButton.addEventListener('click', async () => {
        const isOpen = !notificationPanel.classList.contains('hidden');
        if (isOpen) {
            notificationPanel.classList.add('hidden');
            return;
        }

        notificationPanel.classList.remove('hidden');

        try {
            const notificationQuery = query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'));
            const notificationSnapshot = await getDocs(notificationQuery);
            const items = notificationSnapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data()
            }));

            if (items.length > 0) {
                await markNotificationsAsViewed(uid, items);
            }
        } catch (error) {
            console.warn('Não foi possível abrir a lista de notificações:', error);
            renderNotificationsList([], uid);
        }

        const badge = notificationButton.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = '0';
            badge.style.display = 'none';
        }
    });

    document.addEventListener('click', (event) => {
        if (!notificationPanel.contains(event.target) && !notificationButton.contains(event.target)) {
            notificationPanel.classList.add('hidden');
        }
    });
}

function showLoggedInHeader(user) {
    const authMenu = document.getElementById('auth-menu');
    if (!authMenu) return;

    const actions = document.createElement('div');
    actions.className = 'auth-actions';

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'btn-add-pet';
    addButton.title = 'Adicionar animal';
    addButton.textContent = '+';
    addButton.addEventListener('click', () => {
        if (window.openAddPetModal) {
            window.openAddPetModal();
        }
    });

    const notificationButton = document.createElement('button');
    notificationButton.type = 'button';
    notificationButton.id = 'notification-button';
    notificationButton.className = 'notification-button';
    notificationButton.setAttribute('aria-label', 'Abrir notificações');
    notificationButton.innerHTML = `${getNotificationBellSvg()}<span class="notification-badge">0</span>`;

    const notificationPanel = document.createElement('div');
    notificationPanel.id = 'notification-panel';
    notificationPanel.className = 'notification-panel hidden';
    notificationPanel.innerHTML = `
        <div class="notification-header">
            <h3>Notificações</h3>
        </div>
        <div class="notification-list"></div>
    `;

    const profileLink = document.createElement('a');
    profileLink.href = getProfilePagePath();
    profileLink.title = 'Meu perfil';
    profileLink.className = 'user-profile-summary-link';
    profileLink.setAttribute('aria-label', 'Abrir meu perfil');

    const profileSummary = document.createElement('div');
    profileSummary.className = 'user-profile-summary';

    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'user-profile-summary-avatar-wrap';

    const profileImage = document.createElement('img');
    profileImage.src = getDefaultProfileImagePath();
    profileImage.alt = 'Perfil do usuário';
    profileImage.className = 'user-profile-summary-avatar';

    avatarWrap.appendChild(profileImage);

    const summaryMeta = document.createElement('div');
    summaryMeta.className = 'user-profile-summary-meta';

    const profileName = document.createElement('span');
    profileName.className = 'user-profile-summary-name';
    profileName.textContent = user?.displayName || user?.email?.split('@')[0] || 'Usuário';

    const profilePostsCount = document.createElement('span');
    profilePostsCount.className = 'user-profile-summary-posts';
    profilePostsCount.textContent = '0 posts';

    summaryMeta.appendChild(profileName);
    summaryMeta.appendChild(profilePostsCount);
    profileSummary.appendChild(avatarWrap);
    profileSummary.appendChild(summaryMeta);
    profileLink.appendChild(profileSummary);

    actions.appendChild(notificationButton);
    actions.appendChild(addButton);
    actions.appendChild(profileLink);

    authMenu.replaceChildren(actions, notificationPanel);
    void loadProfileImage(profileImage, user?.uid);
    void getUserPostsCount(user).then((count) => {
        const label = count === 1 ? '1 post' : `${count} posts`;
        profilePostsCount.textContent = label;
    });

    void bindNotificationPanel(user.uid);
}

async function loadProfileImage(imageElement, uid) {
    if (!imageElement || !uid) return;
    try {
        const avatarUrl = await getProfileImagePath(uid);
        if (avatarUrl) {
            imageElement.src = avatarUrl;
        }
    } catch (error) {
        console.error('Erro ao carregar avatar:', error);
    }
}

function setAuthMenuContent(nodes) {
    const authMenu = document.getElementById('auth-menu');
    if (!authMenu) return;
    authMenu.replaceChildren(...nodes);
}

function setupHeaderDefault() {
    const authMenu = document.getElementById('auth-menu');
    if (!authMenu) return;
    const loginLink = document.createElement('a');
    loginLink.href = getLoginPagePath();
    loginLink.className = 'btn-login';
    loginLink.textContent = 'Entrar';
    setAuthMenuContent([loginLink]);
}

async function renderLoggedInAuthCard(user) {
    const authForm = document.querySelector('.auth-form');
    if (!authForm) return;

    let avatarUrl = getDefaultProfileImagePath();
    try {
        avatarUrl = await getProfileImagePath(user.uid);
    } catch (error) {
        console.error('Erro ao carregar avatar:', error);
    }

    authForm.innerHTML = `
        <div class="auth-logged-in">
            <img src="${avatarUrl}" alt="Perfil" class="profile-avatar-large">
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
            const user = await waitForAuthenticatedUser();
            showMessage(messageElement, 'Login realizado com sucesso! Redirecionando...', 'success');
            renderAuthState(user);
            setTimeout(redirectToHome, 400);
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
            const user = await waitForAuthenticatedUser();
            showMessage(messageElement, 'Cadastro realizado com sucesso! Redirecionando...', 'success');
            renderAuthState(user);
            setTimeout(redirectToHome, 600);
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

function renderAuthState(user) {
    if (user) {
        showLoggedInHeader(user);
        if (document.querySelector('.auth-form')) {
            void renderLoggedInAuthCard(user);
        }
    } else {
        setupHeaderDefault();
    }
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

    const currentUser = auth.currentUser;
    if (currentUser) {
        renderAuthState(currentUser);
    } else {
        setupHeaderDefault();
    }

    observeAuthState((user) => {
        renderAuthState(user);
    });
}

window.addEventListener('DOMContentLoaded', initAuthPage);
