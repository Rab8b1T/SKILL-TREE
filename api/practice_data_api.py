"""
Practice data API — authenticated MongoDB CRUD for per-user practice session data.
Supports active practice sessions and session history (pastSessions).
"""

import os
from datetime import datetime, timezone
from flask import Flask, request
from flask_cors import CORS
from pymongo import MongoClient
from api.auth_utils import get_auth_from_request, send_cors_json

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

MONGODB_URI = os.environ.get('MONGODB_URI', '')
DB_NAME = os.environ.get('DB_NAME', 'skilltree')

_client = None

MAX_PAST_SESSIONS = 30

EMPTY_DATA = {
    'activePractice': None,
    'pastSessions': [],
}


def get_db():
    global _client
    if not MONGODB_URI:
        return None
    if _client is not None:
        try:
            _client.admin.command('ping')
            return _client[DB_NAME]
        except Exception:
            _client = None
    _client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=10000)
    _client.admin.command('ping')
    return _client[DB_NAME]


@app.route('/api/practice-data', methods=['GET', 'POST', 'OPTIONS'])
@app.route('/api/practice/data', methods=['GET', 'POST', 'OPTIONS'])
def practice_data():
    if request.method == 'OPTIONS':
        return send_cors_json({'ok': True})

    if not MONGODB_URI:
        return send_cors_json({'error': 'MONGODB_URI not configured'}, 500)

    auth = get_auth_from_request(request)
    if not auth or not auth.get('userId'):
        return send_cors_json({'error': 'Authentication required'}, 401)

    try:
        db = get_db()
        col = db.practice_data

        if request.method == 'GET':
            cf_handle = request.args.get('handle')
            if cf_handle:
                doc = col.find_one({'_id': cf_handle})
            else:
                doc = col.find_one({
                    'userId': auth['userId'],
                    'activePractice': {'$ne': None}
                })
            if doc:
                found_handle = doc.pop('_id', None)
                doc['cfHandle'] = found_handle
                doc.setdefault('pastSessions', [])
                return send_cors_json(doc)
            return send_cors_json(EMPTY_DATA)

        if request.method == 'POST':
            payload = request.get_json(silent=True)
            if not payload or not isinstance(payload, dict):
                return send_cors_json({'error': 'Invalid JSON'}, 400)
            cf_handle = payload.get('cfHandle')
            if not cf_handle or not isinstance(cf_handle, str):
                return send_cors_json({'error': 'cfHandle is required in the request body'}, 400)

            action = payload.get('action')
            now = datetime.now(timezone.utc).isoformat()

            if action == 'saveSession':
                session = payload.get('session')
                if not session:
                    return send_cors_json({'error': 'session is required'}, 400)
                session['savedAt'] = now
                col.update_one(
                    {'_id': cf_handle},
                    {
                        '$push': {
                            'pastSessions': {
                                '$each': [session],
                                '$slice': -MAX_PAST_SESSIONS
                            }
                        },
                        '$set': {'userId': auth['userId'], 'savedAt': now}
                    },
                    upsert=True
                )
                return send_cors_json({'ok': True, 'savedAt': now})

            if action == 'resumeSession':
                session_id = payload.get('sessionId')
                if not session_id:
                    return send_cors_json({'error': 'sessionId is required'}, 400)
                col.update_one(
                    {'_id': cf_handle},
                    {
                        '$pull': {'pastSessions': {'sessionId': session_id}},
                        '$set': {'savedAt': now}
                    }
                )
                return send_cors_json({'ok': True})

            last_known = payload.get('lastKnownSavedAt')
            if last_known:
                existing = col.find_one({'_id': cf_handle})
                if existing and existing.get('savedAt', '') > last_known:
                    existing.pop('_id', None)
                    existing['cfHandle'] = cf_handle
                    existing['conflict'] = True
                    existing.setdefault('pastSessions', [])
                    return send_cors_json(existing)

            data_to_save = {k: v for k, v in payload.items()
                           if k not in ('cfHandle', 'lastKnownSavedAt', 'action')}
            data_to_save['userId'] = auth['userId']
            data_to_save['savedAt'] = now

            col.update_one(
                {'_id': cf_handle},
                {'$set': data_to_save},
                upsert=True
            )
            return send_cors_json({
                'ok': True,
                'savedAt': data_to_save['savedAt']
            })

    except Exception as e:
        print(f'practice-data error: {e}')
        return send_cors_json({'error': 'Database error'}, 500)

    return send_cors_json({'error': 'Method Not Allowed'}, 405)
