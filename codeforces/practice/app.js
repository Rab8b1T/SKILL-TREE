// Practice Mode Application
const CONFIG = {
    API_BASE: 'https://codeforces.com/api',
    CORS_PROXY: 'https://corsproxy.io/?',
    PHASES: [
        { name: 'Solve Phase', duration: 30 * 60, color: '#10b981', cssClass: 'phase-solve' },
        { name: 'Tutorial Phase', duration: 15 * 60, color: '#f59e0b', cssClass: 'phase-tutorial' },
        { name: 'Final Attempt', duration: 15 * 60, color: '#ef4444', cssClass: 'phase-final' }
    ],
    RING_CIRCUMFERENCE: 2 * Math.PI * 90 // ~565.48
};

const state = {
    problems: [],
    handle: '',
    currentProblemIndex: 0,
    currentPhase: 0,
    timeRemaining: 0,
    totalPhaseTime: 0,
    timerInterval: null,
    isPaused: false,
    isRunning: false,
    useCorsProxy: false,
    completed: 0,
    upsolveCount: 0,
    sessionStarted: false
};

let audioCtx = null;

function $(sel) { return document.querySelector(sel); }
function showEl(el) { if (typeof el === 'string') el = $(el); if (el) el.classList.remove('hidden'); }
function hideEl(el) { if (typeof el === 'string') el = $(el); if (el) el.classList.add('hidden'); }

// Theme
function initTheme() {
    const saved = localStorage.getItem('cf_picker_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cf_picker_theme', next);
}

// Audio alarm using Web Audio API
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    $('#themeToggle').addEventListener('click', toggleTheme);

    const raw = localStorage.getItem('cf_practice_data');
    if (!raw) {
        showEl('#emptyState');
        return;
    }

    try {
        const data = JSON.parse(raw);
        if (!data.problems || data.problems.length === 0) {
            showEl('#emptyState');
            return;
        }
        state.problems = data.problems;
        state.handle = data.handle || '';
        $('#handleDisplay').textContent = state.handle ? `@${state.handle}` : '';
        $('#totalCount').textContent = state.problems.length;
        hideEl('#emptyState');
        showEl('#practiceArea');
        loadCurrentProblem();
    } catch (e) {
        console.error('Failed to parse practice data:', e);
        showEl('#emptyState');
    }
});

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

    resetTimer();
    hideEl('#postTimer');
    hideEl('#sessionComplete');
    showEl('#timerSection');
    showEl('#problemCard');
    hideEl('#submissionStatus');
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

// Timer
function resetTimer() {
    clearInterval(state.timerInterval);
    state.currentPhase = 0;
    state.isRunning = false;
    state.isPaused = false;
    state.sessionStarted = false;
    setPhaseTime(0);
    updateTimerUI();
    $('#startPauseText').textContent = 'Start';
    showEl('.icon-play');
    hideEl('.icon-pause');
    $('#phaseBadge').textContent = 'Ready';
    $('#phaseBadge').className = 'problem-phase-badge';
    $('#problemCard').className = 'problem-card';
}

function setPhaseTime(phaseIndex) {
    const phase = CONFIG.PHASES[phaseIndex];
    state.totalPhaseTime = phase.duration;
    state.timeRemaining = phase.duration;
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
        setPhaseTime(0);
    }
    state.isRunning = true;
    state.isPaused = false;
    updateControlUI();
    state.timerInterval = setInterval(tick, 1000);
}

function pauseTimer() {
    state.isPaused = true;
    clearInterval(state.timerInterval);
    updateControlUI();
}

function resumeTimer() {
    state.isPaused = false;
    updateControlUI();
    state.timerInterval = setInterval(tick, 1000);
}

function updateControlUI() {
    if (state.isRunning && !state.isPaused) {
        $('#startPauseText').textContent = 'Pause';
        hideEl('.icon-play');
        showEl('.icon-pause');
    } else {
        $('#startPauseText').textContent = state.isPaused ? 'Resume' : 'Start';
        showEl('.icon-play');
        hideEl('.icon-pause');
    }
}

function tick() {
    state.timeRemaining--;
    updateTimerUI();

    if (state.timeRemaining <= 0) {
        clearInterval(state.timerInterval);
        onPhaseEnd();
    }
}

function updateTimerUI() {
    const phase = CONFIG.PHASES[state.currentPhase];
    const mins = Math.floor(Math.abs(state.timeRemaining) / 60);
    const secs = Math.abs(state.timeRemaining) % 60;
    $('#timerTime').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    $('#timerPhase').textContent = phase.name;

    const progress = 1 - (state.timeRemaining / state.totalPhaseTime);
    const offset = CONFIG.RING_CIRCUMFERENCE * progress;
    const ring = $('#timerRingProgress');
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = phase.color;

    const bg = $('#timerRingProgress').previousElementSibling;
    bg.style.stroke = phase.color + '22';

    $('#phaseBadge').textContent = phase.name;
    $('#phaseBadge').className = 'problem-phase-badge ' + phase.cssClass;
    $('#problemCard').className = 'problem-card ' + phase.cssClass;
}

function onPhaseEnd() {
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
        setPhaseTime(state.currentPhase);
        updateTimerUI();
        state.timerInterval = setInterval(tick, 1000);
    } else {
        showPhaseModal(
            'All Phases Complete!',
            'Time to decide: Did you solve it or need to upsolve?',
            '#ef4444'
        );
        state.isRunning = false;
        hideEl('#timerSection');
        showEl('#postTimer');
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

// Submission check
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
    advanceToNext();
}

async function markUpsolve() {
    const p = state.problems[state.currentProblemIndex];

    try {
        const token = localStorage.getItem('authToken');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';
        await fetch(`${apiBase}/api/upsolve-data`, {
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
    advanceToNext();
}

function advanceToNext() {
    state.currentProblemIndex++;
    if (state.currentProblemIndex >= state.problems.length) {
        showSessionComplete();
    } else {
        loadCurrentProblem();
    }
}

function showSessionComplete() {
    hideEl('#problemCard');
    hideEl('#timerSection');
    hideEl('#postTimer');
    hideEl('.queue-section');
    showEl('#sessionComplete');

    const stats = $('#sessionStats');
    stats.innerHTML = `
        <div class="stat-item"><span class="stat-val">${state.problems.length}</span><span class="stat-lbl">Total</span></div>
        <div class="stat-item completed"><span class="stat-val">${state.completed}</span><span class="stat-lbl">Completed</span></div>
        <div class="stat-item upsolve"><span class="stat-val">${state.upsolveCount}</span><span class="stat-lbl">To Upsolve</span></div>
    `;

    const pct = 100;
    $('#progressPct').textContent = pct + '%';
    $('#sessionProgress').style.width = pct + '%';

    localStorage.removeItem('cf_practice_data');
}

// Globals for onclick handlers
window.toggleTimer = toggleTimer;
window.checkSubmission = checkSubmission;
window.markCompleted = markCompleted;
window.markUpsolve = markUpsolve;
window.dismissPhaseModal = dismissPhaseModal;
