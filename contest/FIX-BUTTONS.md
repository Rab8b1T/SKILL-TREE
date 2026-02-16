# Fix: Pause/Resume Buttons Not Showing

## Issue
Pause and Resume buttons were not visible when contest started from division preview.
They only appeared after page refresh.

## Root Causes

1. **HTML Issue**: Resume button had both `class="hidden"` and `style="display:none;"` causing CSS conflicts
2. **JavaScript Issue**: `displayContestArena()` function didn't initialize button visibility when contest started

## Fixes Applied

### 1. HTML Fix (index.html)
```html
<!-- BEFORE -->
<button class="btn-warning" id="pauseBtn" onclick="pauseContest()">
<button class="btn-success hidden" id="resumeBtn" onclick="resumeContest()" style="display:none;">

<!-- AFTER -->
<button class="btn-warning" id="pauseBtn" onclick="pauseContest()" style="display:inline-flex;">
<button class="btn-success" id="resumeBtn" onclick="resumeContest()" style="display:none;">
```

**Changes:**
- Removed `class="hidden"` from Resume button (conflicted with inline styles)
- Added explicit `style="display:inline-flex;"` to Pause button
- Kept `style="display:none;"` on Resume button for initial state

### 2. JavaScript Fix (script.js)
```javascript
function displayContestArena() {
    // ... existing code ...
    
    // NEW: Initialize pause/resume buttons based on state
    const pauseBtn = document.getElementById('pauseBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    
    if (state.isPaused) {
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = 'inline-flex';
    } else {
        pauseBtn.style.display = 'inline-flex';
        resumeBtn.style.display = 'none';
    }
    
    // ... rest of code ...
}
```

**Changes:**
- Added button initialization when arena is displayed
- Checks current pause state
- Sets correct visibility for both buttons
- Prevents auto-refresh interval if paused

## Result

✅ **Pause button now visible immediately when contest starts**
✅ **Resume button shows correctly when contest is paused**
✅ **Buttons work from both fresh start and restored state**
✅ **No need to refresh page to see controls**

## Testing

Test scenarios that now work:
1. Start new contest → Pause button visible ✅
2. Click Pause → Resume button appears ✅
3. Refresh page → Correct button shows based on state ✅
4. Resume contest → Pause button appears ✅

## Files Modified

1. `index.html` - Fixed button HTML structure
2. `script.js` - Added button initialization in `displayContestArena()`

## Deploy
Ready to deploy to Vercel - all fixes are client-side.
