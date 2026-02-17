"""
Contest System Test Suite

Run this to verify your setup is working correctly.
"""

import os
import sys
import json
from datetime import datetime

def print_status(message, status="info"):
    """Print colored status message"""
    colors = {
        "success": "\033[92m✓",
        "error": "\033[91m✗",
        "warning": "\033[93m⚠",
        "info": "\033[94mℹ"
    }
    reset = "\033[0m"
    print(f"{colors.get(status, colors['info'])} {message}{reset}")


def test_python_version():
    """Test Python version"""
    print("\n1. Testing Python version...")
    version = sys.version_info
    if version.major == 3 and version.minor >= 8:
        print_status(f"Python {version.major}.{version.minor}.{version.micro} ✓", "success")
        return True
    else:
        print_status(f"Python {version.major}.{version.minor} - Need 3.8+", "error")
        return False


def test_dependencies():
    """Test if all required packages are installed"""
    print("\n2. Testing dependencies...")
    required = ['flask', 'flask_cors', 'pymongo', 'dotenv']
    all_ok = True
    
    for package in required:
        try:
            __import__(package)
            print_status(f"{package} installed", "success")
        except ImportError:
            print_status(f"{package} NOT installed", "error")
            all_ok = False
    
    return all_ok


def test_env_file():
    """Test if .env file exists and has required variables"""
    print("\n3. Testing .env configuration...")
    
    if not os.path.exists('.env'):
        print_status(".env file not found", "error")
        print_status("Run: cp .env.example .env", "info")
        return False
    
    print_status(".env file exists", "success")
    
    # Try to load and check
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        mongodb_uri = os.getenv('MONGODB_URI')
        db_name = os.getenv('DB_NAME')
        
        if not mongodb_uri or 'mongodb' not in mongodb_uri:
            print_status("MONGODB_URI not set or invalid", "error")
            return False
        
        print_status("MONGODB_URI configured", "success")
        
        if not db_name:
            print_status("DB_NAME not set (using default)", "warning")
        else:
            print_status(f"DB_NAME: {db_name}", "success")
        
        return True
    except Exception as e:
        print_status(f"Error reading .env: {e}", "error")
        return False


def test_mongodb_connection():
    """Test MongoDB connection"""
    print("\n4. Testing MongoDB connection...")
    
    try:
        from pymongo import MongoClient
        from dotenv import load_dotenv
        
        load_dotenv()
        mongodb_uri = os.getenv('MONGODB_URI')
        db_name = os.getenv('DB_NAME', 'skilltree')
        
        if not mongodb_uri:
            print_status("MONGODB_URI not configured", "error")
            return False
        
        print_status("Connecting to MongoDB...", "info")
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        
        # Test connection
        client.admin.command('ping')
        print_status("MongoDB connection successful!", "success")
        
        # Test database access
        db = client[db_name]
        print_status(f"Database '{db_name}' accessible", "success")
        
        # Test write permission (create test document)
        test_collection = db.test_connection
        test_doc = {
            'test': True,
            'timestamp': datetime.now().isoformat(),
            'message': 'Setup test'
        }
        result = test_collection.insert_one(test_doc)
        print_status("Write permission verified", "success")
        
        # Clean up test document
        test_collection.delete_one({'_id': result.inserted_id})
        print_status("Test cleanup successful", "success")
        
        client.close()
        return True
        
    except Exception as e:
        print_status(f"MongoDB connection failed: {str(e)}", "error")
        print_status("Check: MongoDB URI, IP whitelist, network", "info")
        return False


def test_server_import():
    """Test if server can be imported"""
    print("\n5. Testing server import...")
    
    try:
        import contest_server
        print_status("contest_server.py can be imported", "success")
        return True
    except Exception as e:
        print_status(f"Cannot import server: {e}", "error")
        return False


def test_api_endpoints():
    """Test API endpoints (if server is running)"""
    print("\n6. Testing API endpoints...")
    
    try:
        import requests
        
        base_url = "http://localhost:5000/api"
        
        # Test health endpoint
        print_status("Testing /health endpoint...", "info")
        response = requests.get(f"{base_url}/health", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print_status(f"Health: {data.get('status')}, DB: {data.get('database')}", "success")
            
            if data.get('database') == 'connected':
                print_status("API server is running and connected!", "success")
                return True
            else:
                print_status("API running but DB disconnected", "warning")
                return False
        else:
            print_status(f"Health check failed: {response.status_code}", "error")
            return False
            
    except ImportError:
        print_status("requests module not installed (optional)", "warning")
        print_status("Install: pip install requests", "info")
        return None
    except requests.exceptions.ConnectionError:
        print_status("API server not running", "warning")
        print_status("Start it: python contest_server.py", "info")
        return None
    except Exception as e:
        print_status(f"API test failed: {e}", "error")
        return None


def test_files_exist():
    """Test if all required files exist"""
    print("\n7. Testing file structure...")
    
    required_files = [
        'contest_server.py',
        'requirements.txt',
        '.env.example',
        'vercel.json',
        'contest/index.html',
        'contest/script.js',
        'contest/styles.css'
    ]
    
    all_exist = True
    for file in required_files:
        if os.path.exists(file):
            print_status(f"{file} ✓", "success")
        else:
            print_status(f"{file} NOT FOUND", "error")
            all_exist = False
    
    return all_exist


def print_summary(results):
    """Print test summary"""
    print("\n" + "="*50)
    print("TEST SUMMARY")
    print("="*50)
    
    total = len(results)
    passed = sum(1 for r in results if r is True)
    failed = sum(1 for r in results if r is False)
    skipped = sum(1 for r in results if r is None)
    
    print(f"\nTotal Tests: {total}")
    print_status(f"Passed: {passed}", "success")
    if failed > 0:
        print_status(f"Failed: {failed}", "error")
    if skipped > 0:
        print_status(f"Skipped: {skipped}", "warning")
    
    print("\n" + "="*50)
    
    if failed == 0 and passed > 0:
        print_status("\n🎉 ALL TESTS PASSED! System is ready!", "success")
        print("\nNext steps:")
        print("  1. Run: python contest_server.py")
        print("  2. Open: contest/index.html")
        print("  3. Load your Codeforces profile")
        print("  4. Start competing!")
    elif failed > 0:
        print_status("\n⚠ SOME TESTS FAILED", "warning")
        print("\nPlease fix the issues above before proceeding.")
        print("See CONTEST_MONGODB_SETUP.md for help.")
    else:
        print_status("\n✓ Basic setup looks good", "success")
        print("\nOptional: Start server to run API tests")
    
    print("\n" + "="*50)


def main():
    """Run all tests"""
    print("="*50)
    print("CONTEST SYSTEM - SETUP VERIFICATION")
    print("="*50)
    print("\nThis will verify your setup is correct.\n")
    
    results = []
    
    # Run tests
    results.append(test_python_version())
    results.append(test_dependencies())
    results.append(test_env_file())
    results.append(test_mongodb_connection())
    results.append(test_server_import())
    results.append(test_files_exist())
    results.append(test_api_endpoints())
    
    # Print summary
    print_summary(results)
    
    # Return exit code
    if False in results:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()
