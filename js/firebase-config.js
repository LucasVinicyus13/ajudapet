/**
 * firebase-config.js - Configuração e Funções do Firebase
 * Centraliza a comunicação com o Firestore.
 */

// Importações do SDK do Firebase (Versão Modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    getDoc,
    query,
    orderBy,
    limit as firestoreLimit,
    startAfter,
    where,
    updateDoc,
    doc,
    deleteDoc,
    serverTimestamp,
    setDoc,
    runTransaction,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { formatPhoneInput, normalizePhone, isAdminEmail } from './pet-utils.js';

// CONFIGURAÇÃO DO FIREBASE (Substitua pelos seus dados do Console do Firebase)
const firebaseConfig = {
    apiKey: "AIzaSyBZ53kYtTFaToHGhkAnEQ6sN2yF5jABb98",
    authDomain: "ajudapet-2d3c6.firebaseapp.com",
    projectId: "ajudapet-2d3c6",
    storageBucket: "ajudapet-2d3c6.firebasestorage.app",
    messagingSenderId: "876154081954",
    appId: "1:876154081954:web:35340b11e004e8a449bdfb"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

/**
 * Cria um novo registro de animal no Firestore.
 * @param {Object} dados - Objeto contendo nome, cidade, descricao, status, imagem, telefone.
 * @returns {Promise<string>} - ID do documento criado.
 */
export async function criarPet(dados) {
    try {
        const telefoneLimpo = normalizePhone(dados.contato || dados.telefone || '');
        if (!telefoneLimpo || !dados.imagem) {
            throw new Error("Contato e Imagem são obrigatórios.");
        }

        const docRef = await addDoc(collection(db, "pets"), {
            ...dados,
            contato: dados.contato || formatPhoneInput(telefoneLimpo),
            telefone: telefoneLimpo,
            dataCriacao: serverTimestamp()
        });

        console.log("Pet cadastrado com ID: ", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Erro ao criar pet:", error);
        throw error;
    }
}

/**
 * Retorna todos os animais cadastrados no Firestore.
 * @returns {Promise<Array>} - Lista de objetos de animais.
 */
const LOCAL_PETS_KEY = 'ajudapet_local_pets';

function getLocalPetsData() {
    const raw = sessionStorage.getItem(LOCAL_PETS_KEY);
    if (!raw) return {};
    try {
        return JSON.parse(raw) || {};
    } catch {
        return {};
    }
}

function setLocalPetsData(data) {
    sessionStorage.setItem(LOCAL_PETS_KEY, JSON.stringify(data));
}

function mergeLocalPets(pets) {
    const local = getLocalPetsData();
    const merged = pets.map((pet) => {
        if (local[pet.id]) {
            return { ...pet, ...local[pet.id] };
        }
        return pet;
    });
    const localOnly = Object.values(local).filter((pet) => !merged.find((item) => item.id === pet.id));
    return merged.concat(localOnly);
}

export async function listarPets() {
    try {
        const querySnapshot = await getDocs(collection(db, "pets"));
        const pets = [];

        querySnapshot.forEach((doc) => {
            pets.push({ id: doc.id, ...doc.data() });
        });

        return mergeLocalPets(pets);
    } catch (error) {
        console.error("Erro ao listar pets:", error);
        return Object.values(getLocalPetsData());
    }
}

export async function listarPetsPage(pageSize = 6, startAfterDoc = null, categories = []) {
    try {
        const petsRef = collection(db, "pets");
        let q;

        if (Array.isArray(categories) && categories.length > 0) {
            q = query(
                petsRef,
                where("categoria", "array-contains-any", categories),
                orderBy("dataCriacao", "desc"),
                firestoreLimit(pageSize)
            );
        } else {
            q = query(
                petsRef,
                orderBy("dataCriacao", "desc"),
                firestoreLimit(pageSize)
            );
        }

        if (startAfterDoc) {
            q = query(q, startAfter(startAfterDoc));
        }

        const querySnapshot = await getDocs(q);
        const pets = [];

        querySnapshot.forEach((doc) => {
            pets.push({ id: doc.id, ...doc.data() });
        });

        const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
        const hasMore = querySnapshot.size === pageSize;

        return {
            pets: mergeLocalPets(pets),
            lastVisibleDoc,
            hasMore
        };
    } catch (error) {
        console.error("Erro ao listar pets por página:", error);
        return {
            pets: Object.values(getLocalPetsData()),
            lastVisibleDoc: null,
            hasMore: false
        };
    }
}

/**
 * Atualiza o status de um animal (urgente, resgate, adotado).
 * @param {string} id - ID do documento no Firestore.
 * @param {string} novoStatus - O novo status a ser definido.
 * @returns {Promise<void>}
 */
export async function atualizarStatus(id, novoStatus) {
    try {
        const petRef = doc(db, "pets", id);
        await updateDoc(petRef, {
            status: novoStatus
        });
        console.log(`Status do pet ${id} atualizado para ${novoStatus}`);
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
        throw error;
    }
}

/**
 * Atualiza os dados de um pet existente.
 * @param {string} id - ID do documento no Firestore.
 * @param {Object} dados - Campos a atualizar.
 * @returns {Promise<void>}
 */
export async function atualizarPet(id, dados) {
    try {
        const petPayload = { ...dados };
        const telefoneLimpo = normalizePhone(petPayload.contato || petPayload.telefone || '');
        if (telefoneLimpo) {
            petPayload.contato = petPayload.contato || formatPhoneInput(telefoneLimpo);
            petPayload.telefone = telefoneLimpo;
        }

        const petRef = doc(db, "pets", id);
        await updateDoc(petRef, {
            ...petPayload,
            dataAtualizacao: serverTimestamp()
        });
        console.log(`Pet ${id} atualizado.`);
    } catch (error) {
        console.error("Erro ao atualizar pet:", error);
        throw error;
    }
}

/**
 * Remove um pet do Firestore.
 * @param {string} id - ID do documento no Firestore.
 * @returns {Promise<void>}
 */
export function storeLocalPet(pet) {
    const local = getLocalPetsData();
    local[pet.id] = pet;
    setLocalPetsData(local);
}

export function removeLocalPet(id) {
    const local = getLocalPetsData();
    delete local[id];
    setLocalPetsData(local);
}

export async function deletarPet(id) {
    try {
        const petRef = doc(db, "pets", id);
        await deleteDoc(petRef);
        removeLocalPet(id);
        console.log(`Pet ${id} removido.`);
    } catch (error) {
        console.error("Erro ao deletar pet:", error);
        throw error;
    }
}

// Inicializa o Auth do Firebase
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn('Não foi possível definir a persistência do login:', error);
});

