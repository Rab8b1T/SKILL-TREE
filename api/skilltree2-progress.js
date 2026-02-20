import { MongoClient } from 'mongodb';
import { getAuthFromRequest } from './auth-shared.js';

const uri = process.env.SKILLTREE2_MONGODB_URI;
const dbName = process.env.SKILLTREE2_DB_NAME || 'skilltree2';

let cachedClient = null;

async function getDb() {
    if (cachedClient && cachedClient.topology && cachedClient.topology.isConnected()) {
        return cachedClient.db(dbName);
    }
    const client = new MongoClient(uri);
    await client.connect();
    cachedClient = client;
    return client.db(dbName);
}

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
    if (!uri) {
        return sendJson(res, 500, { error: 'SKILLTREE2_MONGODB_URI not configured' });
    }

    const auth = getAuthFromRequest(req);
    if (!auth || !auth.userId) {
        return sendJson(res, 401, { error: 'Authentication required' });
    }
    const userId = auth.userId;

    const method = req.method || 'GET';

    try {
        const db = await getDb();
        const col = db.collection('progress');

        if (method === 'GET') {
            const doc = await col.findOne({ _id: userId });
            if (doc) {
                const { _id, ...data } = doc;
                return sendJson(res, 200, data);
            }
            return sendJson(res, 200, { topicStatus: {}, notes: {}, savedAt: null });
        }

        if (method === 'POST') {
            const payload = await readJsonBody(req);
            if (!payload || typeof payload !== 'object') {
                return sendJson(res, 400, { error: 'Invalid JSON' });
            }

            const { topicStatus, notes } = payload;
            const doc = {
                topicStatus: topicStatus || {},
                notes: notes || {},
                savedAt: new Date().toISOString(),
            };

            await col.updateOne(
                { _id: userId },
                { $set: doc },
                { upsert: true },
            );

            return sendJson(res, 200, { ok: true, savedAt: doc.savedAt });
        }

        return sendJson(res, 405, { error: 'Method Not Allowed' });
    } catch (err) {
        console.error('skilltree2-progress error:', err);
        return sendJson(res, 500, { error: 'Database error' });
    }
}
