function appendLegalText(container, text) {
    const parts = text.split(/(\*\*.+?\*\*)/g);

    parts.forEach((part) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            const strong = document.createElement('strong');
            strong.textContent = part.slice(2, -2);
            container.append(strong);
        } else if (part) {
            container.append(document.createTextNode(part));
        }
    });
}

function renderLegalDocument(source, target) {
    const lines = source.textContent.trim().split('\n');
    let index = 0;

    while (index < lines.length) {
        const line = lines[index].trim();

        if (!line) {
            index += 1;
            continue;
        }

        if (line === '---') {
            target.append(document.createElement('hr'));
            index += 1;
            continue;
        }

        const heading = line.match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
            const level = Math.min(heading[1].length + 1, 4);
            const element = document.createElement(`h${level}`);
            appendLegalText(element, heading[2]);
            target.append(element);
            index += 1;
            continue;
        }

        if (line.startsWith('* ')) {
            const list = document.createElement('ul');
            while (index < lines.length && lines[index].trim().startsWith('* ')) {
                const item = document.createElement('li');
                appendLegalText(item, lines[index].trim().slice(2));
                list.append(item);
                index += 1;
            }
            target.append(list);
            continue;
        }

        const paragraph = document.createElement('p');
        const paragraphLines = [];
        while (index < lines.length && lines[index].trim() && lines[index].trim() !== '---'
            && !/^(#{1,3})\s+/.test(lines[index].trim()) && !lines[index].trim().startsWith('* ')) {
            paragraphLines.push(lines[index].trim());
            index += 1;
        }
        appendLegalText(paragraph, paragraphLines.join(' '));
        target.append(paragraph);
    }
}

const legalDialogs = [
    {
        modal: document.getElementById('terms-modal'),
        openButton: document.getElementById('terms-open-button'),
        document: document.getElementById('terms-document'),
        source: document.getElementById('terms-source')
    },
    {
        modal: document.getElementById('privacy-modal'),
        openButton: document.getElementById('privacy-open-button'),
        document: document.getElementById('privacy-document'),
        source: document.getElementById('privacy-source')
    }
];

legalDialogs.forEach(({ modal, openButton, document: content, source }) => {
    renderLegalDocument(source, content);

    const closeButton = modal.querySelector('[data-legal-close]');
    const close = () => {
        modal.classList.remove('visible');
        modal.setAttribute('aria-hidden', 'true');
        openButton.focus();
    };

    openButton.addEventListener('click', () => {
        modal.classList.add('visible');
        modal.setAttribute('aria-hidden', 'false');
        closeButton.focus();
    });

    closeButton.addEventListener('click', close);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) close();
    });
});

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    const openDialog = legalDialogs.find(({ modal }) => modal.classList.contains('visible'));
    if (openDialog) {
        openDialog.modal.querySelector('[data-legal-close]').click();
    }
});
