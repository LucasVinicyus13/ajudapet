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
