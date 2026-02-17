"""
Simple MongoDB Connection Test

Test your MongoDB connection before deployment.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("=" * 50)
print("MONGODB CONNECTION TEST")
print("=" * 50)
print()

# Step 1: Check Python version
print("1. Checking Python version...")
version = sys.version_info
if version.major == 3 and version.minor >= 8:
    print(f"   OK - Python {version.major}.{version.minor}.{version.micro}")
else:
    print(f"   ERROR - Python {version.major}.{version.minor} (need 3.8+)")
    sys.exit(1)

# Step 2: Check dependencies
print("\n2. Checking dependencies...")
try:
    import flask
    import flask_cors
    import pymongo
    print("   OK - All packages installed")
except ImportError as e:
    print(f"   ERROR - Missing package: {e}")
    print("   Run: pip install -r requirements.txt")
    sys.exit(1)

# Step 3: Check .env file
print("\n3. Checking .env configuration...")
mongodb_uri = os.getenv('MONGODB_URI')
db_name = os.getenv('DB_NAME', 'skilltree')

if not mongodb_uri or 'mongodb' not in mongodb_uri:
    print("   ERROR - MONGODB_URI not configured in .env")
    sys.exit(1)

print(f"   OK - MONGODB_URI found")
print(f"   OK - DB_NAME: {db_name}")

# Step 4: Test MongoDB connection
print("\n4. Testing MongoDB connection...")
try:
    from pymongo import MongoClient
    from datetime import datetime
    
    print("   Connecting to MongoDB Atlas...")
    client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=10000)
    
    # Test connection
    client.admin.command('ping')
    print("   OK - Connected successfully!")
    
    # Test database access
    db = client[db_name]
    print(f"   OK - Database '{db_name}' accessible")
    
    # Test write permission
    print("   Testing write permission...")
    test_collection = db.test_connection
    test_doc = {
        'test': True,
        'timestamp': datetime.now().isoformat(),
        'message': 'Setup test from local machine'
    }
    result = test_collection.insert_one(test_doc)
    print("   OK - Write permission verified")
    
    # Clean up
    test_collection.delete_one({'_id': result.inserted_id})
    print("   OK - Cleanup successful")
    
    client.close()
    
except Exception as e:
    print(f"   ERROR - Connection failed: {str(e)}")
    print("\n   Common fixes:")
    print("   - Check MONGODB_URI in .env")
    print("   - Whitelist your IP in MongoDB Atlas")
    print("   - Check internet connection")
    print("   - Verify cluster is running")
    sys.exit(1)

# Step 5: Check contest files
print("\n5. Checking contest files...")
required_files = [
    'contest_server.py',
    'contest/index.html',
    'contest/script.js',
    'contest/styles.css'
]

all_exist = True
for file in required_files:
    if os.path.exists(file):
        print(f"   OK - {file}")
    else:
        print(f"   ERROR - {file} NOT FOUND")
        all_exist = False

if not all_exist:
    sys.exit(1)

# Success!
print("\n" + "=" * 50)
print("SUCCESS! ALL TESTS PASSED")
print("=" * 50)
print("\nYour setup is ready!")
print("\nNext steps:")
print("  1. Start server: python contest_server.py")
print("  2. Open: contest/index.html")
print("  3. Test locally before deploying")
print("\nFor Vercel deployment:")
print("  1. Push code to GitHub")
print("  2. Connect to Vercel")
print("  3. Add MONGODB_URI environment variable")
print("  4. Deploy!")
print("\n" + "=" * 50)
