import { getAuthFromRequest } from '../lib/auth.js';

function sendJson(res, status, body) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return sendJson(res, 405, { error: 'Method Not Allowed' });
    }

    const auth = getAuthFromRequest(req);
    if (!auth || !auth.userId) {
        return sendJson(res, 401, { error: 'Not authenticated' });
    }

    return sendJson(res, 200, {
        user: { id: auth.userId, username: auth.username },
    });
}
