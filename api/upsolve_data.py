"""
Upsolve data API — MongoDB CRUD for upsolve todo/solved lists.
Port of api/upsolve-data.js
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

EMPTY_DATA = {'todo': [], 'solved': []}


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


@app.route('/api/upsolve-data', methods=['GET', 'POST', 'OPTIONS'])
def upsolve_data():
    if request.method == 'OPTIONS':
        return send_cors_json({'ok': True})

    if not MONGODB_URI:
        return send_cors_json({'error': 'MONGODB_URI not configured'}, 500)

    auth = get_auth_from_request(request)
    if not auth or not auth.get('userId'):
        return send_cors_json({'error': 'Authentication required'}, 401)

    try:
        db = get_db()
        col = db.upsolve_data

        if request.method == 'GET':
            handle = request.args.get('handle')
            if not handle:
                return send_cors_json(EMPTY_DATA)
            doc = col.find_one({'_id': handle})
            if doc:
                doc.pop('_id', None)
                return send_cors_json(doc)
            return send_cors_json(EMPTY_DATA)

        if request.method == 'POST':
            payload = request.get_json(silent=True)
            if not payload or not isinstance(payload, dict):
                return send_cors_json({'error': 'Invalid JSON'}, 400)

            handle = payload.get('handle')
            if not handle or not isinstance(handle, str):
                return send_cors_json({'error': 'handle is required'}, 400)

            action = payload.get('action')
            now = datetime.now(timezone.utc).isoformat()

            if action == 'add_todo':
                problem = payload.get('problem')
                if not problem:
                    return send_cors_json({'error': 'problem is required'}, 400)
                col.update_one(
                    {'_id': handle},
                    {'$push': {'todo': problem}, '$set': {'savedAt': now}},
                    upsert=True
                )
                return send_cors_json({'ok': True})

            if action == 'mark_solved':
                contest_id = payload.get('contestId')
                index = payload.get('index')
                if not contest_id or not index:
                    return send_cors_json({'error': 'contestId and index required'}, 400)
                doc = col.find_one({'_id': handle})
                if not doc:
                    return send_cors_json({'error': 'No upsolve data found'}, 404)
                todo_item = next(
                    (p for p in doc.get('todo', [])
                     if p.get('contestId') == contest_id and p.get('index') == index),
                    None
                )
                if not todo_item:
                    return send_cors_json({'error': 'Problem not found in todo'}, 404)
                solved_item = {**todo_item, 'solvedAt': now}
                col.update_one(
                    {'_id': handle},
                    {
                        '$pull': {'todo': {'contestId': contest_id, 'index': index}},
                        '$push': {'solved': solved_item},
                        '$set': {'savedAt': now}
                    }
                )
                return send_cors_json({'ok': True})

            if action == 'remove_todo':
                contest_id = payload.get('contestId')
                index = payload.get('index')
                if not contest_id or not index:
                    return send_cors_json({'error': 'contestId and index required'}, 400)
                col.update_one(
                    {'_id': handle},
                    {'$pull': {'todo': {'contestId': contest_id, 'index': index}}, '$set': {'savedAt': now}}
                )
                return send_cors_json({'ok': True})

            return send_cors_json({'error': 'Unknown action. Use add_todo, mark_solved, or remove_todo'}, 400)

    except Exception as e:
        print(f'upsolve-data error: {e}')
        return send_cors_json({'error': 'Database error'}, 500)

    return send_cors_json({'error': 'Method Not Allowed'}, 405)
