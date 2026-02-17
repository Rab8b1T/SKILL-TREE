"""
Simple Contest API Server - Production Ready

Minimal, working version without Unicode issues
"""

import os
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

MONGODB_URI = os.getenv('MONGODB_URI')
DB_NAME = os.getenv('DB_NAME', 'skilltree')

db = None

def init_db():
    global db
    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        db = client[DB_NAME]
        db.contest_data.create_index([("user", ASCENDING)], unique=True)
        print(f"[OK] MongoDB Connected: {DB_NAME}")
        return True
    except Exception as e:
        print(f"[ERROR] MongoDB Connection Failed: {e}")
        return False

@app.route('/api/health', methods=['GET'])
def health():
    is_healthy = (db is not None)
    status_code = 200 if is_healthy else 503
    return jsonify({
        'status': 'healthy' if is_healthy else 'unhealthy',
        'database': 'connected' if is_healthy else 'disconnected',
        'timestamp': datetime.now(timezone.utc).isoformat()
    }), status_code

@app.route('/api/contest/data', methods=['GET'])
def get_data():
    if db is None:
        return jsonify({'error': 'Database unavailable'}), 503
    
    user = request.args.get('user', '').strip()
    if not user:
        return jsonify({'error': 'User parameter required'}), 400
    
    try:
        data = db.contest_data.find_one({'user': user})
        if not data:
            return jsonify({
                'user': user,
                'pastContests': [],
                'streak': {'current': 0, 'lastDate': None, 'best': 0, 'history': []},
                'settings': {'soundEnabled': False, 'autoRefresh': True, 'showTags': False},
                'lastSyncTime': None
            })
        
        data.pop('_id', None)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/contest/data', methods=['POST'])
def save_data():
    if db is None:
        return jsonify({'error': 'Database unavailable'}), 503
    
    try:
        data = request.get_json()
        user = data.get('user') or data.get('lastUser', '').strip()
        
        if not user:
            return jsonify({'error': 'User field required'}), 400
        
        doc = {
            'user': user,
            'pastContests': data.get('pastContests', []),
            'streak': data.get('streak', {}),
            'settings': data.get('settings', {}),
            'lastSyncTime': datetime.now(timezone.utc).isoformat(),
            'updatedAt': datetime.now(timezone.utc)
        }
        
        result = db.contest_data.update_one({'user': user}, {'$set': doc}, upsert=True)
        
        return jsonify({
            'success': True,
            'user': user,
            'lastSyncTime': doc['lastSyncTime']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/contest/stats', methods=['GET'])
def get_stats():
    if db is None:
        return jsonify({'error': 'Database unavailable'}), 503
    
    user = request.args.get('user', '').strip()
    if not user:
        return jsonify({'error': 'User parameter required'}), 400
    
    try:
        data = db.contest_data.find_one({'user': user})
        if not data:
            return jsonify({
                'user': user,
                'totalContests': 0,
                'totalSolved': 0,
                'averageScore': 0,
                'currentStreak': 0,
                'bestStreak': 0
            })
        
        contests = [c for c in data.get('pastContests', []) if not c.get('inProgress')]
        total_solved = sum(c.get('solvedCount', 0) for c in contests)
        avg_score = sum(c.get('totalScore', 0) for c in contests) / len(contests) if contests else 0
        streak = data.get('streak', {})
        
        return jsonify({
            'user': user,
            'totalContests': len(contests),
            'totalSolved': total_solved,
            'averageScore': round(avg_score, 2),
            'currentStreak': streak.get('current', 0),
            'bestStreak': streak.get('best', 0)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("=" * 50)
    print("Contest API Server")
    print("=" * 50)
    
    connected = init_db()
    if not connected:
        print("[WARNING] Starting without database (will use localhost only)")
    
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')
    
    print(f"\nStarting server on http://{host}:{port}")
    print("\nEndpoints:")
    print("  GET  /api/health")
    print("  GET  /api/contest/data?user=<handle>")
    print("  POST /api/contest/data")
    print("  GET  /api/contest/stats?user=<handle>")
    print("\n" + "=" * 50)
    
    app.run(host=host, port=port, debug=False)
