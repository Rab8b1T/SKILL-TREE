// =====================================================
// Codeforces Problem Picker - Main Application
// =====================================================

// Configuration
const CONFIG = {
    CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
    API_BASE: 'https://codeforces.com/api',
    CORS_PROXY: 'https://corsproxy.io/?',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    SEGMENT_STEP: 100, // Each segment spans 100 rating points
};

// State
let state = {
    problemset: [],
    solvedProblems: new Set(),
    allTags: new Set(),
    handle: '',
    useCorsProxy: false,
    selectedProblems: [],
    tagFrequency: {},
};

// Presets for rating segments (each segment = 100 rating range)
const PRESETS = {
    beginner: [
        { min: 800, max: 899, count: 2 },
        { min: 900, max: 999, count: 2 },
        { min: 1000, max: 1099, count: 2 },
    ],
    intermediate: [
        { min: 1200, max: 1299, count: 2 },
        { min: 1300, max: 1399, count: 2 },
        { min: 1400, max: 1499, count: 2 },
    ],
    advanced: [
        { min: 1600, max: 1699, count: 2 },
        { min: 1700, max: 1799, count: 2 },
        { min: 1800, max: 1899, count: 2 },
    ],
    mixed: [
        { min: 800, max: 899, count: 1 },
        { min: 1000, max: 1099, count: 1 },
        { min: 1200, max: 1299, count: 2 },
        { min: 1400, max: 1499, count: 1 },
        { min: 1600, max: 1699, count: 1 },
    ],
};

// Initialize with default segment
let segments = [{ min: 800, max: 899, count: 2 }];

// =====================================================
// Utility Functions
// =====================================================

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function showElement(el) {
    if (typeof el === 'string') el = $(el);
    if (el) el.classList.remove('hidden');
}

function hideElement(el) {
    if (typeof el === 'string') el = $(el);
    if (el) el.classList.add('hidden');
}

function showMessage(message, type = 'info') {
    const area = $('#messageArea');
    const content = $('#messageContent');
    content.textContent = message;
    content.className = `message ${type}`;
    showElement(area);

    if (type === 'success') {
        setTimeout(() => hideElement(area), 5000);
    }
}

function hideMessage() {
    hideElement('#messageArea');
}

function showLoading(message = 'Loading...', progress = 0) {
    $('#loadingMessage').textContent = message;
    $('#progressFill').style.width = `${progress}%`;
    showElement('#loadingOverlay');
}

function hideLoading() {
    hideElement('#loadingOverlay');
}

function updateProgress(progress) {
    $('#progressFill').style.width = `${progress}%`;
}

function getProblemKey(contestId, index) {
    return `${contestId}-${index}`;
}

function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// =====================================================
// Theme Toggle
// =====================================================

function initTheme() {
    const saved = localStorage.getItem('cf_picker_theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cf_picker_theme', next);
}

// =====================================================
// LocalStorage / Caching
// =====================================================

function getCachedProblemset() {
    try {
        const cached = localStorage.getItem('cf_problemset');
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (age > CONFIG.CACHE_TTL) {
            localStorage.removeItem('cf_problemset');
            return null;
        }

        return { data, age };
    } catch (e) {
        console.error('Cache read error:', e);
        return null;
    }
}

function cacheProblemset(data) {
    try {
        localStorage.setItem('cf_problemset', JSON.stringify({
            data,
            timestamp: Date.now(),
        }));
    } catch (e) {
        console.error('Cache write error:', e);
    }
}

function updateCacheInfo() {
    const cached = getCachedProblemset();
    const info = $('#cacheInfo');

    if (cached) {
        const hoursAgo = Math.round(cached.age / (60 * 60 * 1000));
        info.textContent = `Problemset cached ${hoursAgo < 1 ? 'less than an hour' : hoursAgo + ' hours'} ago`;
        info.classList.add('fresh');
    } else {
        info.textContent = 'Problemset will be fetched from Codeforces API';
        info.classList.remove('fresh');
    }
}

// =====================================================
// API Functions
// =====================================================

async function fetchWithRetry(url, retries = CONFIG.MAX_RETRIES) {
    const fetchUrl = state.useCorsProxy ? CONFIG.CORS_PROXY + encodeURIComponent(url) : url;

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(fetchUrl);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.status !== 'OK') {
                throw new Error(data.comment || 'API returned error status');
            }

            return data.result;
        } catch (error) {
            if (error.message.includes('Failed to fetch') && !state.useCorsProxy) {
                showCorsModal();
                throw error;
            }

            if (i === retries - 1) {
                throw error;
            }

            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * (i + 1)));
        }
    }
}

