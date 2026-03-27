// Upsolve Todo Page
const handle = localStorage.getItem('cf_upsolve_handle')
    || localStorage.getItem('lastUser')
    || '';

function $(sel) { return document.querySelector(sel); }
function showEl(el) { if (typeof el === 'string') el = $(el); if (el) el.classList.remove('hidden'); }
function hideEl(el) { if (typeof el === 'string') el = $(el); if (el) el.classList.add('hidden'); }

function initTheme() {
    const saved = localStorage.getItem('cf_picker_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
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

function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
}

async function loadData() {
    try {
        const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';
        const resp = await fetch(`${apiBase}/api/upsolve-data?handle=${encodeURIComponent(handle)}`, {
            headers: getAuthHeaders()
        });
        const data = await resp.json();
        hideEl('#loadingState');
        renderProblems(data.todo || []);
    } catch (e) {
        console.warn('API failed, trying localStorage:', e);
        hideEl('#loadingState');
        const local = JSON.parse(localStorage.getItem('cf_upsolve_todo') || '[]');
        renderProblems(local);
    }
}

function renderProblems(problems) {
    $('#countBadge').textContent = problems.length;

    if (problems.length === 0) {
        showEl('#emptyState');
        hideEl('#problemsList');
        return;
    }

    hideEl('#emptyState');
    showEl('#problemsList');

    const list = $('#problemsList');
    list.innerHTML = problems.map(p => {
        const date = p.addedAt ? new Date(p.addedAt).toLocaleDateString() : '';
        return `<div class="problem-item" data-contest="${p.contestId}" data-index="${p.index}">
            <div class="problem-info">
                <div class="problem-title-row">
                    <a href="${p.url}" target="_blank" rel="noopener" class="problem-title">${p.contestId}${p.index} - ${p.name}</a>
                    <span class="problem-rating ${getRatingClass(p.rating)}">${p.rating || '?'}</span>
                </div>
                <div class="problem-meta">
                    <span class="meta-date">Added: ${date}</span>
                </div>
            </div>
            <button class="btn-mark-solved" onclick="markSolved(${p.contestId}, '${p.index}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
                Mark Solved
            </button>
        </div>`;
    }).join('');
}

async function markSolved(contestId, index) {
    const btn = document.querySelector(`[data-contest="${contestId}"][data-index="${index}"] .btn-mark-solved`);
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Saving...';
    }

    try {
        const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';
        await fetch(`${apiBase}/api/upsolve-data`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ action: 'mark_solved', handle, contestId, index })
        });
    } catch (e) {
        console.warn('API failed, updating localStorage:', e);
        let local = JSON.parse(localStorage.getItem('cf_upsolve_todo') || '[]');
        const item = local.find(p => p.contestId === contestId && p.index === index);
        local = local.filter(p => !(p.contestId === contestId && p.index === index));
        localStorage.setItem('cf_upsolve_todo', JSON.stringify(local));
        if (item) {
            const solved = JSON.parse(localStorage.getItem('cf_upsolve_solved') || '[]');
            solved.push({ ...item, solvedAt: new Date().toISOString() });
            localStorage.setItem('cf_upsolve_solved', JSON.stringify(solved));
        }
    }

    loadData();
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    $('#themeToggle').addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('cf_picker_theme', next);
    });
    loadData();
});

window.markSolved = markSolved;
