import { getUsersDb, hashPassword, createToken } from '../lib/auth.js';

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

    if (!username) {
        return sendJson(res, 400, { error: 'Username is required' });
    }
    if (password == null || String(password).length < 4) {
        return sendJson(res, 400, { error: 'Password must be at least 4 characters' });
    }

    try {
        const db = await getUsersDb();
        const users = db.collection('users');
        await users.createIndex({ username: 1 }, { unique: true });

        const existing = await users.findOne({ username: username.toLowerCase() });
        if (existing) {
            return sendJson(res, 409, { error: 'Username already exists' });
        }

        const passwordHash = hashPassword(String(password));
        const doc = {
            username: username.toLowerCase(),
            displayName: username,
            passwordHash,
            createdAt: new Date().toISOString(),
        };
        const result = await users.insertOne(doc);
        const userId = result.insertedId.toString();
        const token = createToken({ userId, username: doc.username });
        return sendJson(res, 201, {
            token,
            user: { id: userId, username: doc.displayName },
        });
    } catch (err) {
        if (err.code === 11000) {
            return sendJson(res, 409, { error: 'Username already exists' });
        }
        console.error('Signup error:', err);
        let msg = 'Registration failed.';
        if (!process.env.USER_MONGODB_URI) msg = 'Auth database not configured: set USER_MONGODB_URI in Vercel.';
        else if (err.message) msg = err.message;
        return sendJson(res, 500, { error: msg });
    }
}
