import os
import secrets
from datetime import datetime, timezone, timedelta
from flask import Flask, request
import requests as http_requests
from api.auth_utils import get_users_db, send_json

app = Flask(__name__)

RESET_EXPIRY = timedelta(hours=1)


def send_reset_email(to: str, username: str, reset_link: str):
    api_key = os.environ.get('RESEND_API_KEY', '')
    from_email = os.environ.get('RESET_FROM_EMAIL', 'Skill Tree <onboarding@resend.dev>')

    if not api_key:
        raise RuntimeError('RESEND_API_KEY not configured')

    html = f'''
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#1a1a2e;color:#f0f0ff;border-radius:12px">
        <h2 style="color:#a78bfa;margin:0 0 8px">Skill Tree</h2>
        <p style="color:#a0a0c0;margin:0 0 24px">Password Reset Request</p>
        <p>Hi <strong>{username}</strong>,</p>
        <p>You requested a password reset. Click the button below to set a new password.
           This link expires in <strong>1 hour</strong>.</p>
        <a href="{reset_link}"
           style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Reset Password
        </a>
        <p style="color:#6b6b8d;font-size:13px">Or copy this link:<br>
           <a href="{reset_link}" style="color:#a78bfa;word-break:break-all">{reset_link}</a>
        </p>
        <p style="color:#6b6b8d;font-size:12px;margin-top:32px">
            If you didn't request this, ignore this email. Your password won't change.
        </p>
    </div>'''

    resp = http_requests.post(
        'https://api.resend.com/emails',
        headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
        json={'from': from_email, 'to': [to], 'subject': 'Skill Tree — Reset your password', 'html': html}
    )
    if not resp.ok:
        raise RuntimeError(f'Email send failed: {resp.text}')


@app.route('/api/auth/reset-request', methods=['POST'])
def reset_request():
    body = request.get_json(silent=True) or {}
    username = (body.get('username') or '').strip().lower()

    if not username:
        return send_json({'error': 'Username is required'}, 400)

    try:
        db = get_users_db()
        user = db.users.find_one({'username': username})

        if not user:
            return send_json({'ok': True, 'message': 'If that account exists, a reset email was sent.'})
        if not user.get('email'):
            return send_json({'error': 'No email linked to this account. Please contact the admin.'}, 400)

        token = secrets.token_hex(32)
        expires = datetime.now(timezone.utc) + RESET_EXPIRY

        db.users.update_one(
            {'username': username},
            {'$set': {'resetToken': token, 'resetTokenExpires': expires}}
        )

        app_url = os.environ.get('APP_URL') or f'https://{request.headers.get("X-Forwarded-Host", request.host)}'
        reset_link = f'{app_url}/reset-password.html?token={token}'

        send_reset_email(user['email'], user.get('displayName', username), reset_link)
        return send_json({'ok': True, 'message': 'Reset email sent! Check your inbox.'})
    except Exception as e:
        print(f'[auth-reset-request] {e}')
        return send_json({'error': str(e) or 'Failed to send reset email'}, 500)
