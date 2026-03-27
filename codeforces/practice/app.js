// Practice Mode Application — MongoDB-backed with server-timestamp timers
const CONFIG = {
    API_BASE: 'https://codeforces.com/api',
    CORS_PROXY: 'https://corsproxy.io/?',
    PHASES: [
        { name: 'Solve Phase', duration: 30 * 60, color: '#10b981', cssClass: 'phase-solve' },
        { name: 'Tutorial Phase', duration: 15 * 60, color: '#f59e0b', cssClass: 'phase-tutorial' },
        { name: 'Final Attempt', duration: 15 * 60, color: '#ef4444', cssClass: 'phase-final' }
    ],
    RING_CIRCUMFERENCE: 2 * Math.PI * 110 // ~691.15
};

const PRACTICE_API = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : '/api';

function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
}

const state = {
    problems: [],
    handle: '',
    currentProblemIndex: 0,
    currentPhase: 0,
    // Server-timestamp fields (replaces setInterval tick counting)
    phaseStartTime: null,     // Wall-clock ms when current phase timer started
    phasePausedElapsed: 0,    // Total ms spent paused in current phase
    isPaused: false,
    pauseStartTime: null,     // Wall-clock ms when pause started (null if not paused)
    isRunning: false,
    useCorsProxy: false,
    completed: 0,
    upsolveCount: 0,
    sessionStarted: false,
    problemResults: [],       // Track results per problem
    // Sync
    apiSyncEnabled: true,
    _syncTimeout: null,
    _periodicSyncId: null,
    _consecutiveFailures: 0,
    _lastKnownSavedAt: null,
    animFrameId: null
};

let audioCtx = null;

function $(sel) { return document.querySelector(sel); }
function showEl(el) { if (typeof el === 'string') el = $(el); if (el) el.classList.remove('hidden'); }
function hideEl(el) { if (typeof el === 'string') el = $(el); if (el) el.classList.add('hidden'); }

// ===== Theme =====
function initTheme() {
    const saved = localStorage.getItem('cf_picker_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cf_picker_theme', next);
}

// ===== Toast System =====
function showToast(message, type = 'info') {
    const container = $('#toastContainer');
    if (!container) return;
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

// ===== Sync Status =====
function updateSyncStatus(status, text) {
    const syncEl = $('#syncStatus');
    if (!syncEl) return;
    const syncText = syncEl.querySelector('.sync-text');
    syncEl.className = 'sync-status ' + status;
    if (syncText) syncText.textContent = text;
}

// ===== Audio alarm =====
function playAlarm() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [880, 1100, 880, 1100, 880];
        let t = audioCtx.currentTime;
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.3, t + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.2 + 0.18);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(t + i * 0.2);
            osc.stop(t + i * 0.2 + 0.2);
        });
    } catch (e) {
        console.warn('Audio not available:', e);
    }
}

// ===== API Sync =====
function debouncedSync() {
    if (state._syncTimeout) clearTimeout(state._syncTimeout);
    state._syncTimeout = setTimeout(() => syncToAPI(), 1500);
}

async function syncToAPI() {
    saveToLocalStorage();

    if (!state.handle) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
        updateSyncStatus('error', 'Not logged in');
        return;
    }

    updateSyncStatus('syncing', 'Syncing...');

    try {
        let activePractice = null;
        if (state.sessionStarted && state.problems.length > 0) {
            activePractice = buildActivePracticePayload();
        }

        const body = {
            cfHandle: state.handle,
            activePractice,
            lastSyncTime: new Date().toISOString()
        };
        if (state._lastKnownSavedAt) {
            body.lastKnownSavedAt = state._lastKnownSavedAt;
        }

        const response = await fetch(`${PRACTICE_API}/practice/data`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            updateSyncStatus('error', 'Local only');
            return;
        }

        const result = await response.json();

        if (result.conflict) {
            state._lastKnownSavedAt = result.savedAt || null;
            applyRemoteState(result);
            updateSyncStatus('synced', 'Cloud \u2601 (synced)');
            return;
        }

        state.apiSyncEnabled = true;
        state._consecutiveFailures = 0;
        if (result.savedAt) state._lastKnownSavedAt = result.savedAt;
        updateSyncStatus('synced', 'Cloud \u2601');
    } catch (error) {
        console.warn('Sync error:', error.message);
        state._consecutiveFailures = (state._consecutiveFailures || 0) + 1;
        updateSyncStatus('error', 'Offline');
    }
}

