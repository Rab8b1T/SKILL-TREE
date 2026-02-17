# 🏆 Virtual Contest System - Complete Guide

A full-stack virtual contest management system for Codeforces with MongoDB cloud sync.

## ✨ Features

### Contest Features
- ✅ **Multiple Division Support**: DIV 1, DIV 2, DIV 3, DIV 4, and Custom
- ✅ **Quick Practice Mode**: Single problem practice with timer
- ✅ **Real-time Submissions Tracking**: Auto-refresh from Codeforces API
- ✅ **Dynamic Scoring**: Score decreases over time (competitive format)
- ✅ **Penalty System**: Wrong submissions add 5-minute penalty
- ✅ **Pause/Resume**: Pause contests and continue later
- ✅ **Problem Filtering**: Filter by rating, tags, and difficulty

### Data & Sync
- ✅ **Cloud Sync with MongoDB**: All data stored in cloud
- ✅ **Multi-Device Support**: Access same data from anywhere
- ✅ **Offline Fallback**: Works with localStorage when offline
- ✅ **Real-time Sync Status**: See connection status live
- ✅ **Export/Import**: Backup your data anytime

### Analytics & Tracking
- ✅ **Contest History**: Full history of all contests
- ✅ **Performance Graphs**: Track score and solve rate over time
- ✅ **Division Statistics**: Stats per division type
- ✅ **Streak Tracking**: Daily practice streak counter
- ✅ **Detailed Stats**: Problems solved, average score, best performance

### User Experience
- ✅ **Dark/Light Theme**: Toggle between themes
- ✅ **Keyboard Shortcuts**: Fast navigation (R, Space, Esc, etc.)
- ✅ **Sound Notifications**: Optional sound alerts
- ✅ **Responsive Design**: Works on all screen sizes
- ✅ **Beautiful UI**: Modern, clean interface

---

## 🚀 Local Development Setup

### Prerequisites
- Python 3.8+ installed
- MongoDB Atlas account (free tier is fine)
- Web browser

### Step 1: Install Dependencies

```bash
cd "d:\SKILL TREE"
pip install -r requirements.txt
```

### Step 2: Set Up MongoDB

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free account
3. Create a new cluster (M0 Free tier)
4. Click **Connect** → **Connect your application**
5. Copy the connection string

### Step 3: Configure Environment

1. Copy the example env file:
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` and add your MongoDB URI:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   DB_NAME=skilltree
   ```

### Step 4: Run the Server

```bash
# Start contest API server
python contest_server.py
```

The API will be available at `http://localhost:5000`

### Step 5: Open the App

Open `contest/index.html` in your browser or serve it with:

```bash
# Python simple server (from project root)
python -m http.server 8000
```

Then visit: `http://localhost:8000/contest/`

---

## 🌐 Vercel Deployment

### Prerequisites
- Vercel account
- MongoDB Atlas cluster set up
- Git repository

### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 2: Configure Environment Variables

In your Vercel project dashboard, add these environment variables:
- `MONGODB_URI`: Your MongoDB connection string
- `DB_NAME`: `skilltree` (or your preferred name)

### Step 3: Deploy

```bash
vercel --prod
```

The `vercel.json` file is already configured with proper routing.

### Step 4: Update API URL (if needed)

The frontend automatically detects if it's on localhost or production:
- **Localhost**: Uses `http://localhost:5000/api`
- **Production**: Uses relative path `/api`

---

## 📚 API Documentation

### Base URL
- **Local**: `http://localhost:5000/api`
- **Production**: `https://your-domain.vercel.app/api`

### Endpoints

#### Health Check
```http
GET /api/health
```
Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-02-20T10:30:00Z"
}
```

#### Get User Data
```http
GET /api/contest/data?user=<codeforces_handle>
```
Response:
```json
{
  "user": "rab8bit",
  "pastContests": [...],
  "streak": { ... },
  "settings": { ... },
  "lastSyncTime": "..."
}
```

#### Save User Data
```http
POST /api/contest/data
Content-Type: application/json

