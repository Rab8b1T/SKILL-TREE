// ===== Configuration =====
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : '/api';

function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
}

// ===== State Management =====
const state = {
    currentUser: null,
    solvedProblems: new Set(),
    allProblems: [],
    problemStats: {},
    currentContest: null,
    contestStartTime: null,
    contestDuration: 120,
    contestPausedTime: 0,
    isPaused: false,
    pauseStartTime: null,
    timerInterval: null,
    autoRefreshInterval: null,
    submissions: [],
    pastContests: [],
    selectedTags: new Set(),
    selectedDivision: null,
    settings: {
        soundEnabled: false,
        autoRefresh: true,
        showTags: false,
        notifications: false
    },
    streak: {
        current: 0,
        lastDate: null,
        best: 0,
        history: []
    },
    dailyGoal: {
        target: 1,
        completed: 0,
        date: null
    },
    focusMode: false,
    apiSyncEnabled: true,
    lastSyncTime: null,
    currentHandle: 'rab8bit',
    _syncTimeout: null,
    _cloudActiveContest: null,
    _recommendedProblems: []
};

// ===== API Sync Functions =====
function updateSyncStatus(status, text) {
    const syncEl = document.getElementById('syncStatus');
    const syncText = syncEl.querySelector('.sync-text');
    syncEl.className = 'sync-status ' + status;
    syncText.textContent = text;
}

function debouncedSync() {
    if (state._syncTimeout) clearTimeout(state._syncTimeout);
    state._syncTimeout = setTimeout(() => syncToAPI(), 1500);
}

async function syncToAPI() {
    if (!state.apiSyncEnabled || !state.currentHandle) {
        saveToLocalStorage();
        return;
    }
    
    updateSyncStatus('syncing', 'Syncing...');
    
    try {
        let activeContestData = null;
        if (state.currentContest) {
            activeContestData = {
                currentUser: state.currentUser ? {
                    handle: state.currentUser.handle,
                    rating: state.currentUser.rating,
                    maxRating: state.currentUser.maxRating,
                    rank: state.currentUser.rank
                } : null,
                currentContest: state.currentContest,
                contestStartTime: state.contestStartTime,
                contestDuration: state.contestDuration,
                contestPausedTime: state.contestPausedTime,
                isPaused: state.isPaused,
                pauseStartTime: state.pauseStartTime,
                submissions: state.submissions,
                selectedDivision: state.selectedDivision
            };
        }

        const dataToSync = {
            user: state.currentHandle,
            pastContests: state.pastContests,
            streak: state.streak,
            settings: state.settings,
            dailyGoal: state.dailyGoal,
            activeContest: activeContestData,
            lastSyncTime: new Date().toISOString()
        };

        const response = await fetch(`${API_BASE_URL}/contest/data`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(dataToSync)
        });

        if (response.ok) {
            state.lastSyncTime = Date.now();
            updateSyncStatus('synced', 'Cloud \u2601');
        } else {
            updateSyncStatus('error', 'Local only');
        }
    } catch (error) {
        console.warn('Sync error:', error.message);
        updateSyncStatus('error', 'Offline');
    }
    
    saveToLocalStorage();
}

function syncActiveContestToCloud() {
    if (!state.apiSyncEnabled || !state.currentHandle || !state.currentContest) return;
    debouncedSync();
}

function saveToLocalStorage() {
    localStorage.setItem('pastContests', JSON.stringify(state.pastContests));
    localStorage.setItem('practiceStreak', JSON.stringify(state.streak));
    localStorage.setItem('contestSettings', JSON.stringify(state.settings));
    localStorage.setItem('dailyGoal', JSON.stringify(state.dailyGoal));
}

async function loadFromAPI() {
    const savedHandle = localStorage.getItem('lastUser') || 'rab8bit';
    state.currentHandle = savedHandle;
    
    try {
        const response = await fetch(`${API_BASE_URL}/contest/data`, { headers: getAuthHeaders() });
        
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        
        const data = await response.json();
        
        if (data.pastContests && Array.isArray(data.pastContests)) {
            state.pastContests = data.pastContests;
        }
        if (data.streak && typeof data.streak === 'object') {
            state.streak = { ...state.streak, ...data.streak };
        }
        if (data.settings && typeof data.settings === 'object') {
            state.settings = { ...state.settings, ...data.settings };
        }
        if (data.dailyGoal && typeof data.dailyGoal === 'object') {
            state.dailyGoal = { ...state.dailyGoal, ...data.dailyGoal };
        }
        if (data.activeContest && typeof data.activeContest === 'object') {
            state._cloudActiveContest = data.activeContest;
        }
        
        state.apiSyncEnabled = true;
        updateSyncStatus('synced', 'Cloud \u2601');
        return true;
    } catch (error) {
        console.warn('Failed to load from API:', error.message);
        state.apiSyncEnabled = false;
        updateSyncStatus('error', 'Offline');
        
        loadFromLocalStorage();
        return false;
    }
}

function loadFromLocalStorage() {
    try {
        const sc = localStorage.getItem('pastContests');
        if (sc) state.pastContests = JSON.parse(sc);
    } catch(e) { state.pastContests = []; }
    
    try {
        const ss = localStorage.getItem('practiceStreak');
        if (ss) state.streak = { ...state.streak, ...JSON.parse(ss) };
    } catch(e) {}
    
    try {
        const st = localStorage.getItem('contestSettings');
        if (st) state.settings = { ...state.settings, ...JSON.parse(st) };
    } catch(e) {}
    
    try {
        const dg = localStorage.getItem('dailyGoal');
        if (dg) state.dailyGoal = { ...state.dailyGoal, ...JSON.parse(dg) };
    } catch(e) {}
}

// ===== Contest Configurations =====
const CONTEST_CONFIGS = {
    div4: {
        name: 'DIV 4',
        problems: [
            { index: 'A', rating: [800, 900] },
            { index: 'B', rating: [900, 1000] },
            { index: 'C', rating: [1000, 1100] },
            { index: 'D', rating: [1100, 1200] },
            { index: 'E', rating: [1200, 1300] },
            { index: 'F', rating: [1300, 1400] },
            { index: 'G', rating: [1400, 1500] }
        ],
        duration: 120,
        tags: ['implementation', 'math', 'greedy', 'brute force', 'constructive algorithms']
    },
    div3: {
        name: 'DIV 3',
        problems: [
            { index: 'A', rating: [800, 1000] },
            { index: 'B', rating: [1000, 1200] },
            { index: 'C', rating: [1200, 1300] },
            { index: 'D', rating: [1300, 1400] },
            { index: 'E', rating: [1400, 1500] },
            { index: 'F', rating: [1500, 1600] },
            { index: 'G', rating: [1600, 1700] }
        ],
        duration: 150,
        tags: ['implementation', 'math', 'greedy', 'dp', 'data structures', 'graphs',
               'sortings', 'binary search', 'constructive algorithms', 'dfs and similar']
    },
    div2: {
        name: 'DIV 2',
        problems: [
            { index: 'A', rating: [1000, 1200] },
            { index: 'B', rating: [1200, 1400] },
            { index: 'C', rating: [1400, 1600] },
            { index: 'D', rating: [1600, 1800] },
            { index: 'E', rating: [1800, 2000] },
            { index: 'F', rating: [2000, 2200] }
        ],
        duration: 120,
        tags: ['dp', 'greedy', 'graphs', 'data structures', 'math', 'number theory',
               'sortings', 'binary search', 'constructive algorithms', 'two pointers']
    },
    div1: {
        name: 'DIV 1',
        problems: [
            { index: 'A', rating: [1500, 1700] },
            { index: 'B', rating: [1700, 1900] },
            { index: 'C', rating: [1900, 2100] },
            { index: 'D', rating: [2100, 2300] },
            { index: 'E', rating: [2300, 2500] },
            { index: 'F', rating: [2500, 2800] }
        ],
        duration: 150,
        tags: ['dp', 'graphs', 'data structures', 'number theory', 'combinatorics', 'geometry',
               'binary search', 'constructive algorithms', 'bitmasks', 'trees']
    }
};

const AVAILABLE_TAGS = [
    'implementation', 'math', 'greedy', 'dp', 'data structures', 'brute force',
    'constructive algorithms', 'graphs', 'sortings', 'binary search', 'dfs and similar',
    'trees', 'strings', 'number theory', 'combinatorics', 'two pointers', 'bitmasks',
    'probabilities', 'divide and conquer', 'hashing', 'games', 'shortest paths',
    'geometry', 'ternary search', 'expression parsing', 'meet-in-the-middle'
];

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', async () => {
    // Require auth: redirect to main page to log in
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = (window.location.pathname.includes('/contest') ? '../' : '/') + '?redirect=' + encodeURIComponent(window.location.pathname);
        return;
    }
    try {
        const meRes = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' });
        if (!meRes.ok) {
            localStorage.removeItem('authToken');
            window.location.href = (window.location.pathname.includes('/contest') ? '../' : '/');
            return;
        }
    } catch (_) {
        window.location.href = (window.location.pathname.includes('/contest') ? '../' : '/');
        return;
    }

    initializeTheme();
    updateSyncStatus('syncing', 'Loading...');

    showLoading('Loading your contest data...');
    const apiLoaded = await loadFromAPI();
    hideLoading();
    
    if (apiLoaded) {
        showToast('Connected to cloud', 'success');
        updateSyncStatus('synced', 'Cloud \u2601');
    } else {
        showToast('Using offline mode', 'warning');
        updateSyncStatus('error', 'Offline');
    }
    
    applySettings();
    updateStreakDisplay();
    updateDailyGoalDisplay();
    setupEventListeners();
    
    const savedUser = localStorage.getItem('lastUser');
    if (savedUser) {
        document.getElementById('handleInput').value = savedUser;
        state.currentHandle = savedUser;
    }

    // Detect incoming CF Picker contest
    const isFromPicker = new URLSearchParams(window.location.search).get('from') === 'picker';
    const pickerRaw = localStorage.getItem('cf_picker_contest_data');
    if (isFromPicker && pickerRaw) {
        try {
            const pickerData = JSON.parse(pickerRaw);
            const banner = document.getElementById('pickerContestBanner');
            if (banner) {
                const title = document.getElementById('pickerBannerTitle');
                const desc = document.getElementById('pickerBannerDesc');
                if (title) title.textContent = `CF Picker Contest — ${pickerData.problems.length} problems ready`;
                if (desc) desc.textContent = `Load your profile to start · ${pickerData.duration} min total`;
                banner.classList.remove('hidden');
            }
            // Pre-fill handle from picker if not already set
            const handleInput = document.getElementById('handleInput');
            if (handleInput && pickerData.handle && !handleInput.value) {
                handleInput.value = pickerData.handle;
                state.currentHandle = pickerData.handle;
            }
        } catch (e) {
            console.warn('Could not parse picker contest data:', e);
        }
    }

    restoreActiveContest();
    
    requestNotificationPermission();
});

