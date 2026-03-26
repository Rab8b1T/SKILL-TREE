from datetime import datetime, timezone
from flask import Flask, request
from api.auth_utils import get_users_db, hash_password, send_json

app = Flask(__name__)


@app.route('/api/auth/reset-confirm', methods=['POST'])
def reset_confirm():
    body = request.get_json(silent=True) or {}
    token = (body.get('token') or '').strip()
    new_password = body.get('newPassword') or ''

    if not token:
        return send_json({'error': 'Reset token is missing'}, 400)
    if not new_password or len(str(new_password)) < 4:
        return send_json({'error': 'New password must be at least 4 characters'}, 400)

    try:
        db = get_users_db()
        user = db.users.find_one({
            'resetToken': token,
            'resetTokenExpires': {'$gt': datetime.now(timezone.utc)}
        })

        if not user:
            return send_json({'error': 'Reset link is invalid or has expired. Request a new one.'}, 400)

        db.users.update_one(
            {'_id': user['_id']},
            {
                '$set': {
                    'passwordHash': hash_password(new_password),
                    'updatedAt': datetime.now(timezone.utc).isoformat()
                },
                '$unset': {'resetToken': '', 'resetTokenExpires': ''}
            }
        )
        return send_json({'ok': True})
    except Exception as e:
        print(f'[auth-reset-confirm] {e}')
        return send_json({'error': str(e) or 'Reset failed'}, 500)
