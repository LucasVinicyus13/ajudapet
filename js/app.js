/**
 * app.js - Lógica principal do AjudaPet
 * Responsável pela renderização do feed e interações do usuário.
 */

import { listarPetsPage, criarPet, criarDenuncia, auth, atualizarPet, storeLocalPet, removeLocalPet } from './firebase-config.js';
import { formatPhoneInput, normalizePhone } from './pet-utils.js';

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
        categoria: ['Gatos'],
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
let selectedCategoryValues = [];
let isSubmittingPet = false;

const PETS_PAGE_SIZE = 6;
let allPets = [];
let selectedFilterCategories = [];
let pendingFilterCategories = [];
let filterButton = null;
let filterModal = null;
let filterOptionsList = null;
let filterApplyButton = null;
let filterClearButton = null;
let filterCloseButton = null;
let lastVisiblePetDoc = null;
let hasMorePets = true;
let isLoadingPets = false;

let editingPetId = null;
let editingPetImageDataUrl = null;
let reportModal = null;
let reportReasonInputs = [];
let reportOtherReasonInput = null;
let currentReportPet = null;

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

function updateHiddenCategorySelect() {
    if (!categorySelect) return;
    Array.from(categorySelect.options).forEach((option) => {
        option.selected = selectedCategoryValues.includes(option.value);
    });
}

function syncCategoryPicker() {
    if (!categorySelect || !categorySelectedList || !categoryOptionsList) return;

    const selectedValues = [...selectedCategoryValues];
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

    Array.from(categorySelectedList.querySelectorAll('.category-chip-remove')).forEach((button) => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            toggleCategory(button.dataset.value);
        });
    });

    categoryOptionsList.innerHTML = '';
    CATEGORIES.forEach((value) => {
        if (selectedValues.includes(value)) return;

        const optionButton = document.createElement('button');
        optionButton.type = 'button';
        optionButton.className = 'category-option-pill';
        optionButton.setAttribute('aria-pressed', 'false');
        optionButton.dataset.value = value;
        optionButton.textContent = value;
        optionButton.addEventListener('click', (event) => {
            event.preventDefault();
            toggleCategory(value);
        });
        categoryOptionsList.appendChild(optionButton);
    });

    updateHiddenCategorySelect();
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

function addCategory(value) {
    const normalizedValue = String(value).trim();
    if (!normalizedValue || selectedCategoryValues.includes(normalizedValue)) {
        return;
    }

    selectedCategoryValues = [...selectedCategoryValues, normalizedValue];
    if (categorySelect) {
        updateHiddenCategorySelect();
    }
    syncCategoryPicker();
}

function removeCategory(value) {
    const normalizedValue = String(value).trim();
    if (!normalizedValue) {
        return;
    }

    selectedCategoryValues = selectedCategoryValues.filter((item) => item !== normalizedValue);
    if (categorySelect) {
        updateHiddenCategorySelect();
    }
    syncCategoryPicker();
}

function toggleCategory(value) {
    const normalizedValue = String(value).trim();
    const hasValue = selectedCategoryValues.includes(normalizedValue);

    if (hasValue) {
        removeCategory(normalizedValue);
    } else {
        addCategory(normalizedValue);
    }
}

function resetCategoryPicker() {
    if (!categorySelect) return;
    selectedCategoryValues = [];
    Array.from(categorySelect.options).forEach((option) => {
        option.selected = false;
    });
    syncCategoryPicker();
}

function getFilteredPets(pets) {
    if (!selectedFilterCategories.length) return pets;

    return pets.filter((pet) => getCategories(pet).some((category) => selectedFilterCategories.includes(category)));
}

function renderFilteredPets() {
    const filteredPets = getFilteredPets(allPets);
    const emptyMessage = selectedFilterCategories.length
        ? 'Nenhum animal encontrado para os filtros selecionados.'
        : 'Nenhum animal disponível no momento.';
    renderPets(sortPetsByUrgency(filteredPets), emptyMessage, false);
}

function updateFilterButtonText() {
    if (!filterButton) return;
    filterButton.textContent = selectedFilterCategories.length > 0
        ? `Filtros (${selectedFilterCategories.length})`
        : 'Filtros';
}

function renderFilterOptions() {
    if (!filterOptionsList) return;

    filterOptionsList.innerHTML = '';
    CATEGORIES.forEach((category) => {
        const optionRow = document.createElement('label');
        optionRow.className = 'filter-option-row';
        optionRow.innerHTML = `
            <input type="checkbox" value="${category}" ${pendingFilterCategories.includes(category) ? 'checked' : ''}>
            <span>${category}</span>
        `;
        filterOptionsList.appendChild(optionRow);
    });
}