// ===== Theme Management =====
function initializeTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
}

document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
});

// ===== Settings =====
function applySettings() {
    const soundEl = document.getElementById('soundToggle');
    const autoRefreshEl = document.getElementById('autoRefreshToggle');
    const showTagsEl = document.getElementById('showTagsToggle');
    const notifEl = document.getElementById('notifToggle');
    const goalEl = document.getElementById('dailyGoalSelect');
    
    if (soundEl) soundEl.checked = state.settings.soundEnabled;
    if (autoRefreshEl) autoRefreshEl.checked = state.settings.autoRefresh;
    if (showTagsEl) showTagsEl.checked = state.settings.showTags;
    if (notifEl) notifEl.checked = state.settings.notifications;
    if (goalEl) goalEl.value = String(state.dailyGoal.target);
}

function saveSettings() { debouncedSync(); }

function toggleSound() {
    state.settings.soundEnabled = document.getElementById('soundToggle').checked;
    saveSettings();
}

function toggleAutoRefresh() {
    state.settings.autoRefresh = document.getElementById('autoRefreshToggle').checked;
    saveSettings();
    if (state.currentContest && !state.isPaused) {
        if (state.settings.autoRefresh && !state.autoRefreshInterval) {
            state.autoRefreshInterval = setInterval(refreshSubmissions, 30000);
        } else if (!state.settings.autoRefresh && state.autoRefreshInterval) {
            clearInterval(state.autoRefreshInterval);
            state.autoRefreshInterval = null;
        }
    }
}

function toggleShowTags() {
    state.settings.showTags = document.getElementById('showTagsToggle').checked;
    saveSettings();
    if (state.currentContest) renderProblemsTable();
}

function toggleNotifications() {
    state.settings.notifications = document.getElementById('notifToggle').checked;
    if (state.settings.notifications) requestNotificationPermission();
    saveSettings();
}

function updateDailyGoal() {
    state.dailyGoal.target = parseInt(document.getElementById('dailyGoalSelect').value);
    saveSettings();
    updateDailyGoalDisplay();
}

// ===== Notifications =====
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default' && state.settings.notifications) {
        Notification.requestPermission();
    }
}

function sendNotification(title, body) {
    if (!state.settings.notifications || !('Notification' in window) || Notification.permission !== 'granted') return;
    try { new Notification(title, { body, icon: 'data:image/svg+xml,...' }); } catch(e) {}
}

// ===== Daily Goal =====
function updateDailyGoalDisplay() {
    const today = new Date().toDateString();
    if (state.dailyGoal.date !== today) {
        state.dailyGoal.completed = 0;
        state.dailyGoal.date = today;
    }
    
    const badge = document.getElementById('dailyGoalBadge');
    const text = document.getElementById('dailyGoalText');
    
    if (state.dailyGoal.target > 0) {
        badge.classList.remove('hidden');
        text.textContent = `${state.dailyGoal.completed}/${state.dailyGoal.target}`;
        
        if (state.dailyGoal.completed >= state.dailyGoal.target) {
            badge.classList.add('completed');
        } else {
            badge.classList.remove('completed');
        }
    }
}

function incrementDailyGoal() {
    const today = new Date().toDateString();
    if (state.dailyGoal.date !== today) {
        state.dailyGoal.completed = 0;
        state.dailyGoal.date = today;
    }
    state.dailyGoal.completed++;
    updateDailyGoalDisplay();
    
    if (state.dailyGoal.completed === state.dailyGoal.target) {
        showToast('Daily goal reached!', 'success');
        fireConfetti();
    }
}

// ===== Focus Mode =====
function toggleFocusMode() {
    state.focusMode = !state.focusMode;
    document.body.classList.toggle('focus-mode', state.focusMode);
    document.getElementById('focusModeBtn').classList.toggle('active', state.focusMode);
    
    if (state.focusMode) {
        showToast('Focus mode on', 'info');
    } else {
        showToast('Focus mode off', 'info');
    }
}

// ===== Streak Tracking =====
function recordPracticeDay() {
    const today = new Date().toDateString();
    if (state.streak.lastDate === today) return;
    
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (state.streak.lastDate === yesterday) {
        state.streak.current += 1;
    } else if (state.streak.lastDate !== today) {
        state.streak.current = 1;
    }
    
    state.streak.lastDate = today;
    state.streak.best = Math.max(state.streak.best, state.streak.current);
    
    if (!state.streak.history.includes(today)) {
        state.streak.history.push(today);
        if (state.streak.history.length > 365) {
            state.streak.history = state.streak.history.slice(-365);
        }
    }
    
    debouncedSync();
    updateStreakDisplay();
}

function updateStreakDisplay() {
    const badge = document.getElementById('streakBadge');
    const count = document.getElementById('streakCount');
    
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (state.streak.lastDate !== today && state.streak.lastDate !== yesterday) {
        state.streak.current = 0;
    }
    
    if (state.streak.current > 0) {
        badge.classList.remove('hidden');
        count.textContent = state.streak.current;
    } else {
        badge.classList.add('hidden');
    }
}

// ===== Event Listeners =====
function setupEventListeners() {
    document.getElementById('loadUserBtn').addEventListener('click', loadUserProfile);
    document.getElementById('handleInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadUserProfile();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        
        const inContest = !document.getElementById('contestArena').classList.contains('hidden');
        
        switch(e.key) {
            case 'Escape':
                if (!document.getElementById('shortcutsOverlay').classList.contains('hidden')) {
                    closeShortcutsModal();
                } else if (!document.getElementById('settingsOverlay').classList.contains('hidden')) {
                    closeSettingsModal();
                } else if (!document.getElementById('statsOverlay').classList.contains('hidden')) {
                    closeStatsModal();
                } else if (!document.getElementById('modalOverlay').classList.contains('hidden')) {
                    closeModal();
                } else if (inContest) {
                    confirmEndContest();
                }
                break;
            case 'r':
            case 'R':
                if (inContest) { e.preventDefault(); refreshSubmissions(); }
                break;
            case '?':
                e.preventDefault();
                showShortcutsModal();
                break;
            case 't':
            case 'T':
                if (!inContest) document.getElementById('themeToggle').click();
                break;
            case 'n':
            case 'N':
                if (!inContest) startNewContest();
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                toggleFocusMode();
                break;
            case ' ':
                if (inContest) {
                    e.preventDefault();
                    if (state.isPaused) resumeContest();
                    else pauseContest();
                }
                break;
        }
    });
}

// ===== Confetti =====
function fireConfetti() {
    if (typeof confetti !== 'function') return;
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']
    });
}

function fireConfettiBurst() {
    if (typeof confetti !== 'function') return;
    const duration = 1500;
    const end = Date.now() + duration;
    
    (function frame() {
        confetti({
            particleCount: 4,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#3b82f6', '#8b5cf6', '#10b981']
        });
        confetti({
            particleCount: 4,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#f59e0b', '#ef4444', '#06b6d4']
        });
        if (Date.now() < end) requestAnimationFrame(frame);
    })();
}

// ===== Performance Rating Estimation =====
function estimatePerformanceRating(results) {
    if (!results.problems || results.problems.length === 0) return null;
    
    const solved = results.problems.filter(p => p.status === 'solved');
    if (solved.length === 0) return null;
    
    const totalProblems = results.problems.length;
    const solveRatio = solved.length / totalProblems;
    const avgSolvedRating = Math.round(solved.reduce((s, p) => s + (p.rating || 0), 0) / solved.length);
    const maxSolvedRating = Math.max(...solved.map(p => p.rating || 0));
    
    const timeFactor = results.timeTaken < (results.originalDuration * 60000 * 0.5) ? 100 : 0;
    const penaltyFactor = (results.totalPenalty || 0) * -5;
    
    let estimated = Math.round(
        avgSolvedRating * 0.4 + 
        maxSolvedRating * 0.4 + 
        (solveRatio * 200) + 
        timeFactor + 
        penaltyFactor
    );
    
    estimated = Math.max(800, Math.min(3500, estimated));
    return estimated;
}

// ===== Sound System =====
function playSound(type) {
    if (!state.settings.soundEnabled) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.value = 0.15;
        
        if (type === 'success') {
            osc.frequency.value = 523.25;
            osc.type = 'sine';
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            gain2.gain.value = 0.15;
            osc2.frequency.value = 659.25;
            osc2.type = 'sine';
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc2.start(ctx.currentTime + 0.15);
            osc2.stop(ctx.currentTime + 0.5);
        } else if (type === 'warning') {
            osc.frequency.value = 440;
            osc.type = 'triangle';
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } else if (type === 'error') {
            osc.frequency.value = 220;
            osc.type = 'sawtooth';
            gain.gain.value = 0.08;
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch(e) {}
}

// ===== Toast System =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: '\u2713', error: '\u2715', warning: '\u26A0', info: '\u2139' };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-text">${message}</span>
        <button class="toast-close-btn" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, type === 'error' ? 5000 : 3000);
}

function showError(message) { showToast(message, 'error'); }
function showSuccess(message) { showToast(message, 'success'); }
function showWarning(message) { showToast(message, 'warning'); }

// ===== Modal System =====
function showModal(title, bodyHtml, buttons) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    
    const footer = document.getElementById('modalFooter');
    footer.innerHTML = '';
    
    buttons.forEach(btn => {
        const el = document.createElement('button');
        el.className = btn.className || 'btn-ghost';
        el.textContent = btn.text;
        el.onclick = () => { btn.action(); closeModal(); };
        footer.appendChild(el);
    });
    
    document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('modalOverlay').classList.add('hidden');
}

function showShortcutsModal() { document.getElementById('shortcutsOverlay').classList.remove('hidden'); }
function closeShortcutsModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('shortcutsOverlay').classList.add('hidden');
}

function showSettingsModal() {
    applySettings();
    document.getElementById('settingsOverlay').classList.remove('hidden');
}

function closeSettingsModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('settingsOverlay').classList.add('hidden');
}

function showStatsModal() {
    document.getElementById('statsOverlay').classList.remove('hidden');
    renderStatsModal();
}

function closeStatsModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('statsOverlay').classList.add('hidden');
}

