import { getUsersDb, hashPassword, createToken, sendJson, readBody } from './auth-shared.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

    const body     = await readBody(req);
    const username = body?.username?.trim();
    const email    = body?.email?.trim()?.toLowerCase() || null;
    const password = body?.password;

    if (!username)
        return sendJson(res, 400, { error: 'Username is required' });
    if (!password || String(password).length < 4)
        return sendJson(res, 400, { error: 'Password must be at least 4 characters' });

    try {
        const db    = await getUsersDb();
        const users = db.collection('users');

        // Ensure unique index exists
        await users.createIndex({ username: 1 }, { unique: true });

        const existing = await users.findOne({ username: username.toLowerCase() });
        if (existing) return sendJson(res, 409, { error: 'Username already exists. Try logging in!' });

        const doc = {
            username    : username.toLowerCase(),
            displayName : username,
            passwordHash: hashPassword(password),
            email       : email,
            createdAt   : new Date().toISOString(),
        };

        const result = await users.insertOne(doc);
        const token  = createToken({ userId: result.insertedId.toString(), username: doc.username });
        return sendJson(res, 201, { token, user: { id: result.insertedId.toString(), username: doc.displayName } });
    } catch (err) {
        if (err.code === 11000) return sendJson(res, 409, { error: 'Username already exists. Try logging in!' });
        console.error('[auth-signup]', err);
        return sendJson(res, 500, { error: err.message || 'Registration failed' });
    }
}
