export function formatPhoneInput(value = '') {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 2) {
    return digits ? `(${digits}` : '';
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function normalizePhone(value = '') {
  return String(value || '').replace(/\D/g, '').slice(0, 11);
}

export function getDataUrlSizeInBytes(dataUrl = '') {
  if (!dataUrl || typeof dataUrl !== 'string') return 0;

  const separatorIndex = dataUrl.indexOf(',');
  if (separatorIndex === -1) return 0;

  const base64 = dataUrl.slice(separatorIndex + 1);
  if (!base64) return 0;

  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.ceil((base64.length * 3) / 4) - padding;
}

export function shouldCompressImageDataUrl(dataUrl = '', maxBytes = 1048487) {
  return getDataUrlSizeInBytes(dataUrl) > maxBytes;
}

export async function compressImageDataUrl(dataUrl = '', { maxWidth = 1200, quality = 0.70, targetBytes = 900000, maxAttempts = 12 } = {}) {
  if (typeof window === 'undefined' || typeof window.document === 'undefined') {
    return dataUrl;
  }

  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
    return dataUrl;
  }

  let currentDataUrl = dataUrl;
  let currentQuality = quality;
  let currentMaxWidth = maxWidth;

  const sizeUnderLimit = (url) => !shouldCompressImageDataUrl(url, targetBytes);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (sizeUnderLimit(currentDataUrl)) {
      return currentDataUrl;
    }

    const img = new Image();
    img.src = currentDataUrl;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Não foi possível processar a imagem.'));
    });

    const canvas = document.createElement('canvas');
    const scale = Math.min(1, currentMaxWidth / Math.max(img.width, 1));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));

    const context = canvas.getContext('2d');
    if (!context) {
      return currentDataUrl;
    }

    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    currentDataUrl = canvas.toDataURL('image/jpeg', currentQuality);

    if (sizeUnderLimit(currentDataUrl)) {
      return currentDataUrl;
    }

    currentQuality = Math.max(0.05, currentQuality - 0.08);
    currentMaxWidth = Math.max(180, Math.round(currentMaxWidth * 0.70));
  }

  // Última tentativa agressiva com qualidade mínima
  try {
    const img = new Image();
    img.src = currentDataUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Não foi possível processar a imagem.'));
    });

    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 180 / Math.max(img.width, 1));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      currentDataUrl = canvas.toDataURL('image/jpeg', 0.05);
    }
  } catch {
    // se falhar, devolve a última versão possível
  }

  return currentDataUrl;
}

export function isAdminEmail(email = '') {
  return String(email || '').trim().toLowerCase() === 'lucasvinicyussanches@gmail.com';
}

export function formatDateTime(value) {
  if (!value) return '';

  let date;
  if (value instanceof Date) {
    date = value;
  } else if (value && typeof value.toDate === 'function') {
    // Firestore Timestamp
    date = value.toDate();
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} - ${hours}:${minutes}`;
}

export function computeAgeDaysFromPet(pet) {
  if (!pet) return null;

  if (typeof pet.idadeDias === 'number') return pet.idadeDias;

  if (pet.dataNascimento) {
    const d = new Date(pet.dataNascimento);
    if (!Number.isNaN(d.getTime())) {
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
  }

  if (typeof pet.idade === 'string' && pet.idade.trim()) {
    const text = pet.idade.toLowerCase();
    let totalDays = 0;
    const yearMatch = text.match(/(\d+)\s*ano/);
    if (yearMatch) totalDays += parseInt(yearMatch[1], 10) * 365;
    const monthMatch = text.match(/(\d+)\s*m[eê]s/);
    if (monthMatch) totalDays += parseInt(monthMatch[1], 10) * 30;
    const dayMatch = text.match(/(\d+)\s*dia/);
    if (dayMatch) totalDays += parseInt(dayMatch[1], 10);

    if (totalDays > 0) return totalDays;
  }

  return null;
}

export function getCategories(pet) {
  if (!pet) return [];

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

export function formatCategories(pet) {
  return getCategories(pet).join(', ');
}

export function resolvePetId(pet) {
  if (!pet || typeof pet !== 'object') {
    return String(pet || '').trim();
  }

  return String(
    pet.id ?? pet.petId ?? pet.docId ?? pet.uid ?? pet._id ?? pet.key ?? pet.slug ?? ''
  ).trim();
}

export function getPetDetailUrl(petOrId) {
  const petId = typeof petOrId === 'object' ? resolvePetId(petOrId) : String(petOrId || '').trim();
  if (!petId) {
    return 'https://ajudapet-blush.vercel.app';
  }

  return `https://ajudapet-blush.vercel.app/pages/detalhes.html?id=${encodeURIComponent(petId)}`;
}

export function buildPetShareText(petOrUrl = 'https://ajudapet-blush.vercel.app') {
  const url = typeof petOrUrl === 'string' && petOrUrl.includes('https://')
    ? petOrUrl
    : getPetDetailUrl(petOrUrl);

  return `Veja só esse animal que eu encontrei no AjudaPet. Clique no link abaixo para ver mais.\n${url}`;
}

export function buildReportEmailContent(petOwner, motivo, petId, baseOrigin = 'https://ajudapet-blush.vercel.app') {
  const subject = `Denúncia registrada no post de ${petOwner}`;
  const message = `Uma denuncia foi registrada no post de ${petOwner}, pelo motivo de ${motivo}\n\nVerificar post: ${baseOrigin}/pages/verificar-post.html?id=${petId}`;

  return { subject, message };
}

export async function sharePet(pet) {
  if (!pet) return false;

  const petId = resolvePetId(pet);
  if (!petId) {
    console.warn('sharePet chamado sem ID do pet:', pet);
    alert('Não foi possível identificar este post para compartilhar.');
    return false;
  }

  const shareUrl = getPetDetailUrl(petId);
  const shareText = buildPetShareText(shareUrl);

  try {
    if (navigator.share) {
      const shareData = {
        title: pet.nome || 'AjudaPet',
        text: shareText,
        url: shareUrl
      };

      if (pet.imagem) {
        try {
          const response = await fetch(pet.imagem);
          if (response.ok) {
            const blob = await response.blob();
            const file = new File([blob], `${(pet.nome || 'pet').replace(/\s+/g, '-').toLowerCase() || 'pet'}.jpg`, {
              type: blob.type || 'image/jpeg'
            });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              shareData.files = [file];
            }
          }
        } catch (error) {
          console.warn('Não foi possível anexar a imagem do post para compartilhamento:', error);
        }
      }

      try {
        await navigator.share(shareData);
        return true;
      } catch (error) {
        if (error && error.name === 'AbortError') {
          return false;
        }

        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(shareText);
          alert('O Instagram pode ignorar o texto ao compartilhar uma imagem. A mensagem e o link foram copiados para você colar manualmente.');
          return true;
        }

        throw error;
      }
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(shareText);
      alert('Mensagem pronta copiada para a área de transferência.');
      return true;
    }

    const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappShareUrl, '_blank');
    return true;
  } catch (error) {
    if (error && error.name === 'AbortError') {
      return false;
    }

    console.error('Erro ao compartilhar post:', error);
    alert('Não foi possível compartilhar este post no momento.');
    return false;
  }
}

export function formatCityWithState(pet) {
  if (!pet) return '';
  const raw = pet.cidade || '';
  const city = String(raw).split(',')[0].trim();
  const state = String(pet.estado || pet.estadoSigla || pet.uf || '').trim();
  return state ? `${city} - ${state}` : city;
}
