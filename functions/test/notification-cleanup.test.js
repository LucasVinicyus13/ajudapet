import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupReadNotifications } from '../lib/notification-cleanup.js';

function createFirestoreMock(users) {
    const deleted = [];
    const committedBatchSizes = [];

    return {
        deleted,
        committedBatchSizes,
        db: {
            collection(collectionName) {
                assert.equal(collectionName, 'users');
                return {
                    get: async () => ({
                        docs: Object.entries(users).map(([userId, notifications]) => ({
                            ref: {
                                collection(collectionName) {
                                    assert.equal(collectionName, 'notifications');
                                    return {
                                        where(field, operator, value) {
                                            assert.equal(field, 'viewed');
                                            assert.equal(operator, '==');
                                            assert.equal(value, true);

                                            return {
                                                get: async () => ({
                                                    docs: notifications
                                                        .filter((notification) => notification.viewed)
                                                        .map((notification) => ({
                                                            ref: `${userId}/${notification.id}`
                                                        }))
                                                })
                                            };
                                        }
                                    };
                                }
                            }
                        }))
                    })
                };
            },
            batch() {
                const batchItems = [];
                return {
                    delete(ref) {
                        batchItems.push(ref);
                    },
                    async commit() {
                        deleted.push(...batchItems);
                        committedBatchSizes.push(batchItems.length);
                    }
                };
            }
        }
    };
}

test('exclui notificações lidas em lotes de até 500 e preserva as não lidas', async () => {
    const firestore = createFirestoreMock({
        user1: [
            ...Array.from({ length: 501 }, (_, index) => ({
                id: `read-${index}`,
                viewed: true
            })),
            { id: 'unread', viewed: false }
        ],
        user2: [{ id: 'read-by-second-user', viewed: true }]
    });

    const deletedCount = await cleanupReadNotifications(firestore.db);

    assert.equal(deletedCount, 502);
    assert.deepEqual(firestore.committedBatchSizes, [500, 1, 1]);
    assert.equal(firestore.deleted.includes('user1/unread'), false);
});

test('não cria lote quando não há notificações lidas', async () => {
    const firestore = createFirestoreMock({
        user1: [{ id: 'unread', viewed: false }]
    });

    const deletedCount = await cleanupReadNotifications(firestore.db);

    assert.equal(deletedCount, 0);
    assert.deepEqual(firestore.committedBatchSizes, []);
});
