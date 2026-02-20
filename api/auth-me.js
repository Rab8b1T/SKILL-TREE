import { getAuthFromRequest, sendJson } from './auth-shared.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });

    const auth = getAuthFromRequest(req);
    if (!auth || !auth.userId) return sendJson(res, 401, { error: 'Not authenticated' });

    return sendJson(res, 200, { user: { id: auth.userId, username: auth.username } });
}
