# Contest System - Quick Reference Card

## 🚀 Quick Start (2 Minutes)

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Get MongoDB URI
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create free cluster
3. Click Connect → Get connection string

### Step 3: Configure
```bash
# Copy example
cp .env.example .env

# Edit and add your MongoDB URI
notepad .env  # or nano, vim, etc.
```

### Step 4: Run
```bash
python contest_server.py
```

### Step 5: Open
Open `contest/index.html` in your browser

✅ **Done!** Load your Codeforces profile and start competing!

---

## 🔑 Environment Variables

```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/...
DB_NAME=skilltree
FLASK_ENV=production
```

---

## 📡 API Quick Reference

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Get User Data
```bash
curl "http://localhost:5000/api/contest/data?user=rab8bit"
```

### Save Data
```bash
curl -X POST http://localhost:5000/api/contest/data \
  -H "Content-Type: application/json" \
  -d '{"user":"rab8bit","pastContests":[],"streak":{},"settings":{}}'
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `R` | Refresh submissions |
| `Space` | Pause/Resume |
| `Esc` | End contest |
| `?` | Show shortcuts |
| `T` | Toggle theme |
| `N` | New contest |

---

## 🎯 Contest Divisions

| Division | Rating Range | Problems | Duration |
|----------|--------------|----------|----------|
| DIV 4 | 800-1500 | 7 | 2 hours |
| DIV 3 | 800-1700 | 7 | 2.5 hours |
| DIV 2 | 1000-2200 | 6 | 2 hours |
| DIV 1 | 1500-2800 | 6 | 2.5 hours |
| Custom | Your choice | 3-10 | Custom |

---

## 🐛 Common Issues

### Database Not Available
```bash
# Check MongoDB URI in .env
cat .env

# Test connection
python -c "from pymongo import MongoClient; print(MongoClient('YOUR_URI').admin.command('ping'))"
```

### Port Already in Use
```bash
# Use different port
PORT=8000 python contest_server.py
```

### API Not Connecting
1. Check server is running
2. Check browser console for errors
3. Verify API URL in script.js
4. Test health endpoint manually

---

## 📊 Sync Status Icons

| Icon | Meaning |
|------|---------|
| **Cloud ☁** | Connected to MongoDB |
| **Syncing...** | Uploading data |
| **Offline** | Using localStorage only |
| **Error** | Connection failed |

---

## 🔧 Quick Fixes

### Clear All Data
Settings → Clear All Data

### Export Backup
History → Export

### Test Connection
Settings → Test Connection

### Force Sync
Make any change → Auto syncs

---

## 📁 File Structure

```
SKILL TREE/
├── contest_server.py          # Backend API
├── requirements.txt           # Python deps
├── .env                       # Your config (create this!)
├── .env.example              # Config template
├── vercel.json               # Deployment config
├── contest/
│   ├── index.html            # Main page
│   ├── script.js             # Frontend logic
│   ├── styles.css            # Styling
│   └── README.md             # Full docs
└── Documentation/
    ├── CONTEST_MONGODB_SETUP.md
    ├── DEPLOYMENT_CHECKLIST.md
    └── CONTEST_IMPLEMENTATION_SUMMARY.md
```

---

## 🚢 Deploy to Vercel

```bash
# Install CLI
npm i -g vercel

# Deploy
vercel --prod

# Add environment variables in Vercel dashboard:
# - MONGODB_URI
# - DB_NAME
```

---

## 📞 Need Help?

1. **Check Documentation**:
   - `CONTEST_MONGODB_SETUP.md` - Setup guide
   - `contest/README.md` - User guide
   - `DEPLOYMENT_CHECKLIST.md` - Deploy guide

2. **Common Fixes**:
   - Restart server
   - Clear browser cache
   - Check .env file
   - Verify MongoDB Atlas status

3. **Debug**:
   - Check browser console (F12)
   - Check server logs
   - Test API manually
   - Export data as backup

---

## 💡 Pro Tips

1. **Auto-Refresh**: Keep at 30s to avoid Codeforces rate limit
2. **Export Data**: Backup weekly using Export button
3. **Offline Mode**: Works great with localStorage fallback
4. **Quick Practice**: Great for daily warmup
5. **Streak**: Practice daily to maintain streak
6. **Statistics**: Click stats icon to see progress

---

## 📈 Performance Tips

- Keep contest history < 100 contests
- Use auto-refresh (don't spam manual refresh)
- Export old data periodically
- Close unused browser tabs
- Check MongoDB storage limits

---

## ✅ Setup Checklist

- [ ] Python installed
- [ ] Dependencies installed
- [ ] MongoDB Atlas account created
- [ ] Cluster created
- [ ] .env file configured
- [ ] Server runs successfully
- [ ] Contest page opens
- [ ] Profile loads
- [ ] Contest starts
- [ ] Data syncs to cloud

---

## 🎓 Learning Resources

- **MongoDB Atlas**: https://docs.atlas.mongodb.com/
- **Flask Docs**: https://flask.palletsprojects.com/
- **Codeforces API**: https://codeforces.com/apiHelp
- **Vercel Docs**: https://vercel.com/docs

---

**Print this and keep handy! 📄**

*Version 2.0 - MongoDB Backend*