async function ensureUserProfile(user, extraData = {}) {
    if (!user?.uid) return;

    const profileRef = doc(db, 'users', user.uid);
    const profileData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        avatarUrl: '',
        isAdmin: isAdminEmail(user.email),
        ...extraData
    };

    await setDoc(profileRef, profileData, { merge: true });
}

async function updateUserProfileData(uid, data) {
    if (!uid) return;

    const profileRef = doc(db, 'users', uid);
    await setDoc(profileRef, data, { merge: true });
}

/**
 * Registra um usuário usando e-mail e senha.
 * @param {string} name - Nome completo do usuário.
 * @param {string} email - E-mail do usuário.
 * @param {string} password - Senha do usuário.
 * @returns {Promise<import('firebase/auth').UserCredential>} - Credencial do usuário.
 */
export async function registerUser(name, email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
            await updateProfile(userCredential.user, { displayName: name });
        }
        await ensureUserProfile(userCredential.user, { displayName: name, email, avatarUrl: '' });
        return userCredential.user;
    } catch (error) {
        console.error("Erro ao registrar usuário:", error);
        throw error;
    }
}

/**
 * Faz login de um usuário com e-mail e senha.
 * @param {string} email - E-mail do usuário.
 * @param {string} password - Senha do usuário.
 * @returns {Promise<import('firebase/auth').UserCredential>} - Credencial do usuário.
 */
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Erro ao fazer login:", error);
        throw error;
    }
}

/**
 * Observa o estado de autenticação do usuário.
 * @param {function} callback - Função chamada quando o estado de autenticação muda.
 * @returns {import('firebase/auth').Unsubscribe}
 */
export function observeAuthState(callback) {
    return onAuthStateChanged(auth, callback);
}