function buildActivePracticePayload() {
    return {
        problems: state.problems,
        handle: state.handle,
        currentProblemIndex: state.currentProblemIndex,
        currentPhase: state.currentPhase,
        phaseStartTime: state.phaseStartTime,
        phasePausedElapsed: state.phasePausedElapsed,
        isPaused: state.isPaused,
        pauseStartTime: state.pauseStartTime,
        isRunning: state.isRunning,
        sessionStarted: state.sessionStarted,
        completed: state.completed,
        upsolveCount: state.upsolveCount,
        problemResults: state.problemResults
    };
}

function saveToLocalStorage() {
    try {
        const data = {
            problems: state.problems,
            handle: state.handle,
            currentProblemIndex: state.currentProblemIndex,
            currentPhase: state.currentPhase,
            phaseStartTime: state.phaseStartTime,
            phasePausedElapsed: state.phasePausedElapsed,
            isPaused: state.isPaused,
            pauseStartTime: state.pauseStartTime,
            isRunning: state.isRunning,
            sessionStarted: state.sessionStarted,
            completed: state.completed,
            upsolveCount: state.upsolveCount,
            problemResults: state.problemResults,
            timestamp: Date.now()
        };
        localStorage.setItem('cf_practice_data', JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save to localStorage:', e);
    }
}

async function syncNow() {
    saveToLocalStorage();

    if (!state.handle) return;

    const token = localStorage.getItem('authToken');
    if (!token) return;

    updateSyncStatus('syncing', 'Saving...');
    try {
        let activePractice = null;
        if (state.sessionStarted && state.problems.length > 0) {
            activePractice = buildActivePracticePayload();
        }
        const response = await fetch(`${PRACTICE_API}/practice/data`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                cfHandle: state.handle,
                activePractice,
                lastSyncTime: new Date().toISOString()
            })
        });
        if (response.ok) {
            const result = await response.json();
            state.apiSyncEnabled = true;
            state._consecutiveFailures = 0;
            if (result.savedAt) state._lastKnownSavedAt = result.savedAt;
            updateSyncStatus('synced', 'Cloud \u2601');
        } else {
            updateSyncStatus('error', 'Save failed');
        }
    } catch (err) {
        console.warn('syncNow error:', err.message);
        state._consecutiveFailures = (state._consecutiveFailures || 0) + 1;
        updateSyncStatus('error', 'Offline');
    }
}

function startPeriodicSync() {
    if (state._periodicSyncId) clearInterval(state._periodicSyncId);
    state._periodicSyncId = setInterval(() => {
        if (state.sessionStarted) {
            syncToAPI();
        }
    }, 30000);
}

function stopPeriodicSync() {
    if (state._periodicSyncId) {
        clearInterval(state._periodicSyncId);
        state._periodicSyncId = null;
    }
}

function applyRemoteState(serverData) {
    const ap = serverData.activePractice;
    if (!ap || !ap.problems || ap.problems.length === 0) return;

    const wasPaused = state.isPaused;
    const wasRunning = state.isRunning;

    state.problems = ap.problems;
    state.handle = ap.handle || serverData.cfHandle || state.handle;
    state.currentProblemIndex = ap.currentProblemIndex || 0;
    state.currentPhase = ap.currentPhase || 0;
    state.phaseStartTime = ap.phaseStartTime;
    state.phasePausedElapsed = ap.phasePausedElapsed || 0;
    state.isPaused = ap.isPaused || false;
    state.pauseStartTime = ap.pauseStartTime;
    state.isRunning = ap.isRunning || false;
    state.sessionStarted = ap.sessionStarted || false;
    state.completed = ap.completed || 0;
    state.upsolveCount = ap.upsolveCount || 0;
    state.problemResults = ap.problemResults || [];

    saveToLocalStorage();

    if (state.currentProblemIndex >= state.problems.length) {
        showSessionComplete();
        return;
    }

    loadCurrentProblem();

    // Reconcile timer UI with the remote state
    if (state.isRunning && !state.isPaused) {
        // Remote says running — make sure animation loop is going
        updateControlUI();
        updateTimerUI();
        startAnimationLoop();
    } else if (state.isPaused) {
        // Remote says paused — stop any local animation
        cancelAnimationFrame(state.animFrameId);
        updateControlUI();
        updateTimerUI();
        if (!wasPaused && wasRunning) {
            showToast('Paused from another device', 'info');
        }
    } else if (!state.isRunning) {
        cancelAnimationFrame(state.animFrameId);
        updateControlUI();
        if (state.sessionStarted) {
            hideEl('#timerSection');
            showEl('#postTimer');
        }
    }
}

