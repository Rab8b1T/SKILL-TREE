# 🏆 Virtual Contest System with MongoDB Backend

> **Professional virtual contest management system for Codeforces with cloud sync**

Transform your competitive programming practice with a feature-rich contest platform that tracks your progress across all devices.

---

## ⚡ Quick Start

### 1️⃣ Install & Setup (5 minutes)

```bash
# Clone or navigate to project
cd "d:\SKILL TREE"

# Install Python dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env and add your MongoDB URI (see below)
```

### 2️⃣ Get MongoDB (Free Forever)

1. Visit [MongoDB Atlas](https://cloud.mongodb.com) → Sign up
2. Create a **Free M0 Cluster** (512MB - plenty for personal use)
3. Click **Connect** → **Connect your application**
4. Copy connection string to `.env` file

### 3️⃣ Run & Enjoy

```bash
# Verify setup
python test_setup.py

# Start API server
python contest_server.py

# Open in browser
# Navigate to contest/index.html
```

**Alternative: Use setup script**
```bash
# Windows
setup_contest.bat

# Linux/Mac
chmod +x setup_contest.sh
./setup_contest.sh
```

---

## ✨ Features That Set Us Apart

### 🎯 Contest Features
- **4 Division Types**: DIV 1/2/3/4 tailored to your level
- **Custom Contests**: Build your own with 3-10 problems
- **Quick Practice**: Single-problem warmup mode
- **Smart Problem Selection**: Avoids already solved problems
- **Dynamic Scoring**: Competitive time-based scoring
- **Pause/Resume**: Life happens - continue later
- **Auto-Refresh**: Real-time submission tracking

### ☁️ Cloud Sync (The Game Changer!)
- **Multi-Device**: Access from laptop, desktop, anywhere
- **Always Synced**: MongoDB Atlas cloud storage
- **Offline Mode**: Works without internet (localStorage fallback)
- **No Data Loss**: Dual persistence strategy
- **Cross-Browser**: Switch browsers, keep your data

### 📊 Analytics & Insights
- **Contest History**: Complete archive of all contests
- **Performance Graphs**: Visualize your progress
- **Division Stats**: See where you excel
- **Streak Tracking**: Daily practice motivation
- **Detailed Metrics**: Score, time, solve rate, and more

### 🎨 User Experience
- **Dark/Light Theme**: Easy on your eyes
- **Keyboard Shortcuts**: Blazing fast navigation
- **Responsive Design**: Mobile to desktop
- **Sound Notifications**: Optional audio alerts
- **Beautiful UI**: Modern, professional interface

---

## 🗂️ Project Structure

```
SKILL TREE/
│
├── 🚀 Backend
│   ├── contest_server.py         # Flask API server
│   ├── requirements.txt          # Python dependencies
│   └── .env                      # Your configuration (create this!)
│
├── 🎨 Frontend
│   └── contest/
│       ├── index.html            # Main application
│       ├── script.js             # All the logic
│       └── styles.css            # Beautiful styling
│
├── 📚 Documentation
│   ├── CONTEST_MONGODB_SETUP.md          # Setup guide
│   ├── CONTEST_IMPLEMENTATION_SUMMARY.md # Technical details
│   ├── DEPLOYMENT_CHECKLIST.md           # Deploy to production
│   ├── QUICK_REFERENCE.md                # Cheat sheet
│   └── contest/README.md                 # User guide
│
├── 🛠️ Setup Scripts
│   ├── setup_contest.bat         # Windows automated setup
│   ├── setup_contest.sh          # Linux/Mac setup
│   └── test_setup.py             # Verify installation
│
└── ⚙️ Configuration
    ├── .env.example              # Environment template
    ├── .gitignore                # Security
    └── vercel.json               # Deployment config
```

---

## 📖 Documentation Guide

| Document | Purpose | Read When |
|----------|---------|-----------|
| **This README** | Overview & quick start | First time setup |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Commands & shortcuts | Daily use |
| [CONTEST_MONGODB_SETUP.md](CONTEST_MONGODB_SETUP.md) | Detailed setup guide | Setup issues |
| [contest/README.md](contest/README.md) | Complete user guide | Learning features |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Production deployment | Going live |
| [CONTEST_IMPLEMENTATION_SUMMARY.md](CONTEST_IMPLEMENTATION_SUMMARY.md) | Technical architecture | Understanding code |

---

## 🎯 Usage Examples

### Example 1: Daily Practice
```
1. Open contest page
2. Load profile: "rab8bit"
3. Click "Quick Practice"
4. Set rating: 1400, time: 20 min
5. Solve on Codeforces
6. Auto-refresh tracks progress
7. Build your streak! 🔥
```

### Example 2: Virtual Contest
```
1. Load profile
2. Choose "DIV 3"
3. Review your stats for this division
4. Click "Start Contest"
5. Solve 7 problems in 2.5 hours
6. Track live score and penalties
7. Review detailed results
8. See upsolve list
```

### Example 3: Custom Training
```
1. Select "Custom Contest"
2. Set 5 problems, 1200-1600 rating
3. Filter by tags: "dp", "graphs"
4. Start and compete
5. Review performance
6. Track progress over time
```

---

## 🔌 API Reference

### Base URLs
- **Local**: `http://localhost:5000/api`
- **Production**: `https://your-domain.vercel.app/api`

### Key Endpoints

```bash
# Health check
GET /api/health

# Get user's all data
GET /api/contest/data?user=<handle>

# Save user's data
POST /api/contest/data
Body: { user, pastContests, streak, settings }

# Get statistics
GET /api/contest/stats?user=<handle>
```

See [CONTEST_MONGODB_SETUP.md](CONTEST_MONGODB_SETUP.md) for complete API docs.

---

## 🚀 Deployment to Vercel

### Production Ready in 5 Minutes

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel --prod

# 3. Add environment variables in Vercel dashboard
# - MONGODB_URI
# - DB_NAME

# 4. Done! Your app is live with HTTPS
```

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for detailed steps.

---

## 🧪 Testing Your Setup

Run the automated test suite:

```bash
python test_setup.py
```

This checks:
- ✅ Python version (3.8+)
- ✅ All dependencies installed
- ✅ .env file configured
- ✅ MongoDB connection
- ✅ Server import works
- ✅ All files present
- ✅ API endpoints (if server running)

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `R` | Refresh submissions |
| `Space` | Pause/Resume contest |
| `Esc` | End contest |
| `?` | Show all shortcuts |
| `T` | Toggle dark/light theme |
| `N` | Start new contest |

---

## 🔧 Troubleshooting

### "Database not available"
- Check `.env` has valid `MONGODB_URI`
- Whitelist your IP in MongoDB Atlas
- Test: `python test_setup.py`

### "Port already in use"
```bash
PORT=8000 python contest_server.py
```

### Data not syncing
- Check sync status icon (top-right)
- Settings → Test Connection
- Export data as backup

### More issues?
See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) troubleshooting section.

---

## 🔐 Security & Privacy

✅ **Your data is secure:**
- Environment variables for sensitive config
- MongoDB user authentication
- IP whitelist support
- No hardcoded credentials
- `.gitignore` protects secrets

✅ **Your data is yours:**
- Export anytime
- Delete anytime
- Full data portability
- Open source (can self-host)

---

## 📊 Performance & Limits

### MongoDB Free Tier (M0)
- **Storage**: 512 MB (thousands of contests)
- **RAM**: 512 MB shared
- **Connections**: 500 concurrent
- **Cost**: $0 forever

### Codeforces API
- **Rate Limit**: 2 requests/second
- **Our Rate**: 1 request/30 seconds (safe)
- **Handles**: Unlimited

### Vercel Free Tier
- **Bandwidth**: 100 GB/month
- **Functions**: 100 GB-hours
- **Cost**: $0 for personal use

**Verdict**: Free tiers are MORE than enough! 🎉

---

## 🤝 Contributing

### Found a bug?
1. Export your data (backup)
2. Note reproduction steps
3. Check browser console
4. Check server logs

### Want to add features?
1. Fork the repository
2. Create feature branch
3. Make changes + test
4. Document changes
5. Submit pull request

### Code style
- Python: PEP 8
- JavaScript: ES6+, consistent formatting
- CSS: BEM methodology

---

## 📈 Roadmap

### ✅ Completed (v2.0)
- MongoDB cloud sync
- Multi-device support
- Statistics dashboard
- Connection testing
- Comprehensive documentation

### 🚧 In Progress
- Email notifications
- Contest scheduling
- Team contests

### 🎯 Planned
- Mobile app (React Native)
- Discord integration
- Global leaderboards
- Achievement system
- Problem recommendations
- AI-powered hints

---

## 🌟 Why This Exists

Competitive programming is hard. Practice should be **easy**.

This system was built to:
- ✅ Make virtual contests as easy as clicking a button
- ✅ Track progress reliably across devices
- ✅ Provide insights to improve faster
- ✅ Stay motivated with streaks and stats
- ✅ Focus on solving, not managing

**Result**: More practice, better results, higher ratings! 📈

---

## 📜 License

Open source for personal use. Feel free to:
- Use for your own practice
- Modify for your needs
- Learn from the code
- Share with friends

**Not allowed**:
- Commercial use without permission
- Claiming as your own work

---

## 🙏 Acknowledgments

Built with:
- **Flask** - Web framework
- **MongoDB** - Database
- **PyMongo** - Python driver
- **Vercel** - Deployment platform
- **Codeforces** - Problem source

Inspired by competitive programmers worldwide! 🌍

---

## 💬 Support

### Need help?
1. Check documentation (see table above)
2. Run `python test_setup.py`
3. Review browser console
4. Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

### Documentation not clear?
Feedback welcome! Open an issue with:
- What you tried to do
- What went wrong
- What would have helped

---

## 📞 Quick Links

| Resource | URL |
|----------|-----|
| MongoDB Atlas | https://cloud.mongodb.com |
| Vercel | https://vercel.com |
| Codeforces API | https://codeforces.com/apiHelp |
| Flask Docs | https://flask.palletsprojects.com |
| Python Download | https://python.org |

---

## 🎉 Get Started Now!

```bash
# 1. Clone/Download project
# 2. Run setup script
python test_setup.py

# 3. Start server
python contest_server.py

# 4. Open contest/index.html
# 5. Load your profile
# 6. Start competing!
```

---

<div align="center">

**🚀 Built for competitive programmers, by competitive programmers**

*Happy coding! May your submissions be green and your ratings high!* ✅📈

---

**Version 2.0** - MongoDB Backend Edition  
*Last updated: February 2024*

</div>
