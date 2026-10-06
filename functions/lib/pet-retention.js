const RETENTION_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

function toDate(value) {
    if (!value) return null;

    if (typeof value.toDate === 'function') {
        return value.toDate();
    }

    if (value instanceof Date) {
        return value;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function isPastRetentionDeadline(pet, now = new Date()) {
    if (String(pet?.status || '').trim().toLowerCase() !== 'adotado') {
        return false;
    }

    const adoptionDate = toDate(pet?.dataAdotado);
    if (!adoptionDate) {
        return false;
    }

    return now.getTime() - adoptionDate.getTime() >= RETENTION_PERIOD_MS;
}
