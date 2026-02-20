import { MongoClient, ObjectId } from 'mongodb';
import { getAuthFromRequest, getUsersDb, verifyPassword, hashPassword, sendJson, readBody } from './auth-shared.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

    const auth = getAuthFromRequest(req);
    if (!auth || !auth.userId) return sendJson(res, 401, { error: 'Authentication required' });

    const data        = await readBody(req);
    const currentPass = data?.currentPassword;
    const newPass     = data?.newPassword;

    if (!currentPass) return sendJson(res, 400, { error: 'Current password is required' });
    if (!newPass || String(newPass).length < 4)
        return sendJson(res, 400, { error: 'New password must be at least 4 characters' });

    try {
        const db   = await getUsersDb();
        const user = await db.collection('users').findOne({ _id: new ObjectId(auth.userId) });

        if (!user) return sendJson(res, 404, { error: 'User not found' });
        if (!verifyPassword(currentPass, user.passwordHash))
            return sendJson(res, 401, { error: 'Current password is incorrect' });

        await db.collection('users').updateOne(
            { _id: new ObjectId(auth.userId) },
            { $set: { passwordHash: hashPassword(newPass), updatedAt: new Date().toISOString() } }
        );

        return sendJson(res, 200, { ok: true });
    } catch (err) {
        console.error('[auth-change-password]', err);
        return sendJson(res, 500, { error: err.message || 'Failed to change password' });
    }
}