function openFilterModal() {
    if (!filterModal) return;

    pendingFilterCategories = [...selectedFilterCategories];
    renderFilterOptions();
    filterModal.classList.add('visible');
    filterModal.setAttribute('aria-hidden', 'false');
}

function closeFilterModal() {
    if (!filterModal) return;

    filterModal.classList.remove('visible');
    filterModal.setAttribute('aria-hidden', 'true');
}

function applyFilterSelection() {
    selectedFilterCategories = [...pendingFilterCategories];
    updateFilterButtonText();
    renderFilteredPets();
    closeFilterModal();
}

async function initApp() {
    petModal = document.getElementById('pet-modal');
    modalImage = document.getElementById('modal-image');
    modalStatus = document.getElementById('modal-status');
    modalName = document.getElementById('modal-name');
    modalCity = document.getElementById('modal-city');
    modalDesc = document.getElementById('modal-desc');
    modalHelpBtn = document.getElementById('modal-help-btn');
    reportModal = document.getElementById('report-modal');
    reportReasonInputs = Array.from(document.querySelectorAll('input[name="report-reason"]'));
    reportOtherReasonInput = document.getElementById('report-other-reason');

    filterButton = document.getElementById('filter-toggle-button');
    filterModal = document.getElementById('filter-modal');
    filterOptionsList = document.getElementById('filter-options-list');
    filterApplyButton = document.getElementById('filter-apply-button');
    filterClearButton = document.getElementById('filter-clear-button');
    filterCloseButton = document.getElementById('filter-close-button');

    window.addEventListener('scroll', () => {
        if (!hasMorePets || isLoadingPets) return;
        if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 500)) {
            void loadPets();
        }
    });

    const modalCloseButton = document.getElementById('modal-close');
    if (modalCloseButton) {
        modalCloseButton.addEventListener('click', closeModal);
    }

    const reportCloseButton = document.getElementById('report-close-button');
    if (reportCloseButton) {
        reportCloseButton.addEventListener('click', closeReportModal);
    }

    const reportCancelButton = document.getElementById('report-cancel-button');
    if (reportCancelButton) {
        reportCancelButton.addEventListener('click', closeReportModal);
    }

    const reportForm = document.getElementById('report-form');
    if (reportForm) {
        reportForm.addEventListener('submit', submitReport);
    }

    if (reportModal) {
        reportModal.addEventListener('click', (event) => {
            if (event.target === reportModal) {
                closeReportModal();
            }
        });
    }

    if (petModal) {
        petModal.addEventListener('click', (event) => {
            if (event.target === petModal) {
                closeModal();
            }
        });
    }

    if (modalHelpBtn) {
        modalHelpBtn.addEventListener('click', () => {
            if (selectedModalPet) {
                window.ajudarPet(getWhatsAppPhone(selectedModalPet), selectedModalPet.nome);
            }
        });
    }

    if (filterButton) {
        filterButton.addEventListener('click', openFilterModal);
    }

    if (filterCloseButton) {
        filterCloseButton.addEventListener('click', closeFilterModal);
    }

    if (filterModal) {
        filterModal.addEventListener('click', (event) => {
            if (event.target === filterModal) {
                closeFilterModal();
            }
        });
    }

    if (filterOptionsList) {
        filterOptionsList.addEventListener('change', (event) => {
            if (event.target.matches('input[type="checkbox"]')) {
                const value = event.target.value;
                if (event.target.checked) {
                    if (!pendingFilterCategories.includes(value)) {
                        pendingFilterCategories.push(value);
                    }
                } else {
                    pendingFilterCategories = pendingFilterCategories.filter((category) => category !== value);
                }
            }
        });
    }

    if (filterApplyButton) {
        filterApplyButton.addEventListener('click', applyFilterSelection);
    }

    if (filterClearButton) {
        filterClearButton.addEventListener('click', () => {
            pendingFilterCategories = [];
            renderFilterOptions();
            applyFilterSelection();
        });
    }

    updateFilterButtonText();

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

