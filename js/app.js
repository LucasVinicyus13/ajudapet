/**
 * app.js - Lógica principal do AjudaPet
 * Responsável pela renderização do feed e interações do usuário.
 */

import { listarPets, criarPet, auth } from './firebase-config.js';

const CATEGORIES = [
    'Pequeno Porte',
    'Médio Porte',
    'Grande Porte',
    'Cachorros',
    'Gatos',
    'Pássaros',
    'Mamíferos',
    'Carnívoros'
];

const FALLBACK_IMAGE = './assets/images/placeholder.svg';

const MOCK_PETS = [
    {
        id: '1',
        nome: 'Thor',
        idade: '3 anos',
        cidade: 'São Paulo, SP',
        status: 'urgente',
        categoria: ['Cachorros', 'Grande Porte'],
        descricao: 'Encontrado em um terreno baldio, fraco e com muita sede. Precisa de ração e carinho para se recuperar.',
        imagem: './assets/images/thor.jpg',
        telefone: '5511999999999'
    },
    {
        id: '2',
        nome: 'Loki',
        idade: '1 ano',
        cidade: 'Curitiba, PR',
        status: 'resgate',
        categoria: ['Médio Porte', 'Cachorros'],
        descricao: 'Cachorrinho encontrado desabrigado na rua, precisa de um lar seguro e cuidados veterinários.',
        imagem: './assets/images/loki.jpg',
        telefone: '5541999998888'
    },
    {
        id: '3',
        nome: 'Zeus',
        idade: '2 anos',
        cidade: 'Maringá, PR',
        status: 'adotado',
        categoria: ['Gatos', 'Pequeno Porte'],
        descricao: 'Gatinho gentil que já passou por resgate. Está pronto para morar com uma família amorosa.',
        imagem: './assets/images/zeus.jpg',
        telefone: '5544999997777'
    },
    {
        id: '4',
        nome: 'Pipoca',
        idade: '8 meses',
        cidade: 'Londrina, PR',
        status: 'resgate',
        categoria: ['Pequeno Porte', 'Mamíferos'],
        descricao: 'Jovem cãozinho encontrado em frente a um supermercado, precisa de ajuda para vacinar e ganhar peso.',
        imagem: './assets/images/pipoca.jpg',
        telefone: '5543999996666'
    },
    {
        id: '5',
        nome: 'Destruidor de Universos',
        idade: '4 anos',
        cidade: 'Foz do Iguaçu, PR',
        status: 'urgente',
        categoria: ['Cachorros', 'Carnívoros'],
        descricao: 'Cachorrinho muito doce encontrado machucado, precisa de atendimento urgente e nova casa.',
        imagem: './assets/images/destruidor.jpg',
        telefone: '5541999995555'
    },
    {
        id: '6',
        nome: 'Sol',
        idade: '9 meses',
        cidade: 'Ponta Grossa, PR',
        status: 'adotado',
        categoria: ['Gatos', 'Pássaros'],
        descricao: 'Gatinho brincalhão resgatado de um canteiro de obras, busca família que o adote com carinho.',
        imagem: './assets/images/sol.jpg',
        telefone: '5541999994444'
    }
];

let petModal = null;
let modalImage = null;
let modalStatus = null;
let modalName = null;
let modalCity = null;
let modalDesc = null;
let modalHelpBtn = null;
let selectedModalPet = null;

let categorySelect = null;
let categorySelectedList = null;
let categoryOptionsList = null;

function attachImageFallback(imageElement) {
    if (!imageElement) return;

    imageElement.addEventListener('error', () => {
        imageElement.src = FALLBACK_IMAGE;
        imageElement.alt = 'Imagem indisponível';
        imageElement.onerror = null;
    }, { once: true });
}

function getCategories(pet) {
    if (Array.isArray(pet.categoria)) {
        return pet.categoria.filter(Boolean);
    }

    if (typeof pet.categoria === 'string') {
        return pet.categoria
            .split(',')
            .map((categoria) => categoria.trim())
            .filter(Boolean);
    }

    return [];
}

function formatCategories(pet) {
    return getCategories(pet).join(', ');
}

