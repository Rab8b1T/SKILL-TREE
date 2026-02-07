// ============================
// A2OJ Ladder - Main Application v2
// ============================

const App = (() => {
    // ==================== STATE ====================
    const STORAGE_PREFIX = 'a2oj_';
    const PROBLEMS_PER_PAGE = 50;
    const CF_API = 'https://codeforces.com/api';

    let state = {
        currentTab: 'dashboard',
        currentCategory: null,
        problems: [],
        filteredProblems: [],
        currentPage: 1,
        sortField: 'difficulty',
        sortDir: 'asc',
        cfHandle: null,
        cfSolvedSet: new Set(),
        cfAttemptedSet: new Set(),
        cfFailedFirstSet: new Set(),
        bookmarks: new Set(),
        notes: {},
        playlists: [],
        theme: 'dark',
        showAllPlatforms: false,
    };

    // ==================== INIT ====================
    function init() {
        loadState();
        buildProblemsList();
        applyTheme();
        if (state.cfHandle) {
            showUserBadge();
            // Auto-refresh if last fetch was >30min ago
            const lastFetch = localStorage.getItem(STORAGE_PREFIX + 'lastFetch');
            if (lastFetch && Date.now() - parseInt(lastFetch) > 30 * 60 * 1000) {
                fetchCFSubmissions(state.cfHandle, true);
            }
        }
        renderDashboard();
        renderCategories();
        renderAttempted();
        renderPlaylists();
        renderBookmarks();
        setupKeyboard();
        updatePlatformToggle();
        populateCategoryFilter();
    }

    // ==================== PERSISTENCE ====================
    function loadState() {
        state.theme = localStorage.getItem(STORAGE_PREFIX + 'theme') || 'dark';
        state.cfHandle = localStorage.getItem(STORAGE_PREFIX + 'cfHandle') || null;
        state.showAllPlatforms = localStorage.getItem(STORAGE_PREFIX + 'showAllPlatforms') === 'true';

        const solved = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'cfSolved') || '[]');
        state.cfSolvedSet = new Set(solved);

        const attempted = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'cfAttempted') || '[]');
        state.cfAttemptedSet = new Set(attempted);

        const failed = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'cfFailed') || '[]');
        state.cfFailedFirstSet = new Set(failed);

        const bookmarks = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'bookmarks') || '[]');
        state.bookmarks = new Set(bookmarks);

        state.notes = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'notes') || '{}');
        state.playlists = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'playlists') || '[]');
    }

    function saveState() {
        localStorage.setItem(STORAGE_PREFIX + 'theme', state.theme);
        if (state.cfHandle) localStorage.setItem(STORAGE_PREFIX + 'cfHandle', state.cfHandle);
        else localStorage.removeItem(STORAGE_PREFIX + 'cfHandle');
        localStorage.setItem(STORAGE_PREFIX + 'showAllPlatforms', state.showAllPlatforms.toString());
        localStorage.setItem(STORAGE_PREFIX + 'cfSolved', JSON.stringify([...state.cfSolvedSet]));
        localStorage.setItem(STORAGE_PREFIX + 'cfAttempted', JSON.stringify([...state.cfAttemptedSet]));
        localStorage.setItem(STORAGE_PREFIX + 'cfFailed', JSON.stringify([...state.cfFailedFirstSet]));
        localStorage.setItem(STORAGE_PREFIX + 'bookmarks', JSON.stringify([...state.bookmarks]));
        localStorage.setItem(STORAGE_PREFIX + 'notes', JSON.stringify(state.notes));
        localStorage.setItem(STORAGE_PREFIX + 'playlists', JSON.stringify(state.playlists));
    }

    // ==================== BUILD PROBLEMS LIST ====================
    function buildProblemsList() {
        state.problems = [];
        if (typeof A2OJ_DATA === 'undefined') return;

        A2OJ_DATA.categories.forEach(cat => {
            cat.problems.forEach(p => {
                const cfKey = (p.cfContestId && p.cfIndex) ? `${p.cfContestId}-${p.cfIndex}` : null;
                state.problems.push({
                    id: p.id,
                    name: p.name,
                    link: p.link,
                    platform: p.platform || 'Unknown',
                    difficulty: p.difficulty || 0,
                    contest: p.contest || '',
                    year: p.year || '',
                    cfContestId: p.cfContestId || null,
                    cfIndex: p.cfIndex || null,
                    cfKey,
                    categoryName: cat.name,
                    categorySlug: cat.slug,
                    key: `${cat.slug}-${p.id}`
                });
            });
        });
    }

    // ==================== THEME ====================
    function applyTheme() {
        document.documentElement.setAttribute('data-theme', state.theme);
    }

    function toggleTheme() {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        applyTheme();
        saveState();
    }

    // ==================== TAB SWITCHING ====================
    function switchTab(tab) {
        state.currentTab = tab;
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
        const tabContent = document.getElementById('tab-' + tab);
        if (tabContent) tabContent.classList.add('active');
        const tabBtn = document.querySelector(`[data-tab="${tab}"]`);
        if (tabBtn) tabBtn.classList.add('active');

        if (tab === 'problems') {
            state.currentCategory = null;
            filterProblems();
        } else if (tab === 'attempted') {
            renderAttempted();
        } else if (tab === 'bookmarks') {
            renderBookmarks();
        } else if (tab === 'playlists') {
            renderPlaylists();
        }
    }

    // ==================== CF LOGIN / API ====================
    function loginCF() {
        const input = document.getElementById('cfHandle');
        const handle = input.value.trim();
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
        showToast('Disconnected from Codeforces', 'info');
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
            showToast(isRefresh ? 'Submissions refreshed!' : `Connected as ${handle}`, 'success');
        } catch (err) {
            hideLoading();
            if (!isRefresh) {
                state.cfHandle = null;
                localStorage.removeItem(STORAGE_PREFIX + 'cfHandle');
            }
            showToast(`Error: ${err.message}`, 'error');
        }
    }

    function processSubmissions(submissions) {
        state.cfSolvedSet.clear();
        state.cfAttemptedSet.clear();
        state.cfFailedFirstSet.clear();

        const problemMap = {};
        // Sort chronologically
        const sorted = [...submissions].sort((a, b) => a.creationTimeSeconds - b.creationTimeSeconds);

        for (const sub of sorted) {
            if (!sub.problem || sub.problem.contestId == null || !sub.problem.index) continue;
            const key = `${sub.problem.contestId}-${sub.problem.index}`;

            if (!problemMap[key]) {
                problemMap[key] = { accepted: false, hasWrong: false, firstIsWrong: false, firstSeen: false };
            }

            const p = problemMap[key];
            const verdict = sub.verdict;

            if (!p.firstSeen) {
                p.firstSeen = true;
                if (verdict !== 'OK') p.firstIsWrong = true;
            }

            if (verdict === 'OK') {
                p.accepted = true;
            } else if (verdict && verdict !== 'COMPILATION_ERROR' && verdict !== 'TESTING' && verdict !== 'SKIPPED') {
                p.hasWrong = true;
            }
        }

        for (const [key, info] of Object.entries(problemMap)) {
            if (info.accepted) {
                state.cfSolvedSet.add(key);
                if (info.hasWrong || info.firstIsWrong) {
                    state.cfFailedFirstSet.add(key);
                }
            } else if (info.hasWrong) {
                state.cfAttemptedSet.add(key);
                state.cfFailedFirstSet.add(key);
            }
        }

        saveState();
    }

    function showUserBadge() {
        const inputGroup = document.getElementById('cfInputGroup');
        const badge = document.getElementById('userBadge');
        const name = document.getElementById('userName');
        const prompt = document.getElementById('connectPrompt');
        if (inputGroup) inputGroup.classList.add('hidden');
        if (badge) badge.classList.remove('hidden');
        if (name) name.textContent = state.cfHandle;
        if (prompt) prompt.classList.add('hidden');
    }

    // ==================== STATUS ====================
    function getStatus(problem) {
        if (!problem.cfKey) return 'unsolved';
        if (state.cfSolvedSet.has(problem.cfKey)) return 'solved';
        if (state.cfAttemptedSet.has(problem.cfKey)) return 'attempted';
        return 'unsolved';
    }

    function hasFailed(problem) {
        if (!problem.cfKey) return false;
        return state.cfFailedFirstSet.has(problem.cfKey);
    }

    // ==================== PLATFORM FILTER ====================
    function getVisibleProblems(problems) {
        if (state.showAllPlatforms) return problems;
        return problems.filter(p => p.platform === 'Codeforces');
    }

    function togglePlatforms() {
        state.showAllPlatforms = document.getElementById('showAllPlatforms').checked;
        saveState();
        // Update platform filter dropdown
        const pf = document.getElementById('platformFilter');
        if (state.showAllPlatforms) {
            pf.value = 'all';
        } else {
            pf.value = 'Codeforces';
        }
        filterProblems();
        renderDashboard();
        renderCategories();
        renderAttempted();
    }

    function updatePlatformToggle() {
        const chk = document.getElementById('showAllPlatforms');
        if (chk) chk.checked = state.showAllPlatforms;
        const pf = document.getElementById('platformFilter');
        if (pf && !state.showAllPlatforms) pf.value = 'Codeforces';
    }

    // ==================== DASHBOARD ====================
    function renderDashboard() {
        const allProblems = getVisibleProblems(state.problems);
        let solved = 0, attempted = 0;

        allProblems.forEach(p => {
            const s = getStatus(p);
            if (s === 'solved') solved++;
            else if (s === 'attempted') attempted++;
        });

        document.getElementById('totalSolved').textContent = solved;
        document.getElementById('totalAttempted').textContent = attempted;
        document.getElementById('totalRemaining').textContent = allProblems.length - solved;
        document.getElementById('totalCategories').textContent = typeof A2OJ_DATA !== 'undefined' ? A2OJ_DATA.categories.length : 0;

        // Overall progress
        const pct = allProblems.length ? ((solved / allProblems.length) * 100).toFixed(1) : 0;
        document.getElementById('overallProgressText').textContent = `${solved} / ${allProblems.length}`;
        document.getElementById('overallProgressFill').style.width = pct + '%';

        // Category progress grid
        renderCategoryProgress();
    }

    function renderCategoryProgress() {
        const grid = document.getElementById('categoryProgressGrid');
        if (!grid || typeof A2OJ_DATA === 'undefined') return;
        grid.innerHTML = '';

        A2OJ_DATA.categories.forEach(cat => {
            let catProblems = cat.problems.map(p => {
                const cfKey = (p.cfContestId && p.cfIndex) ? `${p.cfContestId}-${p.cfIndex}` : null;
                return { ...p, cfKey, platform: p.platform || 'Unknown' };
            });
            if (!state.showAllPlatforms) catProblems = catProblems.filter(p => p.platform === 'Codeforces');

            const total = catProblems.length;
            if (total === 0) return;
            const solved = catProblems.filter(p => p.cfKey && state.cfSolvedSet.has(p.cfKey)).length;
            const pct = ((solved / total) * 100).toFixed(1);

            const item = document.createElement('div');
            item.className = 'cat-progress-item';
            item.onclick = () => openCategory(cat.slug);
            item.innerHTML = `
                <div class="cp-name">${escapeHtml(cat.name)}</div>
                <div class="cp-stats">
                    <span>${solved} / ${total} solved</span>
                    <span>${pct}%</span>
                </div>
                <div class="cp-bar"><div class="cp-bar-fill" style="width:${pct}%"></div></div>
            `;
            grid.appendChild(item);
        });
    }

    // ==================== CATEGORIES ====================
    function renderCategories() {
        const grid = document.getElementById('categoriesGrid');
        if (!grid || typeof A2OJ_DATA === 'undefined') return;
        grid.innerHTML = '';
        const search = (document.getElementById('categorySearch')?.value || '').toLowerCase();

        A2OJ_DATA.categories.forEach(cat => {
            if (search && !cat.name.toLowerCase().includes(search)) return;

            let catProblems = cat.problems.map(p => {
                const cfKey = (p.cfContestId && p.cfIndex) ? `${p.cfContestId}-${p.cfIndex}` : null;
                return { ...p, cfKey, platform: p.platform || 'Unknown' };
            });
            if (!state.showAllPlatforms) catProblems = catProblems.filter(p => p.platform === 'Codeforces');
            const total = catProblems.length;
            const solved = catProblems.filter(p => p.cfKey && state.cfSolvedSet.has(p.cfKey)).length;
            const attempted = catProblems.filter(p => p.cfKey && state.cfAttemptedSet.has(p.cfKey)).length;
            const pct = total ? ((solved / total) * 100).toFixed(1) : 0;

            const card = document.createElement('div');
            card.className = 'category-card';
            card.onclick = () => openCategory(cat.slug);
            card.innerHTML = `
                <div class="cc-title">
                    <span>${escapeHtml(cat.name)}</span>
                    <span class="cc-badge">${total}</span>
                </div>
                <div class="cc-meta">
                    <span>${solved} solved${attempted > 0 ? `, ${attempted} attempted` : ''}</span>
                    <span>${pct}%</span>
                </div>
                <div class="cc-bar"><div class="cc-bar-fill" style="width:${pct}%"></div></div>
            `;
            grid.appendChild(card);
        });
    }

    function filterCategories() { renderCategories(); }

    function openCategory(slug) {
        state.currentCategory = slug;
        state.currentPage = 1;
        switchTab('problems');
        document.getElementById('categoryFilter').value = slug;
        filterProblems();
    }

    // ==================== PROBLEMS ====================
    function populateCategoryFilter() {
        const sel = document.getElementById('categoryFilter');
        if (!sel || typeof A2OJ_DATA === 'undefined') return;
        sel.innerHTML = '<option value="all">All Categories</option>';
        A2OJ_DATA.categories.forEach(cat => {
            sel.innerHTML += `<option value="${cat.slug}">${escapeHtml(cat.name)}</option>`;
        });
    }

    function filterProblems() {
        const search = (document.getElementById('problemSearch')?.value || '').toLowerCase();
        const platformF = document.getElementById('platformFilter')?.value || 'all';
        const diffF = document.getElementById('difficultyFilter')?.value || 'all';
        const statusF = document.getElementById('statusFilter')?.value || 'all';
        const catF = document.getElementById('categoryFilter')?.value || 'all';

        let problems = [...state.problems];

        // Platform filter
        if (!state.showAllPlatforms && platformF === 'Codeforces') {
            problems = problems.filter(p => p.platform === 'Codeforces');
        } else if (platformF !== 'all') {
            if (platformF === 'other') {
                problems = problems.filter(p => !['Codeforces', 'SPOJ', 'UVA', 'URI'].includes(p.platform));
            } else {
                problems = problems.filter(p => p.platform === platformF);
            }
        }

        // Category
        if (catF !== 'all') problems = problems.filter(p => p.categorySlug === catF);

        // Difficulty
        if (diffF !== 'all') {
            const d = parseInt(diffF);
            if (d === 5) problems = problems.filter(p => p.difficulty >= 5);
            else problems = problems.filter(p => p.difficulty === d);
        }

        // Status
        if (statusF !== 'all') {
            problems = problems.filter(p => getStatus(p) === statusF);
        }

        // Search
        if (search) {
            problems = problems.filter(p =>
                p.name.toLowerCase().includes(search) ||
                p.contest.toLowerCase().includes(search) ||
                p.categoryName.toLowerCase().includes(search)
            );
        }

        // Sort
        problems.sort((a, b) => {
            let va, vb;
            if (state.sortField === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
            else if (state.sortField === 'difficulty') { va = a.difficulty; vb = b.difficulty; }
            else { va = a[state.sortField]; vb = b[state.sortField]; }
            if (va < vb) return state.sortDir === 'asc' ? -1 : 1;
            if (va > vb) return state.sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        state.filteredProblems = problems;
        state.currentPage = 1;

        // Update title
        const catName = catF !== 'all' ? (typeof A2OJ_DATA !== 'undefined' ? A2OJ_DATA.categories.find(c => c.slug === catF)?.name || 'Category' : 'Category') : 'All Problems';
        document.getElementById('problemsTitle').textContent = catName;
        document.getElementById('problemsCount').textContent = problems.length;

        // Back button
        const backBtn = document.getElementById('backToCategories');
        if (backBtn) {
            backBtn.classList.toggle('hidden', catF === 'all');
        }

        // Progress
        const solved = problems.filter(p => getStatus(p) === 'solved').length;
        const pct = problems.length ? ((solved / problems.length) * 100).toFixed(1) : 0;
        document.getElementById('filteredProgress').textContent = `${solved} / ${problems.length} solved`;
        document.getElementById('filteredProgressFill').style.width = pct + '%';

        renderProblems();
    }

    function sortProblems(field) {
        if (state.sortField === field) {
            state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            state.sortField = field;
            state.sortDir = 'asc';
        }
        filterProblems();
    }

    function showAllCategories() {
        state.currentCategory = null;
        document.getElementById('categoryFilter').value = 'all';
        filterProblems();
    }

    function renderProblems() {
        const tbody = document.getElementById('problemsBody');
        if (!tbody) return;

        const start = (state.currentPage - 1) * PROBLEMS_PER_PAGE;
        const page = state.filteredProblems.slice(start, start + PROBLEMS_PER_PAGE);

        if (page.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-td">
                <div class="empty-state">
                    <h3>No problems found</h3>
                    <p>Try adjusting your filters</p>
                </div>
            </td></tr>`;
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        tbody.innerHTML = page.map((p, i) => {
            const status = getStatus(p);
            const failed = hasFailed(p);
            const isBookmarked = state.bookmarks.has(p.key);
            const hasNote = !!state.notes[p.key];
            const rowClass = status === 'solved' ? 'row-solved' : status === 'attempted' ? 'row-attempted' : '';
            const platformClass = `platform-${p.platform.toLowerCase()}`;
            const diffClass = `diff-${Math.min(p.difficulty || 1, 5)}`;

            return `<tr class="${rowClass}">
                <td class="col-num">${start + i + 1}</td>
                <td class="col-status"><span class="status-dot status-${status}" title="${status}"></span></td>
                <td class="col-name"><a class="problem-link" href="${escapeHtml(p.link)}" target="_blank" rel="noopener">${escapeHtml(p.name)}</a></td>
                <td class="col-platform"><span class="platform-badge ${platformClass}">${escapeHtml(p.platform)}</span></td>
                <td class="col-diff"><span class="diff-badge ${diffClass}">${p.difficulty || '-'}</span></td>
                <td class="col-contest">${escapeHtml(p.contest || '-')}</td>
                <td class="col-actions">
                    <div class="action-btns">
                        <button class="action-btn ${isBookmarked ? 'bookmarked' : ''}" onclick="App.toggleBookmark('${p.key}')" title="Bookmark">
                            <svg viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                        </button>
                        <button class="action-btn ${hasNote ? 'has-notes' : ''}" onclick="App.openNotes('${p.key}','${escapeHtml(p.name)}')" title="Notes">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="action-btn" onclick="App.showAddToPlaylist('${p.key}')" title="Add to playlist">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                    </div>
                </td>
                <td class="col-failed">${failed ? '<span class="failed-mark">&#10007;</span>' : ''}</td>
            </tr>`;
        }).join('');

        renderPagination();
    }

    function renderPagination() {
        const div = document.getElementById('pagination');
        if (!div) return;
        const totalPages = Math.ceil(state.filteredProblems.length / PROBLEMS_PER_PAGE);
        if (totalPages <= 1) { div.innerHTML = ''; return; }

        let html = '';
        html += `<button class="page-btn" ${state.currentPage === 1 ? 'disabled' : ''} onclick="App.goPage(${state.currentPage - 1})">Prev</button>`;

        const range = getPageRange(state.currentPage, totalPages);
        for (const p of range) {
            if (p === '...') {
                html += `<span class="page-btn" style="cursor:default;border:none;">...</span>`;
            } else {
                html += `<button class="page-btn ${p === state.currentPage ? 'active' : ''}" onclick="App.goPage(${p})">${p}</button>`;
            }
        }

        html += `<button class="page-btn" ${state.currentPage === totalPages ? 'disabled' : ''} onclick="App.goPage(${state.currentPage + 1})">Next</button>`;
        div.innerHTML = html;
    }

    function getPageRange(current, total) {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        const pages = [];
        pages.push(1);
        if (current > 3) pages.push('...');
        for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
            pages.push(i);
        }
        if (current < total - 2) pages.push('...');
        pages.push(total);
        return pages;
    }

    function goPage(p) {
        const totalPages = Math.ceil(state.filteredProblems.length / PROBLEMS_PER_PAGE);
        if (p < 1 || p > totalPages) return;
        state.currentPage = p;
        renderProblems();
        document.querySelector('.table-wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ==================== ATTEMPTED TAB ====================
    function renderAttempted() {
        const container = document.getElementById('attemptedList');
        const countEl = document.getElementById('attemptedCount');
        if (!container) return;

        // Find all problems that are in attempted set
        const attemptedProblems = state.problems.filter(p => {
            if (!p.cfKey) return false;
            return state.cfAttemptedSet.has(p.cfKey);
        });

        // Also find attempted problems NOT in our list (from CF submissions directly)
        const attemptedFromCF = [];
        state.cfAttemptedSet.forEach(key => {
            const found = state.problems.find(p => p.cfKey === key);
            if (!found) {
                const parts = key.split('-');
                attemptedFromCF.push({
                    name: `${parts[0]}${parts[1]}`,
                    link: `https://codeforces.com/contest/${parts[0]}/problem/${parts[1]}`,
                    platform: 'Codeforces',
                    category: 'Unknown',
                    cfKey: key
                });
            }
        });

        const allAttempted = [...attemptedProblems, ...attemptedFromCF];
        if (countEl) countEl.textContent = allAttempted.length;

        if (allAttempted.length === 0) {
            container.innerHTML = `<div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                <h3>No attempted problems yet</h3>
                <p>When you submit a wrong answer on Codeforces, those problems will appear here so you can retry them.</p>
            </div>`;
            return;
        }

        container.innerHTML = allAttempted.map(p => {
            const catName = p.categoryName || p.category || '';
            return `<div class="attempted-card">
                <div class="attempted-info">
                    <a class="attempted-name" href="${escapeHtml(p.link)}" target="_blank" rel="noopener">${escapeHtml(p.name)}</a>
                    <span class="attempted-meta">${escapeHtml(catName)} &middot; ${escapeHtml(p.platform)}</span>
                </div>
                <div class="attempted-actions">
                    <a href="${escapeHtml(p.link)}" target="_blank" rel="noopener" class="btn-outline" style="padding:6px 14px;font-size:0.8rem;">Retry</a>
                </div>
            </div>`;
        }).join('');
    }

    // ==================== BOOKMARKS ====================
    function toggleBookmark(key) {
        if (state.bookmarks.has(key)) state.bookmarks.delete(key);
        else state.bookmarks.add(key);
        saveState();
        renderProblems();
        renderBookmarks();
    }

    function renderBookmarks() {
        const container = document.getElementById('bookmarksList');
        if (!container) return;

        const bookmarked = state.problems.filter(p => state.bookmarks.has(p.key));

        if (bookmarked.length === 0) {
            container.innerHTML = `<div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                <h3>No bookmarks yet</h3>
                <p>Click the bookmark icon on any problem to save it here.</p>
            </div>`;
            return;
        }

        container.innerHTML = bookmarked.map(p => {
            const status = getStatus(p);
            return `<div class="bookmark-item">
                <div class="bookmark-info">
                    <a class="bookmark-name" href="${escapeHtml(p.link)}" target="_blank" rel="noopener">${escapeHtml(p.name)}</a>
                    <span class="bookmark-meta">${escapeHtml(p.categoryName)} &middot; ${escapeHtml(p.platform)} &middot; Diff: ${p.difficulty || '-'}</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                    <span class="status-dot status-${status}"></span>
                    <button class="action-btn" onclick="App.toggleBookmark('${p.key}')" title="Remove bookmark">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
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

    function closeNotes() {
        document.getElementById('notesModal').classList.add('hidden');
        currentNotesKey = null;
    }

    function saveNotes() {
        if (!currentNotesKey) return;
        const text = document.getElementById('notesTextarea').value.trim();
        if (text) state.notes[currentNotesKey] = text;
        else delete state.notes[currentNotesKey];
        saveState();
        closeNotes();
        renderProblems();
        showToast('Notes saved', 'success');
    }

    // ==================== PLAYLISTS ====================
    function createPlaylist() {
        document.getElementById('playlistModalTitle').textContent = 'New Playlist';
        document.getElementById('playlistName').value = '';
        document.getElementById('playlistDesc').value = '';
        document.getElementById('playlistModal').classList.remove('hidden');
    }

    function closePlaylistModal() {
        document.getElementById('playlistModal').classList.add('hidden');
    }

    function savePlaylist() {
        const name = document.getElementById('playlistName').value.trim();
        if (!name) { showToast('Playlist name required', 'error'); return; }
        const desc = document.getElementById('playlistDesc').value.trim();
        state.playlists.push({
            id: Date.now().toString(),
            name,
            desc,
            problemKeys: []
        });
        saveState();
        closePlaylistModal();
        renderPlaylists();
        showToast('Playlist created!', 'success');
    }

    function deletePlaylist(id) {
        state.playlists = state.playlists.filter(pl => pl.id !== id);
        saveState();
        renderPlaylists();
    }

    function showAddToPlaylist(problemKey) {
        const container = document.getElementById('playlistOptions');
        if (state.playlists.length === 0) {
            container.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted)">No playlists yet. Create one first!</div>';
        } else {
            container.innerHTML = state.playlists.map(pl => {
                const alreadyIn = pl.problemKeys.includes(problemKey);
                return `<div class="playlist-option" onclick="App.addToPlaylist('${pl.id}','${problemKey}')">
                    <span>${alreadyIn ? '&#10003; ' : ''}${escapeHtml(pl.name)}</span>
                </div>`;
            }).join('');
        }
        document.getElementById('addToPlaylistModal').classList.remove('hidden');
    }

    function closeAddToPlaylist() {
        document.getElementById('addToPlaylistModal').classList.add('hidden');
    }

    function addToPlaylist(playlistId, problemKey) {
        const pl = state.playlists.find(p => p.id === playlistId);
        if (!pl) return;
        if (pl.problemKeys.includes(problemKey)) {
            pl.problemKeys = pl.problemKeys.filter(k => k !== problemKey);
            showToast('Removed from playlist', 'info');
        } else {
            pl.problemKeys.push(problemKey);
            showToast('Added to playlist!', 'success');
        }
        saveState();
        closeAddToPlaylist();
        renderPlaylists();
    }

    function renderPlaylists() {
        const grid = document.getElementById('playlistsGrid');
        if (!grid) return;

        if (state.playlists.length === 0) {
            grid.innerHTML = `<div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                <h3>No playlists yet</h3>
                <p>Create your first custom problem list!</p>
            </div>`;
            return;
        }

        grid.innerHTML = state.playlists.map(pl => {
            const problems = state.problems.filter(p => pl.problemKeys.includes(p.key));
            const solved = problems.filter(p => getStatus(p) === 'solved').length;
            return `<div class="playlist-card">
                <div class="pl-header">
                    <span class="pl-name">${escapeHtml(pl.name)}</span>
                </div>
                ${pl.desc ? `<div class="pl-desc">${escapeHtml(pl.desc)}</div>` : ''}
                <div class="pl-count">${solved} / ${pl.problemKeys.length} solved</div>
                <div class="pl-actions">
                    <button class="btn-outline" style="padding:6px 14px;font-size:0.8rem;" onclick="App.viewPlaylist('${pl.id}')">View</button>
                    <button class="btn-outline" style="padding:6px 14px;font-size:0.8rem;color:var(--danger);border-color:var(--danger);" onclick="App.deletePlaylist('${pl.id}')">Delete</button>
                </div>
            </div>`;
        }).join('');
    }

    function viewPlaylist(id) {
        const pl = state.playlists.find(p => p.id === id);
        if (!pl) return;
        // Switch to problems tab with only playlist problems
        switchTab('problems');
        // Temporarily set filtered problems
        state.filteredProblems = state.problems.filter(p => pl.problemKeys.includes(p.key));
        state.currentPage = 1;
        document.getElementById('problemsTitle').textContent = pl.name;
        document.getElementById('problemsCount').textContent = state.filteredProblems.length;
        const solved = state.filteredProblems.filter(p => getStatus(p) === 'solved').length;
        const pct = state.filteredProblems.length ? ((solved / state.filteredProblems.length) * 100).toFixed(1) : 0;
        document.getElementById('filteredProgress').textContent = `${solved} / ${state.filteredProblems.length} solved`;
        document.getElementById('filteredProgressFill').style.width = pct + '%';
        document.getElementById('backToCategories').classList.remove('hidden');
        renderProblems();
    }

    // ==================== UI HELPERS ====================
    function refreshAll() {
        renderDashboard();
        renderCategories();
        renderAttempted();
        renderProblems();
        renderBookmarks();
        renderPlaylists();
    }

    function showToast(msg, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
    }

    function showLoading(msg) {
        document.getElementById('loadingMessage').textContent = msg;
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    function hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function setupKeyboard() {
        document.getElementById('cfHandle')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') loginCF();
        });
    }

    // ==================== PUBLIC API ====================
    return {
        init,
        switchTab,
        loginCF,
        refreshCF,
        logoutCF,
        toggleTheme,
        togglePlatforms,
        filterCategories,
        filterProblems,
        sortProblems,
        goPage,
        showAllCategories,
        toggleBookmark,
        openNotes,
        closeNotes,
        saveNotes,
        createPlaylist,
        closePlaylistModal,
        savePlaylist,
        deletePlaylist,
        showAddToPlaylist,
        closeAddToPlaylist,
        addToPlaylist,
        viewPlaylist,
    };
})();

document.addEventListener('DOMContentLoaded', App.init);