async function fetchProblemset() {
    const cached = getCachedProblemset();

    if (cached) {
        return cached.data;
    }

    const url = `${CONFIG.API_BASE}/problemset.problems`;
    const result = await fetchWithRetry(url);

    cacheProblemset(result.problems);
    return result.problems;
}

async function fetchUserSubmissions(handle) {
    const url = `${CONFIG.API_BASE}/user.status?handle=${encodeURIComponent(handle)}&from=1&count=100000`;
    return await fetchWithRetry(url);
}

// =====================================================
// Data Processing
// =====================================================

function processProblemset(problems) {
    state.allTags.clear();

    const processed = problems.filter(p => p.rating).map(p => {
        (p.tags || []).forEach(tag => state.allTags.add(tag));

        return {
            contestId: p.contestId,
            index: p.index,
            name: p.name,
            rating: p.rating,
            tags: p.tags || [],
            key: getProblemKey(p.contestId, p.index),
            id: `${p.contestId}${p.index}`,
            url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
        };
    });

    return processed;
}

function processSubmissions(submissions) {
    const solved = new Set();

    for (const sub of submissions) {
        if (sub.verdict === 'OK' && sub.problem) {
            const key = getProblemKey(sub.problem.contestId, sub.problem.index);
            solved.add(key);
        }
    }

    return solved;
}

function getUnsolvedProblems() {
    return state.problemset.filter(p => !state.solvedProblems.has(p.key));
}

function filterByRatingSegment(problems, min, max) {
    return problems.filter(p => p.rating >= min && p.rating <= max);
}

function filterByTags(problems, includeTags, excludeTags) {
    let filtered = problems;

    if (includeTags.length > 0) {
        filtered = filtered.filter(p =>
            includeTags.some(tag => p.tags.includes(tag))
        );
    }

    if (excludeTags.length > 0) {
        filtered = filtered.filter(p =>
            !excludeTags.some(tag => p.tags.includes(tag))
        );
    }

    return filtered;
}

function sampleProblems(problems, count, randomize = true) {
    if (randomize) {
        problems = shuffle(problems);
    }
    return problems.slice(0, count);
}

function computeTagFrequency(problems) {
    const freq = {};

    for (const p of problems) {
        for (const tag of p.tags) {
            freq[tag] = (freq[tag] || 0) + 1;
        }
    }

    const sorted = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .reduce((obj, [key, val]) => {
            obj[key] = val;
            return obj;
        }, {});

    return sorted;
}

// =====================================================
// UI Functions
// =====================================================

function dismissPrivacyNotice() {
    hideElement('#privacyNotice');
    localStorage.setItem('cf_privacy_dismissed', 'true');
}

function renderSegments() {
    const container = $('#segmentsContainer');
    const unsolved = getUnsolvedProblems();

    container.innerHTML = segments.map((seg, idx) => {
        const available = filterByRatingSegment(unsolved, seg.min, seg.max).length;

        return `
            <div class="segment-row" data-index="${idx}">
                <span class="segment-badge">${idx + 1}</span>
                <div class="segment-inputs">
                    <input type="number" class="seg-input" value="${seg.min}" min="800" max="3500" step="${CONFIG.SEGMENT_STEP}"
                        onchange="updateSegment(${idx}, 'min', this.value)" aria-label="Minimum rating">
                    <span>to</span>
                    <input type="number" class="seg-input" value="${seg.max}" min="800" max="3500" step="${CONFIG.SEGMENT_STEP}"
                        onchange="updateSegment(${idx}, 'max', this.value)" aria-label="Maximum rating">
                </div>
                <div class="seg-count-group">
                    <label>Count:</label>
                    <input type="number" class="seg-count-input" value="${seg.count}" min="0" max="100"
                        onchange="updateSegment(${idx}, 'count', this.value)" aria-label="Number of problems">
                </div>
                <span class="segment-available">${available} available</span>
                <button class="btn-danger-ghost" onclick="removeSegment(${idx})"
                    aria-label="Remove segment" ${segments.length <= 1 ? 'disabled' : ''}>&#215;</button>
            </div>
        `;
    }).join('');
}

function updateSegment(idx, field, value) {
    segments[idx][field] = parseInt(value, 10);
    renderSegments();
}

function addSegment() {
    const lastSeg = segments[segments.length - 1];
    const step = CONFIG.SEGMENT_STEP;
    const newMin = lastSeg ? lastSeg.max + 1 : 800;
    // Round up to the nearest hundred
    const roundedMin = Math.ceil(newMin / step) * step;
    const newMax = roundedMin + step - 1;

    if (roundedMin > 3500) {
        showMessage('Cannot add more segments beyond rating 3500.', 'warning');
        return;
    }

    segments.push({ min: roundedMin, max: newMax, count: 2 });
    renderSegments();
}