async function loadFromAPI(handle) {
    const token = localStorage.getItem('authToken');
    if (!token) {
        updateSyncStatus('error', 'Not logged in');
        return null;
    }
    try {
        let url = `${PRACTICE_API}/practice/data`;
        if (handle) url += `?handle=${encodeURIComponent(handle)}`;
        const response = await fetch(url, { headers: getAuthHeaders() });

        if (!response.ok) throw new Error(`API returned ${response.status}`);

        const data = await response.json();
        state.apiSyncEnabled = true;
        state._consecutiveFailures = 0;
        if (data.savedAt) state._lastKnownSavedAt = data.savedAt;
        updateSyncStatus('synced', 'Cloud \u2601');
        return data;
    } catch (error) {
        console.warn('Failed to load from API:', error.message);
        updateSyncStatus('error', 'Offline');
        return null;
    }
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    $('#themeToggle').addEventListener('click', toggleTheme);
    setupKeyboardShortcuts();

    const handleInput = $('#handleInput');
    if (handleInput) {
        handleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loadWithHandle();
        });
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        state.apiSyncEnabled = false;
        updateSyncStatus('error', 'Not logged in');
    }

    // Gather handle from all local sources
    const raw = localStorage.getItem('cf_practice_data');
    let localData = null;
    if (raw) {
        try {
            localData = JSON.parse(raw);
            state.handle = localData.handle || '';
        } catch (e) {
            console.error('Failed to parse local practice data:', e);
        }
    }
    if (!state.handle) {
        state.handle = localStorage.getItem('cf_upsolve_handle')
            || localStorage.getItem('lastUser')
            || '';
    }

    $('#handleDisplay').textContent = state.handle ? `@${state.handle}` : '';

    // --- Try to load from API (with handle if known, without for cross-device) ---
    let apiData = null;
    if (token) {
        apiData = await loadFromAPI(state.handle || '');
    }

    if (tryRestoreFromAPI(apiData)) {
        startPeriodicSync();
        return;
    }

    // --- Fall back to localStorage ---
    if (tryRestoreFromLocal(localData)) {
        startPeriodicSync();
        return;
    }

    // No data at all — show empty state with handle input for cross-device
    showEl('#emptyState');
});

function tryRestoreFromAPI(apiData) {
    if (!apiData || !apiData.activePractice
        || !apiData.activePractice.problems
        || apiData.activePractice.problems.length === 0) {
        return false;
    }

    const ap = apiData.activePractice;
    state.problems = ap.problems;
    state.handle = ap.handle || apiData.cfHandle || state.handle;
    state.currentProblemIndex = ap.currentProblemIndex || 0;
    state.currentPhase = ap.currentPhase || 0;
    state.phaseStartTime = ap.phaseStartTime;
    state.phasePausedElapsed = ap.phasePausedElapsed || 0;
    state.isPaused = ap.isPaused || false;
    state.pauseStartTime = ap.pauseStartTime;
    state.isRunning = ap.isRunning || false;
    state.sessionStarted = ap.sessionStarted || false;
    state.completed = ap.completed || 0;
    state.upsolveCount = ap.upsolveCount || 0;
    state.problemResults = ap.problemResults || [];

    // Persist handle locally so future loads on this device are faster
    if (state.handle) {
        localStorage.setItem('cf_upsolve_handle', state.handle);
    }
    localStorage.removeItem('cf_practice_data');

    $('#handleDisplay').textContent = state.handle ? `@${state.handle}` : '';
    $('#totalCount').textContent = state.problems.length;
    hideEl('#emptyState');
    showEl('#practiceArea');
    showEl('#restoreBanner');
    showToast('Practice session restored from cloud!', 'success');
    restoreSession();
    return true;
}

