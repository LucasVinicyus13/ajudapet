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

export function formatCityWithState(pet) {
  if (!pet) return '';
  const raw = pet.cidade || '';
  const city = String(raw).split(',')[0].trim();
  const state = String(pet.estado || pet.estadoSigla || pet.uf || '').trim();
  return state ? `${city} - ${state}` : city;
}
