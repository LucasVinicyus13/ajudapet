import { auth, observeAuthState, listarPets, deletarPet, togglePetLike, subscribeToPetLikes, getPetLikeState } from './firebase-config.js';
import { clearProfileImage, getDefaultProfileImagePath, getProfileImagePath, setProfileImage } from './avatar.js';
import { formatDateTime, computeAgeDaysFromPet, formatCityWithState, formatCategories, sharePet, resolvePetId } from './pet-utils.js';

let currentUser = null;

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

async function renderProfile(user) {
    const nameField = document.getElementById('profile-name');
    const emailField = document.getElementById('profile-email');
    const avatar = document.getElementById('profile-avatar');

    if (!nameField || !emailField || !avatar) return;

    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Usuário');
    nameField.textContent = displayName;
    emailField.textContent = user.email || 'Sem e-mail';
    
    try {
        const avatarUrl = await getProfileImagePath(user.uid);
        avatar.src = avatarUrl;
    } catch (error) {
        console.error('Erro ao carregar avatar:', error);
        avatar.src = getDefaultProfileImagePath();
    }
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

    avatarRemoveButton.addEventListener('click', async () => {
        try {
            await clearProfileImage();
            avatar.src = getDefaultProfileImagePath();
        } catch (error) {
            console.error('Erro ao remover avatar:', error);
            alert('Erro ao remover a foto de perfil');
        }
    });

    avatarInput.addEventListener('change', async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        if (!currentUser) {
            alert('Faça login para alterar sua foto de perfil.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = reader.result;
            avatar.src = dataUrl;
            
            try {
                const firebaseUrl = await setProfileImage(dataUrl, currentUser.uid);
                if (firebaseUrl) {
                    avatar.src = firebaseUrl;
                }
            } catch (error) {
                console.error('Erro ao salvar avatar:', error);
                alert('Erro ao salvar a foto de perfil no Firebase. Tente novamente.');
            }
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
    card.className = 'pet-card';
    const categorias = formatCategories(pet) || '';
    const pubDate = formatDateTime(pet.dataCriacao || pet.createdAt || pet.dataPost || pet.timestamp);
    const ageDays = computeAgeDaysFromPet(pet);
    const ageText = ageDays !== null ? `${ageDays} dias` : 'Data não disponível';
    const ownerUid = pet.ownerUid || user?.uid || pet.userId || null;
    const authorName = pet.ownerName || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Usuário');
    const isOwner = Boolean(user && (pet.ownerEmail === user.email || pet.ownerUid === user.uid));

    card.innerHTML = `
        <span class="pet-status status-${pet.status}">${pet.status}</span>
        <div class="pet-card-image-wrap">
            <img src="${pet.imagem || '../assets/images/placeholder.svg'}" alt="${pet.nome}">
        </div>
        <div class="pet-info">
            <div class="pet-info-top">
                <div class="pet-author">
                    <img class="pet-author-avatar" data-profile-author-avatar src="${getDefaultProfileImagePath()}" alt="Foto do usuário" loading="lazy">
                    <span class="pet-author-name" data-profile-author-name>${authorName}</span>
                </div>
                <div class="pet-toolbar">
                    <div class="pet-like-button-group">
                        <button type="button" class="pet-like-btn" data-pet-like-btn aria-label="Curtir post" aria-pressed="false" title="Curtir post">
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M12 21.35 10.55 20C5.4 15.36 2 12.28 2 8.5A4.5 4.5 0 0 1 6.5 4c1.74 0 3.41.81 4.5 2.09A6.12 6.12 0 0 1 15.5 4 4.5 4.5 0 0 1 20 8.5c0 3.78-3.4 6.86-8.55 11.5L12 21.35Z"/>
                            </svg>
                        </button>
                        <span class="pet-like-count" data-pet-like-count>0</span>
                    </div>
                    <button type="button" class="pet-share-btn" data-pet-share-btn aria-label="Compartilhar post" title="Compartilhar">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M18 16a2.5 2.5 0 0 0-1.9 1l-7.4-4.2a3.1 3.1 0 0 0 0-1.6L16.1 7a2.5 2.5 0 1 0-.9-1.8L7.8 9.4a3 3 0 1 0 0 5.2l7.4 4.2A2.5 2.5 0 1 0 18 16Z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="post-header">
                <h3 class="pet-name">${pet.nome}</h3>
            </div>
            <p class="post-date">${pubDate || 'Data não disponível'}</p>
            <p class="pet-age">${ageText}</p>
            <p class="pet-city">${formatCityWithState(pet)}</p>
            ${categorias ? `<p class="pet-category">${categorias}</p>` : ''}
        </div>
    `;

    const postImage = card.querySelector('img');
    if (postImage) {
        postImage.addEventListener('error', () => {
            postImage.src = '../assets/images/placeholder.svg';
            postImage.alt = 'Imagem indisponível';
        }, { once: true });
    }

    const authorAvatar = card.querySelector('[data-profile-author-avatar]');
    const authorNameLabel = card.querySelector('[data-profile-author-name]');
    if (ownerUid) {
        getProfileImagePath(ownerUid).then((avatarUrl) => {
            if (authorAvatar) authorAvatar.src = avatarUrl;
        }).catch(() => {
            if (authorAvatar) authorAvatar.src = getDefaultProfileImagePath();
        });
    }
    if (authorNameLabel && authorName) {
        authorNameLabel.textContent = authorName;
    }

    const likeButton = card.querySelector('[data-pet-like-btn]');
    const likeCountLabel = card.querySelector('[data-pet-like-count]');
    const petLikeId = resolvePetId(pet) || pet.id || pet.petId || pet.docId || pet.uid;

    const syncLikeState = ({ liked, count }) => {
        if (!likeButton || !likeCountLabel) return;
        const normalizedCount = Number.isFinite(count) ? count : 0;
        likeButton.classList.toggle('is-liked', Boolean(liked));
        likeButton.setAttribute('aria-pressed', String(Boolean(liked)));
        likeButton.title = liked ? 'Remover curtida' : 'Curtir post';
        likeCountLabel.textContent = String(normalizedCount);
    };

    if (likeButton && likeCountLabel) {
        getPetLikeState(petLikeId, auth.currentUser?.uid).then(syncLikeState).catch(() => syncLikeState({ liked: false, count: 0 }));
        subscribeToPetLikes(petLikeId, syncLikeState);

        likeButton.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!auth.currentUser?.uid) {
                alert('Você precisa fazer login para curtir este post.');
                return;
            }
            try {
                const result = await togglePetLike(petLikeId);
                syncLikeState(result);
            } catch (error) {
                console.error('Erro ao curtir o post no perfil:', error);
                alert('Não foi possível atualizar a curtida. Tente novamente.');
            }
        });
    }

    const shareButton = card.querySelector('[data-pet-share-btn]');
    if (shareButton) {
        shareButton.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            const petWithId = { ...pet, id: petLikeId };
            await sharePet(petWithId);
        });
    }

    try {
        if (isOwner) {
            const toolbar = card.querySelector('.pet-toolbar');
            if (toolbar) {
                const menu = createPostMenu(pet, user);
                toolbar.appendChild(menu);
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
        const shouldOpen = !menu.classList.contains('visible');
        document.querySelectorAll('.post-menu.visible').forEach((openMenu) => {
            if (openMenu !== menu) openMenu.classList.remove('visible');
        });
        if (shouldOpen) {
            menu.classList.add('visible');
        } else {
            menu.classList.remove('visible');
        }
    });

    document.addEventListener('click', (event) => {
        if (!wrapper.contains(event.target)) {
            menu.classList.remove('visible');
        }
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

    observeAuthState(async (user) => {
        if (user) {
            currentUser = user;
            await renderProfile(user);
            await renderUserPosts(user);
        } else {
            redirectToLogin();
        }
    });
});
