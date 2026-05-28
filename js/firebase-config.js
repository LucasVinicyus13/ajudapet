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
    updateDoc,
    doc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// CONFIGURAÇÃO DO FIREBASE (Substitua pelos seus dados do Console do Firebase)
const firebaseConfig = {
    apiKey: "AIzaSyBQtBupofTQGmMhHPWUwg8nwgJtvmG2AeE",
    authDomain: "ajudapet-e56a0.firebaseapp.com",
    projectId: "ajudapet-e56a0",
    storageBucket: "ajudapet-e56a0.firebasestorage.app",
    messagingSenderId: "226666378269",
    appId: "1:226666378269:web:e6cea8e9a3b7d578c482f4",
    measurementId: "G-04X4J0PPB0"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Cria um novo registro de animal no Firestore.
 * @param {Object} dados - Objeto contendo nome, cidade, descricao, status, imagem, telefone.
 * @returns {Promise<string>} - ID do documento criado.
 */
export async function criarPet(dados) {
    try {
        // Validação básica (regras do projeto)
        if (!dados.telefone || !dados.imagem) {
            throw new Error("Telefone e Imagem são obrigatórios.");
        }

        const docRef = await addDoc(collection(db, "pets"), {
            ...dados,
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
        const petRef = doc(db, "pets", id);
        await updateDoc(petRef, {
            ...dados,
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
export { db, auth };
