import { getUsersDb, verifyPassword, createToken, sendJson, readBody } from './auth-shared.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

    const body     = await readBody(req);
    const username = body?.username?.trim()?.toLowerCase();
    const password = body?.password;

    if (!username || !password)
        return sendJson(res, 400, { error: 'Username and password are required' });

    try {
        const db   = await getUsersDb();
        const user = await db.collection('users').findOne({ username });

        if (!user || !verifyPassword(password, user.passwordHash))
            return sendJson(res, 401, { error: 'No account found or wrong password. Please sign up!' });

        const token = createToken({ userId: user._id.toString(), username: user.username });
        return sendJson(res, 200, { token, user: { id: user._id.toString(), username: user.displayName || user.username } });
    } catch (err) {
        console.error('[auth-login]', err);
        return sendJson(res, 500, { error: err.message || 'Login failed' });
    }
}
