import { getUsersDb, hashPassword } from '../lib/auth.js';

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

    const payload  = await readJsonBody(req);
    const username = payload?.username?.trim();
    const newPass  = payload?.newPassword;

    if (!username) return sendJson(res, 400, { error: 'Username is required' });
    if (!newPass || String(newPass).length < 4)
        return sendJson(res, 400, { error: 'New password must be at least 4 characters' });

    try {
        const db   = await getUsersDb();
        const user = await db.collection('users').findOne({ username: username.toLowerCase() });

        if (!user) return sendJson(res, 404, { error: 'No account found with that username' });

        const passwordHash = hashPassword(String(newPass));
        await db.collection('users').updateOne(
            { username: username.toLowerCase() },
            { $set: { passwordHash, updatedAt: new Date().toISOString() } }
        );

        return sendJson(res, 200, { ok: true });
    } catch (err) {
        console.error('reset-password error:', err);
        const msg = !process.env.USER_MONGODB_URI
            ? 'Auth database not configured (USER_MONGODB_URI missing)'
            : err.message && err.message.includes('ENOTFOUND')
                ? 'Cannot reach database (check internet / MongoDB Atlas whitelist)'
                : 'Server error. Check .env and MongoDB connection.';
        return sendJson(res, 500, { error: msg });
    }
}
