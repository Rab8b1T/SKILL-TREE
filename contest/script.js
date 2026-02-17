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
        showTags: false
    },
    streak: {
        current: 0,
        lastDate: null,
        best: 0,
        history: []
    },
    apiSyncEnabled: true,
    lastSyncTime: null
};

// ===== API Sync Functions =====
function updateSyncStatus(status, text) {
    const syncEl = document.getElementById('syncStatus');
    const syncText = syncEl.querySelector('.sync-text');
    
    syncEl.className = 'sync-status ' + status;
    syncText.textContent = text;
}

async function syncToAPI() {
    if (!state.apiSyncEnabled) return;
    
    updateSyncStatus('syncing', 'Syncing...');
    
    try {
        const dataToSync = {
            pastContests: state.pastContests,
            streak: state.streak,
            settings: state.settings,
            lastUser: localStorage.getItem('lastUser') || 'rab8bit',
            lastSyncTime: new Date().toISOString()
        };

        const response = await fetch('/contest-data?user=rab8bit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSync)
        });

        if (response.ok) {
            state.lastSyncTime = Date.now();
            updateSyncStatus('synced', 'Synced');
            // Also save to localStorage as backup
            localStorage.setItem('pastContests', JSON.stringify(state.pastContests));
            localStorage.setItem('practiceStreak', JSON.stringify(state.streak));
            localStorage.setItem('contestSettings', JSON.stringify(state.settings));
        } else {
            console.warn('Failed to sync to API, falling back to localStorage');
            updateSyncStatus('error', 'Local only');
            // Fallback to localStorage
            localStorage.setItem('pastContests', JSON.stringify(state.pastContests));
            localStorage.setItem('practiceStreak', JSON.stringify(state.streak));
            localStorage.setItem('contestSettings', JSON.stringify(state.settings));
        }
    } catch (error) {
        console.error('API sync error:', error);
        updateSyncStatus('error', 'Local only');
        // Fallback to localStorage
        localStorage.setItem('pastContests', JSON.stringify(state.pastContests));
        localStorage.setItem('practiceStreak', JSON.stringify(state.streak));
        localStorage.setItem('contestSettings', JSON.stringify(state.settings));
    }
}

async function loadFromAPI() {
    try {
        const response = await fetch('/contest-data?user=rab8bit');
        if (!response.ok) throw new Error('API fetch failed');
        
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
        
        state.apiSyncEnabled = true;
        updateSyncStatus('synced', 'Synced');
        return true;
    } catch (error) {
        console.warn('Failed to load from API, using localStorage:', error);
        state.apiSyncEnabled = false;
        updateSyncStatus('error', 'Local only');
        
        // Fallback to localStorage
        const savedContests = localStorage.getItem('pastContests');
        if (savedContests) {
            try { state.pastContests = JSON.parse(savedContests); }
            catch(e) { state.pastContests = []; }
        }
        
        const savedStreak = localStorage.getItem('practiceStreak');
        if (savedStreak) {
            try { state.streak = { ...state.streak, ...JSON.parse(savedStreak) }; }
            catch(e) { /* ignore */ }
        }
        
        const savedSettings = localStorage.getItem('contestSettings');
        if (savedSettings) {
            try { state.settings = { ...state.settings, ...JSON.parse(savedSettings) }; }
            catch(e) { /* ignore */ }
        }
        
        return false;
    }
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
    initializeTheme();
    
    // Load from API first, then apply settings
    showLoading('Loading your data...');
    const apiLoaded = await loadFromAPI();
    hideLoading();
    
    if (apiLoaded) {
        showToast('Data synced from cloud ☁️', 'success');
    }
    
    applySettings();
    updateStreakDisplay();
    setupEventListeners();
    
    const savedUser = localStorage.getItem('lastUser');
    if (savedUser) {
        document.getElementById('handleInput').value = savedUser;
    }
    
    restoreActiveContest();
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
function loadSettings() {
    // Settings are now loaded from API in loadFromAPI()
    // This function is kept for compatibility
    applySettings();
}

function applySettings() {
    const soundEl = document.getElementById('soundToggle');
    const autoRefreshEl = document.getElementById('autoRefreshToggle');
    const showTagsEl = document.getElementById('showTagsToggle');
    if (soundEl) soundEl.checked = state.settings.soundEnabled;
    if (autoRefreshEl) autoRefreshEl.checked = state.settings.autoRefresh;
    if (showTagsEl) showTagsEl.checked = state.settings.showTags;
}

function saveSettings() {
    syncToAPI();
}

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

// ===== Streak Tracking =====
function loadStreak() {
    // Streak is now loaded from API in loadFromAPI()
    // This function is kept for compatibility
    updateStreakDisplay();
}

function saveStreak() {
    syncToAPI();
}

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
    
    saveStreak();
    updateStreakDisplay();
}