async function renderStatsModal() {
    const body = document.getElementById('statsModalBody');
    
    if (!state.currentHandle) {
        body.innerHTML = '<p class="empty-state">Load a user profile first</p>';
        return;
    }
    
    const completed = state.pastContests.filter(c => !c.inProgress);
    
    if (completed.length === 0) {
        body.innerHTML = '<p class="empty-state">No completed contests yet. Start your first one!</p>';
        return;
    }
    
    const totalSolved = completed.reduce((s, c) => s + (c.solvedCount || 0), 0);
    const totalProblems = completed.reduce((s, c) => s + (c.totalProblems || 0), 0);
    const avgScore = Math.round(completed.reduce((s, c) => s + (c.totalScore || 0), 0) / completed.length);
    const bestScore = Math.max(...completed.map(c => c.totalScore || 0));
    const totalTime = completed.reduce((s, c) => s + (c.timeTaken || 0), 0);
    const avgTime = totalTime / completed.length;
    const solveRate = totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0;
    
    const byDivision = {};
    const divisionNames = { 'div1': 'DIV 1', 'div2': 'DIV 2', 'div3': 'DIV 3', 'div4': 'DIV 4', 'custom': 'Custom' };
    
    ['div1', 'div2', 'div3', 'div4', 'custom'].forEach(div => {
        const dc = completed.filter(c => c.contestType === div);
        if (dc.length > 0) {
            byDivision[div] = {
                count: dc.length,
                avgScore: Math.round(dc.reduce((s, c) => s + c.totalScore, 0) / dc.length),
                solved: dc.reduce((s, c) => s + c.solvedCount, 0),
                total: dc.reduce((s, c) => s + c.totalProblems, 0)
            };
        }
    });
    
    body.innerHTML = `
        <div class="stats-summary">
            <div class="stat-card">
                <div class="stat-card-icon">\u{1F3C6}</div>
                <div class="stat-card-info">
                    <div class="stat-card-value">${completed.length}</div>
                    <div class="stat-card-label">Total Contests</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon">\u2713</div>
                <div class="stat-card-info">
                    <div class="stat-card-value">${totalSolved}/${totalProblems}</div>
                    <div class="stat-card-label">Problems Solved</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon">\u{1F4CA}</div>
                <div class="stat-card-info">
                    <div class="stat-card-value">${avgScore}</div>
                    <div class="stat-card-label">Avg Score</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon">\u2B50</div>
                <div class="stat-card-info">
                    <div class="stat-card-value">${bestScore}</div>
                    <div class="stat-card-label">Best Score</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon">\u23F1</div>
                <div class="stat-card-info">
                    <div class="stat-card-value">${formatDuration(avgTime)}</div>
                    <div class="stat-card-label">Avg Time</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon">\u{1F3AF}</div>
                <div class="stat-card-info">
                    <div class="stat-card-value">${solveRate}%</div>
                    <div class="stat-card-label">Solve Rate</div>
                </div>
            </div>
        </div>
        
        <h4 style="margin: 24px 0 12px; font-size: 14px; color: var(--text-secondary);">By Division</h4>
        <div class="division-breakdown">
            ${Object.entries(byDivision).map(([div, stats]) => `
                <div class="division-stat-row">
                    <div class="division-stat-name">${divisionNames[div]}</div>
                    <div class="division-stat-values">
                        <span>${stats.count} contests</span>
                        <span>\u00B7</span>
                        <span>${stats.solved}/${stats.total} solved</span>
                        <span>\u00B7</span>
                        <span>${stats.avgScore} avg</span>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div style="margin-top: 24px; padding: 16px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <strong style="font-size: 13px;">Cloud Sync</strong>
            </div>
            <div style="font-size: 12px; color: var(--text-secondary);">
                User: <strong>${state.currentHandle}</strong><br>
                Status: <strong style="color: ${state.apiSyncEnabled ? 'var(--success)' : 'var(--warning)'}">
                    ${state.apiSyncEnabled ? '\u2713 Connected' : '\u26A0 Offline (localStorage)'}
                </strong><br>
                Streak: <strong>\u{1F525} ${state.streak.current} days</strong> (best: ${state.streak.best})
                ${state.lastSyncTime ? `<br>Last sync: ${new Date(state.lastSyncTime).toLocaleString()}` : ''}
            </div>
        </div>
    `;
}

async function testConnection() {
    const desc = document.getElementById('cloudSyncDesc');
    desc.textContent = 'Testing connection...';
    desc.style.color = 'var(--text-secondary)';
    
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        
        if (data.status === 'healthy' && data.database === 'connected') {
            desc.textContent = '\u2713 Connected to MongoDB';
            desc.style.color = 'var(--success)';
            state.apiSyncEnabled = true;
            showSuccess('Cloud sync is working!');
        } else {
            desc.textContent = '\u26A0 MongoDB disconnected';
            desc.style.color = 'var(--warning)';
            state.apiSyncEnabled = false;
            showWarning('Database not available');
        }
    } catch (error) {
        desc.textContent = '\u2715 API server offline';
        desc.style.color = 'var(--danger)';
        state.apiSyncEnabled = false;
        showError('Cannot connect to server');
    }
}

function confirmEndContest() {
    showModal(
        'End Contest?',
        '<p style="color:var(--text-secondary);font-size:14px">Are you sure you want to end this contest? Your progress will be saved.</p>',
        [
            { text: 'Cancel', className: 'btn-ghost', action: () => {} },
            { text: 'End Contest', className: 'btn-danger', action: () => endContest() }
        ]
    );
}

// ===== Info Box Toggle =====
function toggleInfoBox() {
    document.getElementById('howItWorks').classList.toggle('collapsed');
}

// ===== API Calls =====
async function loadUserProfile() {
    const handle = document.getElementById('handleInput').value.trim();
    if (!handle) {
        showError('Please enter a Codeforces handle');
        return;
    }

    showLoading('Loading profile...');
    
    try {
        const userResponse = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
        const userData = await userResponse.json();
        
        if (userData.status !== 'OK') throw new Error(userData.comment || 'User not found');

        state.currentUser = userData.result[0];
        state.currentHandle = handle;
        localStorage.setItem('lastUser', handle);
        
        showLoading('Loading your contest data...');
        await loadFromAPI();

        const submissionsResponse = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`);
        const submissionsData = await submissionsResponse.json();
        
        if (submissionsData.status !== 'OK') throw new Error('Failed to fetch submissions');

        state.solvedProblems = new Set();
        submissionsData.result.forEach(sub => {
            if (sub.verdict === 'OK') {
                state.solvedProblems.add(`${sub.problem.contestId}${sub.problem.index}`);
            }
        });

        const problemsResponse = await fetch('https://codeforces.com/api/problemset.problems');
        const problemsData = await problemsResponse.json();
        
        if (problemsData.status !== 'OK') throw new Error('Failed to fetch problemset');

        state.allProblems = problemsData.result.problems;
        state.problemStats = {};
        if (problemsData.result.problemStatistics) {
            problemsData.result.problemStatistics.forEach(stat => {
                state.problemStats[`${stat.contestId}-${stat.index}`] = stat.solvedCount || 0;
            });
        }

        hideLoading();
        displayUserInfo();

        // Check for a pending CF Picker contest
        const pickerRaw = localStorage.getItem('cf_picker_contest_data');
        const isFromPicker = new URLSearchParams(window.location.search).get('from') === 'picker';
        if (pickerRaw && isFromPicker) {
            try {
                const pickerData = JSON.parse(pickerRaw);
                localStorage.removeItem('cf_picker_contest_data');
                showToast(`Starting CF Picker Contest — ${pickerData.problems.length} problems · ${pickerData.duration} min`, 'success');
                await startContestFromPickerData(pickerData);
                return;
            } catch (e) {
                console.warn('Failed to start picker contest:', e);
            }
        }

        showContestTypeSelection();
        renderRecommendations();
        showSuccess('Profile loaded!');

    } catch (error) {
        hideLoading();
        if (error.message && error.message.includes('fetch')) {
            showError('Network error \u2014 check your connection');
        } else {
            showError(error.message || 'Failed to load profile');
        }
    }
}

function displayUserInfo() {
    const u = state.currentUser;
    document.getElementById('userName').textContent = u.handle;
    
    const ratingEl = document.getElementById('userRating');
    ratingEl.textContent = u.rating || 'Unrated';
    ratingEl.style.color = getRatingColor(u.rating);
    
    const maxRatingEl = document.getElementById('userMaxRating');
    maxRatingEl.textContent = u.maxRating || '-';
    maxRatingEl.style.color = getRatingColor(u.maxRating);
    
    document.getElementById('userRank').textContent = u.rank || 'Unrated';
    document.getElementById('problemsSolved').textContent = state.solvedProblems.size;
    document.getElementById('userInfo').classList.remove('hidden');
}

function getRatingColor(rating) {
    if (!rating) return '#808080';
    if (rating < 1200) return 'var(--rating-newbie)';
    if (rating < 1400) return 'var(--rating-pupil)';
    if (rating < 1600) return 'var(--rating-specialist)';
    if (rating < 1900) return 'var(--rating-expert)';
    if (rating < 2100) return 'var(--rating-cm)';
    if (rating < 2300) return 'var(--rating-master)';
    return 'var(--rating-gm)';
}

function getRatingClass(rating) {
    if (!rating) return 'rating-newbie';
    if (rating < 1200) return 'rating-newbie';
    if (rating < 1400) return 'rating-pupil';
    if (rating < 1600) return 'rating-specialist';
    if (rating < 1900) return 'rating-expert';
    if (rating < 2100) return 'rating-cm';
    if (rating < 2300) return 'rating-master';
    return 'rating-gm';
}

function getRatingName(rating) {
    if (!rating) return 'Unrated';
    if (rating < 1200) return 'Newbie';
    if (rating < 1400) return 'Pupil';
    if (rating < 1600) return 'Specialist';
    if (rating < 1900) return 'Expert';
    if (rating < 2100) return 'Candidate Master';
    if (rating < 2300) return 'Master';
    if (rating < 2400) return 'International Master';
    return 'Grandmaster';
}

// ===== Contest Type Selection =====
function showContestTypeSelection() {
    document.getElementById('contestTypeSection').classList.remove('hidden');
}

function selectContestType(type) {
    state.selectedDivision = type;
    if (type === 'custom') showCustomConfig();
    else showDivisionPreview(type);
}

function showDivisionPreview(type) {
    document.getElementById('contestTypeSection').classList.add('hidden');
    document.getElementById('recommendationSection').classList.add('hidden');
    document.getElementById('divisionPreviewSection').classList.remove('hidden');
    
    const config = CONTEST_CONFIGS[type];
    document.getElementById('previewDivisionName').textContent = config.name;
    document.getElementById('previewProblemsCount').textContent = config.problems.length;
    document.getElementById('previewDuration').textContent = config.duration;
    document.getElementById('previewRatingRange').textContent = 
        `${config.problems[0].rating[0]} \u2013 ${config.problems[config.problems.length - 1].rating[1]}`;
    
    displayDivisionStats(calculateDivisionStats(type));
    displayPastContestsForDivision(type);
}

function showCustomConfig() {
    document.getElementById('contestTypeSection').classList.add('hidden');
    document.getElementById('recommendationSection').classList.add('hidden');
    document.getElementById('customConfigSection').classList.remove('hidden');
    
    const tagsContainer = document.getElementById('tagsContainer');
    tagsContainer.innerHTML = '';
    state.selectedTags.clear();
    AVAILABLE_TAGS.forEach(tag => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.textContent = tag;
        chip.onclick = () => toggleTag(chip, tag);
        tagsContainer.appendChild(chip);
    });
}

