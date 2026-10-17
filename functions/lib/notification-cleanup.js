export async function cleanupReadNotifications(db) {
    const usersSnapshot = await db.collection('users').get();
    let deletedCount = 0;

    for (const user of usersSnapshot.docs) {
        const notificationsSnapshot = await user.ref.collection('notifications')
            .where('viewed', '==', true)
            .get();

        for (let index = 0; index < notificationsSnapshot.docs.length; index += 500) {
            const batch = db.batch();
            const notificationsToDelete = notificationsSnapshot.docs.slice(index, index + 500);
            notificationsToDelete.forEach((notification) => {
                batch.delete(notification.ref);
            });
            await batch.commit();
            deletedCount += notificationsToDelete.length;
        }
    }

    return deletedCount;
}