function updateStreakDisplay() {
    const badge = document.getElementById('streakBadge');
    const count = document.getElementById('streakCount');
    
    // Check if streak is still active
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
        // Don't trigger shortcuts if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        const inContest = !document.getElementById('contestArena').classList.contains('hidden');
        
        switch(e.key) {
            case 'Escape':
                if (document.getElementById('shortcutsOverlay') && 
                    !document.getElementById('shortcutsOverlay').classList.contains('hidden')) {
                    closeShortcutsModal();
                } else if (document.getElementById('settingsOverlay') &&
                    !document.getElementById('settingsOverlay').classList.contains('hidden')) {
                    closeSettingsModal();
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
                if (!inContest) {
                    document.getElementById('themeToggle').click();
                }
                break;
            case 'n':
            case 'N':
                if (!inContest) startNewContest();
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
            // Second note
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
    } catch(e) { /* ignore audio errors */ }
}

// ===== Toast System =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    
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

function showShortcutsModal() {
    document.getElementById('shortcutsOverlay').classList.remove('hidden');
}

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
        localStorage.setItem('lastUser', handle);

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
        showContestTypeSelection();
        showSuccess('Profile loaded!');

    } catch (error) {
        hideLoading();
        if (error.message && error.message.includes('fetch')) {
            showError('Network error — check your connection or CF might be down');
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

// ===== Contest Type Selection =====
function showContestTypeSelection() {
    document.getElementById('contestTypeSection').classList.remove('hidden');
}

function selectContestType(type) {
    state.selectedDivision = type;
    if (type === 'custom') {
        showCustomConfig();
    } else {
        showDivisionPreview(type);
    }
}

function showDivisionPreview(type) {
    document.getElementById('contestTypeSection').classList.add('hidden');
    document.getElementById('divisionPreviewSection').classList.remove('hidden');
    
    const config = CONTEST_CONFIGS[type];
    
    document.getElementById('previewDivisionName').textContent = config.name;
    document.getElementById('previewProblemsCount').textContent = config.problems.length;
    document.getElementById('previewDuration').textContent = config.duration;
    document.getElementById('previewRatingRange').textContent = 
        `${config.problems[0].rating[0]} – ${config.problems[config.problems.length - 1].rating[1]}`;
    
    const divisionStats = calculateDivisionStats(type);
    displayDivisionStats(divisionStats);
    displayPastContestsForDivision(type);
}

function showCustomConfig() {
    document.getElementById('contestTypeSection').classList.add('hidden');
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
    state.selectedTags.clear();
}

// ===== Quick Practice =====
function showQuickPractice() {
    document.getElementById('contestTypeSection').classList.add('hidden');
    document.getElementById('quickPracticeSection').classList.remove('hidden');
    
    // Populate tags
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

    const config = {
        name: 'Custom Contest',
        problems,
        duration,
        tags: Array.from(state.selectedTags)
    };

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
        showError(`Not enough unsolved problems found (found ${contestProblems.length}/${config.problems.length}). Try a different division or rating range.`);
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
    
    // Record practice day for streak
    recordPracticeDay();

    const initialSnapshot = {
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
    };
    
    state.pastContests.push(initialSnapshot);
    syncToAPI();

    hideAllSections();
    displayContestArena();
    startTimer();
    saveContestState();
}

function hideAllSections() {
    ['contestTypeSection', 'customConfigSection', 'divisionPreviewSection',
     'quickPracticeSection', 'resultsSection', 'historySection', 'performanceSection'
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
        
        const problemId = `${problem.contestId}${problem.index}`;
        if (state.solvedProblems.has(problemId)) return false;
        
        if (allowedTags && allowedTags.length > 0) {
            const problemTags = problem.tags || [];
            const hasMatch = problemTags.some(tag => 
                allowedTags.some(allowed => tag.toLowerCase() === allowed.toLowerCase())
            );
            if (!hasMatch) return false;
        }
        
        return true;
    });

    if (unsolvedProblems.length === 0) {
        // Fallback: no tag filter but STRICT rating
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

    const pauseBtn = document.getElementById('pauseBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    
    if (state.isPaused) {
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = 'inline-flex';
    } else {
        pauseBtn.style.display = 'inline-flex';
        resumeBtn.style.display = 'none';
    }

    // Set total count
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
        
        // Build tags HTML
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
        row.innerHTML = `
            <td><span class="problem-index">${problem.index}</span></td>
            <td>
                <a href="https://codeforces.com/problemset/problem/${problem.contestId}/${cfIndex}" 
                   target="_blank" class="problem-link">${problem.name}</a>
            </td>
            <td><div class="problem-tags">${tagsHtml || '<span style="color:var(--text-muted);font-size:11px">—</span>'}</div></td>
            <td><span class="rating-color ${ratingClass}">${problem.rating || '-'}</span></td>
            <td style="font-size:12px;color:var(--text-muted)">${typeof solveCount === 'number' ? solveCount.toLocaleString() : solveCount}</td>
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

function updateTimerDisplay() {
    const elapsed = Math.floor((Date.now() - state.contestStartTime - state.contestPausedTime) / 1000);
    const totalSeconds = state.contestDuration * 60;
    const remaining = Math.max(0, totalSeconds - elapsed);

    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;

    const display = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const timerEl = document.getElementById('timerDisplay');
    timerEl.textContent = display;

    // Progress bar
    const pct = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 0;
    const fill = document.getElementById('timerProgressFill');
    fill.style.width = pct + '%';
    
    if (remaining < 300) {
        timerEl.className = 'timer-display danger paused';
        fill.className = 'timer-progress-fill danger';
    } else if (remaining < 900) {
        timerEl.className = 'timer-display warning paused';
        fill.className = 'timer-progress-fill warning';
    } else {
        timerEl.className = 'timer-display paused';
        fill.className = 'timer-progress-fill';
    }
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

    // Progress bar
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
    
    // Sound warnings
    if (remaining === 300) playSound('warning');
    if (remaining === 60) playSound('warning');

    updateProblemScores(elapsed);
    updateSolvedProgress();
    
    if (elapsed % 10 === 0) saveContestState();
    if (remaining === 0) endContest();
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
                    
                    addSubmission({
                        problem: problem.index,
                        name: problem.name,
                        verdict: 'Accepted',
                        time: new Date(acSub.creationTimeSeconds * 1000),
                        penalty: wrongCount * 5
                    });
                    
                    playSound('success');
                    showSuccess(`Problem ${problem.index} solved! 🎉`);
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

        renderProblemsTable();
        renderSubmissions();
        updateSolvedProgress();
        updateInProgressContest();
        saveContestState();

    } catch (error) {
        showError('Failed to check submissions — CF API might be rate limited');
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
    
    document.getElementById('contestArena').classList.add('hidden');
    displayResults(results);
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
    
    // Upsolve section
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
    
    syncToAPI();
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
    
    syncToAPI();
}

function loadPastContests() {
    // Past contests are now loaded from API in loadFromAPI()
    // This function is kept for compatibility
}

function viewPastContests() {
    hideAllSections();
    document.getElementById('historySection').classList.remove('hidden');
    document.getElementById('performanceSection').classList.remove('hidden');
    
    const total = state.pastContests.filter(c => !c.inProgress).length;
    document.getElementById('historySubtitle').textContent = `${total} contests completed`;
    
    renderHistory('all');
    renderPerformanceGraph('overall');
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

    list.innerHTML = contests.slice().reverse().map((contest, idx) => {
        const contestIdx = state.pastContests.length - 1 - state.pastContests.slice().reverse().indexOf(contest);
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
                    <span>•</span>
                    <span>${(contest.contestType || '').toUpperCase()}</span>
                    <span>•</span>
                    <span>${formatDuration(contest.timeTaken)}</span>
                    <span>•</span>
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

// ===== Performance Analytics =====
let performanceChart = null;

function switchPerformanceTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    renderPerformanceGraph(tab);
}

function renderPerformanceGraph(division) {
    let contests = state.pastContests.filter(c => !c.inProgress);
    if (division !== 'overall') contests = contests.filter(c => c.contestType === division);

    const ctx = document.getElementById('performanceChart');
    if (performanceChart) performanceChart.destroy();

    const labels = contests.map((c, i) => `#${i + 1}`);
    const scores = contests.map(c => c.totalScore);
    const solvedRates = contests.map(c => Math.round((c.solvedCount / c.totalProblems) * 100));

    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();

    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Score',
                data: scores,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                tension: 0.4,
                fill: true,
                yAxisID: 'y',
                pointRadius: 4,
                pointHoverRadius: 6
            }, {
                label: 'Solve %',
                data: solvedRates,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                tension: 0.4,
                fill: true,
                yAxisID: 'y1',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    labels: { color: textColor, font: { family: 'Inter', weight: '600', size: 12 } }
                }
            },
            scales: {
                y: {
                    type: 'linear', display: true, position: 'left',
                    ticks: { color: textColor, font: { size: 11 } },
                    grid: { color: gridColor }
                },
                y1: {
                    type: 'linear', display: true, position: 'right',
                    min: 0, max: 100,
                    ticks: { color: textColor, font: { size: 11 }, callback: v => v + '%' },
                    grid: { drawOnChartArea: false }
                },
                x: {
                    ticks: { color: textColor, font: { size: 11 } },
                    grid: { color: gridColor }
                }
            }
        }
    });

    renderPerformanceStats(contests);
}

