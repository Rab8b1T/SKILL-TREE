# Contest System - Deployment Checklist

## 📋 Pre-Deployment

### MongoDB Setup
- [ ] MongoDB Atlas account created
- [ ] Free tier cluster created (M0)
- [ ] Database user created with password
- [ ] IP whitelist configured (or allow from anywhere for testing)
- [ ] Connection string obtained
- [ ] Test connection successful

### Local Testing
- [ ] Python 3.8+ installed
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] `.env` file created from `.env.example`
- [ ] MongoDB URI added to `.env`
- [ ] `DB_NAME` set in `.env`
- [ ] API server runs (`python contest_server.py`)
- [ ] Health endpoint works (`/api/health`)
- [ ] Contest page loads and connects to API
- [ ] Load user profile works
- [ ] Start contest works
- [ ] Data syncs to MongoDB
- [ ] Export/Import works

---

## 🌐 Vercel Deployment

### Prerequisites
- [ ] Vercel account created
- [ ] Vercel CLI installed (`npm i -g vercel`)
- [ ] Git repository ready

### Configuration
- [ ] `vercel.json` exists and configured
- [ ] Environment variables added in Vercel dashboard:
  - [ ] `MONGODB_URI`
  - [ ] `DB_NAME`
- [ ] Project linked to Vercel

### Deploy
```bash
vercel --prod
```

### Post-Deploy Testing
- [ ] Visit production URL
- [ ] Check `/api/health` endpoint
- [ ] Load contest page
- [ ] Test user profile loading
- [ ] Start and complete a test contest
- [ ] Verify data persists in MongoDB
- [ ] Test from different device/browser
- [ ] Check sync status shows "Cloud ☁"

---

## 🔍 Verification Steps

### 1. API Health
```bash
curl https://your-domain.vercel.app/api/health
```
Expected: `{"status":"healthy","database":"connected"}`

### 2. Contest Data
```bash
curl "https://your-domain.vercel.app/api/contest/data?user=test_user"
```
Expected: User data JSON or empty structure

### 3. Frontend
- [ ] Page loads without errors
- [ ] Theme toggle works
- [ ] Sync status shows connection
- [ ] Statistics modal shows data
- [ ] Settings test connection passes

### 4. E2E Flow
1. [ ] Load Codeforces profile
2. [ ] Select division
3. [ ] Start contest
4. [ ] Refresh submissions
5. [ ] End contest
6. [ ] View results
7. [ ] Check history
8. [ ] Verify MongoDB has data
9. [ ] Test from different browser
10. [ ] Data appears correctly

---

## 🔐 Security Checklist

### MongoDB
- [ ] Strong password used
- [ ] IP whitelist configured (not 0.0.0.0/0 in production)
- [ ] 2FA enabled on account
- [ ] Alert emails enabled
- [ ] Audit log enabled (if available)

### Vercel
- [ ] Environment variables set (not in code)
- [ ] `.env` not committed to git
- [ ] `.gitignore` includes sensitive files
- [ ] API endpoints don't expose secrets
- [ ] CORS configured appropriately

### Application
- [ ] User input sanitized
- [ ] No secrets in frontend code
- [ ] Error messages don't leak info
- [ ] Rate limiting considered

---

## 📊 Performance Checklist

### API
- [ ] Database indexes created
- [ ] Queries optimized
- [ ] Connection pooling enabled
- [ ] Response times < 500ms
- [ ] Error handling robust

### Frontend
- [ ] Auto-refresh at 30s (Codeforces limit)
- [ ] localStorage fallback works
- [ ] No memory leaks
- [ ] Smooth animations
- [ ] Mobile responsive

---

## 🐛 Troubleshooting

### Issue: "Database not available"
**Fix**: 
1. Check Vercel environment variables
2. Verify MongoDB IP whitelist
3. Test connection from Vercel function logs
4. Check MongoDB Atlas status

### Issue: Data not syncing
**Fix**:
1. Open browser console
2. Check sync status indicator
3. Test API endpoint manually
4. Verify user handle is set
5. Check network tab for failed requests

### Issue: Codeforces API errors
**Fix**:
1. Check rate limiting (max 2 req/sec)
2. Verify handle is correct
3. Check CF API status
4. Wait and retry

---

## 📝 Post-Deployment Tasks

### Immediate
- [ ] Test all features end-to-end
- [ ] Check error logs in Vercel
- [ ] Monitor MongoDB usage
- [ ] Document production URL
- [ ] Share with test users

### Within 24 Hours
- [ ] Monitor error rates
- [ ] Check database performance
- [ ] Review access logs
- [ ] Test backup/restore

### Weekly
- [ ] Review MongoDB storage usage
- [ ] Check API response times
- [ ] Monitor error patterns
- [ ] Export database backup

---

## 🎯 Success Criteria

A successful deployment means:

✅ **Functionality**
- All contest types work
- Submissions refresh correctly
- Data persists across devices
- Export/import functions
- Statistics display correctly

✅ **Performance**
- Page loads < 3s
- API responses < 500ms
- No console errors
- Smooth user experience

✅ **Reliability**
- MongoDB connection stable
- Offline fallback works
- Data integrity maintained
- No data loss

✅ **Security**
- No exposed secrets
- Proper access controls
- Secure connections (HTTPS)

---

## 🆘 Rollback Plan

If deployment fails:

1. **Revert to localStorage Only**
   - Comment out API calls in `script.js`
   - Use localStorage exclusively
   - No backend needed

2. **Use Previous Deployment**
   ```bash
   vercel rollback
   ```

3. **Local Fallback**
   - Run contest server locally
   - Update API_BASE_URL in frontend
   - Serve frontend locally

---

## 📞 Support Contacts

- **MongoDB**: support@mongodb.com
- **Vercel**: support@vercel.com
- **Codeforces API**: https://codeforces.com/apiHelp

---

## ✅ Final Sign-Off

Date: ________________

Deployed By: ________________

Production URL: ________________

MongoDB Cluster: ________________

Status: ⬜ Success  ⬜ Failed  ⬜ Partial

Notes:
_________________________________________________
_________________________________________________
_________________________________________________

---

**Remember**: Always test in staging before production!
