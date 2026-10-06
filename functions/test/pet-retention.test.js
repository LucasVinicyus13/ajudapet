import test from 'node:test';
import assert from 'node:assert/strict';
import { isPastRetentionDeadline } from '../lib/pet-retention.js';

const now = new Date('2026-10-06T12:00:00Z');

test('não exclui pet adotado antes de completar 7 dias', () => {
    const pet = {
        status: 'adotado',
        dataAdotado: new Date('2026-10-05T12:00:00Z')
    };

    assert.equal(isPastRetentionDeadline(pet, now), false);
});

test('exclui pet adotado após 7 dias completos', () => {
    const pet = {
        status: 'adotado',
        dataAdotado: new Date('2026-09-29T12:00:00Z')
    };

    assert.equal(isPastRetentionDeadline(pet, now), true);
});

test('não exclui pet que não foi adotado', () => {
    const pet = {
        status: 'urgente',
        dataAdotado: new Date('2026-09-29T12:00:00Z')
    };

    assert.equal(isPastRetentionDeadline(pet, now), false);
});
