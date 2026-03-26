"""
Shared auth utilities for all Python API endpoints.
Port of api/auth-shared.js — produces identical JWT tokens and password hashes.
"""

import os
import json
import hashlib
import hmac
import base64
import time
from functools import lru_cache
from pymongo import MongoClient

USER_URI = os.environ.get('USER_MONGODB_URI', '')
USER_DB = os.environ.get('USER_DB_NAME', 'user')
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me-in-production')
TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000  # 7 days
SALT_LEN = 16
KEY_LEN = 64

_user_client = None


def get_users_db():
    global _user_client
    if not USER_URI:
        raise RuntimeError('USER_MONGODB_URI env var is not set')
    if _user_client is not None:
        try:
            _user_client.admin.command('ping')
            return _user_client[USER_DB]
        except Exception:
            _user_client = None

    _user_client = MongoClient(USER_URI, serverSelectionTimeoutMS=10000)
    _user_client.admin.command('ping')
    return _user_client[USER_DB]


# ---------- Password hashing ----------
# Must match Node.js crypto.scryptSync defaults: N=16384, r=8, p=1

def hash_password(password: str) -> str:
    salt = os.urandom(SALT_LEN)
    dk = hashlib.scrypt(
        password.encode('utf-8'), salt=salt,
        n=16384, r=8, p=1, dklen=KEY_LEN
    )
    return base64.b64encode(salt).decode() + ':' + base64.b64encode(dk).decode()


def verify_password(password: str, stored: str) -> bool:
    if not stored or ':' not in stored:
        return False
    salt_b64, hash_b64 = stored.split(':', 1)
    try:
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
    except Exception:
        return False
    dk = hashlib.scrypt(
        password.encode('utf-8'), salt=salt,
        n=16384, r=8, p=1, dklen=KEY_LEN
    )
    return hmac.compare_digest(dk, expected)


# ---------- JWT ----------
# Matches the Node.js custom HS256 JWT implementation exactly.

def _b64url_encode(data: bytes) -> str:
    return base64.b64encode(data).decode().replace('+', '-').replace('/', '_').rstrip('=')


def _b64url_decode(s: str) -> bytes:
    s = s.replace('-', '+').replace('_', '/')
    pad = len(s) % 4
    if pad:
        s += '=' * (4 - pad)
    return base64.b64decode(s)


def create_token(payload: dict) -> str:
    header = _b64url_encode(json.dumps({'alg': 'HS256', 'typ': 'JWT'}, separators=(',', ':')).encode())
    body_data = {**payload, 'exp': int(time.time() * 1000) + TOKEN_EXPIRY_MS}
    body = _b64url_encode(json.dumps(body_data, separators=(',', ':')).encode())
    sig_input = f'{header}.{body}'.encode()
    sig = _b64url_encode(hmac.new(JWT_SECRET.encode(), sig_input, hashlib.sha256).digest())
    return f'{header}.{body}.{sig}'


def verify_token(token: str):
    if not token or not isinstance(token, str):
        return None
    parts = token.strip().split('.')
    if len(parts) != 3:
        return None
    h, b, s = parts
    expected = _b64url_encode(hmac.new(JWT_SECRET.encode(), f'{h}.{b}'.encode(), hashlib.sha256).digest())
    if s != expected:
        return None
    try:
        body = json.loads(_b64url_decode(b).decode('utf-8'))
        if body.get('exp') and body['exp'] < int(time.time() * 1000):
            return None
        return body
    except Exception:
        return None


def get_auth_from_request(request):
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
        return verify_token(token)
    return None


# ---------- HTTP helpers ----------

def send_json(data, status=200, headers=None):
    from flask import make_response, jsonify
    resp = make_response(jsonify(data), status)
    resp.headers['Cache-Control'] = 'no-store'
    if headers:
        for k, v in headers.items():
            resp.headers[k] = v
    return resp


def send_cors_json(data, status=200):
    from flask import make_response, jsonify
    resp = make_response(jsonify(data), status)
    resp.headers['Cache-Control'] = 'no-store'
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return resp
