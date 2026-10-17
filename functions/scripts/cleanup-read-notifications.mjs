import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';
import { cleanupReadNotifications as deleteReadNotifications } from '../lib/notification-cleanup.js';

const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT;

function getServiceAccount() {
    if (!SERVICE_ACCOUNT_JSON) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT não foi configurada.');
    }

    return JSON.parse(SERVICE_ACCOUNT_JSON);
}

async function cleanupReadNotifications() {
    const serviceAccount = getServiceAccount();
    const app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
    });

    const deletedCount = await deleteReadNotifications(app.firestore());
    console.log(`Notificações lidas excluídas: ${deletedCount}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    cleanupReadNotifications().catch((error) => {
        console.error('Erro ao limpar notificações lidas:', error);
        process.exitCode = 1;
    });
}

export { cleanupReadNotifications };