function tryRestoreFromLocal(localData) {
    if (!localData || !localData.problems || localData.problems.length === 0) {
        return false;
    }

    state.problems = localData.problems;
    state.handle = localData.handle || '';
    state.currentProblemIndex = localData.currentProblemIndex || 0;
    state.currentPhase = localData.currentPhase || 0;
    state.phaseStartTime = localData.phaseStartTime || null;
    state.phasePausedElapsed = localData.phasePausedElapsed || 0;
    state.isPaused = localData.isPaused || false;
    state.pauseStartTime = localData.pauseStartTime || null;
    state.isRunning = localData.isRunning || false;
    state.sessionStarted = localData.sessionStarted || false;
    state.completed = localData.completed || 0;
    state.upsolveCount = localData.upsolveCount || 0;
    state.problemResults = localData.problemResults || [];

    $('#handleDisplay').textContent = state.handle ? `@${state.handle}` : '';
    $('#totalCount').textContent = state.problems.length;
    hideEl('#emptyState');
    showEl('#practiceArea');

    if (state.sessionStarted && state.phaseStartTime) {
        showEl('#restoreBanner');
        showToast('Practice session restored from local storage', 'info');
        restoreSession();
    } else {
        loadCurrentProblem();
    }
    return true;
}

function restoreSession() {
    if (state.currentProblemIndex >= state.problems.length) {
        showSessionComplete();
        return;
    }

    // If was paused, account for time since page was closed while paused
    if (state.isPaused && state.pauseStartTime) {
        // Pause time already accumulated, pauseStartTime is when pause began
        // We keep it as-is; elapsed will be computed correctly
    }

    // If was running (not paused), check if the phase has expired
    if (state.isRunning && !state.isPaused && state.phaseStartTime) {
        const elapsed = getPhaseElapsedMs();
        const phaseDurationMs = CONFIG.PHASES[state.currentPhase].duration * 1000;

        if (elapsed >= phaseDurationMs) {
            // Phase expired while we were away — handle phase transitions
            handleMissedPhaseTransitions();
            return;
        }
    }

    loadCurrentProblem();

    // Restore timer visual state
    if (state.sessionStarted && state.isRunning) {
        updateControlUI();
        updateTimerUI();

        if (!state.isPaused) {
            startAnimationLoop();
        }
    }
}

function handleMissedPhaseTransitions() {
    // Walk through phases that may have elapsed while page was closed
    while (state.currentPhase < CONFIG.PHASES.length) {
        const elapsed = getPhaseElapsedMs();
        const phaseDurationMs = CONFIG.PHASES[state.currentPhase].duration * 1000;

        if (elapsed >= phaseDurationMs) {
            if (state.currentPhase < CONFIG.PHASES.length - 1) {
                // Move to next phase
                const overshoot = elapsed - phaseDurationMs;
                state.currentPhase++;
                state.phaseStartTime = Date.now() - overshoot;
                state.phasePausedElapsed = 0;
            } else {
                // All phases done
                state.isRunning = false;
                loadCurrentProblem();
                hideEl('#timerSection');
                showEl('#postTimer');
                debouncedSync();
                return;
            }
        } else {
            break;
        }
    }

    loadCurrentProblem();
    updateControlUI();
    updateTimerUI();
    startAnimationLoop();
}

// ===== Timer Computation (server-timestamp based) =====
function getPhaseElapsedMs() {
    if (!state.phaseStartTime) return 0;

    let pausedMs = state.phasePausedElapsed || 0;
    if (state.isPaused && state.pauseStartTime) {
        pausedMs += (Date.now() - state.pauseStartTime);
    }

    return Date.now() - state.phaseStartTime - pausedMs;
}

function getTimeRemainingSeconds() {
    const phaseDurationMs = CONFIG.PHASES[state.currentPhase].duration * 1000;
    const elapsed = getPhaseElapsedMs();
    return Math.max(0, Math.ceil((phaseDurationMs - elapsed) / 1000));
}

