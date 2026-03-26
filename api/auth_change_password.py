from datetime import datetime, timezone
from flask import Flask, request
from bson import ObjectId
from api.auth_utils import (
    get_auth_from_request, get_users_db,
    verify_password, hash_password, send_json
)

app = Flask(__name__)


@app.route('/api/auth/change-password', methods=['POST'])
def change_password():
    auth = get_auth_from_request(request)
    if not auth or not auth.get('userId'):
        return send_json({'error': 'Authentication required'}, 401)

    body = request.get_json(silent=True) or {}
    current_pass = body.get('currentPassword') or ''
    new_pass = body.get('newPassword') or ''

    if not current_pass:
        return send_json({'error': 'Current password is required'}, 400)
    if not new_pass or len(str(new_pass)) < 4:
        return send_json({'error': 'New password must be at least 4 characters'}, 400)

    try:
        db = get_users_db()
        user = db.users.find_one({'_id': ObjectId(auth['userId'])})

        if not user:
            return send_json({'error': 'User not found'}, 404)
        if not verify_password(current_pass, user.get('passwordHash', '')):
            return send_json({'error': 'Current password is incorrect'}, 401)

        db.users.update_one(
            {'_id': ObjectId(auth['userId'])},
            {'$set': {
                'passwordHash': hash_password(new_pass),
                'updatedAt': datetime.now(timezone.utc).isoformat()
            }}
        )
        return send_json({'ok': True})
    except Exception as e:
        print(f'[auth-change-password] {e}')
        return send_json({'error': str(e) or 'Failed to change password'}, 500)
