# 🚀 Deploy to Vercel - Quick Guide

## ✅ Pre-Deployment Checklist

- [x] MongoDB connection tested locally ✓
- [x] Dependencies installed (`requirements.txt`)
- [x] Environment file configured (`.env`)
- [x] API endpoints tested and working ✓
- [x] `contest_server.py` is production-ready

## 📋 Deployment Steps

### 1. Prepare Your Repository

```bash
# Make sure you're in the project directory
cd "d:\SKILL TREE"

# Check git status
git status

# Add all files
git add .

# Commit
git commit -m "Add MongoDB backend for virtual contest system"

# Push to GitHub (if not already done)
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### Option B: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the configuration

### 3. Configure Environment Variables

In Vercel Dashboard (Settings → Environment Variables):

**Add these variables:**

| Name | Value |
|------|-------|
| `MONGODB_URI` | `mongodb+srv://arghya2k01_db_user:kMGDh6WGdrAe0a2i@skilltree.dlxv8zm.mongodb.net/?appName=skilltree` |
| `DB_NAME` | `skilltree` |

**Important:** These variables are needed for ALL environments (Production, Preview, Development)

### 4. Verify Deployment

Once deployed, test your API:

```bash
# Replace YOUR_DOMAIN with your Vercel domain
curl https://YOUR_DOMAIN.vercel.app/api/health

# Should return:
# {"status":"healthy","database":"connected","timestamp":"..."}
```

### 5. Update Frontend (if needed)

The frontend (`contest/script.js`) already has auto-detection:
- Localhost: Uses `http://localhost:5000/api`
- Production: Uses `/api` (relative path, works on Vercel)

No changes needed! 🎉

## 🔍 Testing Your Deployment

### Test Health Endpoint
```bash
curl https://YOUR_DOMAIN.vercel.app/api/health
```

### Test Get Data
```bash
curl "https://YOUR_DOMAIN.vercel.app/api/contest/data?user=rab8bit"
```

### Test Save Data
```bash
curl -X POST https://YOUR_DOMAIN.vercel.app/api/contest/data \
  -H "Content-Type: application/json" \
  -d '{"user":"rab8bit","pastContests":[],"streak":{},"settings":{}}'
```

## 📱 Access Your App

1. **Contest Page**: `https://YOUR_DOMAIN.vercel.app/contest/`
2. **API**: `https://YOUR_DOMAIN.vercel.app/api/`

## 🐛 Troubleshooting

### Issue: 500 Internal Server Error

**Check:**
1. Vercel function logs (Dashboard → Deployments → View Function Logs)
2. Environment variables are set correctly
3. MongoDB Atlas IP whitelist includes `0.0.0.0/0` (allow from anywhere)

**Fix:**
- Go to MongoDB Atlas → Network Access
- Add IP: `0.0.0.0/0` (allows Vercel to connect)

### Issue: Database not connected

**Check:**
1. `MONGODB_URI` is correct in Vercel env variables
2. MongoDB cluster is running
3. Database user has read/write permissions

**Fix:**
- Copy your MongoDB URI from Atlas
- Update in Vercel Dashboard → Settings → Environment Variables
- Redeploy

### Issue: CORS errors

**Already fixed!** The server has CORS enabled for all origins.

## 📊 Monitor Your Deployment

### Vercel Dashboard
- **Analytics**: View traffic and performance
- **Logs**: Real-time function logs
- **Deployments**: Deployment history

### MongoDB Atlas
- **Metrics**: Database usage and performance
- **Operations**: Query performance
- **Charts**: Create custom dashboards

## 🔄 Updating Your Deployment

```bash
# Make changes to your code
# ...

# Commit and push
git add .
git commit -m "Update: description of changes"
git push

# Vercel auto-deploys on push! 🚀
# Or manually: vercel --prod
```

## ✅ Success Criteria

Your deployment is successful when:

- ✅ `/api/health` returns `{"status":"healthy","database":"connected"}`
- ✅ Contest page loads without errors
- ✅ Can load Codeforces profile
- ✅ Can start and complete a contest
- ✅ Data persists across browser sessions
- ✅ Works on different devices

## 🎉 You're Live!

Your Virtual Contest system is now:
- ✅ Running on Vercel (globally distributed CDN)
- ✅ Storing data in MongoDB Atlas (cloud database)
- ✅ Accessible from anywhere in the world
- ✅ Costing $0 (free tiers)

**Share your domain and start competing!** 🏆

---

## 📞 Need Help?

1. Check Vercel function logs
2. Check MongoDB Atlas logs
3. Review this guide
4. Check `CONTEST_README.md` for detailed docs

**Pro Tip:** Keep your MongoDB URI secret! Never commit it to git.