// ===== Problem Loading =====
function loadCurrentProblem() {
    if (state.currentProblemIndex >= state.problems.length) {
        showSessionComplete();
        return;
    }

    const p = state.problems[state.currentProblemIndex];
    $('#currentIndex').textContent = state.currentProblemIndex + 1;
    $('#problemName').textContent = `${p.contestId}${p.index} - ${p.name}`;
    $('#problemLink').href = p.url;
    $('#problemRating').textContent = p.rating || '?';
    $('#problemRating').className = 'problem-rating ' + getRatingClass(p.rating);

    const tagsEl = $('#problemTags');
    tagsEl.innerHTML = (p.tags || []).map(t => `<span class="tag-chip">${t}</span>`).join('');

    const pct = Math.round((state.currentProblemIndex / state.problems.length) * 100);
    $('#progressPct').textContent = pct + '%';
    $('#sessionProgress').style.width = pct + '%';

    if (!state.sessionStarted || !state.isRunning) {
        resetTimerUI();
    }

    hideEl('#postTimer');
    hideEl('#sessionComplete');
    showEl('#timerSection');
    showEl('#problemCard');
    hideEl('#submissionStatus');
    hideEl('#restoreBanner');
    renderQueue();
}

function getRatingClass(rating) {
    if (!rating) return '';
    if (rating < 1200) return 'rating-gray';
    if (rating < 1400) return 'rating-green';
    if (rating < 1600) return 'rating-cyan';
    if (rating < 1900) return 'rating-blue';
    if (rating < 2100) return 'rating-violet';
    if (rating < 2400) return 'rating-orange';
    return 'rating-red';
}

function renderQueue() {
    const list = $('#queueList');
    const remaining = state.problems.slice(state.currentProblemIndex + 1);
    if (remaining.length === 0) {
        list.innerHTML = '<div class="queue-empty">No more problems in queue</div>';
        return;
    }
    list.innerHTML = remaining.map((p, i) => {
        const idx = state.currentProblemIndex + 1 + i + 1;
        return `<div class="queue-item">
            <span class="queue-num">${idx}</span>
            <span class="queue-name">${p.contestId}${p.index} - ${p.name}</span>
            <span class="queue-rating ${getRatingClass(p.rating)}">${p.rating || '?'}</span>
        </div>`;
    }).join('');
}

// ===== Timer =====
function resetTimerUI() {
    cancelAnimationFrame(state.animFrameId);
    state.currentPhase = 0;
    state.isRunning = false;
    state.isPaused = false;
    state.sessionStarted = false;
    state.phaseStartTime = null;
    state.phasePausedElapsed = 0;
    state.pauseStartTime = null;

    const phase = CONFIG.PHASES[0];
    const mins = Math.floor(phase.duration / 60);
    const secs = phase.duration % 60;
    $('#timerTime').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    $('#timerPhase').textContent = phase.name;
    $('#timerRingProgress').style.strokeDashoffset = '0';

    $('#startPauseText').textContent = 'Start';
    showEl('.icon-play');
    hideEl('.icon-pause');
    $('#phaseBadge').textContent = 'Ready';
    $('#phaseBadge').className = 'problem-phase-badge';
    $('#problemCard').className = 'problem-card';

    const section = $('#timerSection');
    section.className = 'timer-section';
}

function toggleTimer() {
    if (!state.isRunning) {
        startTimer();
    } else if (state.isPaused) {
        resumeTimer();
    } else {
        pauseTimer();
    }
}

function startTimer() {
    if (!state.sessionStarted) {
        state.sessionStarted = true;
        state.currentPhase = 0;
        state.phaseStartTime = Date.now();
        state.phasePausedElapsed = 0;
        state.pauseStartTime = null;
    }
    state.isRunning = true;
    state.isPaused = false;
    updateControlUI();
    startAnimationLoop();
    startPeriodicSync();
    syncNow();
}

function pauseTimer() {
    state.isPaused = true;
    state.pauseStartTime = Date.now();
    cancelAnimationFrame(state.animFrameId);
    updateControlUI();
    syncNow();
    showToast('Timer paused', 'warning');
}