{
  "user": "rab8bit",
  "pastContests": [...],
  "streak": { ... },
  "settings": { ... }
}
```

#### Get Statistics
```http
GET /api/contest/stats?user=<codeforces_handle>
```

---

## 🗄️ Database Schema

### Collection: `contest_data`

```javascript
{
  _id: ObjectId,
  user: "rab8bit",                    // Codeforces handle
  pastContests: [
    {
      contestId: 1708445600000,
      contestName: "DIV 3",
      contestType: "div3",
      problems: [...],
      solvedCount: 5,
      totalProblems: 7,
      totalScore: 2500,
      totalPenalty: 10,
      timeTaken: 5400000,             // milliseconds
      date: ISODate("2024-02-20"),
      inProgress: false
    }
  ],
  streak: {
    current: 5,
    lastDate: "2024-02-20",
    best: 12,
    history: ["2024-02-15", "2024-02-16", ...]
  },
  settings: {
    soundEnabled: false,
    autoRefresh: true,
    showTags: false
  },
  lastSyncTime: "2024-02-20T10:30:00Z",
  updatedAt: ISODate("2024-02-20")
}
```

---

## 🎯 Usage Guide

### Starting a Contest

1. **Load Profile**: Enter your Codeforces handle and click "Load Profile"
2. **Choose Division**: Select DIV 1/2/3/4 or create Custom contest
3. **Review & Start**: Check preview stats and click "Start Contest"
4. **Solve Problems**: Click problem links to open on Codeforces
5. **Submit Solutions**: Submit on Codeforces as usual
6. **Refresh**: Click "Refresh" or press `R` to update standings
7. **End Contest**: Timer expires automatically or click "End Contest"

### Quick Practice

1. Click "Quick Practice" from main menu
2. Set target rating and time limit
3. Optionally select topic tags
4. Click "Start Practice"
5. Solve the single problem within time limit

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `R` | Refresh submissions |
| `Space` | Pause/Resume contest |
| `Esc` | End contest |
| `?` | Show shortcuts |
| `T` | Toggle theme |
| `N` | New contest |

---

## 🔧 Troubleshooting

### "Database not available" Error

**Cause**: Cannot connect to MongoDB

**Solutions**:
1. Check `.env` file has correct `MONGODB_URI`
2. Verify MongoDB Atlas cluster is running
3. Whitelist your IP in MongoDB Atlas
4. Check network connection

**Fallback**: App works with localStorage if MongoDB unavailable

### API Server Won't Start

**Cause**: Missing dependencies or port conflict

**Solutions**:
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Use different port
PORT=8000 python contest_server.py
```

### Data Not Syncing

**Solutions**:
1. Check sync status indicator (top right)
2. Click Settings → Test Connection
3. Check browser console for errors
4. Verify API server is running
5. Export data as backup

### Codeforces API Rate Limit

**Cause**: Too many API requests

**Solutions**:
- Use auto-refresh (30s interval is safe)
- Don't spam manual refresh
- Wait a minute if rate limited

---

## 🔐 Security Best Practices

### Environment Variables
- ✅ Never commit `.env` file to git
- ✅ Use different credentials for dev/prod
- ✅ Rotate MongoDB password periodically

### MongoDB Atlas
- ✅ Enable IP whitelist (not `0.0.0.0/0`)
- ✅ Use strong passwords
- ✅ Enable 2FA on MongoDB account
- ✅ Set up connection alerts

### Vercel
- ✅ Store secrets as environment variables
- ✅ Don't expose API keys in code
- ✅ Enable Vercel authentication if needed

---

## 📊 Performance Tips

1. **Auto-refresh**: Keep at 30s interval (Codeforces limit)
2. **Problem Count**: Limit custom contests to ≤10 problems
3. **Export Regular**: Backup data weekly
4. **Clean History**: Delete old test contests periodically

---

## 🤝 Contributing

### Development Workflow

1. Create feature branch
2. Make changes
3. Test locally
4. Test API endpoints
5. Submit PR with description

### Code Style

- Python: Follow PEP 8
- JavaScript: Use ES6+
- CSS: BEM naming for new classes

---

## 📝 Changelog

### v2.0.0 - MongoDB Backend
- ✨ Added MongoDB cloud sync
- ✨ Multi-device support
- ✨ Enhanced statistics dashboard
- ✨ Real-time sync status
- ✨ Connection testing
- 🐛 Fixed localStorage reliability issues

### v1.0.0 - Initial Release
- ✨ Contest system with 4 divisions
- ✨ Quick practice mode
- ✨ Local storage persistence
- ✨ Dark/light theme

---

## 📄 License

This project is open source and available for personal use.

---

## 🆘 Support

### Getting Help

1. Check this README thoroughly
2. Review `CONTEST_MONGODB_SETUP.md`
3. Check browser console for errors
4. Test API health endpoint
5. Export your data before major changes

### Common Issues

See **Troubleshooting** section above.

---

## 🎨 Customization

### Change Division Configs

Edit `contest/script.js`:
```javascript
const CONTEST_CONFIGS = {
  div3: {
    problems: [...],  // Modify problem ratings
    duration: 150     // Change duration
  }
}
```

### Add New Themes

Edit `contest/styles.css`:
```css
[data-theme="custom"] {
  --bg-primary: #...;
  --accent-primary: #...;
}
```

---

## 🚦 Status

- ✅ Core features complete
- ✅ MongoDB integration stable
- ✅ Production ready
- 🚧 Mobile app (planned)
- 🚧 Team contests (planned)

---

**Happy Coding! 🚀**
