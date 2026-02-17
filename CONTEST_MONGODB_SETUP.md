# Contest System - MongoDB Backend Setup Guide

This guide will help you set up the MongoDB backend for the Virtual Contest system.

## 🚀 Quick Start

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up MongoDB Atlas (Free)

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Sign up for a free account
3. Create a new cluster (Free M0 tier is sufficient)
4. Click "Connect" → "Connect your application"
5. Copy the connection string

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your MongoDB URI:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   DB_NAME=skilltree
   ```

### 4. Run the Contest Server

```bash
python contest_server.py
```

The server will start on `http://localhost:5000`

## 📋 API Endpoints

### Health Check
```
GET /api/health
```

### Get User Contest Data
```
GET /api/contest/data?user=<codeforces_handle>
```

### Save Contest Data
```
POST /api/contest/data
Body: { user, pastContests, streak, settings }
```

### Get User Statistics
```
GET /api/contest/stats?user=<codeforces_handle>
```

## 🗄️ Database Structure

### Collections

#### `contest_data`
Stores all contest data for each user:
```json
{
  "user": "rab8bit",
  "pastContests": [...],
  "streak": {
    "current": 5,
    "lastDate": "2024-02-20",
    "best": 10,
    "history": [...]
  },
  "settings": {
    "soundEnabled": false,
    "autoRefresh": true,
    "showTags": false
  },
  "lastSyncTime": "2024-02-20T10:30:00Z",
  "updatedAt": "2024-02-20T10:30:00Z"
}
```

## 🌐 Deployment

### Vercel Deployment

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Create `vercel.json`:
   ```json
   {
     "builds": [
       { "src": "contest_server.py", "use": "@vercel/python" }
     ],
     "routes": [
       { "src": "/api/(.*)", "dest": "contest_server.py" },
       { "src": "/(.*)", "dest": "/$1" }
     ]
   }
   ```

3. Add environment variables in Vercel dashboard:
   - `MONGODB_URI`
   - `DB_NAME`

4. Deploy:
   ```bash
   vercel --prod
   ```

## 🔧 Troubleshooting

### Connection Issues

If you see "Database not available":
1. Check your MongoDB URI in `.env`
2. Ensure your IP is whitelisted in MongoDB Atlas
3. Verify network connectivity

### Data Migration

To migrate from localStorage to MongoDB:
1. Export data from the UI (History → Export)
2. Load user profile
3. Import the exported JSON file
4. Data will automatically sync to MongoDB

## 🎯 Features

### Cloud Sync
- ✅ All contest data synced to MongoDB
- ✅ Works across multiple devices
- ✅ Automatic fallback to localStorage if offline
- ✅ Real-time sync status indicator

### Data Persistence
- ✅ Contest history
- ✅ User statistics
- ✅ Practice streaks
- ✅ Settings preferences
- ✅ In-progress contests

### Multi-User Support
- ✅ Each Codeforces handle has separate data
- ✅ Switch between accounts seamlessly
- ✅ No data conflicts

## 📊 Monitoring

Check server health:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-02-20T10:30:00Z"
}
```

## 🔐 Security Notes

- Never commit `.env` file
- Keep MongoDB credentials secure
- Use environment variables in production
- Enable MongoDB Atlas IP whitelist
- Rotate credentials periodically

## 📝 Notes

- The system automatically falls back to localStorage if MongoDB is unavailable
- Data is synced after every contest completion and settings change
- Export/import functionality works as a backup mechanism
- The frontend detects the API automatically based on environment