function renderPets(pets, emptyMessage = 'Nenhum animal disponível no momento.', append = false) {
    const feedContainer = document.getElementById('pet-feed');
    if (!feedContainer) return;

    if (!append) {
        feedContainer.innerHTML = '';
    }

    if (!pets || pets.length === 0) {
        if (!append) {
            feedContainer.innerHTML = `<div class="loading">${emptyMessage}</div>`;
        }
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
            <div class="pet-card-actions">
                <button type="button" class="btn-ajudar btn-ajudar-inline" data-pet-help-btn>AJUDAR</button>
                <button type="button" class="btn-report" data-pet-report-btn>Denunciar</button>
            </div>
        </div>
    `;

    const petImage = card.querySelector('img');
    attachImageFallback(petImage);

    const helpButton = card.querySelector('[data-pet-help-btn]');
    if (helpButton) {
        helpButton.addEventListener('click', (event) => {
            event.stopPropagation();
            window.ajudarPet(getWhatsAppPhone(pet), pet.nome);
        });
    }

    const reportButton = card.querySelector('[data-pet-report-btn]');
    if (reportButton) {
        reportButton.addEventListener('click', (event) => {
            event.stopPropagation();
            openReportModal(pet);
        });
    }

    card.addEventListener('click', (e) => {
        if (!e.target.closest('[data-pet-help-btn]') && !e.target.closest('[data-pet-report-btn]')) {
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

    const reportButton = document.getElementById('modal-report-btn');
    if (reportButton) {
        reportButton.onclick = () => openReportModal(pet);
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

function getWhatsAppPhone(pet) {
    const rawValue = pet?.telefone || pet?.contato || '';
    return normalizePhone(rawValue);
}

function openReportModal(pet) {
    if (!reportModal) {
        reportModal = document.getElementById('report-modal');
        reportReasonInputs = Array.from(document.querySelectorAll('input[name="report-reason"]'));
        reportOtherReasonInput = document.getElementById('report-other-reason');
    }

    if (!reportModal) return;

    currentReportPet = pet;
    const reportPetName = document.getElementById('report-pet-name');
    if (reportPetName) {
        reportPetName.textContent = pet?.nome || 'este post';
    }

    if (reportOtherReasonInput) {
        reportOtherReasonInput.value = '';
        reportOtherReasonInput.parentElement.classList.remove('visible');
    }

    reportReasonInputs.forEach((input) => {
        input.checked = false;
        input.onchange = () => {
            if (reportOtherReasonInput) {
                reportOtherReasonInput.parentElement.classList.toggle('visible', input.value === 'Outro');
            }
        };
    });

    reportModal.classList.add('visible');
    reportModal.setAttribute('aria-hidden', 'false');
}

function closeReportModal() {
    if (!reportModal) return;
    reportModal.classList.remove('visible');
    reportModal.setAttribute('aria-hidden', 'true');
    currentReportPet = null;
}

async function submitReport(event) {
    event.preventDefault();

    if (!currentReportPet) return;

    if (!auth.currentUser) {
        alert('Você precisa estar logado para denunciar um post.');
        return;
    }

    const selectedReasonInput = document.querySelector('input[name="report-reason"]:checked');
    const selectedReason = selectedReasonInput ? selectedReasonInput.value : '';
    const customReason = reportOtherReasonInput ? reportOtherReasonInput.value.trim() : '';
    const motivo = selectedReason === 'Outro' ? customReason : selectedReason;

    if (!motivo) {
        alert('Selecione um motivo e descreva o detalhe, quando necessário.');
        return;
    }

    const reporterName = auth.currentUser.displayName || auth.currentUser.email || 'Usuário sem nome';
    const reporterEmail = auth.currentUser.email || '';
    const petOwner = currentReportPet.ownerEmail || currentReportPet.ownerUid || 'usuário';
    const reportPayload = {
        petId: currentReportPet.id,
        petName: currentReportPet.nome,
        reporterName,
        reporterEmail,
        motivo,
        ownerIdentifier: petOwner
    };

    try {
        const reportId = await criarDenuncia(reportPayload);
        console.log('Denúncia registrada com ID:', reportId);
        
        const subject = encodeURIComponent(`Denúncia registrada no post de ${petOwner}`);
        const body = encodeURIComponent(`Uma denuncia foi registrada no post de ${petOwner}, pelo motivo de ${motivo}\n\nVerificar post: ${window.location.origin}/pages/verificar-post.html?id=${currentReportPet.id}`);
        
        // Fechar modal antes de abrir mailto (que será tratado pelo navegador)
        closeReportModal();
        
        // Abrir cliente de e-mail com as informações
        setTimeout(() => {
            window.location.href = `mailto:ajudapet.contato@gmail.com?subject=${subject}&body=${body}`;
        }, 500);
        
        alert('Denúncia registrada com sucesso! Um e-mail de notificação será enviado.');\n    } catch (error) {\n        console.error('❌ Erro completo ao registrar denúncia:', error);\n        console.error('Código de erro:', error?.code);\n        console.error('Mensagem:', error?.message);\n        alert('Não foi possível registrar a denúncia. Verifique sua conexão e tente novamente.\\nErro: ' + (error?.message || 'desconhecido'));\n    }
}

function openAddPetModal() {
    const modal = document.getElementById('add-pet-modal');
    if (!modal) return;
    resetCategoryPicker();
    editingPetId = null;
    editingPetImageDataUrl = null;
    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
}

function openAddPetModalWithData(pet) {
    const modal = document.getElementById('add-pet-modal');
    if (!modal) return;
    resetCategoryPicker();
    // garante que o select esteja populado
    populateCategorySelect();

    if (pet) {
        editingPetId = pet.id || null;
        editingPetImageDataUrl = pet.imagem || null;

        const nameInput = document.getElementById('addpet-name');
        const ageInput = document.getElementById('addpet-age');
        const cityInput = document.getElementById('addpet-city');
        const statusInput = document.getElementById('addpet-status');
        const descInput = document.getElementById('addpet-desc');
        const contactInput = document.getElementById('addpet-contact');

        if (nameInput) nameInput.value = pet.nome || '';
        if (ageInput) ageInput.value = pet.idade || '';
        if (cityInput) cityInput.value = pet.cidade || '';
        if (statusInput) statusInput.value = pet.status || 'resgate';
        if (descInput) descInput.value = pet.descricao || '';
        if (contactInput) {
            contactInput.value = pet.contato || formatPhoneInput(pet.telefone || '');
        }

        // select categories (aceita array ou string) - case-insensitive
        if (pet.categoria) {
            console.debug('Abrindo modal para editar pet:', pet.id, pet.categoria);
            let categorias = [];
            if (Array.isArray(pet.categoria)) {
                categorias = pet.categoria.map((c) => String(c).trim());
            } else if (typeof pet.categoria === 'string') {
                categorias = pet.categoria.split(',').map((c) => c.trim()).filter(Boolean);
            }
            const normalized = categorias.map((c) => c.toLowerCase());
            selectedCategoryValues = categorias.filter((categoria) => normalized.includes(categoria.toLowerCase()));
            Array.from(categorySelect.options).forEach((option) => {
                option.selected = selectedCategoryValues.includes(option.value);
            });
            syncCategoryPicker();
        }
    } else {
        editingPetId = null;
        editingPetImageDataUrl = null;
    }

    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
    const nameInput = document.getElementById('addpet-name');
    if (nameInput) nameInput.focus();
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

    const cancelButton = document.getElementById('add-pet-cancel');
    const contactInput = document.getElementById('addpet-contact');
    const modal = document.getElementById('add-pet-modal');

    categorySelect = document.getElementById('addpet-category');
    categorySelectedList = document.getElementById('category-selected-list');
    categoryOptionsList = document.getElementById('category-options-list');

    if (!form || !modal || !categorySelect || !categorySelectedList || !categoryOptionsList) return;

    populateCategorySelect();
    syncCategoryPicker();

    if (contactInput) {
        contactInput.addEventListener('input', (event) => {
            const formattedValue = formatPhoneInput(event.target.value);
            if (event.target.value !== formattedValue) {
                event.target.value = formattedValue;
            }
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            closeAddPetModal();
            resetCategoryPicker();
            form.reset();
        });
    }

    // remover o fechamento ao clicar fora do modal de adicionar/editar
    // somente fechar com o botão Cancelar ou pelo envio do formulário
    // nenhum listener de clique externo é necessário aqui

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        const submitButtonText = submitButton ? submitButton.textContent : null;
        const setSubmitting = (submitting) => {
            if (!submitButton) return;
            submitButton.disabled = submitting;
            submitButton.classList.toggle('loading', submitting);
            submitButton.textContent = submitting ? 'Enviando...' : submitButtonText;
        };

        if (isSubmittingPet || (submitButton && submitButton.disabled)) {
            return;
        }

        isSubmittingPet = true;
        setSubmitting(true);

        const imageInput = document.getElementById('addpet-image');
        const nameInput = document.getElementById('addpet-name');
        const ageInput = document.getElementById('addpet-age');
        const cityInput = document.getElementById('addpet-city');
        const statusInput = document.getElementById('addpet-status');
        const descInput = document.getElementById('addpet-desc');
        const contactInput = document.getElementById('addpet-contact');

        const selectedCategories = [...selectedCategoryValues];

        let imagem = null;
        if (imageInput.files.length) {
            const file = imageInput.files[0];
            imagem = await fileToDataUrl(file);
        } else if (editingPetImageDataUrl) {
            imagem = editingPetImageDataUrl;
        }

        if (!imagem) {
            alert('Envie uma foto do animal.');
            isSubmittingPet = false;
            setSubmitting(false);
            return;
        }

        if (selectedCategoryValues.length === 0) {
            alert('Selecione pelo menos uma categoria.');
            isSubmittingPet = false;
            setSubmitting(false);
            return;
        }

        const nome = nameInput.value.trim();
        const idade = ageInput.value.trim();
        const cidade = cityInput.value.trim();
        const status = statusInput.value;
        const categoria = selectedCategories;
        const descricao = descInput.value.trim();
        const contato = formatPhoneInput(contactInput ? contactInput.value : '');
        const telefone = normalizePhone(contato);
        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert('Faça login para publicar um animal.');
            isSubmittingPet = false;
            setSubmitting(false);
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
            contato,
            telefone,
            ownerEmail: currentUser.email,
            ownerUid: currentUser.uid
        };

        setSubmitting(true);
        try {
            if (editingPetId) {
                await atualizarPet(editingPetId, petData);
            } else {
                await criarPet(petData);
            }
            closeAddPetModal();
            form.reset();
            resetCategoryPicker();
            await loadPets();
            window.location.reload();
        } catch (error) {
            console.error('Erro ao publicar pet:', error);
            const permissionDenied = error && ((error.code && error.code.includes('permission')) || (error.message && error.message.toLowerCase().includes('permission')) || (error.message && error.message.toLowerCase().includes('insufficient permissions')));
            if (permissionDenied) {
                alert('Permissão negada ao salvar no Firebase. As alterações foram aplicadas localmente.');
                if (editingPetId) {
                    storeLocalPet({ id: editingPetId, ...petData });
                } else {
                    const tempId = `local-${Date.now()}`;
                    storeLocalPet({ id: tempId, ...petData });
                }
                closeAddPetModal();
                form.reset();
                resetCategoryPicker();
                await loadPets();
                return;
            }
            alert('Não foi possível publicar o animal. Tente novamente.');
        } finally {
            isSubmittingPet = false;
            setSubmitting(false);
        }
    });
}

async function loadPets(reset = false) {
    if (isLoadingPets) return;
    isLoadingPets = true;

    const feedContainer = document.getElementById('pet-feed');
    if (reset && feedContainer) {
        feedContainer.innerHTML = '<div class="loading">Carregando animais...</div>';
    }

    if (reset) {
        allPets = [];
        lastVisiblePetDoc = null;
        hasMorePets = true;
    }

    if (!hasMorePets) {
        isLoadingPets = false;
        return;
    }

    try {
        const result = await listarPetsPage(PETS_PAGE_SIZE, lastVisiblePetDoc);
        const newPets = (result && result.pets && result.pets.length > 0) ? result.pets : [];

        if (reset) {
            allPets = newPets;
            renderFilteredPets();
        } else {
            allPets = [...allPets, ...newPets];
            renderPets(sortPetsByUrgency(getFilteredPets(allPets)), 'Nenhum animal disponível no momento.', false);
        }

        lastVisiblePetDoc = result.lastVisibleDoc;
        hasMorePets = result.hasMore;
        if (!hasMorePets && allPets.length === 0 && feedContainer) {
            feedContainer.innerHTML = '<div class="loading">Nenhum animal disponível no momento.</div>';
        }
    } catch (error) {
        console.error('Erro ao carregar pets do Firebase:', error);
        if (allPets.length === 0) {
            allPets = MOCK_PETS;
            renderFilteredPets();
        }
    } finally {
        isLoadingPets = false;
    }

    updateFilterButtonText();
    // Notifica outras partes da aplicação que os pets foram recarregados
    try {
        document.dispatchEvent(new CustomEvent('petsUpdated'));
    } catch (e) {
        // fallback
        document.dispatchEvent(new Event('petsUpdated'));
    }
}

function getLoginPagePath() {
    return window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
}

/**
 * Abre o WhatsApp com uma mensagem automática para ajudar o animal.
 * @param {string} telefone - O número de telefone formatado
 * @param {string} nomePet - O nome do animal
 * @returns {void}
 */
window.ajudarPet = function (telefone, nomePet) {
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
    const whatsappUrl = `https://wa.me/${telefoneLimpo}?text=${mensagem}`;
    window.open(whatsappUrl, '_blank');
};

window.openAddPetModal = openAddPetModal;
window.openAddPetModalForEdit = openAddPetModalWithData;
window.loadPets = loadPets;
window.openReportModal = openReportModal;

window.addEventListener('DOMContentLoaded', initApp);
