import { auth, db, listarPets, criarDenuncia, togglePetLike, subscribeToPetLikes, getPetLikeState } from './firebase-config.js';
import { getProfileImagePath } from './avatar.js';
import { formatDateTime, computeAgeDaysFromPet, formatCityWithState, formatCategories, normalizePhone, sharePet, resolvePetId } from './pet-utils.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const FOLLOWING_KEY = 'ajudapet-following-users';

const userAvatar = document.getElementById('other-user-avatar');
const userName = document.getElementById('other-user-name');
const followButton = document.getElementById('follow-button');
const postsContainer = document.getElementById('user-posts');

function isSafeAvatarUrl(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {
        const parsed = new URL(url);
        const isStorageHost = parsed.hostname.includes('firebasestorage.googleapis.com');
        const hasToken = parsed.searchParams.has('token');
        const hasAltMedia = parsed.searchParams.get('alt') === 'media';
        const looksLikeDownload = parsed.pathname.includes('/download') || parsed.pathname.includes('/o/');
        return isStorageHost && (hasToken || hasAltMedia || looksLikeDownload);
    } catch {
        return false;
    }
}

function getDefaultProfileImagePath() {
    return window.location.pathname.includes('/pages/') ? '../assets/images/usuario.png' : './assets/images/usuario.png';
}

function getLoginPagePath() {
    return window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
}

