import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { isPastRetentionDeadline } from './lib/pet-retention.js';

initializeApp();

const db = getFirestore();
const storage = getStorage();

const RETENTION_LIMIT_DAYS = 7;

async function deleteStorageFile(imageUrl) {
    if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) {
        return;
    }

    try {
        const decodedUrl = decodeURIComponent(imageUrl);
        const match = decodedUrl.match(/\/o\/(.+?)(\?|$)/);
        if (!match) {
            return;
        }

        const filePath = match[1].replace(/%2F/g, '/');
        await storage.bucket().file(decodeURIComponent(filePath)).delete();
    } catch (error) {
        if (error?.code !== 404) {
            console.warn('Não foi possível excluir a imagem do post:', error);
        }
    }
}

async function deletePetRelatedData(petId, pet) {
    const likesSnapshot = await db.collection(`pets/${petId}/likes`).get();
    const deleteLikes = likesSnapshot.docs.map((likeDoc) => likeDoc.ref.delete());

    const reportsSnapshot = await db.collection('reports').where('petId', '==', petId).get();
    const deleteReports = reportsSnapshot.docs.map((reportDoc) => reportDoc.ref.delete());

    await Promise.allSettled([...deleteLikes, ...deleteReports]);

    if (pet?.imagem) {
        await deleteStorageFile(pet.imagem);
    }
}

export const cleanupAdoptedPets = onSchedule({
    schedule: 'every 24 hours',
    timeZone: 'America/Sao_Paulo',
    retryCount: 3,
}, async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_LIMIT_DAYS);

    const petsSnapshot = await db.collection('pets')
        .where('status', '==', 'adotado')
        .where('dataAdotado', '<=', cutoff)
        .get();

    for (const petDoc of petsSnapshot.docs) {
        const pet = petDoc.data();

        if (!isPastRetentionDeadline(pet, new Date())) {
            continue;
        }

        try {
            await deletePetRelatedData(petDoc.id, pet);
            await petDoc.ref.delete();
            console.log(`Post adotado removido após 7 dias: ${petDoc.id}`);
        } catch (error) {
            console.error(`Erro ao remover post adotado ${petDoc.id}:`, error);
            throw error;
        }
    }
});
