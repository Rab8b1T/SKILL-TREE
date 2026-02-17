"""
Contest API Server - Production Ready for Vercel + Local

Endpoints:
  GET  /api/health              -> health check with DB status
  GET  /api/contest/data?user=  -> load user contest data
  POST /api/contest/data        -> save user contest data
  GET  /api/contest/stats?user= -> aggregated user statistics
  GET  /api/contest/leaderboard -> top performers across all users
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

_client = None
_db = None


def get_db():
    """Lazy database connection — connects on first request, reuses afterward."""
    global _client, _db
    if _db is not None:
        return _db
    if not MONGODB_URI:
        return None
    try:
        _client = MongoClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
            retryWrites=True,
            maxPoolSize=10,
        )
        _client.admin.command('ping')
        _db = _client[DB_NAME]
        _db.contest_data.create_index([("user", ASCENDING)], unique=True)
        return _db
    except Exception as e:
        print(f"[ERROR] MongoDB Connection Failed: {e}")
        _client = None
        _db = None
        return None


@app.route('/api/health', methods=['GET'])
def health():
    db = get_db()
    is_healthy = db is not None
    try:
        if db is not None:
            db.command('ping')
    except Exception:
        is_healthy = False
    status_code = 200 if is_healthy else 503
    return jsonify({
        'status': 'healthy' if is_healthy else 'unhealthy',
        'database': 'connected' if is_healthy else 'disconnected',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'version': '2.1.0'
    }), status_code


@app.route('/api/contest/data', methods=['GET'])
def get_data():
    db = get_db()
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
                'dailyGoal': {'target': 1, 'completed': 0, 'date': None},
                'activeContest': None,
                'lastSyncTime': None
            })

        data.pop('_id', None)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/contest/data', methods=['POST'])
def save_data():
    db = get_db()
    if db is None:
        return jsonify({'error': 'Database unavailable'}), 503

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON body'}), 400

        user = (data.get('user') or data.get('lastUser', '')).strip()
        if not user:
            return jsonify({'error': 'User field required'}), 400

        now = datetime.now(timezone.utc)
        doc = {
            'user': user,
            'pastContests': data.get('pastContests', []),
            'streak': data.get('streak', {}),
            'settings': data.get('settings', {}),
            'dailyGoal': data.get('dailyGoal', {}),
            'activeContest': data.get('activeContest'),
            'lastSyncTime': now.isoformat(),
            'updatedAt': now
        }

        db.contest_data.update_one({'user': user}, {'$set': doc}, upsert=True)

        return jsonify({
            'success': True,
            'user': user,
            'lastSyncTime': doc['lastSyncTime']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/contest/stats', methods=['GET'])
def get_stats():
    db = get_db()
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
                'totalProblems': 0,
                'averageScore': 0,
                'bestScore': 0,
                'currentStreak': 0,
                'bestStreak': 0,
                'avgSolveTime': 0,
                'byDivision': {}
            })

        contests = [c for c in data.get('pastContests', []) if not c.get('inProgress')]
        total_solved = sum(c.get('solvedCount', 0) for c in contests)
        total_problems = sum(c.get('totalProblems', 0) for c in contests)
        total_score = sum(c.get('totalScore', 0) for c in contests)
        avg_score = round(total_score / len(contests), 2) if contests else 0
        best_score = max((c.get('totalScore', 0) for c in contests), default=0)
        avg_time = round(
            sum(c.get('timeTaken', 0) for c in contests) / len(contests)
        ) if contests else 0
        streak = data.get('streak', {})

        by_division = {}
        for div in ['div1', 'div2', 'div3', 'div4', 'custom']:
            div_contests = [c for c in contests if c.get('contestType') == div]
            if div_contests:
                by_division[div] = {
                    'count': len(div_contests),
                    'avgScore': round(sum(c.get('totalScore', 0) for c in div_contests) / len(div_contests)),
                    'solved': sum(c.get('solvedCount', 0) for c in div_contests),
                    'total': sum(c.get('totalProblems', 0) for c in div_contests)
                }

        return jsonify({
            'user': user,
            'totalContests': len(contests),
            'totalSolved': total_solved,
            'totalProblems': total_problems,
            'averageScore': avg_score,
            'bestScore': best_score,
            'currentStreak': streak.get('current', 0),
            'bestStreak': streak.get('best', 0),
            'avgSolveTime': avg_time,
            'byDivision': by_division
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/contest/leaderboard', methods=['GET'])
def leaderboard():
    db = get_db()
    if db is None:
        return jsonify({'error': 'Database unavailable'}), 503

    try:
        limit = min(int(request.args.get('limit', 20)), 50)
        users = list(db.contest_data.find(
            {},
            {'user': 1, 'pastContests': 1, 'streak': 1, '_id': 0}
        ).limit(100))

        entries = []
        for u in users:
            contests = [c for c in u.get('pastContests', []) if not c.get('inProgress')]
            if not contests:
                continue
            total_score = sum(c.get('totalScore', 0) for c in contests)
            total_solved = sum(c.get('solvedCount', 0) for c in contests)
            entries.append({
                'user': u['user'],
                'totalContests': len(contests),
                'totalScore': total_score,
                'totalSolved': total_solved,
                'avgScore': round(total_score / len(contests)) if contests else 0,
                'streak': u.get('streak', {}).get('current', 0)
            })

        entries.sort(key=lambda x: x['avgScore'], reverse=True)
        return jsonify({'leaderboard': entries[:limit]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("=" * 50)
    print("Contest API Server v2.1")
    print("=" * 50)

    db = get_db()
    if db is None:
        print("[WARNING] Starting without database")

    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')

    print(f"\nServer: http://{host}:{port}")
    print("\nEndpoints:")
    print("  GET  /api/health")
    print("  GET  /api/contest/data?user=<handle>")
    print("  POST /api/contest/data")
    print("  GET  /api/contest/stats?user=<handle>")
    print("  GET  /api/contest/leaderboard")
    print("=" * 50)

    app.run(host=host, port=port, debug=False)
