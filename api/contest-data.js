import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function getUserId(req, origin) {
  const url = new URL(req.url, origin);
  return url.searchParams.get('user') || 'rab8bit';
}

export default async function handler(req, res) {
  const method = req.method || 'GET';
  
  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  const origin = getOrigin(req);
  const userId = getUserId(req, origin);
  const key = `contest:data:${userId}`;

  if (method === 'GET') {
    try {
      const existing = await redis.get(key);
      
      if (!existing) {
        // Return empty data structure
        return sendJson(res, 200, {
          pastContests: [],
          streak: { current: 0, lastDate: null, best: 0, history: [] },
          settings: { soundEnabled: false, autoRefresh: true, showTags: false },
          lastUser: userId
        });
      }

      // Parse if it's a string
      let data = existing;
      if (typeof existing === 'string') {
        try {
          data = JSON.parse(existing);
        } catch {
          return sendJson(res, 500, { error: 'Failed to parse stored data' });
        }
      }

      return sendJson(res, 200, data);
    } catch (error) {
      console.error('Redis GET error:', error);
      return sendJson(res, 500, { error: 'Failed to retrieve contest data' });
    }
  }

  if (method === 'POST') {
    try {
      const payload = await readJsonBody(req);
      if (!payload) {
        return sendJson(res, 400, { error: 'Invalid JSON' });
      }

      // Validate payload structure
      if (typeof payload !== 'object') {
        return sendJson(res, 400, { error: 'Invalid payload structure' });
      }

      // Save to Redis
      await redis.set(key, JSON.stringify(payload));
      return sendJson(res, 200, { ok: true, message: 'Contest data saved successfully' });
    } catch (error) {
      console.error('Redis POST error:', error);
      return sendJson(res, 500, { error: 'Failed to save contest data' });
    }
  }

  return sendJson(res, 405, { error: 'Method Not Allowed' });
}