function getFollowingUsers() {
    try {
        return JSON.parse(localStorage.getItem(FOLLOWING_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveFollowingUsers(users) {
    localStorage.setItem(FOLLOWING_KEY, JSON.stringify(users));
}

function isFollowingUser(uid) {
    return getFollowingUsers().includes(uid);
}

function updateFollowButtonState(uid) {
    if (!followButton) return;

    const following = isFollowingUser(uid);
    followButton.classList.toggle('is-following', following);
    followButton.innerHTML = `<span>${following ? 'Seguindo' : 'Seguir'}</span>`;
    followButton.setAttribute('aria-pressed', String(following));
    followButton.title = following ? 'Deixar de seguir' : 'Seguir usuário';
}

function getUserProfilePath(uid) {
    return `${window.location.pathname.includes('/pages/') ? 'perfil-usuario.html' : 'pages/perfil-usuario.html'}?uid=${encodeURIComponent(uid)}`;
}

function normalizeUserId(value) {
    return value ? String(value).trim() : '';
}

async function getUserProfileData(uid) {
    const safeUid = normalizeUserId(uid);
    if (!safeUid) {
        return {
            name: 'Usuário',
            avatar: getDefaultProfileImagePath()
        };
    }

    try {
        const profileRef = doc(db, 'users', safeUid);
        const profileSnap = await getDoc(profileRef);
        const profileData = profileSnap.exists() ? profileSnap.data() : {};
        const name = profileData.displayName || profileData.name || (profileData.email ? profileData.email.split('@')[0] : 'Usuário');
        const storedAvatar = profileData.avatarUrl && isSafeAvatarUrl(profileData.avatarUrl) ? profileData.avatarUrl : null;
        const avatar = storedAvatar || await getProfileImagePath(safeUid) || getDefaultProfileImagePath();
        return { name, avatar };
    } catch (error) {
        console.warn('Não foi possível carregar o perfil do usuário:', error);
        return {
            name: 'Usuário',
            avatar: getDefaultProfileImagePath()
        };
    }
}

function attachImageFallback(img) {
    if (!img) return;
    img.addEventListener('error', () => {
        img.src = getDefaultProfileImagePath();
        img.alt = 'Imagem indisponível';
    }, { once: true });
}

function openWhatsAppForPet(telefone, nomePet) {
    if (!auth.currentUser) {
        window.location.href = getLoginPagePath();
        return;
    }

    const telefoneLimpo = normalizePhone(telefone);
    if (!telefoneLimpo) {
        alert('Este post não possui um contato válido para WhatsApp.');
        return;
    }

    const mensagem = encodeURIComponent(`Olá! Vi o ${nomePet} no AjudaPet e gostaria de saber como posso ajudar.`);
    window.open(`https://wa.me/${telefoneLimpo}?text=${mensagem}`, '_blank');
}

async function reportPet(pet) {
    if (!auth.currentUser) {
        window.location.href = getLoginPagePath();
        return;
    }

    const motivo = 'Conteúdo inadequado';
    const petId = resolvePetId(pet) || pet.id || pet.petId || pet.docId || pet.uid;

    try {
        await criarDenuncia({
            petId,
            petName: pet.nome || 'Animal',
            reporterName: auth.currentUser.displayName || auth.currentUser.email || 'Usuário',
            reporterEmail: auth.currentUser.email || '',
            motivo,
            ownerIdentifier: pet.ownerEmail || pet.ownerUid || 'usuário'
        });
        alert('Denúncia registrada com sucesso.');
    } catch (error) {
        console.error('Erro ao denunciar post:', error);
        alert('Não foi possível registrar a denúncia. Tente novamente.');
    }
}

function renderPetCard(pet, authorName, authorAvatarUrl) {
    const card = document.createElement('article');
    card.className = 'pet-card';
    const petLikeId = resolvePetId(pet) || pet.id || pet.petId || pet.docId || pet.uid;
    const categorias = formatCategories(pet) || '';
    const pubDate = formatDateTime(pet.dataCriacao || pet.createdAt || pet.dataPost || pet.timestamp);
    const ageDays = computeAgeDaysFromPet(pet);
    const ageText = ageDays !== null ? `${ageDays} dias` : 'Data não disponível';
    const petIsAdopted = String(pet?.status || '').trim().toLowerCase() === 'adotado';

    card.innerHTML = `
        <span class="pet-status status-${pet.status}">${pet.status}</span>
        <div class="pet-card-image-wrap">
            <img src="${pet.imagem || getDefaultProfileImagePath()}" alt="${pet.nome}" loading="lazy">
        </div>
        <div class="pet-info">
            <div class="pet-author" data-user-author>
                <img class="pet-author-avatar" src="${authorAvatarUrl || getDefaultProfileImagePath()}" alt="Foto do usuário" loading="lazy">
                <span class="pet-author-name">${authorName}</span>
            </div>
            <div class="pet-info-actions">
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
            <p class="post-date">${pubDate || 'Data não disponível'}</p>
            <p class="pet-age">${ageText}</p>
            <p class="pet-city">${formatCityWithState(pet)}</p>
            <h3 class="pet-name">${pet.nome}</h3>
            ${categorias ? `<p class="pet-category">${categorias}</p>` : ''}
            <div class="pet-card-actions">
                ${petIsAdopted ? '' : '<button type="button" class="btn-ajudar btn-ajudar-inline" data-pet-help-btn>AJUDAR</button>'}
                <button type="button" class="btn-report" data-pet-report-btn>Denunciar</button>
            </div>
        </div>
    `;

    const imageEl = card.querySelector('img');
    attachImageFallback(imageEl);

    const likeButton = card.querySelector('[data-pet-like-btn]');
    const likeCountLabel = card.querySelector('[data-pet-like-count]');

    const syncLikeState = ({ liked, count }) => {
        if (!likeButton || !likeCountLabel) return;
        likeButton.classList.toggle('is-liked', Boolean(liked));
        likeButton.setAttribute('aria-pressed', String(Boolean(liked)));
        likeButton.title = liked ? 'Remover curtida' : 'Curtir post';
        likeCountLabel.textContent = String(Number.isFinite(count) ? count : 0);
    };

    if (likeButton && likeCountLabel) {
        getPetLikeState(petLikeId, auth.currentUser?.uid).then(syncLikeState).catch(() => syncLikeState({ liked: false, count: 0 }));
        const unsubscribeLikes = subscribeToPetLikes(petLikeId, syncLikeState);

        likeButton.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!auth.currentUser?.uid) {
                alert('Você precisa estar logado para curtir este post.');
                return;
            }
            try {
                const result = await togglePetLike(petLikeId);
                syncLikeState(result);
            } catch (error) {
                console.error('Erro ao curtir o post:', error);
                alert('Não foi possível atualizar a curtida. Tente novamente.');
            }
        });

        card.addEventListener('DOMNodeRemoved', () => unsubscribeLikes(), { once: true });
    }

    const shareButton = card.querySelector('[data-pet-share-btn]');
    if (shareButton) {
        shareButton.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await sharePet({ ...pet, id: petLikeId });
        });
    }

    const helpButton = card.querySelector('[data-pet-help-btn]');
    if (helpButton) {
        helpButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openWhatsAppForPet(pet.telefone || pet.contato, pet.nome);
        });
    }

    const reportButton = card.querySelector('[data-pet-report-btn]');
    if (reportButton) {
        reportButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            reportPet(pet);
        });
    }

    return card;
}

