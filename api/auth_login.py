from flask import Flask, request
from api.auth_utils import get_users_db, verify_password, create_token, send_json

app = Flask(__name__)


@app.route('/api/auth/login', methods=['POST'])
def login():
    body = request.get_json(silent=True) or {}
    username = (body.get('username') or '').strip().lower()
    password = body.get('password') or ''

    if not username or not password:
        return send_json({'error': 'Username and password are required'}, 400)

    try:
        db = get_users_db()
        user = db.users.find_one({'username': username})

        if not user or not verify_password(password, user.get('passwordHash', '')):
            return send_json({'error': 'No account found or wrong password. Please sign up!'}, 401)

        token = create_token({
            'userId': str(user['_id']),
            'username': user['username']
        })
        return send_json({
            'token': token,
            'user': {
                'id': str(user['_id']),
                'username': user.get('displayName') or user['username']
            }
        })
    except Exception as e:
        print(f'[auth-login] {e}')
        return send_json({'error': str(e) or 'Login failed'}, 500)
