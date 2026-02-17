"""
Minimal Flask server to test setup
"""
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'message': 'Server is running'})

@app.route('/api/test')
def test():
    return jsonify({'message': 'Test endpoint working'})

if __name__ == '__main__':
    print("Starting minimal test server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)