function syncCategoryPicker() {
    if (!categorySelect || !categorySelectedList || !categoryOptionsList) return;

    const selectedValues = Array.from(categorySelect.selectedOptions).map((option) => option.value);
    categorySelectedList.innerHTML = '';

    if (selectedValues.length === 0) {
        categorySelectedList.innerHTML = '<span class="category-empty">Nenhuma categoria selecionada</span>';
    } else {
        selectedValues.forEach((value) => {
            const chip = document.createElement('div');
            chip.className = 'category-chip';
            chip.innerHTML = `
                <span>${value}</span>
                <button type="button" class="category-chip-remove" data-value="${value}" aria-label="Remover ${value}">×</button>
            `;
            categorySelectedList.appendChild(chip);
        });
    }

    categoryOptionsList.innerHTML = '';
    CATEGORIES.forEach((value) => {
        if (selectedValues.includes(value)) return;

        const optionButton = document.createElement('button');
        optionButton.type = 'button';
        optionButton.className = 'category-option-pill';
        optionButton.dataset.value = value;
        optionButton.textContent = value;
        categoryOptionsList.appendChild(optionButton);
    });
}

function populateCategorySelect() {
    if (!categorySelect) return;
    categorySelect.innerHTML = '';
    CATEGORIES.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        categorySelect.appendChild(option);
    });
}

function toggleCategory(value) {
    if (!categorySelect) return;

    const option = Array.from(categorySelect.options).find((item) => item.value === value);
    if (!option) return;

    option.selected = !option.selected;
    syncCategoryPicker();
}

function resetCategoryPicker() {
    if (!categorySelect) return;
    Array.from(categorySelect.options).forEach((option) => {
        option.selected = false;
    });
    syncCategoryPicker();
}

async function initApp() {
    petModal = document.getElementById('pet-modal');
    modalImage = document.getElementById('modal-image');
    modalStatus = document.getElementById('modal-status');
    modalName = document.getElementById('modal-name');
    modalCity = document.getElementById('modal-city');
    modalDesc = document.getElementById('modal-desc');
    modalHelpBtn = document.getElementById('modal-help-btn');

    document.getElementById('modal-close').addEventListener('click', closeModal);
    petModal.addEventListener('click', (event) => {
        if (event.target === petModal) {
            closeModal();
        }
    });
    modalHelpBtn.addEventListener('click', () => {
        if (selectedModalPet) {
            window.ajudarPet(selectedModalPet.telefone, selectedModalPet.nome);
        }
    });

    await initAddPetForm();
    await loadPets();
}

function sortPetsByUrgency(pets) {
    const priority = {
        urgente: 1,
        resgate: 2,
        adotado: 3
    };

    return [...pets].sort((a, b) => {
        const statusA = (a.status || 'resgate').toLowerCase();
        const statusB = (b.status || 'resgate').toLowerCase();
        return (priority[statusA] || 4) - (priority[statusB] || 4) || (a.nome || '').localeCompare(b.nome || '');
    });
}

function renderPets(pets) {
    const feedContainer = document.getElementById('pet-feed');
    if (!feedContainer) return;
    feedContainer.innerHTML = '';

    if (!pets || pets.length === 0) {
        feedContainer.innerHTML = '<div class="loading">Nenhum animal disponível no momento.</div>';
        return;
    }

    pets.forEach(pet => {
        const petCard = renderPetCard(pet);
        feedContainer.appendChild(petCard);
    });
}

function renderPetCard(pet) {
    const card = document.createElement('div');
    const categorias = formatCategories(pet);
    card.className = 'pet-card';
    card.innerHTML = `
        <span class="pet-status status-${pet.status}">${pet.status}</span>
        <img src="${pet.imagem || FALLBACK_IMAGE}" alt="${pet.nome}" loading="lazy">
        <div class="pet-info">
            <p class="pet-city">${pet.cidade}</p>
            <h3 class="pet-name">${pet.nome}</h3>
            <p class="pet-category">${categorias}</p>
            <button class="btn-ajudar" onclick="ajudarPet('${pet.telefone}', '${pet.nome}')">
                AJUDAR
            </button>
        </div>
    `;

    const petImage = card.querySelector('img');
    attachImageFallback(petImage);

    card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('btn-ajudar')) {
            abrirDetalhes(pet);
        }
    });

    return card;
}

function abrirDetalhes(pet) {
    selectedModalPet = pet;
    openModal(pet);
}