function resumeTimer() {
    if (state.pauseStartTime) {
        state.phasePausedElapsed += (Date.now() - state.pauseStartTime);
    }
    state.isPaused = false;
    state.pauseStartTime = null;
    updateControlUI();
    startAnimationLoop();
    syncNow();
    showToast('Timer resumed', 'success');
}

function updateControlUI() {
    const section = $('#timerSection');
    if (state.isRunning && !state.isPaused) {
        $('#startPauseText').textContent = 'Pause';
        hideEl('.icon-play');
        showEl('.icon-pause');
        section.classList.add('running');
    } else {
        $('#startPauseText').textContent = state.isPaused ? 'Resume' : 'Start';
        showEl('.icon-play');
        hideEl('.icon-pause');
        section.classList.remove('running');
    }
}

// ===== Animation Frame Loop (replaces setInterval) =====
function startAnimationLoop() {
    cancelAnimationFrame(state.animFrameId);

    function tick() {
        const remaining = getTimeRemainingSeconds();
        updateTimerUI();

        if (remaining <= 0) {
            onPhaseEnd();
            return;
        }

        state.animFrameId = requestAnimationFrame(tick);
    }

    state.animFrameId = requestAnimationFrame(tick);
}

function updateTimerUI() {
    const phase = CONFIG.PHASES[state.currentPhase];
    const remaining = getTimeRemainingSeconds();
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    $('#timerTime').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    $('#timerPhase').textContent = phase.name;

    const progress = 1 - (remaining / phase.duration);
    const offset = CONFIG.RING_CIRCUMFERENCE * progress;
    const ring = $('#timerRingProgress');
    ring.style.strokeDashoffset = offset;

    const gradIds = ['url(#ringGradSolve)', 'url(#ringGradTutorial)', 'url(#ringGradFinal)'];
    ring.setAttribute('stroke', gradIds[state.currentPhase] || gradIds[0]);

    const bg = ring.previousElementSibling;
    bg.style.stroke = phase.color + '22';

    const section = $('#timerSection');
    section.className = 'timer-section ' + phase.cssClass;
    if (state.isRunning && !state.isPaused) section.classList.add('running');

    const dots = document.querySelectorAll('.phase-dot');
    dots.forEach((dot, i) => {
        dot.classList.remove('active', 'completed');
        if (i === state.currentPhase) dot.classList.add('active');
        else if (i < state.currentPhase) dot.classList.add('completed');
    });

    $('#phaseBadge').textContent = phase.name;
    $('#phaseBadge').className = 'problem-phase-badge ' + phase.cssClass;
    $('#problemCard').className = 'problem-card ' + phase.cssClass;
}

function onPhaseEnd() {
    cancelAnimationFrame(state.animFrameId);
    playAlarm();
    const phase = CONFIG.PHASES[state.currentPhase];

    if (state.currentPhase < CONFIG.PHASES.length - 1) {
        const nextPhase = CONFIG.PHASES[state.currentPhase + 1];
        showPhaseModal(
            phase.name + ' Complete!',
            `Moving to ${nextPhase.name} (${nextPhase.duration / 60} minutes)`,
            phase.color
        );
        state.currentPhase++;
        state.phaseStartTime = Date.now();
        state.phasePausedElapsed = 0;
        state.pauseStartTime = null;
        updateTimerUI();
        startAnimationLoop();
        debouncedSync();
    } else {
        showPhaseModal(
            'All Phases Complete!',
            'Time to decide: Did you solve it or need to upsolve?',
            '#ef4444'
        );
        state.isRunning = false;
        hideEl('#timerSection');
        showEl('#postTimer');
        debouncedSync();
    }
}

function showPhaseModal(title, text, color) {
    $('#phaseModalTitle').textContent = title;
    $('#phaseModalText').textContent = text;
    const icon = $('#phaseModalIcon');
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" width="48" height="48">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>`;
    $('#phaseModalContent').style.borderTopColor = color;
    showEl('#phaseModal');
}

function dismissPhaseModal() {
    hideEl('#phaseModal');
}

