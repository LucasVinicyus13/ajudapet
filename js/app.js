/**
 * app.js - Lógica principal do AjudaPet
 * Responsável pela renderização do feed e interações do usuário.
 */

// Importa a função de listagem do Firebase
import { listarPets } from './firebase-config.js';

// Dados mockados (mantidos como fallback caso o banco esteja vazio)
const MOCK_PETS = [
    {
        id: '1',
        nome: 'Thor',
        cidade: 'São Paulo, SP',
        status: 'urgente',
        imagem: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400',
        telefone: '5511999999999'
    }
];

/**
 * Inicializa a aplicação ao carregar o DOM.
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Tenta buscar dados reais do Firebase
        const realPets = await listarPets();

        // Se houver dados no Firebase, renderiza-os. Caso contrário, usa os mocks.
        if (realPets && realPets.length > 0) {
            renderPets(realPets);
        } else {
            console.log("Nenhum pet encontrado no Firebase. Exibindo dados de exemplo.");
            renderPets(MOCK_PETS);
        }
    } catch (error) {
        console.error("Erro ao carregar pets do Firebase:", error);
        renderPets(MOCK_PETS);
    }
});

/**
 * Renderiza a lista de animais no container do feed.
 * @param {Array} pets - Array de objetos contendo os dados dos animais.
 * @returns {void}
 */
function renderPets(pets) {
    const feedContainer = document.getElementById('pet-feed');

    if (!feedContainer) return;

    // Limpa o container
    feedContainer.innerHTML = '';

    // Itera sobre cada pet e adiciona ao feed
    pets.forEach(pet => {
        const petCard = renderPetCard(pet);
        feedContainer.appendChild(petCard);
    });
}

/**
 * Cria o elemento HTML de um card de animal.
 * @param {Object} pet - Objeto com os dados do animal.
 * @returns {HTMLElement} - O elemento DOM do card.
 */
function renderPetCard(pet) {
    const card = document.createElement('div');
    card.className = 'pet-card';

    card.innerHTML = `
        <span class="pet-status status-${pet.status}">${pet.status}</span>
        <img src="${pet.imagem}" alt="${pet.nome}" loading="lazy">
        <div class="pet-info">
            <p class="pet-city">${pet.cidade}</p>
            <h3 class="pet-name">${pet.nome}</h3>
            <button class="btn-ajudar" onclick="ajudarPet('${pet.telefone}', '${pet.nome}')">
                AJUDAR
            </button>
        </div>
    `;

    // Evento para abrir detalhes
    card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('btn-ajudar')) {
            abrirDetalhes(pet.id);
        }
    });

    return card;
}

/**
 * Redireciona para a página de detalhes do animal.
 * @param {string} id - O identificador único do animal.
 * @returns {void}
 */
function abrirDetalhes(id) {
    // Armazena o ID no localStorage para a página de detalhes ler
    localStorage.setItem('selectedPetId', id);
    window.location.href = `pages/detalhes.html`;
}

/**
 * Abre o WhatsApp com uma mensagem automática para ajudar o animal.
 * @param {string} telefone - O número de telefone formatado
 * @param {string} nomePet - O nome do animal
 * @returns {void}
 */
window.ajudarPet = function (telefone, nomePet) {
    const mensagem = encodeURIComponent(`Olá! Vi o ${nomePet} no AjudaPet e gostaria de saber como posso ajudar.`);
    const whatsappUrl = `https://wa.me/${telefone}?text=${mensagem}`;
    window.open(whatsappUrl, '_blank');
}