function openModal(pet) {
    if (!petModal) return;
    modalImage.src = pet.imagem || FALLBACK_IMAGE;
    modalImage.alt = pet.nome;
    attachImageFallback(modalImage);
    modalStatus.textContent = pet.status;
    modalStatus.className = `pet-status status-${pet.status} detail-status`;
    modalName.textContent = pet.nome;
    modalCity.textContent = pet.cidade;
    modalDesc.textContent = pet.descricao || 'Sem descrição disponível.';
    const modalCategory = document.getElementById('modal-category');
    if (modalCategory) {
        modalCategory.textContent = formatCategories(pet);
    }

    petModal.classList.add('visible');
    petModal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
    if (!petModal) return;
    petModal.classList.remove('visible');
    petModal.setAttribute('aria-hidden', 'true');
    selectedModalPet = null;
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function openAddPetModal() {
    const modal = document.getElementById('add-pet-modal');
    if (!modal) return;
    resetCategoryPicker();
    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
}

function closeAddPetModal() {
    const modal = document.getElementById('add-pet-modal');
    if (!modal) return;
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
}

async function initAddPetForm() {
    const form = document.getElementById('add-pet-form');
    const closeButton = document.getElementById('add-pet-close');
    const modal = document.getElementById('add-pet-modal');

    categorySelect = document.getElementById('addpet-category');
    categorySelectedList = document.getElementById('category-selected-list');
    categoryOptionsList = document.getElementById('category-options-list');

    if (!form || !closeButton || !modal || !categorySelect || !categorySelectedList || !categoryOptionsList) return;

    populateCategorySelect();
    syncCategoryPicker();

    const categoryPicker = document.getElementById('category-picker');
    categoryPicker.addEventListener('click', (event) => {
        const optionButton = event.target.closest('.category-option-pill');
        if (optionButton) {
            toggleCategory(optionButton.dataset.value);
            return;
        }

        const removeButton = event.target.closest('.category-chip-remove');
        if (removeButton) {
            toggleCategory(removeButton.dataset.value);
        }
    });

    closeButton.addEventListener('click', () => {
        closeAddPetModal();
        resetCategoryPicker();
        form.reset();
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeAddPetModal();
            resetCategoryPicker();
            form.reset();
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const imageInput = document.getElementById('addpet-image');
        const nameInput = document.getElementById('addpet-name');
        const ageInput = document.getElementById('addpet-age');
        const cityInput = document.getElementById('addpet-city');
        const statusInput = document.getElementById('addpet-status');
        const descInput = document.getElementById('addpet-desc');

        const selectedCategories = Array.from(categorySelect.selectedOptions).map((option) => option.value);

        if (!imageInput.files.length) {
            alert('Envie uma foto do animal.');
            return;
        }

        if (selectedCategories.length === 0) {
            alert('Selecione pelo menos uma categoria.');
            return;
        }

        const file = imageInput.files[0];
        const imagem = await fileToDataUrl(file);
        const nome = nameInput.value.trim();
        const idade = ageInput.value.trim();
        const cidade = cityInput.value.trim();
        const status = statusInput.value;
        const categoria = selectedCategories;
        const descricao = descInput.value.trim();
        const telefone = '55999999999';

        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert('Faça login para publicar um animal.');
            return;
        }

        const petData = {
            nome,
            idade,
            cidade,
            status,
            categoria,
            descricao,
            imagem,
            telefone,
            ownerEmail: currentUser.email,
            ownerUid: currentUser.uid
        };

        try {
            await criarPet(petData);
            closeAddPetModal();
            form.reset();
            resetCategoryPicker();
            await loadPets();
        } catch (error) {
            console.error('Erro ao publicar pet:', error);
            alert('Não foi possível publicar o animal. Tente novamente.');
        }
    });
}

async function loadPets() {
    try {
        const realPets = await listarPets();
        if (realPets && realPets.length > 0) {
            renderPets(sortPetsByUrgency(realPets));
        } else {
            console.log('Nenhum pet encontrado no Firebase. Exibindo dados de exemplo.');
            renderPets(sortPetsByUrgency(MOCK_PETS));
        }
    } catch (error) {
        console.error('Erro ao carregar pets do Firebase:', error);
        renderPets(sortPetsByUrgency(MOCK_PETS));
    }
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
};

window.openAddPetModal = openAddPetModal;

window.addEventListener('DOMContentLoaded', initApp);