function toggleTag(chip, tag) {
    chip.classList.toggle('selected');
    if (state.selectedTags.has(tag)) state.selectedTags.delete(tag);
    else state.selectedTags.add(tag);
}

function cancelCustom() {
    document.getElementById('customConfigSection').classList.add('hidden');
    document.getElementById('contestTypeSection').classList.remove('hidden');
    document.getElementById('recommendationSection').classList.remove('hidden');
}

// ===== Quick Practice =====
function showQuickPractice() {
    document.getElementById('contestTypeSection').classList.add('hidden');
    document.getElementById('recommendationSection').classList.add('hidden');
    document.getElementById('quickPracticeSection').classList.remove('hidden');
    
    const container = document.getElementById('qpTagsContainer');
    container.innerHTML = '';
    state.selectedTags.clear();
    AVAILABLE_TAGS.forEach(tag => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.textContent = tag;
        chip.onclick = () => toggleTag(chip, tag);
        container.appendChild(chip);
    });
}

function backFromQuickPractice() {
    document.getElementById('quickPracticeSection').classList.add('hidden');
    document.getElementById('contestTypeSection').classList.remove('hidden');
    document.getElementById('recommendationSection').classList.remove('hidden');
    state.selectedTags.clear();
}

async function startQuickPractice() {
    const targetRating = parseInt(document.getElementById('qpRating').value);
    const timeLimit = parseInt(document.getElementById('qpTime').value);
    
    if (isNaN(targetRating) || targetRating < 800 || targetRating > 3500) {
        showError('Rating must be between 800 and 3500');
        return;
    }
    
    const ratingRange = [Math.max(800, targetRating - 100), targetRating + 100];
    const config = {
        name: `Quick Practice (${targetRating})`,
        problems: [{ index: 'A', rating: ratingRange }],
        duration: timeLimit,
        tags: Array.from(state.selectedTags)
    };
    
    showLoading('Finding a problem...');
    await startContest('custom', config);
    hideLoading();
}

// ===== Contest Generation =====
async function generateCustomContest() {
    const problemCount = parseInt(document.getElementById('problemCount').value);
    const duration = parseInt(document.getElementById('contestDuration').value);
    const minRating = parseInt(document.getElementById('minRating').value);
    const maxRating = parseInt(document.getElementById('maxRating').value);

    if (minRating >= maxRating) {
        showError('Min rating must be less than max rating');
        return;
    }
    
    if (problemCount < 1 || problemCount > 10) {
        showError('Problem count must be between 1 and 10');
        return;
    }

    showLoading('Generating contest...');
    
    const ratingStep = Math.floor((maxRating - minRating) / problemCount);
    const problems = [];
    
    for (let i = 0; i < problemCount; i++) {
        const min = minRating + (i * ratingStep);
        const max = Math.min(min + ratingStep, maxRating);
        problems.push({
            index: String.fromCharCode(65 + i),
            rating: [min, max]
        });
    }

    const config = { name: 'Custom Contest', problems, duration, tags: Array.from(state.selectedTags) };
    await startContest('custom', config);
    hideLoading();
}

async function generatePresetContest(type) {
    showLoading(`Generating ${CONTEST_CONFIGS[type].name} contest...`);
    await startContest(type, CONTEST_CONFIGS[type]);
    hideLoading();
}

async function startContest(type, config) {
    const contestProblems = [];
    
    for (const problemSpec of config.problems) {
        const problem = findUnsolvedProblem(problemSpec.rating, config.tags);
        if (problem) {
            contestProblems.push({
                ...problem,
                originalIndex: problem.index,
                index: problemSpec.index,
                targetRating: problemSpec.rating,
                maxScore: 500 + (problemSpec.rating[0] / 10),
                currentScore: 500 + (problemSpec.rating[0] / 10),
                status: 'pending',
                attempts: 0,
                solvedAt: null
            });
        }
    }

    if (contestProblems.length < config.problems.length) {
        showError(`Not enough unsolved problems (found ${contestProblems.length}/${config.problems.length}). Try different settings.`);
        return;
    }

    state.currentContest = {
        id: Date.now(),
        type,
        name: config.name,
        problems: contestProblems,
        duration: config.duration,
        startTime: Date.now()
    };

    state.contestStartTime = Date.now();
    state.contestDuration = config.duration;
    state.contestPausedTime = 0;
    state.isPaused = false;
    state.submissions = [];
    
    recordPracticeDay();

    state.pastContests.push({
        contestId: state.currentContest.id,
        contestName: state.currentContest.name,
        contestType: state.currentContest.type,
        problems: JSON.parse(JSON.stringify(state.currentContest.problems)),
        solvedCount: 0,
        totalProblems: state.currentContest.problems.length,
        totalScore: 0,
        totalPenalty: 0,
        timeTaken: 0,
        date: new Date(),
        startTime: state.contestStartTime,
        originalDuration: state.contestDuration,
        inProgress: true
    });
    
    debouncedSync();

    hideAllSections();
    displayContestArena();
    startTimer();
    saveContestState();
    syncActiveContestToCloud();
}

// ===== CF Picker Contest =====
async function startContestFromPickerData(pickerData) {
    const problems = pickerData.problems || [];
    if (problems.length === 0) {
        showError('No problems found in CF Picker data.');
        return;
    }

    const duration = pickerData.duration || problems.length * 30;

    // Sort problems by rating ascending so A is easiest
    const sorted = [...problems].sort((a, b) => (a.rating || 0) - (b.rating || 0));

    const contestProblems = sorted.map((p, i) => ({
        contestId: p.contestId,
        originalIndex: p.index,
        index: String.fromCharCode(65 + i),
        name: p.name,
        rating: p.rating || 0,
        tags: p.tags || [],
        targetRating: [p.rating || 0, p.rating || 0],
        maxScore: Math.round(500 + ((p.rating || 0) / 10)),
        currentScore: Math.round(500 + ((p.rating || 0) / 10)),
        status: 'pending',
        attempts: 0,
        solvedAt: null
    }));

    state.currentContest = {
        id: Date.now(),
        type: 'custom',
        name: 'CF Picker Contest',
        problems: contestProblems,
        duration,
        startTime: Date.now()
    };

    state.contestStartTime = Date.now();
    state.contestDuration = duration;
    state.contestPausedTime = 0;
    state.isPaused = false;
    state.submissions = [];

    recordPracticeDay();

    state.pastContests.push({
        contestId: state.currentContest.id,
        contestName: state.currentContest.name,
        contestType: 'custom',
        problems: JSON.parse(JSON.stringify(contestProblems)),
        solvedCount: 0,
        totalProblems: contestProblems.length,
        totalScore: 0,
        totalPenalty: 0,
        timeTaken: 0,
        date: new Date(),
        startTime: state.contestStartTime,
        originalDuration: duration,
        inProgress: true
    });

    debouncedSync();

    hideAllSections();
    displayContestArena();
    startTimer();
    saveContestState();
    syncActiveContestToCloud();
}