// ===== Submission check =====
async function checkSubmission() {
    const p = state.problems[state.currentProblemIndex];
    const statusEl = $('#submissionStatus');
    const iconEl = $('#statusIcon');
    const textEl = $('#statusText');

    showEl(statusEl);
    textEl.textContent = 'Checking...';
    iconEl.textContent = '';
    statusEl.className = 'submission-status checking';

    try {
        let url = `${CONFIG.API_BASE}/user.status?handle=${encodeURIComponent(state.handle)}&from=1&count=30`;
        if (state.useCorsProxy) url = CONFIG.CORS_PROXY + encodeURIComponent(url);

        const resp = await fetch(url);
        const data = await resp.json();

        if (data.status !== 'OK') throw new Error(data.comment || 'API error');

        const accepted = data.result.some(sub =>
            sub.problem && sub.problem.contestId === p.contestId &&
            sub.problem.index === p.index && sub.verdict === 'OK'
        );

        if (accepted) {
            statusEl.className = 'submission-status accepted';
            iconEl.textContent = '\u2714';
            textEl.textContent = 'Accepted!';
        } else {
            statusEl.className = 'submission-status not-solved';
            iconEl.textContent = '\u2718';
            textEl.textContent = 'Not solved yet';
        }
    } catch (err) {
        if (err.message.includes('Failed to fetch') && !state.useCorsProxy) {
            state.useCorsProxy = true;
            return checkSubmission();
        }
        statusEl.className = 'submission-status error';
        iconEl.textContent = '!';
        textEl.textContent = 'Error: ' + err.message;
    }
}

async function markCompleted() {
    const p = state.problems[state.currentProblemIndex];

    try {
        let url = `${CONFIG.API_BASE}/user.status?handle=${encodeURIComponent(state.handle)}&from=1&count=30`;
        if (state.useCorsProxy) url = CONFIG.CORS_PROXY + encodeURIComponent(url);

        const resp = await fetch(url);
        const data = await resp.json();

        if (data.status === 'OK') {
            const accepted = data.result.some(sub =>
                sub.problem && sub.problem.contestId === p.contestId &&
                sub.problem.index === p.index && sub.verdict === 'OK'
            );
            if (!accepted) {
                const statusEl = $('#submissionStatus');
                showEl(statusEl);
                statusEl.className = 'submission-status not-solved';
                $('#statusIcon').textContent = '\u2718';
                $('#statusText').textContent = 'Not accepted on Codeforces yet! Solve it first or click Upsolve.';
                showEl('#postTimer');
                return;
            }
        }
    } catch (e) {
        console.warn('Could not verify, proceeding anyway:', e);
    }

    state.completed++;
    state.problemResults.push({ contestId: p.contestId, index: p.index, result: 'completed' });
    advanceToNext();
}

async function markUpsolve() {
    const p = state.problems[state.currentProblemIndex];

    try {
        const headers = getAuthHeaders();
        await fetch(`${PRACTICE_API}/upsolve-data`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                action: 'add_todo',
                handle: state.handle,
                problem: {
                    contestId: p.contestId,
                    index: p.index,
                    name: p.name,
                    rating: p.rating,
                    url: p.url,
                    addedAt: new Date().toISOString()
                }
            })
        });
    } catch (e) {
        console.warn('Could not save upsolve to server, saving locally:', e);
        const local = JSON.parse(localStorage.getItem('cf_upsolve_todo') || '[]');
        local.push({ contestId: p.contestId, index: p.index, name: p.name, rating: p.rating, url: p.url, addedAt: new Date().toISOString() });
        localStorage.setItem('cf_upsolve_todo', JSON.stringify(local));
    }

    state.upsolveCount++;
    state.problemResults.push({ contestId: p.contestId, index: p.index, result: 'upsolve' });
    advanceToNext();
}

function advanceToNext() {
    cancelAnimationFrame(state.animFrameId);
    state.currentProblemIndex++;

    if (state.currentProblemIndex >= state.problems.length) {
        showSessionComplete();
    } else {
        state.currentPhase = 0;
        state.isRunning = false;
        state.isPaused = false;
        state.sessionStarted = false;
        state.phaseStartTime = null;
        state.phasePausedElapsed = 0;
        state.pauseStartTime = null;
        loadCurrentProblem();
        syncNow();
    }
}