function removeSegment(idx) {
    if (segments.length > 1) {
        segments.splice(idx, 1);
        renderSegments();
    }
}

function loadPreset(presetName) {
    segments = PRESETS[presetName].map(s => ({ ...s }));
    renderSegments();
}

function populateTagSelects() {
    const includeContainer = $('#includeTagsContainer');
    const excludeContainer = $('#excludeTagsContainer');

    const sortedTags = [...state.allTags].sort();

    includeContainer.innerHTML = sortedTags.map(tag =>
        `<div class="tag-checkbox-item" data-tag="${tag}" onclick="toggleTag(this, 'include')">
            <span class="tag-check-icon">&#10003;</span>
            <span class="tag-name">${tag}</span>
        </div>`
    ).join('');

    excludeContainer.innerHTML = sortedTags.map(tag =>
        `<div class="tag-checkbox-item" data-tag="${tag}" onclick="toggleTag(this, 'exclude')">
            <span class="tag-check-icon">&#10003;</span>
            <span class="tag-name">${tag}</span>
        </div>`
    ).join('');
}

function toggleTag(element, type) {
    const isExclude = type === 'exclude';

    if (element.classList.contains('selected')) {
        element.classList.remove('selected', 'exclude');
    } else {
        element.classList.add('selected');
        if (isExclude) element.classList.add('exclude');
    }

    updateTagCount(type);
}

function updateTagCount(type) {
    const container = type === 'include' ? $('#includeTagsContainer') : $('#excludeTagsContainer');
    const countEl = type === 'include' ? $('#includeCount') : $('#excludeCount');

    const selectedCount = container.querySelectorAll('.tag-checkbox-item.selected').length;
    countEl.textContent = `${selectedCount} selected`;
}

function clearTagFilter(type) {
    const container = type === 'include' ? $('#includeTagsContainer') : $('#excludeTagsContainer');

    container.querySelectorAll('.tag-checkbox-item.selected').forEach(item => {
        item.classList.remove('selected', 'exclude');
    });

    updateTagCount(type);
}

function getSelectedTags(type) {
    const container = type === 'include' ? $('#includeTagsContainer') : $('#excludeTagsContainer');
    const selectedTags = [];

    container.querySelectorAll('.tag-checkbox-item.selected').forEach(item => {
        selectedTags.push(item.dataset.tag);
    });

    return selectedTags;
}

function filterTags(query) {
    const q = query.toLowerCase().trim();
    const allItems = $$('.tag-checkbox-item');

    allItems.forEach(item => {
        const tag = item.dataset.tag.toLowerCase();
        if (!q || tag.includes(q)) {
            item.classList.remove('tag-hidden');
        } else {
            item.classList.add('tag-hidden');
        }
    });
}

function updateStats() {
    const total = state.problemset.length;
    const solved = state.solvedProblems.size;
    const unsolved = total - solved;

    $('#totalProblems').textContent = total.toLocaleString();
    $('#solvedProblems').textContent = solved.toLocaleString();
    $('#unsolvedProblems').textContent = unsolved.toLocaleString();
}

