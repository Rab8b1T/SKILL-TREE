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

const EMPTY_DATA = { todo: [], solved: [] };

export default async function handler(req, res) {
    const method = req.method || 'GET';

    if (method === 'OPTIONS') {
        return sendJson(res, 200, { ok: true });
    }

    if (!uri) {
        return sendJson(res, 500, { error: 'MONGODB_URI not configured' });
    }

    const auth = getAuthFromRequest(req);
    if (!auth || !auth.userId) {
        return sendJson(res, 401, { error: 'Authentication required' });
    }

    try {
        const db = await getDb();
        const col = db.collection('upsolve_data');

        if (method === 'GET') {
            const urlObj = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
            const handle = urlObj.searchParams.get('handle');
            if (!handle) {
                return sendJson(res, 200, EMPTY_DATA);
            }
            const doc = await col.findOne({ _id: handle });
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

            const handle = payload.handle;
            if (!handle || typeof handle !== 'string') {
                return sendJson(res, 400, { error: 'handle is required' });
            }

            const action = payload.action;

            if (action === 'add_todo') {
                const problem = payload.problem;
                if (!problem) return sendJson(res, 400, { error: 'problem is required' });

                await col.updateOne(
                    { _id: handle },
                    {
                        $push: { todo: problem },
                        $set: { savedAt: new Date().toISOString() }
                    },
                    { upsert: true }
                );
                return sendJson(res, 200, { ok: true });
            }

            if (action === 'mark_solved') {
                const contestId = payload.contestId;
                const index = payload.index;
                if (!contestId || !index) return sendJson(res, 400, { error: 'contestId and index required' });

                const doc = await col.findOne({ _id: handle });
                if (!doc) return sendJson(res, 404, { error: 'No upsolve data found' });

                const todoItem = (doc.todo || []).find(p => p.contestId === contestId && p.index === index);
                if (!todoItem) return sendJson(res, 404, { error: 'Problem not found in todo' });

                await col.updateOne(
                    { _id: handle },
                    {
                        $pull: { todo: { contestId, index } },
                        $push: { solved: { ...todoItem, solvedAt: new Date().toISOString() } },
                        $set: { savedAt: new Date().toISOString() }
                    }
                );
                return sendJson(res, 200, { ok: true });
            }

            if (action === 'remove_todo') {
                const contestId = payload.contestId;
                const index = payload.index;
                if (!contestId || !index) return sendJson(res, 400, { error: 'contestId and index required' });

                await col.updateOne(
                    { _id: handle },
                    {
                        $pull: { todo: { contestId, index } },
                        $set: { savedAt: new Date().toISOString() }
                    }
                );
                return sendJson(res, 200, { ok: true });
            }

            return sendJson(res, 400, { error: 'Unknown action. Use add_todo, mark_solved, or remove_todo' });
        }

        return sendJson(res, 405, { error: 'Method Not Allowed' });
    } catch (err) {
        console.error('upsolve-data error:', err);
        return sendJson(res, 500, { error: 'Database error' });
    }
}
