import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPhoneInput, normalizePhone, isAdminEmail, formatDateTime, getDataUrlSizeInBytes, shouldCompressImageDataUrl, buildPetShareText, getPetDetailUrl, resolvePetId } from './pet-utils.js';

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

test('formatDateTime formata a data e hora no padrão pedido', () => {
  const date = new Date('2024-05-10T09:05:00');
  assert.equal(formatDateTime(date), '10/05/2024 - 09:05');
});

test('getDataUrlSizeInBytes calcula o tamanho aproximado da imagem', () => {
  assert.equal(getDataUrlSizeInBytes('data:image/png;base64,AAAA'), 3);
});

test('shouldCompressImageDataUrl detecta imagens maiores que o limite do Firestore', () => {
  const largeDataUrl = `data:image/jpeg;base64,${'A'.repeat(1400000)}`;
  assert.equal(shouldCompressImageDataUrl(largeDataUrl), true);
  assert.equal(shouldCompressImageDataUrl('data:image/png;base64,AAAA'), false);
});

test('buildPetShareText inclui a mensagem pronta com quebra de linha antes do link', () => {
  const text = buildPetShareText();
  assert.match(text, /Veja só esse animal que eu encontrei no AjudaPet\. Clique no link abaixo para ver mais\./);
  assert.match(text, /\nhttps:\/\/ajudapet-blush\.vercel\.app$/);
});

test('getPetDetailUrl gera a URL pública do post com o ID correto', () => {
  assert.equal(getPetDetailUrl('abc123'), 'https://ajudapet-blush.vercel.app/pages/detalhes.html?id=abc123');
  assert.equal(getPetDetailUrl({ docId: 'xyz789' }), 'https://ajudapet-blush.vercel.app/pages/detalhes.html?id=xyz789');
});

test('resolvePetId usa o identificador real do post quando o objeto vem em campos alternativos', () => {
  assert.equal(resolvePetId({ docId: 'pet-42' }), 'pet-42');
  assert.equal(resolvePetId({ petId: 'pet-99' }), 'pet-99');
});
