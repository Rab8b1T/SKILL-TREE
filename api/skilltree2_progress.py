"""
Skill Tree 2.0 progress API — MongoDB CRUD for per-user topic progress.
Port of api/skilltree2-progress.js
"""

import os
from datetime import datetime, timezone
from flask import Flask, request
from pymongo import MongoClient
from api.auth_utils import get_auth_from_request, send_json

app = Flask(__name__)

MONGODB_URI = os.environ.get('SKILLTREE2_MONGODB_URI', '')
DB_NAME = os.environ.get('SKILLTREE2_DB_NAME', 'skilltree2')

_client = None


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


@app.route('/api/skilltree2-progress', methods=['GET', 'POST'])
def skilltree2_progress():
    if not MONGODB_URI:
        return send_json({'error': 'SKILLTREE2_MONGODB_URI not configured'}, 500)

    auth = get_auth_from_request(request)
    if not auth or not auth.get('userId'):
        return send_json({'error': 'Authentication required'}, 401)

    user_id = auth['userId']

    try:
        db = get_db()
        col = db.progress

        if request.method == 'GET':
            doc = col.find_one({'_id': user_id})
            if doc:
                doc.pop('_id', None)
                return send_json(doc)
            return send_json({'topicStatus': {}, 'notes': {}, 'savedAt': None})

        if request.method == 'POST':
            payload = request.get_json(silent=True)
            if not payload or not isinstance(payload, dict):
                return send_json({'error': 'Invalid JSON'}, 400)

            doc = {
                'topicStatus': payload.get('topicStatus', {}),
                'notes': payload.get('notes', {}),
                'savedAt': datetime.now(timezone.utc).isoformat(),
            }
            col.update_one({'_id': user_id}, {'$set': doc}, upsert=True)
            return send_json({'ok': True, 'savedAt': doc['savedAt']})

    except Exception as e:
        print(f'skilltree2-progress error: {e}')
        return send_json({'error': 'Database error'}, 500)

    return send_json({'error': 'Method Not Allowed'}, 405)