function matchesUserPost(pet, uid) {
    const candidates = [
        pet?.ownerUid,
        pet?.ownerId,
        pet?.userId,
        pet?.uid,
        pet?.user?.uid,
        pet?.authorUid,
        pet?.owner?.uid
    ];

    const normalizedCandidates = candidates
        .filter(Boolean)
        .map((value) => normalizeUserId(String(value)));

    if (normalizedCandidates.includes(normalizeUserId(uid))) {
        return true;
    }

    const ownerEmail = pet?.ownerEmail ? String(pet.ownerEmail).toLowerCase() : '';
    const profileEmailNormalized = normalizeUserId(profileEmail || '').toLowerCase();
    return profileEmailNormalized && ownerEmail && ownerEmail === profileEmailNormalized;
}

async function loadUserPosts(uid) {
    if (!postsContainer) return;

    try {
        const pets = await listarPets();
        const userPosts = pets.filter((pet) => matchesUserPost(pet, uid));

        postsContainer.innerHTML = '';

        if (!userPosts.length) {
            postsContainer.innerHTML = '<div class="profile-empty">Este usuário ainda não publicou nenhum animal.</div>';
            return;
        }

        const profile = await getUserProfileData(uid);
        userPosts.forEach((pet) => {
            const card = renderPetCard(pet, profile.name, profile.avatar);
            postsContainer.appendChild(card);
        });
    } catch (error) {
        console.error('Erro ao carregar posts do usuário:', error);
        postsContainer.innerHTML = '<div class="profile-empty">Não foi possível carregar os posts desse usuário.</div>';
    }
}

let profileEmail = '';

async function initUserProfile() {
    const params = new URLSearchParams(window.location.search);
    let uid = params.get('uid') || sessionStorage.getItem('ajudapet-target-user-id');

    if (!uid) {
        const stored = sessionStorage.getItem('ajudapet-target-user-id');
        if (stored) {
            uid = stored;
        }
    }

    if (!uid) {
        if (postsContainer) postsContainer.innerHTML = '<div class="profile-empty">Usuário não encontrado.</div>';
        return;
    }

    try {
        const profile = await getUserProfileData(uid);
        if (userAvatar) userAvatar.src = profile.avatar;
        if (userName) userName.textContent = profile.name;

        const profileRef = doc(db, 'users', uid);
        const snapshot = await getDoc(profileRef);
        if (snapshot.exists()) {
            const data = snapshot.data();
            profileEmail = String(data.email || '');
        }

        updateFollowButtonState(uid);
        if (followButton) {
            followButton.onclick = () => {
                const current = getFollowingUsers();
                const filtered = current.filter((item) => item !== uid);
                if (!current.includes(uid)) {
                    filtered.push(uid);
                }
                saveFollowingUsers(filtered);
                updateFollowButtonState(uid);
            };
        }

        await loadUserPosts(uid);
    } catch (error) {
        console.error('Erro ao inicializar o perfil do usuário:', error);
        if (postsContainer) {
            postsContainer.innerHTML = '<div class="profile-empty">Não foi possível carregar este perfil.</div>';
        }
    }
}

window.addEventListener('DOMContentLoaded', initUserProfile);
