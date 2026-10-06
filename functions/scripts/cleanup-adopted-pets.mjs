import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';
import { isPastRetentionDeadline } from '../lib/pet-retention.js';

const RETENTION_PERIOD_DAYS = 7;
const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT;
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

function getServiceAccount() {
    if (!SERVICE_ACCOUNT_JSON) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT não foi configurada.');
    }

    return JSON.parse(SERVICE_ACCOUNT_JSON);
}

function getStorageFilePath(imageUrl) {
    if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) {
        return null;
    }

    const decodedUrl = decodeURIComponent(imageUrl);
    const match = decodedUrl.match(/\/o\/(.+?)(\?|$)/);
    if (!match) {
        return null;
    }

    return decodeURIComponent(match[1].replace(/%2F/g, '/'));
}

async function deletePetRelatedData(db, storage, petId, pet) {
    const likesSnapshot = await db.collection(`pets/${petId}/likes`).get();
    const likeDeletes = likesSnapshot.docs.map((likeDoc) => likeDoc.ref.delete());

    const reportsSnapshot = await db.collection('reports').where('petId', '==', petId).get();
    const reportDeletes = reportsSnapshot.docs.map((reportDoc) => reportDoc.ref.delete());

    await Promise.allSettled([...likeDeletes, ...reportDeletes]);

    const filePath = getStorageFilePath(pet?.imagem);
    if (filePath) {
        await storage.bucket().file(filePath).delete().catch((error) => {
            if (error?.code !== 404) {
                console.warn(`Não foi possível excluir a imagem do post ${petId}:`, error);
            }
        });
    }
}

async function cleanupAdoptedPets() {
    const serviceAccount = getServiceAccount();
    const app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${PROJECT_ID || serviceAccount.project_id}.firebasestorage.app`
    });

    const db = app.firestore();
    const storage = app.storage();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_PERIOD_DAYS);

    const petsSnapshot = await db.collection('pets')
        .where('status', '==', 'adotado')
        .where('dataAdotado', '<=', cutoff)
        .get();

    let deletedCount = 0;
    for (const petDoc of petsSnapshot.docs) {
        const pet = petDoc.data();
        if (!isPastRetentionDeadline(pet, new Date())) {
            continue;
        }

        try {
            await deletePetRelatedData(db, storage, petDoc.id, pet);
            await petDoc.ref.delete();
            deletedCount += 1;
            console.log(`Post excluído: ${petDoc.id}`);
        } catch (error) {
            console.error(`Erro ao excluir post ${petDoc.id}:`, error);
        }
    }

    console.log(`Posts excluídos: ${deletedCount}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    cleanupAdoptedPets().catch((error) => {
        console.error('Erro na limpeza de posts adotados:', error);
        process.exitCode = 1;
    });
}

export { cleanupAdoptedPets };
