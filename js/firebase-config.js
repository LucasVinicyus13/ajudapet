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
    setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    onAuthStateChanged
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

export async function saveUserAvatarUrl(uid, avatarUrl) {
    if (!uid || !avatarUrl) return null;

    await updateUserProfileData(uid, { avatarUrl });
    return avatarUrl;
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

export async function saveUserAvatarString(uid, avatarUrl) {
    if (!uid || !avatarUrl) {
        throw new Error('UID e avatarUrl são obrigatórios.');
    }
    await updateUserProfileData(uid, { avatarUrl });
    if (auth.currentUser?.uid === uid) {
        await updateProfile(auth.currentUser, { photoURL: avatarUrl });
    }
    return avatarUrl;
}

/**
 * Obtém a URL do avatar do usuário do Firebase Storage.
 * @param {string} uid - ID do usuário.
 * @returns {Promise<string|null>} - URL do avatar ou null se não existir.
 */
export async function getUserAvatarUrl(uid) {
    try {
        const profileSnap = await getDoc(doc(db, 'users', uid));
        if (profileSnap.exists()) {
            const profileData = profileSnap.data();
            if (profileData?.avatarUrl) {
                return profileData.avatarUrl;
            }
        }

        const avatarRef = ref(storage, `avatars/${uid}/profile-picture`);
        return await getDownloadURL(avatarRef);
    } catch (error) {
        if (error.code === 'storage/object-not-found') {
            return null;
        }
        console.error("Erro ao obter avatar:", error);
        throw error;
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
