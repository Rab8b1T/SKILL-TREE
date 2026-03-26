"""
Skill Tree progress API — reads/writes progress data to Upstash Redis.
Port of api/progress.js
"""

import os
import json
from flask import Flask, request
import requests as http_requests
from api.auth_utils import get_auth_from_request, send_json

app = Flask(__name__)

UPSTASH_URL = os.environ.get('UPSTASH_REDIS_REST_URL', '')
UPSTASH_TOKEN = os.environ.get('UPSTASH_REDIS_REST_TOKEN', '')


def redis_get(key: str):
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        return None
    resp = http_requests.get(
        f'{UPSTASH_URL}/get/{key}',
        headers={'Authorization': f'Bearer {UPSTASH_TOKEN}'}
    )
    if resp.ok:
        data = resp.json()
        return data.get('result')
    return None


def redis_set(key: str, value: str):
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        return
    http_requests.post(
        f'{UPSTASH_URL}',
        headers={
            'Authorization': f'Bearer {UPSTASH_TOKEN}',
            'Content-Type': 'application/json'
        },
        json=['SET', key, value]
    )


def with_defaults(data):
    if not data or not isinstance(data, dict) or not isinstance(data.get('zones'), list):
        return None
    if not data.get('settings') or not isinstance(data['settings'], dict):
        data['settings'] = {'shortcutsEnabled': True, 'view': 'grid'}
    if not data.get('user') or not isinstance(data['user'], dict):
        data['user'] = {
            'current_xp': 0, 'level': 1, 'badges': [],
            'notes': {}, 'journal': {},
            'lastVisit': None, 'streakDays': 0,
        }
    return data


def clean_seed_for_new_user(data):
    if not data or not isinstance(data.get('zones'), list):
        return data
    for zi, zone in enumerate(data['zones']):
        for li, level in enumerate(zone.get('levels', [])):
            level['status'] = 'unlocked' if (zi == 0 and li == 0) else 'locked'
    data['user'] = {
        'current_xp': 0, 'level': 1, 'badges': [],
        'notes': {}, 'journal': {},
        'lastVisit': None, 'streakDays': 0,
    }
    data['settings'] = data.get('settings') or {'shortcutsEnabled': True, 'view': 'grid'}
    return data


def get_origin():
    proto = request.headers.get('X-Forwarded-Proto', 'https')
    host = request.headers.get('X-Forwarded-Host', request.host)
    return f'{proto}://{host}'


def read_seed_from_static():
    origin = get_origin()
    candidates = [f'{origin}/progress.json', f'{origin}/skilltree-progress-2025-11-26.json']
    for url in candidates:
        try:
            resp = http_requests.get(url, timeout=5, headers={'Cache-Control': 'no-store'})
            if resp.ok:
                data = with_defaults(resp.json())
                if data:
                    return clean_seed_for_new_user(data)
        except Exception:
            continue

    from datetime import datetime, timezone
    return with_defaults({
        'version': '1.0',
        'updatedAt': datetime.now(timezone.utc).isoformat(),
        'zones': [],
        'user': {
            'current_xp': 0, 'level': 1, 'badges': [],
            'notes': {}, 'journal': {},
            'lastVisit': None, 'streakDays': 0,
        },
        'settings': {'shortcutsEnabled': True, 'view': 'grid'},
    })


@app.route('/api/progress', methods=['GET', 'POST'])
@app.route('/progress', methods=['GET', 'POST'])
def progress():
    auth = get_auth_from_request(request)
    if not auth or not auth.get('userId'):
        return send_json({'error': 'Authentication required'}, 401)

    user_id = auth['userId']
    key = f'skilltree:progress:{user_id}'

    if request.method == 'GET':
        force_seed = request.args.get('seed') == '1' or request.args.get('forceSeed') == '1'
        existing_raw = redis_get(key)

        if existing_raw:
            try:
                if isinstance(existing_raw, str):
                    parsed = with_defaults(json.loads(existing_raw))
                elif isinstance(existing_raw, dict):
                    parsed = with_defaults(existing_raw)
                else:
                    parsed = None

                if parsed and not force_seed:
                    if isinstance(parsed.get('zones'), list) and len(parsed['zones']) == 0:
                        seed = read_seed_from_static()
                        if seed and isinstance(seed.get('zones'), list) and len(seed['zones']) > 0:
                            redis_set(key, json.dumps(seed))
                            return send_json(seed)
                    return send_json(parsed)
            except Exception:
                pass

        seed = read_seed_from_static()
        redis_set(key, json.dumps(seed))
        return send_json(seed)

    if request.method == 'POST':
        payload = request.get_json(silent=True)
        if not payload:
            return send_json({'error': 'Invalid JSON'}, 400)
        if not isinstance(payload, dict) or not isinstance(payload.get('zones'), list):
            return send_json({'error': 'Invalid payload (expected object with zones: [])'}, 400)

        redis_set(key, json.dumps(payload))
        return send_json({'ok': True})

    return send_json({'error': 'Method Not Allowed'}, 405)
