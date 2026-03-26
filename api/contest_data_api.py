"""
Contest data API — authenticated MongoDB CRUD for per-user contest data.
Port of api/contest-data.js
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

EMPTY_DATA = {
    'pastContests': [],
    'streak': {'current': 0, 'lastDate': None, 'best': 0, 'history': []},
    'settings': {'soundEnabled': False, 'autoRefresh': True, 'showTags': False},
    'cfHandle': None,
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


@app.route('/api/contest-data', methods=['GET', 'POST', 'OPTIONS'])
@app.route('/api/contest/data', methods=['GET', 'POST', 'OPTIONS'])
def contest_data():
    if request.method == 'OPTIONS':
        return send_cors_json({'ok': True})

    if not MONGODB_URI:
        return send_cors_json({'error': 'MONGODB_URI not configured'}, 500)

    auth = get_auth_from_request(request)
    if not auth or not auth.get('userId'):
        return send_cors_json({'error': 'Authentication required'}, 401)

    try:
        db = get_db()
        col = db.contest_data

        if request.method == 'GET':
            cf_handle = request.args.get('handle')
            if not cf_handle:
                return send_cors_json(EMPTY_DATA)
            doc = col.find_one({'_id': cf_handle})
            if doc:
                doc.pop('_id', None)
                return send_cors_json(doc)
            return send_cors_json(EMPTY_DATA)

        if request.method == 'POST':
            payload = request.get_json(silent=True)
            if not payload or not isinstance(payload, dict):
                return send_cors_json({'error': 'Invalid JSON'}, 400)
            cf_handle = payload.get('cfHandle')
            if not cf_handle or not isinstance(cf_handle, str):
                return send_cors_json({'error': 'cfHandle is required in the request body'}, 400)

            data_to_save = {k: v for k, v in payload.items() if k != 'cfHandle'}
            data_to_save['savedAt'] = datetime.now(timezone.utc).isoformat()

            col.update_one(
                {'_id': cf_handle},
                {'$set': data_to_save},
                upsert=True
            )
            return send_cors_json({'ok': True})

    except Exception as e:
        print(f'contest-data error: {e}')
        return send_cors_json({'error': 'Database error'}, 500)

    return send_cors_json({'error': 'Method Not Allowed'}, 405)
