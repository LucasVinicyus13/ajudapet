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

export function formatCityWithState(pet) {
  if (!pet) return '';
  const raw = pet.cidade || '';
  const city = String(raw).split(',')[0].trim();
  const state = String(pet.estado || pet.estadoSigla || pet.uf || '').trim();
  return state ? `${city} - ${state}` : city;
}
