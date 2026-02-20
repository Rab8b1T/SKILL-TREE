import { Redis } from '@upstash/redis';
import { getAuthFromRequest } from './auth-shared.js';

const redis = Redis.fromEnv();

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function shouldForceSeed(req, origin) {
  const url = new URL(req.url, origin);
  return url.searchParams.get('seed') === '1' || url.searchParams.get('forceSeed') === '1';
}

function withDefaults(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.zones)) return null;
  if (!data.settings || typeof data.settings !== 'object') {
    data.settings = { shortcutsEnabled: true, view: 'grid' };
  }
  if (!data.user || typeof data.user !== 'object') {
    data.user = {
      current_xp: 0,
      level: 1,
      badges: [],
      notes: {},
      journal: {},
      lastVisit: null,
      streakDays: 0,
    };
  }
  return data;
}

async function readSeedFromStatic(origin) {
  // Prefer progress.json if present, else fall back to the exported seed.
  const candidates = [`${origin}/progress.json`, `${origin}/skilltree-progress-2025-11-26.json`];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      const normalized = withDefaults(data);
      if (normalized) return normalized;
    } catch {
      // try next
    }
  }

  return withDefaults({
    version: '1.0',
    updatedAt: new Date().toISOString(),
    zones: [],
    user: {
      current_xp: 0,
      level: 1,
      badges: [],
      notes: {},
      journal: {},
      lastVisit: null,
      streakDays: 0,
    },
    settings: { shortcutsEnabled: true, view: 'grid' },
  });
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
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  const raw = await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const method = req.method || 'GET';
  const origin = getOrigin(req);
  const auth = getAuthFromRequest(req);
  if (!auth || !auth.userId) {
    return sendJson(res, 401, { error: 'Authentication required' });
  }
  const id = auth.userId;
  const key = `skilltree:progress:${id}`;

  if (method === 'GET') {
    const forceSeed = shouldForceSeed(req, origin);
    const existing = await redis.get(key);
    if (typeof existing === 'string') {
      try {
        const parsed = withDefaults(JSON.parse(existing));
        if (parsed && !forceSeed) {
          // If we previously seeded a minimal/empty payload, and the repo has a real seed file,
          // prefer the real seed so the UI isn't blank.
          if (Array.isArray(parsed.zones) && parsed.zones.length === 0) {
            const seed = await readSeedFromStatic(origin);
            if (seed && Array.isArray(seed.zones) && seed.zones.length > 0) {
              await redis.set(key, JSON.stringify(seed));
              return sendJson(res, 200, seed);
            }
          }
          return sendJson(res, 200, parsed);
        }
      } catch {
        // fall through to reseed
      }
    } else if (existing && typeof existing === 'object') {
      // If KV returns JSON directly, support it.
      const parsed = withDefaults(existing);
      if (parsed && !forceSeed) {
        if (Array.isArray(parsed.zones) && parsed.zones.length === 0) {
          const seed = await readSeedFromStatic(origin);
          if (seed && Array.isArray(seed.zones) && seed.zones.length > 0) {
            await redis.set(key, JSON.stringify(seed));
            return sendJson(res, 200, seed);
          }
        }
        return sendJson(res, 200, parsed);
      }
    }

    const seed = await readSeedFromStatic(origin);
    await redis.set(key, JSON.stringify(seed));
    return sendJson(res, 200, seed);
  }

  if (method === 'POST') {
    const payload = await readJsonBody(req);
    if (!payload) return sendJson(res, 400, { error: 'Invalid JSON' });

    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.zones)) {
      return sendJson(res, 400, { error: 'Invalid payload (expected object with zones: [])' });
    }

    // Match your current semantics: overwrite the “single file”.
    await redis.set(key, JSON.stringify(payload));
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 405, { error: 'Method Not Allowed' });
}