function hideAllSections() {
    ['contestTypeSection', 'customConfigSection', 'divisionPreviewSection',
     'quickPracticeSection', 'resultsSection', 'historySection', 'performanceSection',
     'recommendationSection'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

function findUnsolvedProblem(ratingRange, allowedTags) {
    const [minRating, maxRating] = ratingRange;
    
    const unsolvedProblems = state.allProblems.filter(problem => {
        if (!problem.rating) return false;
        if (problem.rating < minRating || problem.rating > maxRating) return false;
        if (state.solvedProblems.has(`${problem.contestId}${problem.index}`)) return false;
        
        if (allowedTags && allowedTags.length > 0) {
            const problemTags = problem.tags || [];
            if (!problemTags.some(tag => allowedTags.some(a => tag.toLowerCase() === a.toLowerCase()))) return false;
        }
        
        return true;
    });

    if (unsolvedProblems.length === 0) {
        const fallback = state.allProblems.filter(p => {
            if (!p.rating) return false;
            if (p.rating < minRating || p.rating > maxRating) return false;
            return !state.solvedProblems.has(`${p.contestId}${p.index}`);
        });
        if (fallback.length === 0) return null;
        return selectByPopularity(fallback);
    }
    
    return selectByPopularity(unsolvedProblems);
}

function selectByPopularity(problems) {
    const withStats = problems.map(p => ({
        problem: p,
        solvedCount: state.problemStats[`${p.contestId}-${p.index}`] || 0
    }));
    
    const sorted = [...withStats].sort((a, b) => a.solvedCount - b.solvedCount);
    
    if (sorted.length <= 3) {
        return problems[Math.floor(Math.random() * problems.length)];
    }
    
    const lo = Math.floor(sorted.length * 0.2);
    const hi = Math.ceil(sorted.length * 0.8);
    const mid = sorted.slice(lo, hi);
    
    if (mid.length === 0) return problems[Math.floor(Math.random() * problems.length)];
    return mid[Math.floor(Math.random() * mid.length)].problem;
}

// ===== Contest Display =====
function displayContestArena() {
    const arena = document.getElementById('contestArena');
    arena.classList.remove('hidden');

    document.getElementById('contestName').textContent = state.currentContest.name;
    document.getElementById('contestType').textContent = state.currentContest.type.toUpperCase();
    document.getElementById('contestProblemsCount').textContent = `${state.currentContest.problems.length} problems`;
    document.getElementById('contestDurationLabel').textContent = `${state.currentContest.duration} min`;

    if (state.isPaused) {
        document.getElementById('pauseBtn').style.display = 'none';
        document.getElementById('resumeBtn').style.display = 'inline-flex';
    } else {
        document.getElementById('pauseBtn').style.display = 'inline-flex';
        document.getElementById('resumeBtn').style.display = 'none';
    }

    document.getElementById('totalCountLive').textContent = state.currentContest.problems.length;

    renderProblemsTable();
    updateSolvedProgress();
    
    if (!state.isPaused && state.settings.autoRefresh) {
        state.autoRefreshInterval = setInterval(refreshSubmissions, 30000);
    }
}

function renderProblemsTable() {
    const tbody = document.getElementById('problemsTableBody');
    tbody.innerHTML = '';

    state.currentContest.problems.forEach(problem => {
        const cfIndex = problem.originalIndex || problem.index;
        const solveCount = state.problemStats[`${problem.contestId}-${cfIndex}`] || problem.solvedCount || '-';
        const ratingClass = getRatingClass(problem.rating);
        
        const tags = problem.tags || [];
        let tagsHtml = '';
        if (tags.length > 0) {
            const displayTags = tags.slice(0, 3);
            tagsHtml = displayTags.map(t => 
                `<span class="problem-tag ${state.settings.showTags ? '' : 'hidden-tag'}">${t}</span>`
            ).join('');
            if (tags.length > 3) tagsHtml += `<span class="problem-tag">+${tags.length - 3}</span>`;
        }
        
        const row = document.createElement('tr');
        if (problem.status === 'solved') row.classList.add('solved-row');
        
        row.innerHTML = `
            <td><span class="problem-index">${problem.index}</span></td>
            <td>
                <a href="https://codeforces.com/problemset/problem/${problem.contestId}/${cfIndex}" 
                   target="_blank" class="problem-link">${problem.name}</a>
            </td>
            <td class="hide-focus"><div class="problem-tags">${tagsHtml || '<span style="color:var(--text-muted);font-size:11px">\u2014</span>'}</div></td>
            <td><span class="rating-color ${ratingClass}">${problem.rating || '-'}</span></td>
            <td class="hide-mobile" style="font-size:12px;color:var(--text-muted)">${typeof solveCount === 'number' ? solveCount.toLocaleString() : solveCount}</td>
            <td id="score-${problem.index}" style="font-family:'JetBrains Mono',monospace;font-size:13px">${Math.round(problem.currentScore)}</td>
            <td>
                <span class="status-badge ${problem.status}" id="status-${problem.index}">
                    ${getStatusText(problem.status)}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateSolvedProgress() {
    if (!state.currentContest) return;
    const solved = state.currentContest.problems.filter(p => p.status === 'solved').length;
    const total = state.currentContest.problems.length;
    const score = state.currentContest.problems.reduce((s, p) => s + (p.status === 'solved' ? Math.round(p.currentScore) : 0), 0);
    
    document.getElementById('solvedCountLive').textContent = solved;
    document.getElementById('liveScore').textContent = `Score: ${score}`;
    
    const pct = total > 0 ? (solved / total) * 100 : 0;
    document.getElementById('solvedProgressFill').style.width = pct + '%';
}

function getStatusText(status) {
    return { pending: 'Pending', attempted: 'Attempted', solved: 'Accepted', failed: 'Wrong' }[status] || status;
}

// ===== Timer =====
function startTimer() {
    updateTimer();
    state.timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - state.contestStartTime - state.contestPausedTime) / 1000);
    const totalSeconds = state.contestDuration * 60;
    const remaining = Math.max(0, totalSeconds - elapsed);

    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;

    const display = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const timerEl = document.getElementById('timerDisplay');
    timerEl.textContent = display;

    const pct = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 0;
    const fill = document.getElementById('timerProgressFill');
    fill.style.width = pct + '%';

    if (remaining < 300) {
        timerEl.className = 'timer-display danger';
        fill.className = 'timer-progress-fill danger';
    } else if (remaining < 900) {
        timerEl.className = 'timer-display warning';
        fill.className = 'timer-progress-fill warning';
    } else {
        timerEl.className = 'timer-display';
        fill.className = 'timer-progress-fill';
    }
    
    if (remaining === 300) playSound('warning');
    if (remaining === 60) playSound('warning');

    updateProblemScores(elapsed);
    updateSolvedProgress();
    
    if (elapsed % 10 === 0) saveContestState();
    if (elapsed % 300 === 0 && elapsed > 0) syncActiveContestToCloud();
    if (remaining === 0) endContest();
}

function updateTimerDisplayPaused() {
    const elapsed = Math.floor((Date.now() - state.contestStartTime - state.contestPausedTime) / 1000);
    const totalSeconds = state.contestDuration * 60;
    const remaining = Math.max(0, totalSeconds - elapsed);

    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;

    const timerEl = document.getElementById('timerDisplay');
    timerEl.textContent = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    timerEl.className = 'timer-display paused';

    const pct = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 0;
    const fill = document.getElementById('timerProgressFill');
    fill.style.width = pct + '%';
    fill.className = 'timer-progress-fill';
}

function updateProblemScores(elapsedSeconds) {
    state.currentContest.problems.forEach(problem => {
        if (problem.status !== 'solved') {
            const elapsedMin = elapsedSeconds / 60;
            const maxScore = problem.maxScore;
            const rate = maxScore * 0.002;
            problem.currentScore = Math.max(maxScore * 0.3, maxScore - (rate * elapsedMin));
            
            const el = document.getElementById(`score-${problem.index}`);
            if (el) el.textContent = Math.round(problem.currentScore);
        }
    });
}

// ===== Submissions =====
async function refreshSubmissions() {
    if (!state.currentUser || !state.currentContest) return;

    const btn = document.getElementById('refreshSubmissions');
    if (btn.disabled) return;
    btn.disabled = true;
    const origHTML = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div> Checking...';

    try {
        const response = await fetch(`https://codeforces.com/api/user.status?handle=${state.currentUser.handle}&from=1&count=50`);
        const data = await response.json();

        if (data.status !== 'OK') throw new Error('API error');

        const recent = data.result.filter(sub => 
            sub.creationTimeSeconds * 1000 >= state.contestStartTime
        );

        let newSolves = 0;
        
        state.currentContest.problems.forEach(problem => {
            const cfIndex = problem.originalIndex || problem.index;
            const pid = `${problem.contestId}${cfIndex}`;
            const subs = recent.filter(s => `${s.problem.contestId}${s.problem.index}` === pid);

            if (subs.length > 0) {
                const accepted = subs.some(s => s.verdict === 'OK');
                const wrongCount = subs.filter(s => s.verdict !== 'OK' && s.verdict !== 'TESTING').length;

                if (accepted && problem.status !== 'solved') {
                    const acSub = subs.find(s => s.verdict === 'OK');
                    problem.status = 'solved';
                    problem.solvedAt = acSub.creationTimeSeconds * 1000;
                    problem.attempts = wrongCount;
                    newSolves++;
                    
                    addSubmission({
                        problem: problem.index,
                        name: problem.name,
                        verdict: 'Accepted',
                        time: new Date(acSub.creationTimeSeconds * 1000),
                        penalty: wrongCount * 5
                    });
                    
                    playSound('success');
                    sendNotification('Problem Solved!', `${problem.index}: ${problem.name}`);
                    showSuccess(`Problem ${problem.index} solved!`);
                    
                    fireConfetti();
                    
                } else if (wrongCount > 0 && problem.status === 'pending') {
                    problem.status = 'attempted';
                    addSubmission({
                        problem: problem.index,
                        name: problem.name,
                        verdict: 'Wrong Answer',
                        time: new Date(),
                        penalty: 0
                    });
                }
            }
        });

        const allSolved = state.currentContest.problems.every(p => p.status === 'solved');
        if (allSolved && newSolves > 0) {
            fireConfettiBurst();
            showSuccess('All problems solved! Amazing!');
        }

        renderProblemsTable();
        renderSubmissions();
        updateSolvedProgress();
        updateInProgressContest();
        saveContestState();
        
        if (newSolves > 0) syncActiveContestToCloud();

    } catch (error) {
        showError('Failed to check submissions');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHTML;
    }
}

function addSubmission(submission) {
    state.submissions.unshift(submission);
    if (state.submissions.length > 30) state.submissions = state.submissions.slice(0, 30);
}

function renderSubmissions() {
    const list = document.getElementById('submissionsList');
    
    if (state.submissions.length === 0) {
        list.innerHTML = '<p class="empty-state">No submissions yet. Open problems and solve them on Codeforces!</p>';
        return;
    }

    list.innerHTML = state.submissions.map(sub => `
        <div class="submission-item ${sub.verdict === 'Accepted' ? 'accepted' : 'wrong'}">
            <div class="submission-info">
                <div class="submission-problem">${sub.problem}: ${sub.verdict}</div>
                <div class="submission-time">${formatTime(sub.time)}</div>
            </div>
            ${sub.penalty > 0 ? `<span class="status-badge failed">+${sub.penalty}m</span>` : ''}
        </div>
    `).join('');
}

function formatTime(date) {
    if (typeof date === 'string') date = new Date(date);
    if (!(date instanceof Date) || isNaN(date)) return '-';
    return date.toLocaleTimeString();
}

// ===== End Contest =====
function endContest() {
    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
    if (state.autoRefreshInterval) { clearInterval(state.autoRefreshInterval); state.autoRefreshInterval = null; }

    const results = calculateResults();
    saveContest(results);
    clearActiveContestState();
    incrementDailyGoal();
    
    document.getElementById('contestArena').classList.add('hidden');
    displayResults(results);
    
    if (results.solvedCount > 0) {
        fireConfettiBurst();
    }
    playSound('warning');
}

function calculateResults() {
    const solved = state.currentContest.problems.filter(p => p.status === 'solved');
    const totalScore = solved.reduce((sum, p) => sum + Math.round(p.currentScore), 0);
    const totalPenalty = solved.reduce((sum, p) => sum + (p.attempts * 5), 0);
    const timeTaken = Date.now() - state.contestStartTime - state.contestPausedTime;

    return {
        contestId: state.currentContest.id,
        contestName: state.currentContest.name,
        contestType: state.currentContest.type,
        problems: state.currentContest.problems,
        solvedCount: solved.length,
        totalProblems: state.currentContest.problems.length,
        totalScore,
        totalPenalty,
        timeTaken,
        date: new Date(),
        startTime: state.contestStartTime,
        originalDuration: state.contestDuration
    };
}

function displayResults(results) {
    document.getElementById('resultsSection').classList.remove('hidden');
    
    document.getElementById('solvedCount').textContent = `${results.solvedCount}/${results.totalProblems}`;
    document.getElementById('totalScore').textContent = results.totalScore;
    document.getElementById('timeTaken').textContent = formatDuration(results.timeTaken);
    document.getElementById('penaltyTime').textContent = results.totalPenalty;

    const estimatedRating = estimatePerformanceRating(results);
    const ratingEl = document.getElementById('performanceRating');
    if (estimatedRating) {
        const ratingColor = getRatingColor(estimatedRating);
        const ratingName = getRatingName(estimatedRating);
        ratingEl.innerHTML = `Estimated Performance: <strong style="color:${ratingColor}">${estimatedRating}</strong> <span style="color:${ratingColor}">(${ratingName})</span>`;
    } else {
        ratingEl.innerHTML = '';
    }

    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = results.problems.map(p => {
        const cfIndex = p.originalIndex || p.index;
        const ratingClass = getRatingClass(p.rating);
        return `
        <tr>
            <td><span class="problem-index">${p.index}</span></td>
            <td><a href="https://codeforces.com/problemset/problem/${p.contestId}/${cfIndex}" target="_blank" class="problem-link">${p.name}</a></td>
            <td><span class="rating-color ${ratingClass}">${p.rating || '-'}</span></td>
            <td><span class="status-badge ${p.status}">${getStatusText(p.status)}</span></td>
            <td style="font-family:'JetBrains Mono',monospace">${p.status === 'solved' ? Math.round(p.currentScore) : 0}</td>
            <td style="font-family:'JetBrains Mono',monospace">${p.solvedAt ? formatDuration(p.solvedAt - state.contestStartTime) : '-'}</td>
            <td>${p.attempts || 0}</td>
        </tr>`;
    }).join('');
    
    const unsolved = results.problems.filter(p => p.status !== 'solved');
    const upsolveSection = document.getElementById('upsolveSection');
    
    if (unsolved.length > 0) {
        upsolveSection.classList.remove('hidden');
        document.getElementById('upsolveList').innerHTML = unsolved.map(p => {
            const cfIndex = p.originalIndex || p.index;
            const ratingClass = getRatingClass(p.rating);
            return `
            <div class="upsolve-item">
                <div class="upsolve-item-info">
                    <span class="problem-index">${p.index}</span>
                    <a href="https://codeforces.com/problemset/problem/${p.contestId}/${cfIndex}" target="_blank">${p.name}</a>
                    <span class="rating-color ${ratingClass}">${p.rating}</span>
                </div>
            </div>`;
        }).join('');
    } else {
        upsolveSection.classList.add('hidden');
    }
}

function formatDuration(ms) {
    if (ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ===== Contest History =====
function saveContest(results) {
    const idx = state.pastContests.findIndex(c => c.contestId === results.contestId);
    results.inProgress = false;
    
    if (idx !== -1) state.pastContests[idx] = results;
    else state.pastContests.push(results);
    
    debouncedSync();
}

function updateInProgressContest() {
    if (!state.currentContest) return;
    const idx = state.pastContests.findIndex(c => c.contestId === state.currentContest.id);
    if (idx === -1) return;
    
    const solved = state.currentContest.problems.filter(p => p.status === 'solved');
    state.pastContests[idx] = {
        ...state.pastContests[idx],
        problems: JSON.parse(JSON.stringify(state.currentContest.problems)),
        solvedCount: solved.length,
        totalScore: solved.reduce((s, p) => s + Math.round(p.currentScore), 0),
        totalPenalty: solved.reduce((s, p) => s + (p.attempts * 5), 0),
        timeTaken: Date.now() - state.contestStartTime - state.contestPausedTime,
        inProgress: true
    };
    
    debouncedSync();
}

function viewPastContests() {
    hideAllSections();
    document.getElementById('historySection').classList.remove('hidden');
    document.getElementById('performanceSection').classList.remove('hidden');
    
    const total = state.pastContests.filter(c => !c.inProgress).length;
    document.getElementById('historySubtitle').textContent = `${total} contests completed`;
    
    renderHistory('all');
    initAnalyticsDateRange();
    renderAnalyticsCharts();
}

function filterHistory(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderHistory(filter);
}

function renderHistory(filter) {
    const list = document.getElementById('historyList');
    
    let contests = state.pastContests;
    if (filter !== 'all') contests = contests.filter(c => c.contestType === filter);

    if (contests.length === 0) {
        list.innerHTML = '<p class="empty-state">No contests found</p>';
        return;
    }

    list.innerHTML = contests.slice().reverse().map((contest) => {
        const contestIdx = state.pastContests.indexOf(contest);
        const isIP = contest.inProgress;
        const solveRate = contest.totalProblems > 0 
            ? Math.round((contest.solvedCount / contest.totalProblems) * 100) : 0;
        
        return `
        <div class="history-item ${isIP ? 'in-progress-contest' : ''}">
            <div class="history-item-info">
                <div class="history-item-title">
                    ${contest.contestName} 
                    ${isIP ? '<span class="in-progress-badge">Live</span>' : ''}
                </div>
                <div class="history-item-meta">
                    <span>${new Date(contest.date).toLocaleDateString()}</span>
                    <span>\u00B7</span>
                    <span>${(contest.contestType || '').toUpperCase()}</span>
                    <span>\u00B7</span>
                    <span>${formatDuration(contest.timeTaken)}</span>
                    <span>\u00B7</span>
                    <span>${solveRate}%</span>
                </div>
            </div>
            <div class="history-item-stats">
                <div class="history-stat">
                    <span class="history-stat-value">${contest.solvedCount}/${contest.totalProblems}</span>
                    <span class="history-stat-label">Solved</span>
                </div>
                <div class="history-stat">
                    <span class="history-stat-value">${contest.totalScore}</span>
                    <span class="history-stat-label">Score</span>
                </div>
            </div>
            <div class="history-actions">
                <button class="btn-mini" onclick="resumePastContest(${contestIdx})">${isIP ? 'Continue' : 'Resume'}</button>
                <button class="btn-mini-danger" onclick="deletePastContest(${contestIdx})">Delete</button>
            </div>
        </div>`;
    }).join('');
}

// ===== Performance Analytics (Two Charts + Date Range) =====
let solvedChart = null;
let scoreChart = null;

function initAnalyticsDateRange() {
    const fromEl = document.getElementById('analyticsDateFrom');
    const toEl = document.getElementById('analyticsDateTo');
    if (!fromEl || !toEl) return;
    
    const today = new Date().toISOString().split('T')[0];
    toEl.value = today;
    
    const completed = state.pastContests.filter(c => !c.inProgress);
    if (completed.length > 0) {
        const dates = completed.map(c => new Date(c.date).getTime()).filter(d => !isNaN(d));
        if (dates.length > 0) {
            const earliest = new Date(Math.min(...dates));
            fromEl.value = earliest.toISOString().split('T')[0];
        } else {
            const thirtyAgo = new Date(Date.now() - 30 * 86400000);
            fromEl.value = thirtyAgo.toISOString().split('T')[0];
        }
    } else {
        const thirtyAgo = new Date(Date.now() - 30 * 86400000);
        fromEl.value = thirtyAgo.toISOString().split('T')[0];
    }
}

function setAnalyticsRange(range) {
    const toEl = document.getElementById('analyticsDateTo');
    const fromEl = document.getElementById('analyticsDateFrom');
    const today = new Date();
    toEl.value = today.toISOString().split('T')[0];
    
    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    
    if (range === '7d') {
        fromEl.value = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        document.querySelector('[data-range="7d"]').classList.add('active');
    } else if (range === '30d') {
        fromEl.value = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
        document.querySelector('[data-range="30d"]').classList.add('active');
    } else if (range === '90d') {
        fromEl.value = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
        document.querySelector('[data-range="90d"]').classList.add('active');
    } else {
        const completed = state.pastContests.filter(c => !c.inProgress);
        const dates = completed.map(c => new Date(c.date).getTime()).filter(d => !isNaN(d));
        if (dates.length > 0) {
            fromEl.value = new Date(Math.min(...dates)).toISOString().split('T')[0];
        }
        document.querySelector('[data-range="all"]').classList.add('active');
    }
    
    renderAnalyticsCharts();
}

function switchPerformanceTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    renderAnalyticsCharts();
}

function getFilteredContests() {
    const fromEl = document.getElementById('analyticsDateFrom');
    const toEl = document.getElementById('analyticsDateTo');
    const activeTab = document.querySelector('.tab-btn.active');
    const division = activeTab ? activeTab.dataset.tab : 'overall';
    
    let contests = state.pastContests.filter(c => !c.inProgress);
    
    if (division !== 'overall') {
        contests = contests.filter(c => c.contestType === division);
    }
    
    if (fromEl && fromEl.value) {
        const fromDate = new Date(fromEl.value);
        fromDate.setHours(0, 0, 0, 0);
        contests = contests.filter(c => new Date(c.date) >= fromDate);
    }
    
    if (toEl && toEl.value) {
        const toDate = new Date(toEl.value);
        toDate.setHours(23, 59, 59, 999);
        contests = contests.filter(c => new Date(c.date) <= toDate);
    }
    
    contests.sort((a, b) => new Date(a.date) - new Date(b.date));
    return contests;
}

function renderAnalyticsCharts() {
    const contests = getFilteredContests();
    
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();
    
    const labels = contests.map(c => {
        const d = new Date(c.date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    const solvedData = contests.map(c => c.solvedCount || 0);
    const totalData = contests.map(c => c.totalProblems || 0);
    const scoreData = contests.map(c => c.totalScore || 0);
    
    const solvedCtx = document.getElementById('solvedChart');
    if (solvedChart) solvedChart.destroy();
    
    solvedChart = new Chart(solvedCtx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Solved',
                data: solvedData,
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderColor: '#10b981',
                borderWidth: 1,
                borderRadius: 4
            }, {
                label: 'Total',
                data: totalData,
                backgroundColor: 'rgba(148, 163, 184, 0.25)',
                borderColor: 'rgba(148, 163, 184, 0.5)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    labels: { color: textColor, font: { family: 'Inter', weight: '600', size: 11 } }
                },
                title: {
                    display: true,
                    text: 'Questions Solved',
                    color: textColor,
                    font: { family: 'Inter', weight: '700', size: 14 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: textColor, font: { size: 11 }, stepSize: 1 },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: textColor, font: { size: 10 }, maxRotation: 45 },
                    grid: { display: false }
                }
            }
        }
    });
    
    const scoreCtx = document.getElementById('scoreChart');
    if (scoreChart) scoreChart.destroy();
    
    scoreChart = new Chart(scoreCtx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Score',
                data: scoreData,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#3b82f6',
                borderWidth: 2.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    labels: { color: textColor, font: { family: 'Inter', weight: '600', size: 11 } }
                },
                title: {
                    display: true,
                    text: 'Total Score',
                    color: textColor,
                    font: { family: 'Inter', weight: '700', size: 14 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: textColor, font: { size: 11 } },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: textColor, font: { size: 10 }, maxRotation: 45 },
                    grid: { display: false }
                }
            }
        }
    });
    
    renderPerformanceStats(contests);
}

