/**
 * Shared auth utilities — imported by all auth API files.
 * Lives in api/ root so Vercel can resolve it from sibling files.
 */
import crypto from 'crypto';
import { MongoClient } from 'mongodb';

const USER_URI         = process.env.USER_MONGODB_URI;
const USER_DB          = process.env.USER_DB_NAME || 'user';
const JWT_SECRET       = process.env.JWT_SECRET   || 'change-me-in-production';
const TOKEN_EXPIRY_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days
const SALT_LEN         = 16;
const KEY_LEN          = 64;

/* ── MongoDB connection ── */
let _client = null;
export async function getUsersDb() {
    if (!USER_URI) throw new Error('USER_MONGODB_URI env var is not set in Vercel');
    if (_client) {
        try { await _client.db(USER_DB).command({ ping: 1 }); return _client.db(USER_DB); }
        catch { _client = null; }
    }
    const client = new MongoClient(USER_URI, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    await client.db(USER_DB).command({ ping: 1 });
    _client = client;
    return client.db(USER_DB);
}

/* ── Password hashing ── */
export function hashPassword(password) {
    const salt = crypto.randomBytes(SALT_LEN);
    const hash = crypto.scryptSync(String(password), salt, KEY_LEN);
    return salt.toString('base64') + ':' + hash.toString('base64');
}

export function verifyPassword(password, stored) {
    const [saltB64, hashB64] = (stored || '').split(':');
    if (!saltB64 || !hashB64) return false;
    const salt = Buffer.from(saltB64, 'base64');
    const hash = crypto.scryptSync(String(password), salt, KEY_LEN);
    return crypto.timingSafeEqual(Buffer.from(hashB64, 'base64'), hash);
}

/* ── JWT ── */
function b64u(buf)  { return Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unb64u(s)  { s=s.replace(/-/g,'+').replace(/_/g,'/'); const p=s.length%4; if(p) s+='===='.slice(0,4-p); return Buffer.from(s,'base64'); }

export function createToken(payload) {
    const hdr = b64u(JSON.stringify({ alg:'HS256', typ:'JWT' }));
    const bdy = b64u(JSON.stringify({ ...payload, exp: Date.now() + TOKEN_EXPIRY_MS }));
    const sig = b64u(crypto.createHmac('sha256', JWT_SECRET).update(hdr+'.'+bdy).digest());
    return hdr+'.'+bdy+'.'+sig;
}

export function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const [h, b, s] = token.trim().split('.');
    if (!h || !b || !s) return null;
    const expected = b64u(crypto.createHmac('sha256', JWT_SECRET).update(h+'.'+b).digest());
    if (s !== expected) return null;
    try {
        const body = JSON.parse(unb64u(b).toString('utf8'));
        if (body.exp && body.exp < Date.now()) return null;
        return body;
    } catch { return null; }
}

export function getAuthFromRequest(req) {
    const auth  = req.headers?.authorization || req.headers?.Authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    return token ? verifyToken(token) : null;
}

/* ── HTTP helpers ── */
export function sendJson(res, status, body) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
}

export async function readBody(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return null; } }
    return new Promise((resolve, reject) => {
        let d = '';
        req.on('data', c => d += c);
        req.on('end',  () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
        req.on('error', reject);
    });
}
