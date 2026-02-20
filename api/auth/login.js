import { getUsersDb, verifyPassword, createToken } from '../lib/auth.js';

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
    if (req.method !== 'POST') {
        return sendJson(res, 405, { error: 'Method Not Allowed' });
    }

    const payload = await readJsonBody(req);
    const username = payload?.username?.trim();
    const password = payload?.password;

    if (!username || password == null) {
        return sendJson(res, 400, { error: 'Username and password are required' });
    }

    try {
        const db = await getUsersDb();
        const user = await db.collection('users').findOne({ username: username.toLowerCase() });
        if (!user || !verifyPassword(String(password), user.passwordHash)) {
            return sendJson(res, 401, { error: 'Invalid username or password' });
        }

        const userId = user._id.toString();
        const token = createToken({ userId, username: user.username });
        return sendJson(res, 200, {
            token,
            user: { id: userId, username: user.displayName || user.username },
        });
    } catch (err) {
        console.error('Login error:', err);
        const msg = !process.env.USER_MONGODB_URI
            ? 'Auth database not configured (USER_MONGODB_URI missing)'
            : err.message && err.message.includes('ENOTFOUND')
                ? 'Cannot reach database (check internet / MongoDB Atlas whitelist)'
                : 'Login failed. Check server logs or .env (USER_MONGODB_URI).';
        return sendJson(res, 500, { error: msg });
    }
}
