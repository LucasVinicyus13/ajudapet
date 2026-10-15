import { uploadUserAvatar, getUserAvatarUrl, deleteUserAvatar } from './firebase-config.js';
import { auth } from './firebase-config.js';

const PROFILE_AVATAR_KEY = 'ajudapet-profile-avatar';

function getProfileAvatarKey(uid) {
    return `${PROFILE_AVATAR_KEY}:${uid}`;
}

function isSafeAvatarUrl(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }

    if (/^data:image\/(?:jpeg|png|webp);base64,/i.test(url)) {
        return true;
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

const MAX_AVATAR_DATA_URL_LENGTH = 256 * 1024;
const AVATAR_QUALITIES = [0.82, 0.72, 0.62, 0.52, 0.42];

export async function compressProfileImage(imageBlob) {
    const imageUrl = URL.createObjectURL(imageBlob);
    const image = new Image();

    try {
        image.src = imageUrl;
        await image.decode();

        const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
        let width = Math.max(1, Math.round(image.naturalWidth * scale));
        let height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Não foi possível preparar a imagem para compressão.');
        }

        while (Math.max(width, height) >= 48) {
            canvas.width = width;
            canvas.height = height;
            context.clearRect(0, 0, width, height);
            context.drawImage(image, 0, 0, width, height);

            for (const quality of AVATAR_QUALITIES) {
                const compressedBlob = await new Promise((resolve, reject) => {
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Não foi possível comprimir a imagem.'));
                        }
                    }, 'image/webp', quality);
                });
                const dataUrlLength = `data:${compressedBlob.type};base64,`.length
                    + 4 * Math.ceil(compressedBlob.size / 3);

                if (dataUrlLength <= MAX_AVATAR_DATA_URL_LENGTH) {
                    return compressedBlob;
                }
            }

            width = Math.max(1, Math.floor(width * 0.8));
            height = Math.max(1, Math.floor(height * 0.8));
        }

        throw new Error('Não foi possível reduzir a imagem ao tamanho permitido pelo Firestore.');
    } finally {
        URL.revokeObjectURL(imageUrl);
    }
}

export function setupProfileImagePreview(imageElement) {
    if (!imageElement || document.getElementById('profile-image-preview')) return;

    const modal = document.createElement('div');
    modal.id = 'profile-image-preview';
    modal.className = 'profile-image-preview';
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');

    const dialog = document.createElement('div');
    dialog.className = 'profile-image-preview-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Foto de perfil ampliada');

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'profile-image-preview-close';
    closeButton.setAttribute('aria-label', 'Fechar foto ampliada');
    closeButton.textContent = '×';

    const previewImage = document.createElement('img');
    previewImage.className = 'profile-image-preview-image';

    dialog.append(closeButton, previewImage);
    modal.appendChild(dialog);
    document.body.appendChild(modal);

    const closePreview = () => {
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        imageElement.focus();
    };

    const openPreview = () => {
        previewImage.src = imageElement.currentSrc || imageElement.src;
        previewImage.alt = imageElement.alt || 'Foto de perfil';
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        closeButton.focus();
    };

    imageElement.setAttribute('role', 'button');
    imageElement.setAttribute('tabindex', '0');
    imageElement.setAttribute('aria-label', 'Ampliar foto de perfil');
    imageElement.setAttribute('aria-haspopup', 'dialog');
    imageElement.classList.add('profile-image-preview-trigger');
    imageElement.addEventListener('click', openPreview);
    imageElement.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPreview();
        }
    });

    closeButton.addEventListener('click', closePreview);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closePreview();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal.hidden) closePreview();
    });
}

function getDefaultProfileImagePath() {
    return window.location.pathname.includes('/pages/') ? '../assets/images/usuario.png' : './assets/images/usuario.png';
}

/**
 * Obtém o avatar salvo no Firestore, com fallbacks para versões antigas.
 * @returns {Promise<string>} - URL do avatar ou caminho padrão se não existir.
 */
export async function getProfileImagePath(uid) {
    const userId = uid || auth.currentUser?.uid;

    try {
        if (userId) {
            const firebaseUrl = await getUserAvatarUrl(userId);
            if (firebaseUrl) {
                localStorage.setItem(getProfileAvatarKey(userId), firebaseUrl);
                return firebaseUrl;
            }

            const currentPhotoUrl = auth.currentUser?.uid === userId ? auth.currentUser?.photoURL : null;
            if (currentPhotoUrl && isSafeAvatarUrl(currentPhotoUrl)) {
                return currentPhotoUrl;
            }
        }
    } catch (error) {
        console.error("Erro ao obter avatar do Firebase:", error);
    }

    if (!userId || userId !== auth.currentUser?.uid) {
        return getDefaultProfileImagePath();
    }

    const storedAvatar = localStorage.getItem(getProfileAvatarKey(userId));
    if (storedAvatar && isSafeAvatarUrl(storedAvatar)) {
        return storedAvatar;
    }

    return getDefaultProfileImagePath();
}

/**
 * Comprime e salva a foto de perfil no documento do usuário no Firestore.
 * @param {string} dataUrl - Data URL da imagem.
 * @param {string} [uid] - ID do usuário.
 * @returns {Promise<string>} - Data URL da imagem salva no Firestore.
 */
export async function setProfileImage(dataUrl, uid) {
    const userId = uid || auth.currentUser?.uid;
    if (!dataUrl || !userId) {
        console.warn("Não é possível salvar avatar sem usuário logado");
        return null;
    }

    try {
        // Converter data URL para Blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const compressedBlob = await compressProfileImage(blob);

        const firebaseUrl = await uploadUserAvatar(userId, compressedBlob);
        
        // Manter no localStorage do próprio usuário como fallback
        localStorage.setItem(getProfileAvatarKey(userId), firebaseUrl);
        
        return firebaseUrl;
    } catch (error) {
        console.error("Erro ao salvar avatar:", error);
        throw error;
    }
}

/**
 * Limpa o avatar do perfil no Firestore e no localStorage.
 * @param {string} [uid] - ID do usuário.
 * @returns {Promise<void>}
 */
export async function clearProfileImage(uid) {
    const userId = uid || auth.currentUser?.uid;
    if (!userId) {
        return;
    }

    try {
        // Remover do documento do usuário
        await deleteUserAvatar(userId);
    } catch (error) {
        console.error("Erro ao deletar avatar:", error);
        throw error;
    }

    localStorage.removeItem(getProfileAvatarKey(userId));
}

export {
    PROFILE_AVATAR_KEY,
    getDefaultProfileImagePath
};