function renderPerformanceStats(contests) {
    const div = document.getElementById('performanceStats');
    
    if (contests.length === 0) {
        div.innerHTML = '<p class="empty-state">No completed contests yet</p>';
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
}

function backToContestTypes() {
    hideAllSections();
    document.getElementById('contestTypeSection').classList.remove('hidden');
}

function backFromPreview() {
    document.getElementById('divisionPreviewSection').classList.add('hidden');
    document.getElementById('contestTypeSection').classList.remove('hidden');
    state.selectedDivision = null;
}

function startContestFromPreview() {
    if (state.selectedDivision === 'custom') generateCustomContest();
    else generatePresetContest(state.selectedDivision);
}

// ===== Utility Functions =====
function showLoading(message) {
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

// ===== State Persistence =====
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
    const saved = localStorage.getItem('activeContest');
    if (!saved) return;
    
    try {
        const s = JSON.parse(saved);
        
        state.currentUser = s.currentUser;
        state.solvedProblems = new Set(s.solvedProblems);
        state.allProblems = s.allProblems || [];
        state.problemStats = s.problemStats || {};
        state.currentContest = s.currentContest;
        state.contestStartTime = s.contestStartTime;
        state.contestDuration = s.contestDuration || 120;
        state.contestPausedTime = s.contestPausedTime || 0;
        state.isPaused = s.isPaused || false;
        state.pauseStartTime = s.pauseStartTime;
        state.submissions = s.submissions || [];
        state.selectedDivision = s.selectedDivision;
        
        if (state.isPaused && state.pauseStartTime) {
            state.contestPausedTime += (Date.now() - state.pauseStartTime);
            state.pauseStartTime = Date.now();
        }
        
        if (state.currentUser) {
            displayUserInfo();
        }
        
        if (state.isPaused) {
            displayContestArena();
            document.getElementById('pauseBtn').style.display = 'none';
            document.getElementById('resumeBtn').style.display = 'inline-flex';
            document.getElementById('timerDisplay').classList.add('paused');
            updateTimerDisplay();
            showSuccess('Contest restored (paused)');
        } else {
            displayContestArena();
            startTimer();
            showSuccess('Contest restored!');
        }
        
    } catch (error) {
        console.error('Failed to restore contest:', error);
        localStorage.removeItem('activeContest');
    }
}

function clearActiveContestState() {
    localStorage.removeItem('activeContest');
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
        container.innerHTML = '<p class="empty-state">No completed contests yet — start your first one!</p>';
        document.getElementById('avgSolveTimePerProblem').innerHTML = '';
        return;
    }
    
    container.innerHTML = `
        <div class="division-stat-card"><div class="stat-icon">📊</div><div class="stat-info"><span class="stat-value">${stats.averageScore}</span><span class="stat-label">Avg Score</span></div></div>
        <div class="division-stat-card"><div class="stat-icon">⏱</div><div class="stat-info"><span class="stat-value">${formatDuration(stats.averageTime)}</span><span class="stat-label">Avg Time</span></div></div>
        <div class="division-stat-card"><div class="stat-icon">✓</div><div class="stat-info"><span class="stat-value">${stats.averageSolved}</span><span class="stat-label">Avg Solved</span></div></div>
        <div class="division-stat-card"><div class="stat-icon">🏆</div><div class="stat-info"><span class="stat-value">${stats.bestScore}</span><span class="stat-label">Best</span></div></div>
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
                <span class="mini-contest-stats">${contest.solvedCount}/${contest.totalProblems} • ${contest.totalScore} pts</span>
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
        ? `Continue this contest?\n${contest.solvedCount}/${contest.totalProblems} solved • ${formatDuration(contest.timeTaken)} elapsed`
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
}

function deletePastContest(contestIndex) {
    showModal('Delete Contest?', '<p style="color:var(--text-secondary);font-size:14px">This cannot be undone.</p>', [
        { text: 'Cancel', className: 'btn-ghost', action: () => {} },
        { text: 'Delete', className: 'btn-danger', action: () => doDeletePastContest(contestIndex) }
    ]);
}

function doDeletePastContest(contestIndex) {
    state.pastContests.splice(contestIndex, 1);
    syncToAPI();
    
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
        version: 2,
        exportDate: new Date().toISOString(),
        pastContests: state.pastContests,
        streak: state.streak,
        settings: state.settings,
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
                `<p style="color:var(--text-secondary);font-size:14px">This will merge <strong>${data.pastContests.length}</strong> contests into your history. Existing data will be preserved.</p>`,
                [
                    { text: 'Cancel', className: 'btn-ghost', action: () => {} },
                    { text: 'Import', className: 'btn-primary', action: () => {
                        // Merge contests (avoid duplicates by contestId)
                        const existingIds = new Set(state.pastContests.map(c => c.contestId));
                        let imported = 0;
                        data.pastContests.forEach(c => {
                            if (!existingIds.has(c.contestId)) {
                                state.pastContests.push(c);
                                imported++;
                            }
                        });
                        syncToAPI();
                        
                        if (data.streak) {
                            state.streak.best = Math.max(state.streak.best, data.streak.best || 0);
                            saveStreak();
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
                state.pastContests = [];
                state.streak = { current: 0, lastDate: null, best: 0, history: [] };
                updateStreakDisplay();
                closeSettingsModal();
                showSuccess('All data cleared');
            }}
        ]
    );
}
