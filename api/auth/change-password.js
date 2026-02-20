import { getUsersDb, verifyPassword, hashPassword, getAuthFromRequest } from '../lib/auth.js';

function sendJson(res, status, body) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
        try { return JSON.parse(req.body); } catch { return null; }
    }
    const raw = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => (data += chunk));
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method Not Allowed' });

    const auth = getAuthFromRequest(req);
    if (!auth || !auth.userId) return sendJson(res, 401, { error: 'Authentication required' });

    const payload  = await readJsonBody(req);
    const currentPass = payload?.currentPassword;
    const newPass     = payload?.newPassword;

    if (!currentPass) return sendJson(res, 400, { error: 'Current password is required' });
    if (!newPass || String(newPass).length < 4)
        return sendJson(res, 400, { error: 'New password must be at least 4 characters' });

    try {
        const db   = await getUsersDb();
        const { ObjectId } = await import('mongodb');
        const user = await db.collection('users').findOne({ _id: new ObjectId(auth.userId) });

        if (!user) return sendJson(res, 404, { error: 'User not found' });
        if (!verifyPassword(String(currentPass), user.passwordHash))
            return sendJson(res, 401, { error: 'Current password is incorrect' });

        const passwordHash = hashPassword(String(newPass));
        await db.collection('users').updateOne(
            { _id: new ObjectId(auth.userId) },
            { $set: { passwordHash, updatedAt: new Date().toISOString() } }
        );

        return sendJson(res, 200, { ok: true });
    } catch (err) {
        console.error('change-password error:', err);
        return sendJson(res, 500, { error: 'Server error' });
    }
}
