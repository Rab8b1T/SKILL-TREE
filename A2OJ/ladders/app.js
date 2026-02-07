// ============================
// A2OJ Ladders - Application
// ============================

const App = (() => {
    const STORAGE_PREFIX = 'a2oj_ladder_';
    const PROBLEMS_PER_PAGE = 50;
    const CF_API = 'https://codeforces.com/api';

    let state = {
        currentTab: 'dashboard',
        currentLadder: null,
        currentGroup: 'all',
        problems: [],
        filteredProblems: [],
        currentPage: 1,
        sortField: 'rating',
        sortDir: 'asc',
        cfHandle: null,
        cfSolvedSet: new Set(),
        cfAttemptedSet: new Set(),
        cfFailedFirstSet: new Set(),
        bookmarks: new Set(),
        notes: {},
        theme: 'dark',
    };

    // ==================== INIT ====================
    function init() {
        loadState();
        buildProblemsList();
        applyTheme();
        if (state.cfHandle) {
            showUserBadge();
            const lastFetch = localStorage.getItem(STORAGE_PREFIX + 'lastFetch');
            if (lastFetch && Date.now() - parseInt(lastFetch) > 30 * 60 * 1000) {
                fetchCFSubmissions(state.cfHandle, true);
            }
        }
        renderDashboard();
        renderLadders();
        renderAttempted();
        renderBookmarks();
        setupKeyboard();
        populateLadderFilter();
    }

    // ==================== PERSISTENCE ====================
    function loadState() {
        state.theme = localStorage.getItem(STORAGE_PREFIX + 'theme') || 'dark';
        state.cfHandle = localStorage.getItem(STORAGE_PREFIX + 'cfHandle') || null;
        state.cfSolvedSet = new Set(JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'cfSolved') || '[]'));
        state.cfAttemptedSet = new Set(JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'cfAttempted') || '[]'));
        state.cfFailedFirstSet = new Set(JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'cfFailed') || '[]'));
        state.bookmarks = new Set(JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'bookmarks') || '[]'));
        state.notes = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'notes') || '{}');
    }

    function saveState() {
        localStorage.setItem(STORAGE_PREFIX + 'theme', state.theme);
        if (state.cfHandle) localStorage.setItem(STORAGE_PREFIX + 'cfHandle', state.cfHandle);
        else localStorage.removeItem(STORAGE_PREFIX + 'cfHandle');
        localStorage.setItem(STORAGE_PREFIX + 'cfSolved', JSON.stringify([...state.cfSolvedSet]));
        localStorage.setItem(STORAGE_PREFIX + 'cfAttempted', JSON.stringify([...state.cfAttemptedSet]));
        localStorage.setItem(STORAGE_PREFIX + 'cfFailed', JSON.stringify([...state.cfFailedFirstSet]));
        localStorage.setItem(STORAGE_PREFIX + 'bookmarks', JSON.stringify([...state.bookmarks]));
        localStorage.setItem(STORAGE_PREFIX + 'notes', JSON.stringify(state.notes));
    }

    // ==================== BUILD ====================
    function buildProblemsList() {
        state.problems = [];
        if (typeof LADDER_DATA === 'undefined') return;
        LADDER_DATA.ladders.forEach(lad => {
            lad.problems.forEach(p => {
                const cfKey = (p.cfContestId && p.cfIndex) ? `${p.cfContestId}-${p.cfIndex}` : null;
                state.problems.push({
                    id: p.id,
                    name: p.name,
                    link: p.link,
                    rating: p.rating || 0,
                    difficulty: p.difficulty || 0,
                    cfContestId: p.cfContestId || null,
                    cfIndex: p.cfIndex || null,
                    cfKey,
                    ladderName: lad.name,
                    ladderSlug: lad.slug,
                    ladderGroup: lad.group,
                    key: `${lad.slug}-${p.id}`
                });
            });
        });
    }

    // ==================== THEME ====================
    function applyTheme() { document.documentElement.setAttribute('data-theme', state.theme); }
    function toggleTheme() { state.theme = state.theme === 'dark' ? 'light' : 'dark'; applyTheme(); saveState(); }

    // ==================== TABS ====================
    function switchTab(tab) {
        state.currentTab = tab;
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
        const tc = document.getElementById('tab-' + tab);
        if (tc) tc.classList.add('active');
        const tb = document.querySelector(`[data-tab="${tab}"]`);
        if (tb) tb.classList.add('active');
        if (tab === 'problems') { state.currentLadder = null; filterProblems(); }
        else if (tab === 'attempted') renderAttempted();
        else if (tab === 'bookmarks') renderBookmarks();
    }

    // ==================== CF API ====================
    function loginCF() {
        const handle = document.getElementById('cfHandle')?.value.trim();
        if (!handle) { showToast('Please enter a Codeforces handle', 'error'); return; }
        showLoading('Connecting to Codeforces...');
        state.cfHandle = handle;
        fetchCFSubmissions(handle, false);
    }

    function refreshCF() {
        if (!state.cfHandle) return;
        showLoading('Refreshing submissions...');
        fetchCFSubmissions(state.cfHandle, true);
    }

    function logoutCF() {
        state.cfHandle = null;
        state.cfSolvedSet.clear();
        state.cfAttemptedSet.clear();
        state.cfFailedFirstSet.clear();
        localStorage.removeItem(STORAGE_PREFIX + 'cfHandle');
        localStorage.removeItem(STORAGE_PREFIX + 'lastFetch');
        saveState();
        const badge = document.getElementById('userBadge');
        const inputGroup = document.getElementById('cfInputGroup');
        const handle = document.getElementById('cfHandle');
        const prompt = document.getElementById('connectPrompt');
        if (badge) badge.classList.add('hidden');
        if (inputGroup) inputGroup.classList.remove('hidden');
        if (handle) handle.value = '';
        if (prompt) prompt.classList.remove('hidden');
        refreshAll();
        showToast('Disconnected', 'info');
    }

    async function fetchCFSubmissions(handle, isRefresh) {
        try {
            const res = await fetch(`${CF_API}/user.status?handle=${encodeURIComponent(handle)}&from=1&count=100000`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.status !== 'OK') throw new Error(data.comment || 'API Error');
            processSubmissions(data.result);
            localStorage.setItem(STORAGE_PREFIX + 'lastFetch', Date.now().toString());
            showUserBadge();
            refreshAll();
            hideLoading();
            showToast(isRefresh ? 'Refreshed!' : `Connected as ${handle}`, 'success');
        } catch (err) {
            hideLoading();
            if (!isRefresh) { state.cfHandle = null; localStorage.removeItem(STORAGE_PREFIX + 'cfHandle'); }
            showToast(`Error: ${err.message}`, 'error');
        }
    }

    function processSubmissions(submissions) {
        state.cfSolvedSet.clear();
        state.cfAttemptedSet.clear();
        state.cfFailedFirstSet.clear();
        const pm = {};
        const sorted = [...submissions].sort((a, b) => a.creationTimeSeconds - b.creationTimeSeconds);
        for (const sub of sorted) {
            if (!sub.problem || sub.problem.contestId == null || !sub.problem.index) continue;
            const key = `${sub.problem.contestId}-${sub.problem.index}`;
            if (!pm[key]) pm[key] = { accepted: false, hasWrong: false, firstIsWrong: false, firstSeen: false };
            const p = pm[key];
            if (!p.firstSeen) { p.firstSeen = true; if (sub.verdict !== 'OK') p.firstIsWrong = true; }
            if (sub.verdict === 'OK') p.accepted = true;
            else if (sub.verdict && sub.verdict !== 'COMPILATION_ERROR' && sub.verdict !== 'TESTING' && sub.verdict !== 'SKIPPED') p.hasWrong = true;
        }
        for (const [key, info] of Object.entries(pm)) {
            if (info.accepted) { state.cfSolvedSet.add(key); if (info.hasWrong || info.firstIsWrong) state.cfFailedFirstSet.add(key); }
            else if (info.hasWrong) { state.cfAttemptedSet.add(key); state.cfFailedFirstSet.add(key); }
        }
        saveState();
    }

    function showUserBadge() {
        const ig = document.getElementById('cfInputGroup');
        const b = document.getElementById('userBadge');
        const n = document.getElementById('userName');
        const p = document.getElementById('connectPrompt');
        if (ig) ig.classList.add('hidden');
        if (b) b.classList.remove('hidden');
        if (n) n.textContent = state.cfHandle;
        if (p) p.classList.add('hidden');
    }

    // ==================== STATUS ====================
    function getStatus(problem) {
        if (!problem.cfKey) return 'unsolved';
        if (state.cfSolvedSet.has(problem.cfKey)) return 'solved';
        if (state.cfAttemptedSet.has(problem.cfKey)) return 'attempted';
        return 'unsolved';
    }
    function hasFailed(problem) { return problem.cfKey ? state.cfFailedFirstSet.has(problem.cfKey) : false; }

    // ==================== DASHBOARD ====================
    function renderDashboard() {
        const all = state.problems;
        let solved = 0, attempted = 0;
        all.forEach(p => { const s = getStatus(p); if (s === 'solved') solved++; else if (s === 'attempted') attempted++; });
        document.getElementById('totalSolved').textContent = solved;
        document.getElementById('totalAttempted').textContent = attempted;
        document.getElementById('totalRemaining').textContent = all.length - solved;
        document.getElementById('totalLadders').textContent = typeof LADDER_DATA !== 'undefined' ? LADDER_DATA.ladders.length : 0;
        const pct = all.length ? ((solved / all.length) * 100).toFixed(1) : 0;
        document.getElementById('overallProgressText').textContent = `${solved} / ${all.length}`;
        document.getElementById('overallProgressFill').style.width = pct + '%';
        renderLadderProgress();
    }

    function renderLadderProgress() {
        const grid = document.getElementById('ladderProgressGrid');
        if (!grid || typeof LADDER_DATA === 'undefined') return;
        grid.innerHTML = '';
        LADDER_DATA.ladders.forEach(lad => {
            const probs = state.problems.filter(p => p.ladderSlug === lad.slug);
            const total = probs.length;
            if (!total) return;
            const solved = probs.filter(p => p.cfKey && state.cfSolvedSet.has(p.cfKey)).length;
            const pct = ((solved / total) * 100).toFixed(1);
            const item = document.createElement('div');
            item.className = 'cat-progress-item';
            item.onclick = () => openLadder(lad.slug);
            item.innerHTML = `<div class="cp-name">${esc(lad.name)}</div>
                <div class="cp-stats"><span>${solved} / ${total}</span><span>${pct}%</span></div>
                <div class="cp-bar"><div class="cp-bar-fill" style="width:${pct}%"></div></div>`;
            grid.appendChild(item);
        });
    }

    // ==================== LADDERS (Categories) ====================
    function renderLadders() {
        const grid = document.getElementById('laddersGrid');
        if (!grid || typeof LADDER_DATA === 'undefined') return;
        grid.innerHTML = '';
        const search = (document.getElementById('ladderSearch')?.value || '').toLowerCase();
        LADDER_DATA.ladders.forEach(lad => {
            if (search && !lad.name.toLowerCase().includes(search)) return;
            if (state.currentGroup !== 'all' && lad.group !== state.currentGroup) return;
            const probs = state.problems.filter(p => p.ladderSlug === lad.slug);
            const total = probs.length;
            const solved = probs.filter(p => p.cfKey && state.cfSolvedSet.has(p.cfKey)).length;
            const attempted = probs.filter(p => p.cfKey && state.cfAttemptedSet.has(p.cfKey)).length;
            const pct = total ? ((solved / total) * 100).toFixed(1) : 0;
            const card = document.createElement('div');
            card.className = 'category-card';
            card.onclick = () => openLadder(lad.slug);
            card.innerHTML = `<div class="cc-title"><span>${esc(lad.name)}</span><span class="cc-badge">${total}</span></div>
                <div class="cc-meta"><span>${solved} solved${attempted > 0 ? `, ${attempted} attempted` : ''}</span><span>${pct}%</span></div>
                <div class="cc-bar"><div class="cc-bar-fill" style="width:${pct}%"></div></div>`;
            grid.appendChild(card);
        });
    }

    function filterLadders() { renderLadders(); }
    function filterGroup(group) {
        state.currentGroup = group;
        document.querySelectorAll('.group-btn').forEach(b => b.classList.toggle('active', b.dataset.group === group));
        renderLadders();
    }

    function openLadder(slug) {
        state.currentLadder = slug;
        state.currentPage = 1;
        switchTab('problems');
        const sel = document.getElementById('ladderFilter');
        if (sel) sel.value = slug;
        filterProblems();
    }

    // ==================== PROBLEMS ====================
    function populateLadderFilter() {
        const sel = document.getElementById('ladderFilter');
        if (!sel || typeof LADDER_DATA === 'undefined') return;
        sel.innerHTML = '<option value="all">All Ladders</option>';
        LADDER_DATA.ladders.forEach(lad => {
            sel.innerHTML += `<option value="${lad.slug}">${esc(lad.name)}</option>`;
        });
    }

    function filterProblems() {
        const search = (document.getElementById('problemSearch')?.value || '').toLowerCase();
        const statusF = document.getElementById('statusFilter')?.value || 'all';
        const ladF = document.getElementById('ladderFilter')?.value || 'all';
        let probs = [...state.problems];
        if (ladF !== 'all') probs = probs.filter(p => p.ladderSlug === ladF);
        if (statusF !== 'all') probs = probs.filter(p => getStatus(p) === statusF);
        if (search) probs = probs.filter(p => p.name.toLowerCase().includes(search) || p.ladderName.toLowerCase().includes(search));
        probs.sort((a, b) => {
            let va, vb;
            if (state.sortField === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
            else { va = a[state.sortField] || 0; vb = b[state.sortField] || 0; }
            if (va < vb) return state.sortDir === 'asc' ? -1 : 1;
            if (va > vb) return state.sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        state.filteredProblems = probs;
        state.currentPage = 1;
        const ladName = ladF !== 'all' ? (LADDER_DATA.ladders.find(l => l.slug === ladF)?.name || 'Ladder') : 'All Problems';
        document.getElementById('problemsTitle').textContent = ladName;
        document.getElementById('problemsCount').textContent = probs.length;
        const backBtn = document.getElementById('backToLadders');
        if (backBtn) backBtn.classList.toggle('hidden', ladF === 'all');
        const solved = probs.filter(p => getStatus(p) === 'solved').length;
        const pct = probs.length ? ((solved / probs.length) * 100).toFixed(1) : 0;
        document.getElementById('filteredProgress').textContent = `${solved} / ${probs.length} solved`;
        document.getElementById('filteredProgressFill').style.width = pct + '%';
        renderProblems();
    }

    function sortProblems(field) {
        if (state.sortField === field) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        else { state.sortField = field; state.sortDir = 'asc'; }
        filterProblems();
    }

    function showAllLadders() {
        state.currentLadder = null;
        const sel = document.getElementById('ladderFilter');
        if (sel) sel.value = 'all';
        filterProblems();
    }

    function renderProblems() {
        const tbody = document.getElementById('problemsBody');
        if (!tbody) return;
        const start = (state.currentPage - 1) * PROBLEMS_PER_PAGE;
        const page = state.filteredProblems.slice(start, start + PROBLEMS_PER_PAGE);
        if (!page.length) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><h3>No problems found</h3><p>Try adjusting your filters</p></div></td></tr>`;
            document.getElementById('pagination').innerHTML = '';
            return;
        }
        tbody.innerHTML = page.map((p, i) => {
            const status = getStatus(p);
            const failed = hasFailed(p);
            const isBookmarked = state.bookmarks.has(p.key);
            const hasNote = !!state.notes[p.key];
            const rowClass = status === 'solved' ? 'row-solved' : status === 'attempted' ? 'row-attempted' : '';
            const ratingDisplay = p.rating || (p.difficulty ? `L${p.difficulty}` : '-');
            const ratingColor = getRatingColor(p.rating);
            return `<tr class="${rowClass}">
                <td class="col-num">${start + i + 1}</td>
                <td class="col-status"><span class="status-dot status-${status}" title="${status}"></span></td>
                <td class="col-name"><a class="problem-link" href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.name)}</a></td>
                <td class="col-diff"><span class="rating-badge" style="background:${ratingColor}">${ratingDisplay}</span></td>
                <td class="col-contest">${esc(p.ladderName)}</td>
                <td class="col-actions">
                    <div class="action-btns">
                        <button class="action-btn ${isBookmarked ? 'bookmarked' : ''}" onclick="App.toggleBookmark('${p.key}')" title="Bookmark">
                            <svg viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                        </button>
                        <button class="action-btn ${hasNote ? 'has-notes' : ''}" onclick="App.openNotes('${p.key}','${esc(p.name)}')" title="Notes">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                    </div>
                </td>
                <td class="col-failed">${failed ? '<span class="failed-mark">&#10007;</span>' : ''}</td>
            </tr>`;
        }).join('');
        renderPagination();
    }

    function getRatingColor(rating) {
        if (!rating) return 'var(--bg-tertiary)';
        if (rating < 1200) return '#808080';
        if (rating < 1400) return '#008000';
        if (rating < 1600) return '#03a89e';
        if (rating < 1900) return '#0000ff';
        if (rating < 2100) return '#aa00aa';
        if (rating < 2400) return '#ff8c00';
        return '#ff0000';
    }

    function renderPagination() {
        const div = document.getElementById('pagination');
        if (!div) return;
        const total = Math.ceil(state.filteredProblems.length / PROBLEMS_PER_PAGE);
        if (total <= 1) { div.innerHTML = ''; return; }
        let html = `<button class="page-btn" ${state.currentPage === 1 ? 'disabled' : ''} onclick="App.goPage(${state.currentPage - 1})">Prev</button>`;
        const range = getPageRange(state.currentPage, total);
        for (const p of range) {
            if (p === '...') html += `<span class="page-btn" style="cursor:default;border:none;">...</span>`;
            else html += `<button class="page-btn ${p === state.currentPage ? 'active' : ''}" onclick="App.goPage(${p})">${p}</button>`;
        }
        html += `<button class="page-btn" ${state.currentPage === total ? 'disabled' : ''} onclick="App.goPage(${state.currentPage + 1})">Next</button>`;
        div.innerHTML = html;
    }

    function getPageRange(c, t) {
        if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
        const p = [1];
        if (c > 3) p.push('...');
        for (let i = Math.max(2, c - 1); i <= Math.min(t - 1, c + 1); i++) p.push(i);
        if (c < t - 2) p.push('...');
        p.push(t);
        return p;
    }

    function goPage(p) {
        const t = Math.ceil(state.filteredProblems.length / PROBLEMS_PER_PAGE);
        if (p < 1 || p > t) return;
        state.currentPage = p;
        renderProblems();
        document.querySelector('.table-wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ==================== ATTEMPTED ====================
    function renderAttempted() {
        const container = document.getElementById('attemptedList');
        const countEl = document.getElementById('attemptedCount');
        if (!container) return;
        const attemptedProblems = state.problems.filter(p => p.cfKey && state.cfAttemptedSet.has(p.cfKey));
        const attemptedFromCF = [];
        state.cfAttemptedSet.forEach(key => {
            if (!state.problems.find(p => p.cfKey === key)) {
                const parts = key.split('-');
                attemptedFromCF.push({ name: `${parts[0]}${parts[1]}`, link: `https://codeforces.com/contest/${parts[0]}/problem/${parts[1]}`, ladderName: 'Unknown', cfKey: key });
            }
        });
        const all = [...attemptedProblems, ...attemptedFromCF];
        if (countEl) countEl.textContent = all.length;
        if (!all.length) {
            container.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><h3>No attempted problems yet</h3><p>Problems with wrong submissions will appear here.</p></div>`;
            return;
        }
        container.innerHTML = all.map(p => `<div class="attempted-card">
            <div class="attempted-info">
                <a class="attempted-name" href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.name)}</a>
                <span class="attempted-meta">${esc(p.ladderName || '')}</span>
            </div>
            <div class="attempted-actions"><a href="${esc(p.link)}" target="_blank" rel="noopener" class="btn-outline" style="padding:6px 14px;font-size:0.8rem;">Retry</a></div>
        </div>`).join('');
    }

    // ==================== BOOKMARKS ====================
    function toggleBookmark(key) {
        if (state.bookmarks.has(key)) state.bookmarks.delete(key); else state.bookmarks.add(key);
        saveState(); renderProblems(); renderBookmarks();
    }

    function renderBookmarks() {
        const container = document.getElementById('bookmarksList');
        if (!container) return;
        const bm = state.problems.filter(p => state.bookmarks.has(p.key));
        if (!bm.length) {
            container.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg><h3>No bookmarks yet</h3><p>Click the bookmark icon on any problem to save it here.</p></div>`;
            return;
        }
        container.innerHTML = bm.map(p => {
            const status = getStatus(p);
            return `<div class="bookmark-item">
                <div class="bookmark-info"><a class="bookmark-name" href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.name)}</a><span class="bookmark-meta">${esc(p.ladderName)} &middot; Rating: ${p.rating || '-'}</span></div>
                <div style="display:flex;gap:8px;align-items:center"><span class="status-dot status-${status}"></span>
                <button class="action-btn" onclick="App.toggleBookmark('${p.key}')" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
            </div>`;
        }).join('');
    }

    // ==================== NOTES ====================
    let currentNotesKey = null;
    function openNotes(key, name) {
        currentNotesKey = key;
        document.getElementById('notesTitle').textContent = `Notes: ${name}`;
        document.getElementById('notesTextarea').value = state.notes[key] || '';
        document.getElementById('notesModal').classList.remove('hidden');
    }
    function closeNotes() { document.getElementById('notesModal').classList.add('hidden'); currentNotesKey = null; }
    function saveNotes() {
        if (!currentNotesKey) return;
        const t = document.getElementById('notesTextarea').value.trim();
        if (t) state.notes[currentNotesKey] = t; else delete state.notes[currentNotesKey];
        saveState(); closeNotes(); renderProblems(); showToast('Notes saved', 'success');
    }

    // ==================== HELPERS ====================
    function refreshAll() { renderDashboard(); renderLadders(); renderAttempted(); renderProblems(); renderBookmarks(); }
    function showToast(msg, type = 'info') {
        const c = document.getElementById('toastContainer');
        const t = document.createElement('div');
        t.className = `toast toast-${type}`; t.textContent = msg; c.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
    }
    function showLoading(msg) { document.getElementById('loadingMessage').textContent = msg; document.getElementById('loadingOverlay').classList.remove('hidden'); }
    function hideLoading() { document.getElementById('loadingOverlay').classList.add('hidden'); }
    function esc(s) { return !s ? '' : s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
    function setupKeyboard() { document.getElementById('cfHandle')?.addEventListener('keydown', e => { if (e.key === 'Enter') loginCF(); }); }

    return {
        init, switchTab, loginCF, refreshCF, logoutCF, toggleTheme,
        filterLadders, filterGroup, filterProblems, sortProblems, goPage, showAllLadders,
        toggleBookmark, openNotes, closeNotes, saveNotes,
    };
})();

document.addEventListener('DOMContentLoaded', App.init);
