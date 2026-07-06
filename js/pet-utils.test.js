import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPhoneInput, normalizePhone, isAdminEmail } from './pet-utils.js';

test('formatPhoneInput adiciona máscara automaticamente', () => {
  assert.equal(formatPhoneInput('11999999999'), '(11) 99999-9999');
  assert.equal(formatPhoneInput('119'), '(11) 9');
});

test('normalizePhone remove máscara para WhatsApp', () => {
  assert.equal(normalizePhone('(11) 99999-9999'), '11999999999');
  assert.equal(normalizePhone('11999999999'), '11999999999');
});

test('isAdminEmail aceita o e-mail autorizado', () => {
  assert.equal(isAdminEmail('lucasvinicyussanches@gmail.com'), true);
  assert.equal(isAdminEmail('outro@email.com'), false);
});