function renderResults() {
    const { selectedProblems, tagFrequency } = state;

    // Segment summary
    const segmentSummary = $('#segmentSummary');
    const segmentCounts = {};

    for (const p of selectedProblems) {
        for (const seg of segments) {
            if (p.rating >= seg.min && p.rating <= seg.max) {
                const key = `${seg.min}-${seg.max}`;
                segmentCounts[key] = (segmentCounts[key] || 0) + 1;
                break;
            }
        }
    }

    segmentSummary.innerHTML = Object.entries(segmentCounts)
        .map(([range, count]) => `<div>Rating ${range}: ${count} problem${count !== 1 ? 's' : ''}</div>`)
        .join('');

    // Problem IDs
    $('#problemCount').textContent = `(${selectedProblems.length})`;

    const showLinks = $('#showLinksCheck').checked;
    const problemsGrid = $('#problemsGrid');
    problemsGrid.innerHTML = selectedProblems.map(p => {
        if (showLinks) {
            return `<span class="problem-tag"><a href="${p.url}" target="_blank" rel="noopener">${p.id}</a></span>`;
        }
        return `<span class="problem-tag">${p.id}</span>`;
    }).join('');

    // Tag frequency chart (top 10)
    const tagsChart = $('#tagsChart');
    const maxCount = Math.max(...Object.values(tagFrequency), 1);

    tagsChart.innerHTML = Object.entries(tagFrequency)
        .slice(0, 10)
        .map(([tag, count]) => {
            const percentage = (count / maxCount) * 100;
            return `
                <div class="tag-bar">
                    <span class="tag-bar-label">${tag}</span>
                    <div class="tag-bar-track">
                        <div class="tag-bar-fill" style="width: ${percentage}%">${count}</div>
                    </div>
                </div>
            `;
        }).join('');

    // Tag frequency table
    const tagsTableBody = $('#tagsTableBody');
    const totalTags = Object.values(tagFrequency).reduce((a, b) => a + b, 0);

    tagsTableBody.innerHTML = Object.entries(tagFrequency)
        .map(([tag, count]) => {
            const pct = ((count / totalTags) * 100).toFixed(1);
            return `
                <tr>
                    <td>${tag}</td>
                    <td>${count}</td>
                    <td>${pct}%</td>
                </tr>
            `;
        }).join('');

    // Update virtual contest button meta
    const meta = $('#contestBtnMeta');
    if (meta) {
        const dur = selectedProblems.length * 30;
        meta.textContent = `${selectedProblems.length} problems · ${dur} min`;
    }

    showElement('#resultsSection');
}

function toggleProblemLinks() {
    renderResults();
}

// =====================================================
// Export Functions
// =====================================================

function getExportData() {
    return {
        selected_problems: state.selectedProblems.length,
        problem_ids: state.selectedProblems.map(p => p.id),
        segments: segments.map(s => ({ min: s.min, max: s.max, count: s.count })),
        tags: state.tagFrequency,
    };
}

function copyAsJSON() {
    const data = getExportData();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
        .then(() => showCopyFeedback())
        .catch(err => showMessage('Failed to copy: ' + err.message, 'error'));
}

function copyAsCSV() {
    const data = getExportData();

    let csv = 'Problem IDs\n';
    csv += data.problem_ids.join(',') + '\n\n';
    csv += 'Tag,Count\n';
    csv += Object.entries(data.tags).map(([tag, count]) => `${tag},${count}`).join('\n');

    navigator.clipboard.writeText(csv)
        .then(() => showCopyFeedback())
        .catch(err => showMessage('Failed to copy: ' + err.message, 'error'));
}

function copyAsText() {
    const data = getExportData();

    let text = `Problem IDs: ${data.problem_ids.join(', ')}\n\n`;
    text += 'Tag Distribution:\n';
    text += Object.entries(data.tags).map(([tag, count]) => `${tag}: ${count}`).join('\n');

    navigator.clipboard.writeText(text)
        .then(() => showCopyFeedback())
        .catch(err => showMessage('Failed to copy: ' + err.message, 'error'));
}

function downloadJSON() {
    const data = getExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `cf-problems-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showCopyFeedback() {
    const feedback = $('#copyFeedback');
    showElement(feedback);
    setTimeout(() => hideElement(feedback), 2000);
}

// =====================================================
// CORS Modal Functions
// =====================================================

function showCorsModal() {
    showElement('#corsModal');
}

function closeCorsModal() {
    hideElement('#corsModal');
}

function retryWithProxy() {
    state.useCorsProxy = true;
    closeCorsModal();
    fetchData();
}

// =====================================================
// Main Actions
// =====================================================

async function fetchData() {
    const handle = $('#handleInput').value.trim();

    if (!handle) {
        showMessage('Please enter a Codeforces handle', 'warning');
        return;
    }

    state.handle = handle;
    hideMessage();

    const fetchBtn = $('#fetchBtn');
    fetchBtn.disabled = true;
    fetchBtn.querySelector('.btn-text').textContent = 'Fetching...';
    fetchBtn.querySelector('.spinner').classList.remove('hidden');
    const arrow = fetchBtn.querySelector('.btn-arrow');
    if (arrow) arrow.classList.add('hidden');

    try {
        showLoading('Fetching problemset...', 10);

        const rawProblems = await fetchProblemset();
        state.problemset = processProblemset(rawProblems);
        updateProgress(40);

        showLoading('Fetching your submissions...', 50);
        const submissions = await fetchUserSubmissions(handle);
        state.solvedProblems = processSubmissions(submissions);
        updateProgress(80);

        showLoading('Processing data...', 90);
        populateTagSelects();
        updateStats();
        renderSegments();

        updateProgress(100);
        hideLoading();

        showElement('#selectionSection');
        hideElement('#resultsSection');
        showMessage(`Successfully loaded ${state.problemset.length} problems. You've solved ${state.solvedProblems.size}!`, 'success');

    } catch (error) {
        hideLoading();

        if (error.message.includes('handle')) {
            showMessage(`Invalid handle: "${handle}". Please check and try again.`, 'error');
        } else if (error.message.includes('rate limit')) {
            showMessage('Rate limited by Codeforces. Please wait a moment and try again.', 'warning');
        } else {
            showMessage(`Error: ${error.message}`, 'error');
        }
    } finally {
        fetchBtn.disabled = false;
        fetchBtn.querySelector('.btn-text').textContent = 'Fetch Data';
        fetchBtn.querySelector('.spinner').classList.add('hidden');
        if (arrow) arrow.classList.remove('hidden');
        updateCacheInfo();
    }
}

