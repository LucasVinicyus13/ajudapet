import { uploadUserAvatar, getUserAvatarUrl, deleteUserAvatar } from './firebase-config.js';
import { auth } from './firebase-config.js';

const PROFILE_AVATAR_KEY = 'ajudapet-profile-avatar';

function getDefaultProfileImagePath() {
    return window.location.pathname.includes('/pages/') ? '../assets/images/usuario.png' : './assets/images/usuario.png';
}

/**
 * Obtém a URL do avatar do perfil.
 * Tenta primeiro do Firebase Storage, depois do localStorage (compatibilidade com versões antigas).
 * @returns {Promise<string>} - URL do avatar ou caminho padrão se não existir.
 */
export async function getProfileImagePath(uid) {
    try {
        const userId = uid || auth.currentUser?.uid;
        if (userId) {
            const currentPhotoUrl = auth.currentUser?.uid === userId ? auth.currentUser?.photoURL : null;
            if (currentPhotoUrl) {
                return currentPhotoUrl;
            }

            const firebaseUrl = await getUserAvatarUrl(userId);
            if (firebaseUrl) {
                localStorage.setItem(PROFILE_AVATAR_KEY, firebaseUrl);
                return firebaseUrl;
            }
        }
    } catch (error) {
        console.error("Erro ao obter avatar do Firebase:", error);
    }

    // Fallback para localStorage (compatibilidade com dados antigos)
    const storedAvatar = localStorage.getItem(PROFILE_AVATAR_KEY);
    if (storedAvatar) {
        return storedAvatar;
    }

    return getDefaultProfileImagePath();
}

/**
 * Salva a foto de perfil no Firebase Storage.
 * @param {string} dataUrl - Data URL da imagem.
 * @param {string} [uid] - ID do usuário.
 * @returns {Promise<string>} - URL de download da imagem salva no Firebase.
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

        // Upload para Firebase Storage
        const firebaseUrl = await uploadUserAvatar(userId, blob);
        
        // Manter no localStorage como fallback
        localStorage.setItem(PROFILE_AVATAR_KEY, firebaseUrl);
        
        return firebaseUrl;
    } catch (error) {
        console.error("Erro ao salvar avatar:", error);
        throw error;
    }
}

/**
 * Limpa o avatar do perfil (remove do Firebase Storage e localStorage).
 * @param {string} [uid] - ID do usuário.
 * @returns {Promise<void>}
 */
export async function clearProfileImage(uid) {
    const userId = uid || auth.currentUser?.uid;
    if (!userId) {
        localStorage.removeItem(PROFILE_AVATAR_KEY);
        return;
    }

    try {
        // Remover do Firebase Storage
        await deleteUserAvatar(userId);
    } catch (error) {
        console.error("Erro ao deletar avatar:", error);
    }

    // Remover do localStorage
    localStorage.removeItem(PROFILE_AVATAR_KEY);
}

export {
    PROFILE_AVATAR_KEY,
    getDefaultProfileImagePath
};