function renderPerformanceStats(contests) {
    const div = document.getElementById('performanceStats');
    
    if (contests.length === 0) {
        div.innerHTML = '<p class="empty-state">No completed contests in this range</p>';
        return;
    }

    const avgScore = Math.round(contests.reduce((s, c) => s + c.totalScore, 0) / contests.length);
    const avgSolved = (contests.reduce((s, c) => s + c.solvedCount, 0) / contests.length).toFixed(1);
    const bestScore = Math.max(...contests.map(c => c.totalScore));
    const total = contests.length;

    div.innerHTML = `
        <div class="result-card">
            <div class="result-icon score">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div class="result-info">
                <span class="result-value">${avgScore}</span>
                <span class="result-label">Avg Score</span>
            </div>
        </div>
        <div class="result-card">
            <div class="result-icon success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="result-info">
                <span class="result-value">${avgSolved}</span>
                <span class="result-label">Avg Solved</span>
            </div>
        </div>
        <div class="result-card">
            <div class="result-icon time">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div class="result-info">
                <span class="result-value">${bestScore}</span>
                <span class="result-label">Best Score</span>
            </div>
        </div>
        <div class="result-card">
            <div class="result-icon info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
            <div class="result-info">
                <span class="result-value">${total}</span>
                <span class="result-label">Contests</span>
            </div>
        </div>
    `;
}