function showSessionComplete() {
    cancelAnimationFrame(state.animFrameId);
    stopPeriodicSync();
    hideEl('#problemCard');
    hideEl('#timerSection');
    hideEl('#postTimer');
    hideEl('.queue-section');
    hideEl('#restoreBanner');
    showEl('#sessionComplete');

    const skipped = state.problemResults.filter(r => r.result === 'skipped').length;
    const stats = $('#sessionStats');
    stats.innerHTML = `
        <div class="stat-item"><span class="stat-val">${state.problems.length}</span><span class="stat-lbl">Total</span></div>
        <div class="stat-item completed"><span class="stat-val">${state.completed}</span><span class="stat-lbl">Completed</span></div>
        <div class="stat-item upsolve"><span class="stat-val">${state.upsolveCount}</span><span class="stat-lbl">To Upsolve</span></div>
        ${skipped > 0 ? `<div class="stat-item skipped"><span class="stat-val">${skipped}</span><span class="stat-lbl">Skipped</span></div>` : ''}
    `;

    const pct = 100;
    $('#progressPct').textContent = pct + '%';
    $('#sessionProgress').style.width = pct + '%';

    // Clear session from localStorage and MongoDB
    localStorage.removeItem('cf_practice_data');

    // Clear active practice from MongoDB
    state.sessionStarted = false;
    state.isRunning = false;
    syncNow();
}

// ===== Abandon Session =====
async function abandonSession() {
    if (!confirm('Are you sure you want to abandon this practice session? All progress will be lost.')) {
        return;
    }

    cancelAnimationFrame(state.animFrameId);
    stopPeriodicSync();
    state.problems = [];
    state.currentProblemIndex = 0;
    state.currentPhase = 0;
    state.isRunning = false;
    state.isPaused = false;
    state.sessionStarted = false;
    state.phaseStartTime = null;
    state.phasePausedElapsed = 0;
    state.pauseStartTime = null;
    state.completed = 0;
    state.upsolveCount = 0;
    state.problemResults = [];

    localStorage.removeItem('cf_practice_data');

    // Clear from MongoDB
    await syncNow();

    showToast('Practice session abandoned', 'warning');

    // Redirect back to problem picker
    setTimeout(() => {
        window.location.href = '../';
    }, 500);
}

// ===== Skip Problem =====
function skipProblem() {
    if (!state.sessionStarted && state.currentProblemIndex === 0) {
        showToast('Start the timer first before skipping', 'warning');
        return;
    }
    const p = state.problems[state.currentProblemIndex];
    state.problemResults.push({ contestId: p.contestId, index: p.index, result: 'skipped' });
    advanceToNext();
    showToast('Problem skipped', 'info');
}

// ===== Resume Banner =====
function dismissRestoreBanner() {
    hideEl('#restoreBanner');
}

// ===== Keyboard Shortcuts =====
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                if (state.problems.length > 0) toggleTimer();
                break;
            case 'KeyS':
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    if (state.sessionStarted) skipProblem();
                }
                break;
            case 'KeyC':
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    if (state.sessionStarted) checkSubmission();
                }
                break;
        }
    });
}

// ===== Handle Input (cross-device) =====
async function loadWithHandle() {
    const input = $('#handleInput');
    if (!input) return;
    const handle = input.value.trim();
    if (!handle) {
        showToast('Please enter your Codeforces handle', 'warning');
        return;
    }
    state.handle = handle;
    localStorage.setItem('cf_upsolve_handle', handle);
    $('#handleDisplay').textContent = `@${handle}`;

    const apiData = await loadFromAPI(handle);
    if (tryRestoreFromAPI(apiData)) {
        startPeriodicSync();
        showToast('Session loaded!', 'success');
    } else {
        showToast('No active session found for this handle', 'info');
    }
}

// Globals for onclick handlers
window.toggleTimer = toggleTimer;
window.checkSubmission = checkSubmission;
window.markCompleted = markCompleted;
window.markUpsolve = markUpsolve;
window.dismissPhaseModal = dismissPhaseModal;
window.abandonSession = abandonSession;
window.dismissRestoreBanner = dismissRestoreBanner;
window.skipProblem = skipProblem;
window.loadWithHandle = loadWithHandle;
