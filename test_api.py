"""Test the Contest API"""
import requests
import json

BASE_URL = "http://localhost:5000/api"

print("Testing Contest API Server")
print("=" * 50)

# Test 1: Health Check
print("\n1. Testing /api/health...")
try:
    response = requests.get(f"{BASE_URL}/health")
    print(f"   Status: {response.status_code}")
    print(f"   Raw Response: {response.text[:200]}")
    if response.status_code == 200:
        print(f"   JSON: {response.json()}")
except Exception as e:
    print(f"   ERROR: {e}")

# Test 2: Get User Data (should return empty for new user)
print("\n2. Testing GET /api/contest/data...")
try:
    response = requests.get(f"{BASE_URL}/contest/data", params={"user": "test_user"})
    print(f"   Status: {response.status_code}")
    data = response.json()
    print(f"   User: {data.get('user')}")
    print(f"   Contests: {len(data.get('pastContests', []))}")
except Exception as e:
    print(f"   ERROR: {e}")

# Test 3: Save User Data
print("\n3. Testing POST /api/contest/data...")
try:
    test_data = {
        "user": "test_user",
        "pastContests": [{
            "contestId": 123456,
            "contestName": "Test Contest",
            "contestType": "custom",
            "problems": [],
            "solvedCount": 0,
            "totalProblems": 5,
            "totalScore": 0,
            "date": "2024-02-17T12:00:00Z"
        }],
        "streak": {
            "current": 1,
            "best": 1,
            "lastDate": "2024-02-17",
            "history": []
        },
        "settings": {
            "soundEnabled": False,
            "autoRefresh": True,
            "showTags": False
        }
    }
    
    response = requests.post(
        f"{BASE_URL}/contest/data",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
except Exception as e:
    print(f"   ERROR: {e}")

# Test 4: Get Stats
print("\n4. Testing GET /api/contest/stats...")
try:
    response = requests.get(f"{BASE_URL}/contest/stats", params={"user": "test_user"})
    print(f"   Status: {response.status_code}")
    stats = response.json()
    print(f"   Total Contests: {stats.get('totalContests')}")
    print(f"   Total Solved: {stats.get('totalSolved')}")
    print(f"   Current Streak: {stats.get('currentStreak')}")
except Exception as e:
    print(f"   ERROR: {e}")

print("\n" + "=" * 50)
print("API Test Complete!")
