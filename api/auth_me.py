from flask import Flask, request
from api.auth_utils import get_auth_from_request, send_json

app = Flask(__name__)


@app.route('/api/auth/me', methods=['GET'])
def me():
    auth = get_auth_from_request(request)
    if not auth or not auth.get('userId'):
        return send_json({'error': 'Not authenticated'}, 401)
    return send_json({
        'user': {
            'id': auth['userId'],
            'username': auth.get('username')
        }
    })
