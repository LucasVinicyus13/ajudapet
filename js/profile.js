import { auth, observeAuthState, listarPets, deletarPet } from './firebase-config.js';
import { clearProfileImage, getDefaultProfileImagePath, getProfileImagePath, setProfileImage } from './avatar.js';

function redirectToLogin() {
    const loginPath = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
    window.location.href = loginPath;
}

async function handleLogout() {
    try {
        await auth.signOut();
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Erro ao sair da conta:', error);
    }
}

function setupLogoutButton() {
    const logoutButton = document.getElementById('logout-button');
    if (!logoutButton) return;

    logoutButton.addEventListener('click', handleLogout);
}

function renderProfile(user) {
    const nameField = document.getElementById('profile-name');
    const emailField = document.getElementById('profile-email');
    const avatar = document.getElementById('profile-avatar');

    if (!nameField || !emailField || !avatar) return;

    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Usuário');
    nameField.textContent = displayName;
    emailField.textContent = user.email || 'Sem e-mail';
    avatar.src = getProfileImagePath();
}

function setupAvatarUpload() {
    const avatar = document.getElementById('profile-avatar');
    const avatarInput = document.getElementById('profile-avatar-input');
    const avatarButton = document.getElementById('profile-avatar-button');
    const avatarRemoveButton = document.getElementById('profile-avatar-remove-button');

    if (!avatar || !avatarInput || !avatarButton || !avatarRemoveButton) return;

    avatarButton.addEventListener('click', () => {
        avatarInput.click();
    });

    avatarRemoveButton.addEventListener('click', () => {
        clearProfileImage();
        avatar.src = getDefaultProfileImagePath();
    });

    avatarInput.addEventListener('change', (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            avatar.src = dataUrl;
            setProfileImage(dataUrl);
        };
        reader.readAsDataURL(file);
        avatarInput.value = '';
    });
}

async function renderUserPosts(user) {
    const postsContainer = document.getElementById('profile-posts');
    if (!postsContainer) return;

    try {
        const pets = await listarPets();
        const userPosts = pets.filter(pet => pet.ownerEmail === user.email || pet.ownerUid === user.uid);

        postsContainer.innerHTML = '';

        if (!userPosts.length) {
            postsContainer.innerHTML = '<div class="profile-empty">Você ainda não publicou nenhum animal.</div>';
            return;
        }

        userPosts.forEach((pet) => {
            postsContainer.appendChild(renderPostCard(pet, user));
        });
    } catch (error) {
        console.error('Erro ao carregar posts do usuário:', error);
        postsContainer.innerHTML = '<div class="profile-empty">Você ainda não publicou nenhum animal.</div>';
    }
}

function renderPostCard(pet, user) {
    const card = document.createElement('div');
    card.className = 'profile-post-card';
    card.innerHTML = `
        <img src="${pet.imagem || '../assets/images/placeholder.svg'}" alt="${pet.nome}">
        <div class="post-header">
            <h3 class="post-name">${pet.nome}</h3>
            <span class="pet-status status-${pet.status}">${pet.status}</span>
        </div>
        <p class="post-city">${pet.cidade}</p>
        <button type="button" class="btn-ajudar" onclick="openWhatsapp('${pet.telefone}', '${pet.nome}')">AJUDAR</button>
    `;

    const postImage = card.querySelector('img');
    if (postImage) {
        postImage.addEventListener('error', () => {
            postImage.src = '../assets/images/placeholder.svg';
            postImage.alt = 'Imagem indisponível';
        }, { once: true });
    }

    // se for dono do post, adicionar o menu de ações
    try {
        const isOwner = user && (pet.ownerEmail === user.email || pet.ownerUid === user.uid);
        if (isOwner) {
            const header = card.querySelector('.post-header');
            if (header) {
                const menu = createPostMenu(pet, user);
                header.appendChild(menu);
            }
        }
    } catch (e) {
        // ignore
    }

    return card;
}

function createPostMenu(pet, user) {
    const wrapper = document.createElement('div');
    wrapper.className = 'post-menu-wrapper';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'post-menu-button';
    btn.setAttribute('aria-label', 'Abrir opções');
    btn.textContent = '⋯';

    const menu = document.createElement('div');
    menu.className = 'post-menu';
    menu.innerHTML = `
        <button type="button" class="post-menu-item post-edit">Editar post</button>
        <button type="button" class="post-menu-item post-delete">Excluir post</button>
    `;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('visible');
    });

    menu.querySelector('.post-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        console.debug('Editar post clicado:', pet.id);
        // Abre o modal de adicionar/editar com os dados do pet
        if (window.openAddPetModalForEdit) {
            window.openAddPetModalForEdit(pet);
        } else {
            console.warn('openAddPetModalForEdit não está definido');
            alert('Não foi possível abrir o editor. Tente recarregar a página.');
        }
        menu.classList.remove('visible');
    });

    menu.querySelector('.post-delete').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Deseja realmente excluir este post?')) return;
        try {
            await deletarPet(pet.id);
            // Atualiza a lista de posts na página e o feed
            if (window.loadPets) await window.loadPets();
            const currentUser = auth.currentUser;
            if (currentUser) renderUserPosts(currentUser);
        } catch (error) {
            console.error('Erro ao excluir post:', error);
            alert('Não foi possível excluir o post. Tente novamente.');
        }
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(menu);
    return wrapper;
}

// Re-renderiza os posts do perfil quando o feed muda
document.addEventListener('petsUpdated', () => {
    const currentUser = auth.currentUser;
    if (currentUser) renderUserPosts(currentUser);
});

function openWhatsapp(telefone, nome) {
    const mensagem = encodeURIComponent(`Olá! Vi o ${nome} no AjudaPet e gostaria de saber como posso ajudar.`);
    window.open(`https://wa.me/${telefone}?text=${mensagem}`, '_blank');
}

window.openWhatsapp = openWhatsapp;

window.addEventListener('DOMContentLoaded', () => {
    setupAvatarUpload();
    setupLogoutButton();

    observeAuthState((user) => {
        if (user) {
            renderProfile(user);
            renderUserPosts(user);
        } else {
            redirectToLogin();
        }
    });
});
