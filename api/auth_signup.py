from datetime import datetime, timezone
from flask import Flask, request
from pymongo.errors import DuplicateKeyError
from api.auth_utils import get_users_db, hash_password, create_token, send_json

app = Flask(__name__)


@app.route('/api/auth/signup', methods=['POST'])
def signup():
    body = request.get_json(silent=True) or {}
    username = (body.get('username') or '').strip()
    email = (body.get('email') or '').strip().lower() or None
    password = body.get('password') or ''

    if not username:
        return send_json({'error': 'Username is required'}, 400)
    if not password or len(str(password)) < 4:
        return send_json({'error': 'Password must be at least 4 characters'}, 400)

    try:
        db = get_users_db()
        users = db.users
        users.create_index('username', unique=True)

        existing = users.find_one({'username': username.lower()})
        if existing:
            return send_json({'error': 'Username already exists. Try logging in!'}, 409)

        doc = {
            'username': username.lower(),
            'displayName': username,
            'passwordHash': hash_password(password),
            'email': email,
            'createdAt': datetime.now(timezone.utc).isoformat(),
        }

        result = users.insert_one(doc)
        token = create_token({
            'userId': str(result.inserted_id),
            'username': doc['username']
        })
        return send_json({
            'token': token,
            'user': {
                'id': str(result.inserted_id),
                'username': doc['displayName']
            }
        }, 201)
    except DuplicateKeyError:
        return send_json({'error': 'Username already exists. Try logging in!'}, 409)
    except Exception as e:
        print(f'[auth-signup] {e}')
        return send_json({'error': str(e) or 'Registration failed'}, 500)