function pickProblems() {
    hideMessage();

    const unsolved = getUnsolvedProblems();
    const randomize = $('#randomizeCheck').checked;
    const fillFromAdjacent = $('#fillFromAdjacent').checked;

    const includeTags = getSelectedTags('include');
    const excludeTags = getSelectedTags('exclude');

    let filtered = filterByTags(unsolved, includeTags, excludeTags);

    const selected = [];
    const warnings = [];

    for (const seg of segments) {
        const segmentProblems = filterByRatingSegment(filtered, seg.min, seg.max);
        const sampled = sampleProblems(segmentProblems, seg.count, randomize);

        if (sampled.length < seg.count) {
            const shortage = seg.count - sampled.length;
            warnings.push(`Segment ${seg.min}-${seg.max}: Only found ${sampled.length}/${seg.count} problems`);

            if (fillFromAdjacent && shortage > 0) {
                const expandedMin = Math.max(800, seg.min - 200);
                const expandedMax = Math.min(3500, seg.max + 200);
                const expandedProblems = filterByRatingSegment(filtered, expandedMin, expandedMax)
                    .filter(p => !sampled.includes(p) && !selected.includes(p));
                const extraSampled = sampleProblems(expandedProblems, shortage, randomize);
                sampled.push(...extraSampled);

                if (extraSampled.length > 0) {
                    warnings.push(`  → Filled ${extraSampled.length} from adjacent ratings (${expandedMin}-${expandedMax})`);
                }
            }
        }

        selected.push(...sampled);
    }

    if (selected.length === 0) {
        showMessage('No problems found matching your criteria. Try adjusting the filters.', 'warning');
        return;
    }

    state.selectedProblems = selected;
    state.tagFrequency = computeTagFrequency(selected);

    if (warnings.length > 0) {
        showMessage(warnings.join('\n'), 'warning');
    }

    renderResults();

    $('#resultsSection').scrollIntoView({ behavior: 'smooth' });
}

// =====================================================
// Initialization
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    initTheme();

    // Theme toggle
    const themeToggle = $('#themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Check if privacy notice was dismissed
    if (localStorage.getItem('cf_privacy_dismissed')) {
        hideElement('#privacyNotice');
    }

    // Update cache info
    updateCacheInfo();

    // Handle Enter key in input
    $('#handleInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            fetchData();
        }
    });
});

// =====================================================
// Virtual Contest Creation
// =====================================================

function createVirtualContest() {
    if (!state.selectedProblems || state.selectedProblems.length === 0) {
        showMessage('No problems selected. Please pick problems first.', 'warning');
        return;
    }

    const duration = state.selectedProblems.length * 30;

    const pickerData = {
        problems: state.selectedProblems,
        handle: state.handle,
        duration,
        timestamp: Date.now()
    };

    localStorage.setItem('cf_picker_contest_data', JSON.stringify(pickerData));
    window.location.href = '../contest/?from=picker';
}

// Make functions available globally for onclick handlers
window.fetchData = fetchData;
window.pickProblems = pickProblems;
window.createVirtualContest = createVirtualContest;
window.addSegment = addSegment;
window.removeSegment = removeSegment;
window.updateSegment = updateSegment;
window.loadPreset = loadPreset;
window.copyAsJSON = copyAsJSON;
window.copyAsCSV = copyAsCSV;
window.copyAsText = copyAsText;
window.downloadJSON = downloadJSON;
window.dismissPrivacyNotice = dismissPrivacyNotice;
window.toggleProblemLinks = toggleProblemLinks;
window.showCorsModal = showCorsModal;
window.closeCorsModal = closeCorsModal;
window.retryWithProxy = retryWithProxy;
window.toggleTag = toggleTag;
window.updateTagCount = updateTagCount;
window.clearTagFilter = clearTagFilter;
window.filterTags = filterTags;
