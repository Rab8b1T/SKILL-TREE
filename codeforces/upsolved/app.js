// Upsolved History Page
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
        renderProblems(data.solved || []);
    } catch (e) {
        console.warn('API failed, trying localStorage:', e);
        hideEl('#loadingState');
        const local = JSON.parse(localStorage.getItem('cf_upsolve_solved') || '[]');
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

    const sorted = [...problems].sort((a, b) => new Date(b.solvedAt || 0) - new Date(a.solvedAt || 0));

    const list = $('#problemsList');
    list.innerHTML = sorted.map(p => {
        const solvedDate = p.solvedAt ? new Date(p.solvedAt).toLocaleDateString() : '';
        const addedDate = p.addedAt ? new Date(p.addedAt).toLocaleDateString() : '';
        return `<div class="problem-item solved">
            <div class="solved-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="problem-info">
                <div class="problem-title-row">
                    <a href="${p.url}" target="_blank" rel="noopener" class="problem-title">${p.contestId}${p.index} - ${p.name}</a>
                    <span class="problem-rating ${getRatingClass(p.rating)}">${p.rating || '?'}</span>
                </div>
                <div class="problem-meta">
                    <span class="meta-date">Solved: ${solvedDate}</span>
                    ${addedDate ? `<span class="meta-date">Added: ${addedDate}</span>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
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