// ===== Recommendation System =====
function analyzeTagFrequency() {
    if (!state.allProblems || state.allProblems.length === 0 || state.solvedProblems.size === 0) {
        return { tagCounts: {}, strongTags: new Set(), totalSolved: 0 };
    }
    
    const tagCounts = {};
    let totalSolved = 0;
    
    state.allProblems.forEach(problem => {
        const pid = `${problem.contestId}${problem.index}`;
        if (state.solvedProblems.has(pid)) {
            totalSolved++;
            (problem.tags || []).forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });
    
    const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    const totalTags = sortedTags.length;
    const cutoff = Math.max(1, Math.ceil(totalTags * 0.3));
    const strongTags = new Set(sortedTags.slice(0, cutoff).map(([tag]) => tag));
    
    return { tagCounts, strongTags, totalSolved, sortedTags };
}

function getRecommendedProblems(count = 5) {
    if (!state.currentUser || !state.allProblems || state.allProblems.length === 0) {
        return { problems: [], message: null };
    }
    
    const userRating = state.currentUser.rating || 1200;
    const minRating = userRating;
    const maxRating = userRating + 300;
    
    const { strongTags, totalSolved } = analyzeTagFrequency();
    
    if (strongTags.size === 0) {
        return { problems: [], message: null };
    }
    
    const candidates = state.allProblems.filter(problem => {
        if (!problem.rating) return false;
        if (problem.rating < minRating || problem.rating > maxRating) return false;
        if (state.solvedProblems.has(`${problem.contestId}${problem.index}`)) return false;
        
        const tags = problem.tags || [];
        if (tags.length === 0) return false;
        const hasStrongTag = tags.some(t => strongTags.has(t));
        return !hasStrongTag;
    });
    
    if (candidates.length === 0) {
        return { problems: [], message: "done with this level just move to the next level bro!!" };
    }
    
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    
    const selected = [];
    const usedTags = new Set();
    
    for (const problem of shuffled) {
        if (selected.length >= count) break;
        
        const primaryTag = (problem.tags || [])[0];
        if (primaryTag && usedTags.has(primaryTag) && selected.length < count - 1) continue;
        
        selected.push(problem);
        (problem.tags || []).forEach(t => usedTags.add(t));
    }
    
    while (selected.length < count && selected.length < shuffled.length) {
        const next = shuffled.find(p => !selected.includes(p));
        if (next) selected.push(next);
        else break;
    }
    
    return { problems: selected, message: null };
}

function renderRecommendations() {
    const section = document.getElementById('recommendationSection');
    const container = document.getElementById('recommendationList');
    if (!section || !container) return;
    
    if (!state.currentUser || state.allProblems.length === 0 || state.solvedProblems.size === 0) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    
    const { problems, message } = getRecommendedProblems(5);
    state._recommendedProblems = problems;
    
    const { strongTags, sortedTags } = analyzeTagFrequency();
    
    const weakTagsHtml = sortedTags
        ? sortedTags.slice(-5).reverse().map(([tag, count]) => 
            `<span class="rec-tag weak-tag">${tag} (${count})</span>`
        ).join('')
        : '';
    
    const strongTagsHtml = sortedTags
        ? sortedTags.slice(0, 3).map(([tag, count]) => 
            `<span class="rec-tag strong-tag">${tag} (${count})</span>`
        ).join('')
        : '';
    
    if (message) {
        container.innerHTML = `
            <div class="rec-level-up">
                <div class="rec-level-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="40" height="40">
                        <path d="M12 19V5M5 12l7-7 7 7"/>
                    </svg>
                </div>
                <h3>${message}</h3>
                <p>Your strong tags: ${strongTagsHtml}</p>
                <p style="color: var(--text-muted); font-size: 13px; margin-top: 8px;">
                    No unsolved problems found in weak tags at rating ${state.currentUser.rating || 1200}\u2013${(state.currentUser.rating || 1200) + 300}
                </p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="rec-tag-analysis">
            <div class="rec-tag-group">
                <span class="rec-tag-label">Strong (excluded):</span>
                ${strongTagsHtml}
            </div>
            <div class="rec-tag-group">
                <span class="rec-tag-label">Weak (target):</span>
                ${weakTagsHtml}
            </div>
        </div>
        <div class="rec-problems-grid">
            ${problems.map(p => {
                const ratingClass = getRatingClass(p.rating);
                const tags = (p.tags || []).slice(0, 3).map(t => 
                    `<span class="rec-problem-tag">${t}</span>`
                ).join('');
                return `
                <div class="rec-problem-card">
                    <div class="rec-problem-header">
                        <a href="https://codeforces.com/problemset/problem/${p.contestId}/${p.index}" 
                           target="_blank" class="rec-problem-name">${p.name}</a>
                        <span class="rating-color ${ratingClass}" style="font-size:13px">${p.rating}</span>
                    </div>
                    <div class="rec-problem-tags">${tags}</div>
                    <div class="rec-problem-meta">
                        <span>${p.contestId}${p.index}</span>
                    </div>
                </div>`;
            }).join('')}
        </div>
    `;
}

function refreshRecommendations() {
    renderRecommendations();
    showToast('Recommendations refreshed', 'info');
}

// ===== Navigation =====
function startNewContest() {
    state.currentContest = null;
    state.contestStartTime = null;
    state.contestPausedTime = 0;
    state.isPaused = false;
    state.submissions = [];
    state.selectedDivision = null;
    
    clearActiveContestState();
    hideAllSections();
    document.getElementById('contestArena').classList.add('hidden');
    document.getElementById('contestTypeSection').classList.remove('hidden');
    if (state.currentUser && state.allProblems.length > 0) {
        document.getElementById('recommendationSection').classList.remove('hidden');
    }
}

function backToContestTypes() {
    hideAllSections();
    document.getElementById('contestTypeSection').classList.remove('hidden');
    if (state.currentUser && state.allProblems.length > 0) {
        document.getElementById('recommendationSection').classList.remove('hidden');
    }
}

function backFromPreview() {
    document.getElementById('divisionPreviewSection').classList.add('hidden');
    document.getElementById('contestTypeSection').classList.remove('hidden');
    if (state.currentUser && state.allProblems.length > 0) {
        document.getElementById('recommendationSection').classList.remove('hidden');
    }
    state.selectedDivision = null;
}

function startContestFromPreview() {
    if (state.selectedDivision === 'custom') generateCustomContest();
    else generatePresetContest(state.selectedDivision);
}

// ===== Utility =====
function showLoading(message) {
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

// ===== State Persistence (localStorage + Cloud Sync) =====
function saveContestState() {
    if (!state.currentContest) return;
    
    const contestState = {
        currentUser: state.currentUser,
        solvedProblems: Array.from(state.solvedProblems),
        currentContest: state.currentContest,
        contestStartTime: state.contestStartTime,
        contestDuration: state.contestDuration,
        contestPausedTime: state.contestPausedTime,
        isPaused: state.isPaused,
        pauseStartTime: state.pauseStartTime,
        submissions: state.submissions,
        selectedDivision: state.selectedDivision,
        allProblems: state.allProblems,
        problemStats: state.problemStats
    };
    
    localStorage.setItem('activeContest', JSON.stringify(contestState));
}

function restoreActiveContest() {
    let contestData = null;
    let source = null;
    
    if (state._cloudActiveContest && state._cloudActiveContest.currentContest) {
        contestData = state._cloudActiveContest;
        source = 'cloud';
    }
    
    if (!contestData) {
        const saved = localStorage.getItem('activeContest');
        if (saved) {
            try {
                contestData = JSON.parse(saved);
                source = 'local';
            } catch(e) {
                localStorage.removeItem('activeContest');
                return;
            }
        }
    }
    
    if (!contestData || !contestData.currentContest) return;
    
    try {
        if (source === 'cloud') {
            if (contestData.currentUser) {
                state.currentUser = contestData.currentUser;
            }
            state.currentContest = contestData.currentContest;
            state.contestStartTime = contestData.contestStartTime;
            state.contestDuration = contestData.contestDuration || 120;
            state.contestPausedTime = contestData.contestPausedTime || 0;
            state.isPaused = contestData.isPaused || false;
            state.pauseStartTime = contestData.pauseStartTime;
            state.submissions = contestData.submissions || [];
            state.selectedDivision = contestData.selectedDivision;
        } else {
            state.currentUser = contestData.currentUser;
            state.solvedProblems = new Set(contestData.solvedProblems || []);
            state.allProblems = contestData.allProblems || [];
            state.problemStats = contestData.problemStats || {};
            state.currentContest = contestData.currentContest;
            state.contestStartTime = contestData.contestStartTime;
            state.contestDuration = contestData.contestDuration || 120;
            state.contestPausedTime = contestData.contestPausedTime || 0;
            state.isPaused = contestData.isPaused || false;
            state.pauseStartTime = contestData.pauseStartTime;
            state.submissions = contestData.submissions || [];
            state.selectedDivision = contestData.selectedDivision;
        }
        
        if (state.isPaused && state.pauseStartTime) {
            state.contestPausedTime += (Date.now() - state.pauseStartTime);
            state.pauseStartTime = Date.now();
        }
        
        const elapsed = Date.now() - state.contestStartTime - state.contestPausedTime;
        const totalMs = state.contestDuration * 60 * 1000;
        if (elapsed >= totalMs && !state.isPaused) {
            endContest();
            return;
        }
        
        if (state.currentUser) displayUserInfo();
        
        if (state.isPaused) {
            displayContestArena();
            document.getElementById('pauseBtn').style.display = 'none';
            document.getElementById('resumeBtn').style.display = 'inline-flex';
            updateTimerDisplayPaused();
            showSuccess(`Contest restored from ${source} (paused)`);
        } else {
            displayContestArena();
            startTimer();
            showSuccess(`Contest restored from ${source}!`);
        }
        
    } catch (error) {
        console.error('Failed to restore contest:', error);
        localStorage.removeItem('activeContest');
    }
}

function clearActiveContestState() {
    localStorage.removeItem('activeContest');
    state._cloudActiveContest = null;
    state.currentContest = null;
    syncToAPI();
}

// ===== Pause/Resume =====
function pauseContest() {
    if (!state.currentContest || state.isPaused) return;
    
    state.isPaused = true;
    state.pauseStartTime = Date.now();
    
    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
    if (state.autoRefreshInterval) { clearInterval(state.autoRefreshInterval); state.autoRefreshInterval = null; }
    
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('resumeBtn').style.display = 'inline-flex';
    document.getElementById('timerDisplay').classList.add('paused');
    
    saveContestState();
    syncActiveContestToCloud();
    showToast('Contest paused', 'warning');
}

function resumeContest() {
    if (!state.currentContest || !state.isPaused) return;
    
    state.contestPausedTime += (Date.now() - state.pauseStartTime);
    state.isPaused = false;
    state.pauseStartTime = null;
    
    document.getElementById('pauseBtn').style.display = 'inline-flex';
    document.getElementById('resumeBtn').style.display = 'none';
    document.getElementById('timerDisplay').classList.remove('paused');
    
    startTimer();
    if (state.settings.autoRefresh) {
        state.autoRefreshInterval = setInterval(refreshSubmissions, 30000);
    }
    
    saveContestState();
    syncActiveContestToCloud();
    showSuccess('Contest resumed');
}

// ===== Division Statistics =====
function calculateDivisionStats(divisionType) {
    const divContests = state.pastContests.filter(c => c.contestType === divisionType && !c.inProgress);
    
    if (divContests.length === 0) {
        return { averageScore: 0, averageTime: 0, averageSolved: 0, totalContests: 0, bestScore: 0, averageProblemSolveTime: {} };
    }
    
    const totalScore = divContests.reduce((s, c) => s + c.totalScore, 0);
    const totalTime = divContests.reduce((s, c) => s + c.timeTaken, 0);
    const totalSolved = divContests.reduce((s, c) => s + c.solvedCount, 0);
    const bestScore = Math.max(...divContests.map(c => c.totalScore));
    
    const problemSolveTimes = {};
    divContests.forEach(contest => {
        (contest.problems || []).forEach(p => {
            if (p.status === 'solved' && p.solvedAt) {
                const time = p.solvedAt - contest.startTime;
                if (!problemSolveTimes[p.index]) problemSolveTimes[p.index] = [];
                problemSolveTimes[p.index].push(time);
            }
        });
    });
    
    const avgProblemTime = {};
    Object.entries(problemSolveTimes).forEach(([idx, times]) => {
        avgProblemTime[idx] = times.reduce((s, t) => s + t, 0) / times.length;
    });
    
    return {
        averageScore: Math.round(totalScore / divContests.length),
        averageTime: Math.round(totalTime / divContests.length),
        averageSolved: (totalSolved / divContests.length).toFixed(1),
        totalContests: divContests.length,
        bestScore,
        averageProblemSolveTime: avgProblemTime
    };
}

function displayDivisionStats(stats) {
    const container = document.getElementById('divisionStatsContainer');
    
    if (stats.totalContests === 0) {
        container.innerHTML = '<p class="empty-state">No completed contests yet \u2014 start your first one!</p>';
        document.getElementById('avgSolveTimePerProblem').innerHTML = '';
        return;
    }
    
    container.innerHTML = `
        <div class="division-stat-card"><div class="stat-icon">\u{1F4CA}</div><div class="stat-info"><span class="stat-value">${stats.averageScore}</span><span class="stat-label">Avg Score</span></div></div>
        <div class="division-stat-card"><div class="stat-icon">\u23F1</div><div class="stat-info"><span class="stat-value">${formatDuration(stats.averageTime)}</span><span class="stat-label">Avg Time</span></div></div>
        <div class="division-stat-card"><div class="stat-icon">\u2713</div><div class="stat-info"><span class="stat-value">${stats.averageSolved}</span><span class="stat-label">Avg Solved</span></div></div>
        <div class="division-stat-card"><div class="stat-icon">\u{1F3C6}</div><div class="stat-info"><span class="stat-value">${stats.bestScore}</span><span class="stat-label">Best</span></div></div>
        <div class="division-stat-card"><div class="stat-icon">#</div><div class="stat-info"><span class="stat-value">${stats.totalContests}</span><span class="stat-label">Contests</span></div></div>
    `;
    
    if (Object.keys(stats.averageProblemSolveTime).length > 0) {
        const html = Object.entries(stats.averageProblemSolveTime)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([idx, time]) => `<div class="problem-time-stat"><span class="problem-index-small">${idx}</span><span class="problem-time">${formatDuration(time)}</span></div>`)
            .join('');
        
        document.getElementById('avgSolveTimePerProblem').innerHTML = `
            <h4 style="margin:16px 0 10px;font-size:13px;color:var(--text-secondary)">Avg Solve Time</h4>
            <div class="problem-times-grid">${html}</div>
        `;
    } else {
        document.getElementById('avgSolveTimePerProblem').innerHTML = '';
    }
}

function displayPastContestsForDivision(divType) {
    const divContests = state.pastContests.filter(c => c.contestType === divType);
    const container = document.getElementById('divisionPastContestsList');
    
    if (divContests.length === 0) {
        container.innerHTML = '<p class="empty-state">No contests for this division yet</p>';
        return;
    }
    
    container.innerHTML = divContests.slice(-5).reverse().map(contest => {
        const idx = state.pastContests.indexOf(contest);
        const isIP = contest.inProgress;
        return `
        <div class="mini-contest-card">
            <div class="mini-contest-info">
                <span class="mini-contest-date">${new Date(contest.date).toLocaleDateString()}${isIP ? ' (Live)' : ''}</span>
                <span class="mini-contest-stats">${contest.solvedCount}/${contest.totalProblems} \u2022 ${contest.totalScore} pts</span>
            </div>
            <div style="display:flex;gap:6px">
                <button class="btn-mini" onclick="resumePastContest(${idx})">${isIP ? 'Continue' : 'Resume'}</button>
                <button class="btn-mini-danger" onclick="deletePastContest(${idx})">Del</button>
            </div>
        </div>`;
    }).join('');
}

function resumePastContest(contestIndex) {
    const contest = state.pastContests[contestIndex];
    if (!contest) return;
    
    const msg = contest.inProgress 
        ? `Continue this contest?\n${contest.solvedCount}/${contest.totalProblems} solved \u2022 ${formatDuration(contest.timeTaken)} elapsed`
        : `Resume this contest?\n${contest.solvedCount}/${contest.totalProblems} solved`;
    
    showModal('Resume Contest?', `<p style="color:var(--text-secondary);font-size:14px;white-space:pre-line">${msg}</p>`, [
        { text: 'Cancel', className: 'btn-ghost', action: () => {} },
        { text: 'Resume', className: 'btn-primary', action: () => doResumePastContest(contestIndex) }
    ]);
}

function doResumePastContest(contestIndex) {
    const contest = state.pastContests[contestIndex];
    if (!contest) return;
    
    state.currentContest = {
        id: contest.contestId,
        type: contest.contestType,
        name: contest.contestName,
        problems: JSON.parse(JSON.stringify(contest.problems)),
        duration: contest.originalDuration || 120,
        startTime: contest.startTime || Date.now()
    };
    
    state.contestStartTime = Date.now() - contest.timeTaken;
    state.contestDuration = contest.originalDuration || 120;
    state.contestPausedTime = 0;
    state.isPaused = false;
    state.submissions = [];
    state.selectedDivision = contest.contestType;
    
    hideAllSections();
    displayContestArena();
    startTimer();
    
    const remaining = Math.max(0, Math.floor(((state.contestDuration * 60 * 1000) - contest.timeTaken) / 60000));
    showSuccess(`Contest resumed! ${remaining} min remaining`);
    saveContestState();
    syncActiveContestToCloud();
}

function deletePastContest(contestIndex) {
    showModal('Delete Contest?', '<p style="color:var(--text-secondary);font-size:14px">This cannot be undone.</p>', [
        { text: 'Cancel', className: 'btn-ghost', action: () => {} },
        { text: 'Delete', className: 'btn-danger', action: () => doDeletePastContest(contestIndex) }
    ]);
}

function doDeletePastContest(contestIndex) {
    const contest = state.pastContests[contestIndex];
    
    if (contest && contest.inProgress && state.currentContest && state.currentContest.id === contest.contestId) {
        if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
        if (state.autoRefreshInterval) { clearInterval(state.autoRefreshInterval); state.autoRefreshInterval = null; }
        state.currentContest = null;
        state.contestStartTime = null;
        document.getElementById('contestArena').classList.add('hidden');
        clearActiveContestState();
    }
    
    state.pastContests.splice(contestIndex, 1);
    debouncedSync();
    
    if (!document.getElementById('historySection').classList.contains('hidden')) {
        const activeFilter = document.querySelector('.filter-btn.active');
        renderHistory(activeFilter ? activeFilter.dataset.filter : 'all');
    }
    
    if (!document.getElementById('divisionPreviewSection').classList.contains('hidden') && state.selectedDivision) {
        displayDivisionStats(calculateDivisionStats(state.selectedDivision));
        displayPastContestsForDivision(state.selectedDivision);
    }
    
    showSuccess('Contest deleted');
}

function viewAllPastContests() {
    document.getElementById('divisionPreviewSection').classList.add('hidden');
    viewPastContests();
}

// ===== Export / Import =====
function exportData() {
    const data = {
        version: 3,
        exportDate: new Date().toISOString(),
        pastContests: state.pastContests,
        streak: state.streak,
        settings: state.settings,
        dailyGoal: state.dailyGoal,
        lastUser: localStorage.getItem('lastUser'),
        syncEnabled: state.apiSyncEnabled,
        lastSyncTime: state.lastSyncTime ? new Date(state.lastSyncTime).toISOString() : null
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contest-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showSuccess('Data exported!');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.pastContests || !Array.isArray(data.pastContests)) {
                throw new Error('Invalid data format');
            }
            
            showModal('Import Data?', 
                `<p style="color:var(--text-secondary);font-size:14px">This will merge <strong>${data.pastContests.length}</strong> contests into your history.</p>`,
                [
                    { text: 'Cancel', className: 'btn-ghost', action: () => {} },
                    { text: 'Import', className: 'btn-primary', action: () => {
                        const existingIds = new Set(state.pastContests.map(c => c.contestId));
                        let imported = 0;
                        data.pastContests.forEach(c => {
                            if (!existingIds.has(c.contestId)) {
                                state.pastContests.push(c);
                                imported++;
                            }
                        });
                        debouncedSync();
                        
                        if (data.streak) {
                            state.streak.best = Math.max(state.streak.best, data.streak.best || 0);
                        }
                        
                        showSuccess(`Imported ${imported} new contests!`);
                    }}
                ]
            );
        } catch (err) {
            showError('Invalid file format');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ===== Clear All Data =====
function clearAllData() {
    showModal('Clear All Data?', 
        '<p style="color:var(--text-secondary);font-size:14px">This will permanently delete all contest history, streak data, and settings. This cannot be undone.</p>',
        [
            { text: 'Cancel', className: 'btn-ghost', action: () => {} },
            { text: 'Clear Everything', className: 'btn-danger', action: () => {
                localStorage.removeItem('pastContests');
                localStorage.removeItem('practiceStreak');
                localStorage.removeItem('contestSettings');
                localStorage.removeItem('activeContest');
                localStorage.removeItem('dailyGoal');
                state.pastContests = [];
                state.streak = { current: 0, lastDate: null, best: 0, history: [] };
                state.dailyGoal = { target: 1, completed: 0, date: null };
                updateStreakDisplay();
                updateDailyGoalDisplay();
                closeSettingsModal();
                showSuccess('All data cleared');
            }}
        ]
    );
}
