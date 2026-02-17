# Cloud Sync Update

## Problem
Contest history was stored in browser's `localStorage`, which is device-specific. This meant:
- Contest data only visible on the device where contests were done
- No synchronization across different devices (laptop, phone, etc.)
- Data lost if browser cache was cleared

## Solution
Implemented cloud-based data synchronization using Vercel serverless functions and Upstash Redis.

## Changes Made

### 1. Backend API (`api/contest-data.js`)
- Created new serverless function to handle contest data storage
- Supports GET and POST operations
- Stores data in Upstash Redis with user-specific keys
- Includes CORS headers for cross-origin requests
- Falls back gracefully if Redis is unavailable

### 2. Frontend Updates (`contest/script.js`)
- Added `syncToAPI()` function to save data to cloud
- Added `loadFromAPI()` function to load data from cloud
- Modified all save operations to sync to API:
  - Contest history (`saveContest()`)
  - Streak data (`saveStreak()`)
  - Settings (`saveSettings()`)
  - Active contests (`updateInProgressContest()`)
- Maintains localStorage as backup/fallback
- Loads from cloud on page load

### 3. Sync Status Indicator (`contest/index.html` & `contest/styles.css`)
- Added visual sync status indicator in header
- Shows three states:
  - **Synced** (green): Data successfully synced to cloud
  - **Syncing** (blue): Currently syncing data
  - **Local only** (orange): Cloud sync failed, using localStorage
- Animated spinner during sync operation

### 4. Vercel Configuration (`vercel.json`)
- Added route for new API endpoint: `/contest-data` → `/api/contest-data`

## How It Works

### On Page Load:
1. App attempts to load data from cloud API
2. If successful: Shows "Synced" status
3. If failed: Falls back to localStorage, shows "Local only" status

### When Data Changes:
1. Data is updated in memory (`state` object)
2. `syncToAPI()` is called automatically
3. Data is sent to cloud via POST request
4. Also saved to localStorage as backup
5. Sync status indicator updates based on result

### Data Structure Stored:
```json
{
  "pastContests": [...],
  "streak": { "current": 0, "best": 0, ... },
  "settings": { "soundEnabled": false, ... },
  "lastUser": "rab8bit",
  "lastSyncTime": "2026-02-17T..."
}
```

## User Benefits
- ✅ Contest history visible across all devices
- ✅ Automatic cloud synchronization
- ✅ Fallback to localStorage if cloud unavailable
- ✅ Visual indicator of sync status
- ✅ No user action required - works automatically
- ✅ Data preserved even if browser cache cleared

## Testing Checklist
- [ ] Do a contest on Device A
- [ ] Check if contest appears in history on Device A
- [ ] Open app on Device B
- [ ] Verify contest history shows on Device B
- [ ] Verify sync status shows "Synced"
- [ ] Test with network offline (should show "Local only")

## Future Enhancements
- Multi-user support (currently hardcoded to "rab8bit")
- Conflict resolution for simultaneous edits from multiple devices
- Offline queue for sync operations
- Last sync timestamp display in settings
