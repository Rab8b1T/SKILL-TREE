import { MongoClient } from 'mongodb';
import { getAuthFromRequest } from './auth-shared.js';

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'skilltree';

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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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

const EMPTY_DATA = {
    pastContests: [],
    streak: { current: 0, lastDate: null, best: 0, history: [] },
    settings: { soundEnabled: false, autoRefresh: true, showTags: false },
    cfHandle: null,
};

export default async function handler(req, res) {
    const method = req.method || 'GET';

    if (method === 'OPTIONS') {
        return sendJson(res, 200, { ok: true });
    }

    if (!uri) {
        return sendJson(res, 500, { error: 'MONGODB_URI not configured' });
    }

    // Auth required for all operations to prevent abuse
    const auth = getAuthFromRequest(req);
    if (!auth || !auth.userId) {
        return sendJson(res, 401, { error: 'Authentication required' });
    }

    try {
        const db = await getDb();
        const col = db.collection('contest_data');

        if (method === 'GET') {
            // Data is keyed by CF handle — any authenticated user can read any handle's data
            const urlObj = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
            const cfHandle = urlObj.searchParams.get('handle');
            if (!cfHandle) {
                return sendJson(res, 200, EMPTY_DATA);
            }
            const doc = await col.findOne({ _id: cfHandle });
            if (doc) {
                const { _id, ...data } = doc;
                return sendJson(res, 200, data);
            }
            return sendJson(res, 200, EMPTY_DATA);
        }

        if (method === 'POST') {
            const payload = await readJsonBody(req);
            if (!payload || typeof payload !== 'object') {
                return sendJson(res, 400, { error: 'Invalid JSON' });
            }
            const cfHandle = payload.cfHandle;
            if (!cfHandle || typeof cfHandle !== 'string') {
                return sendJson(res, 400, { error: 'cfHandle is required in the request body' });
            }
            const { cfHandle: _h, ...dataToSave } = payload;
            await col.updateOne(
                { _id: cfHandle },
                { $set: { ...dataToSave, savedAt: new Date().toISOString() } },
                { upsert: true },
            );
            return sendJson(res, 200, { ok: true });
        }

        return sendJson(res, 405, { error: 'Method Not Allowed' });
    } catch (err) {
        console.error('contest-data error:', err);
        return sendJson(res, 500, { error: 'Database error' });
    }
}