export function isValidStorageDownloadUrl(url) {
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

// Exporta o db para uso em outros arquivos se necessário
export { db, auth, storage };

/**
 * Faz upload do avatar do usuário para o Firebase Storage.
 * @param {string} uid - ID do usuário.
 * @param {Blob} imageBlob - Blob da imagem.
 * @returns {Promise<string>} - URL de download da imagem.
 */
export async function uploadUserAvatar(uid, imageBlob) {
    try {
        const avatarRef = ref(storage, `avatars/${uid}/profile-picture`);
        await uploadBytes(avatarRef, imageBlob);
        const downloadUrl = await getDownloadURL(avatarRef);
        await updateUserProfileData(uid, { avatarUrl: downloadUrl });
        if (auth.currentUser?.uid === uid) {
            await updateProfile(auth.currentUser, { photoURL: downloadUrl });
        }
        console.log("Avatar enviado com sucesso:", downloadUrl);
        return downloadUrl;
    } catch (error) {
        console.error("Erro ao enviar avatar:", error);
        throw error;
    }
}

/**
 * Obtém a URL do avatar do usuário do Firebase Storage.
 * @param {string} uid - ID do usuário.
 * @returns {Promise<string|null>} - URL do avatar ou null se não existir.
 */
export async function getUserAvatarUrl(uid) {
    if (!uid) {
        return null;
    }

    try {
        const profileSnap = await getDoc(doc(db, 'users', uid));
        if (!profileSnap.exists()) {
            return null;
        }

        const profileData = profileSnap.data();
        const storedAvatarUrl = profileData?.avatarUrl;

        if (!storedAvatarUrl) {
            return null;
        }

        if (!isValidStorageDownloadUrl(storedAvatarUrl)) {
            await updateUserProfileData(uid, { avatarUrl: '' });
            return null;
        }

        return storedAvatarUrl;
    } catch (error) {
        console.error('Erro ao obter avatar do usuário:', error);
        return null;
    }
}

/**
 * Deleta o avatar do usuário do Firebase Storage.
 * @param {string} uid - ID do usuário.
 * @returns {Promise<void>}
 */
export async function deleteUserAvatar(uid) {
    try {
        const avatarRef = ref(storage, `avatars/${uid}/profile-picture`);
        await deleteObject(avatarRef);
        await updateUserProfileData(uid, { avatarUrl: '' });
        if (auth.currentUser?.uid === uid) {
            await updateProfile(auth.currentUser, { photoURL: null });
        }
        console.log("Avatar deletado com sucesso");
    } catch (error) {
        if (error.code === 'storage/object-not-found') {
            await updateUserProfileData(uid, { avatarUrl: '' });
            console.log("Avatar não encontrado no storage");
            return;
        }
        console.error("Erro ao deletar avatar:", error);
        throw error;
    }
}

export async function criarDenuncia(dados) {
    try {
        if (!dados.petId || !dados.motivo) {
            throw new Error('petId e motivo são campos obrigatórios na denúncia');
        }

        const docRef = await addDoc(collection(db, 'reports'), {
            petId: dados.petId,
            petName: dados.petName || '',
            reporterName: dados.reporterName || 'Anônimo',
            reporterEmail: dados.reporterEmail || '',
            motivo: dados.motivo,
            ownerIdentifier: dados.ownerIdentifier || '',
            dataCriacao: serverTimestamp(),
            resolvida: false
        });
        console.log('Denúncia criada com sucesso:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Erro ao registrar denúncia:', error);
        throw error;
    }
}

export async function buscarPetPorId(id) {
    try {
        const petRef = doc(db, 'pets', id);
        const snapshot = await getDoc(petRef);
        if (!snapshot.exists()) {
            return null;
        }

        return { id: snapshot.id, ...snapshot.data() };
    } catch (error) {
        console.error('Erro ao buscar pet por ID:', error);
        throw error;
    }
}

export async function togglePetLike(postId) {
    if (!postId) {
        throw new Error('ID do post é obrigatório para curtir.');
    }

    if (!auth.currentUser?.uid) {
        throw new Error('Você precisa estar autenticado para curtir.');
    }

    const userId = auth.currentUser.uid;
    const petRef = doc(db, 'pets', postId);
    const likeRef = doc(db, 'pets', postId, 'likes', userId);

    return runTransaction(db, async (transaction) => {
        const petSnapshot = await transaction.get(petRef);
        const likeSnapshot = await transaction.get(likeRef);

        const currentCount = Number(petSnapshot.data()?.likesCount || 0);
        const alreadyLiked = likeSnapshot.exists();

        if (alreadyLiked) {
            transaction.delete(likeRef);
            transaction.update(petRef, {
                likesCount: Math.max(0, currentCount - 1)
            });
            return { liked: false, count: Math.max(0, currentCount - 1) };
        }

        transaction.set(likeRef, {
            userId,
            createdAt: serverTimestamp()
        });

        transaction.update(petRef, {
            likesCount: currentCount + 1
        });

        return { liked: true, count: currentCount + 1 };
    });
}

export async function getPetLikeState(postId, userId = auth.currentUser?.uid) {
    if (!postId) {
        return { liked: false, count: 0 };
    }

    try {
        const likesRef = collection(db, 'pets', postId, 'likes');
        const likesSnapshot = await getDocs(likesRef);
        const count = likesSnapshot.size;

        if (!userId) {
            return { liked: false, count };
        }

        const likeRef = doc(db, 'pets', postId, 'likes', userId);
        const likeSnapshot = await getDoc(likeRef);

        return {
            liked: likeSnapshot.exists(),
            count
        };
    } catch (error) {
        console.error('Erro ao obter estado de curtidas:', error);
        return { liked: false, count: 0 };
    }
}

export function subscribeToPetLikes(postId, callback) {
    if (!postId) {
        callback({ liked: false, count: 0 });
        return () => {};
    }

    const likesRef = collection(db, 'pets', postId, 'likes');

    return onSnapshot(likesRef, (snapshot) => {
        const currentUserId = auth.currentUser?.uid || null;
        const count = snapshot.size;
        const liked = currentUserId ? snapshot.docs.some((docSnap) => docSnap.id === currentUserId) : false;

        callback({ liked, count });
    }, (error) => {
        console.error('Erro em onSnapshot de curtidas:', error);
        callback({ liked: false, count: 0 });
    });
}
