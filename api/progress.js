import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

function getKey(req) {
  // Optional: allow multiple progress “files” via ?id=
  const url = new URL(req.url);
  const id = url.searchParams.get('id') || 'default';
  return `skilltree:progress:${id}`;
}

async function readSeedFile() {
  // Prefer progress.json if present, else fall back to the exported seed.
  const root = process.cwd();
  const candidates = [
    path.join(root, 'progress.json'),
    path.join(root, 'skilltree-progress-2025-11-26.json'),
  ];

  for (const p of candidates) {
    try {
      const raw = await readFile(p, 'utf8');
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || !Array.isArray(data.zones)) continue;
      if (!data.settings || typeof data.settings !== 'object') {
        data.settings = { shortcutsEnabled: true, view: 'grid' };
      }
      return data;
    } catch {
      // try next
    }
  }

  return {
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
  };
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export default async function handler(req) {
  const method = req.method || 'GET';
  const key = getKey(req);

  if (method === 'GET') {
    const existing = await redis.get(key);
    if (typeof existing === 'string') {
      try {
        return json(200, JSON.parse(existing));
      } catch {
        // fall through to reseed
      }
    } else if (existing && typeof existing === 'object') {
      // If KV returns JSON directly, support it.
      return json(200, existing);
    }

    const seed = await readSeedFile();
    await redis.set(key, JSON.stringify(seed));
    return json(200, seed);
  }

  if (method === 'POST') {
    let payload;
    try {
      payload = await req.json();
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }

    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.zones)) {
      return json(400, { error: 'Invalid payload (expected object with zones: [])' });
    }

    // Match your current semantics: overwrite the “single file”.
    await redis.set(key, JSON.stringify(payload));
    return json(200, { ok: true });
  }

  return json(405, { error: 'Method Not Allowed' });
}

