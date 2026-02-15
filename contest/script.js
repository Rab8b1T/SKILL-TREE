// ===== State Management =====
const state = {
    currentUser: null,
    solvedProblems: new Set(),
    allProblems: [],
    currentContest: null,
    contestStartTime: null,
    contestDuration: 120, // minutes
    timerInterval: null,
    autoRefreshInterval: null,
    submissions: [],
    pastContests: [],
    selectedTags: new Set()
};

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
        tags: ['implementation', 'math', 'greedy', 'dp', 'data structures', 'graphs']
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
        tags: ['dp', 'greedy', 'graphs', 'data structures', 'math', 'number theory']
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
        tags: ['dp', 'graphs', 'data structures', 'number theory', 'combinatorics', 'geometry']
    }
};

// Available tags for custom contests
const AVAILABLE_TAGS = [
    'implementation', 'math', 'greedy', 'dp', 'data structures', 'brute force',
    'constructive algorithms', 'graphs', 'sortings', 'binary search', 'dfs and similar',
    'trees', 'strings', 'number theory', 'combinatorics', 'two pointers', 'bitmasks',
    'probabilities', 'divide and conquer', 'hashing', 'games', 'shortest paths',
    'geometry', 'ternary search', 'expression parsing', 'meet-in-the-middle'
];

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    loadPastContests();
    setupEventListeners();
    
    // Auto-load default user
    const defaultHandle = 'rab8bit';
    document.getElementById('handleInput').value = defaultHandle;
    
    // Check if user was previously loaded
    const savedUser = localStorage.getItem('lastUser');
    if (savedUser) {
        document.getElementById('handleInput').value = savedUser;
    }
});

// ===== Theme Management =====
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// ===== Event Listeners =====
function setupEventListeners() {
    document.getElementById('loadUserBtn').addEventListener('click', loadUserProfile);
    document.getElementById('handleInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadUserProfile();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape key - close modals or go back
        if (e.key === 'Escape') {
            if (!document.getElementById('contestArena').classList.contains('hidden')) {
                if (confirm('Are you sure you want to end the contest?')) {
                    endContest();
                }
            }
        }
        
        // R key - refresh submissions during contest
        if (e.key === 'r' || e.key === 'R') {
            if (!document.getElementById('contestArena').classList.contains('hidden')) {
                e.preventDefault();
                refreshSubmissions();
            }
        }
    });
}

// ===== API Calls =====
async function loadUserProfile() {
    const handle = document.getElementById('handleInput').value.trim();
    if (!handle) {
        showError('Please enter a Codeforces handle');
        return;
    }

    showLoading('Loading user profile...');
    
    try {
        // Fetch user info
        const userResponse = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
        const userData = await userResponse.json();
        
        if (userData.status !== 'OK') {
            throw new Error('User not found');
        }

        state.currentUser = userData.result[0];

        // Save user handle for future sessions
        localStorage.setItem('lastUser', handle);

        // Fetch user submissions
        const submissionsResponse = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`);
        const submissionsData = await submissionsResponse.json();
        
        if (submissionsData.status !== 'OK') {
            throw new Error('Failed to fetch submissions');
        }

        // Get solved problems
        state.solvedProblems = new Set();
        submissionsData.result.forEach(submission => {
            if (submission.verdict === 'OK') {
                const problemId = `${submission.problem.contestId}${submission.problem.index}`;
                state.solvedProblems.add(problemId);
            }
        });

        // Fetch all problems
        const problemsResponse = await fetch('https://codeforces.com/api/problemset.problems');
        const problemsData = await problemsResponse.json();
        
        if (problemsData.status !== 'OK') {
            throw new Error('Failed to fetch problemset');
        }

        state.allProblems = problemsData.result.problems;

        hideLoading();
        displayUserInfo();
        showContestTypeSelection();
        showSuccess('Profile loaded successfully!');

    } catch (error) {
        hideLoading();
        showError(error.message || 'Failed to load user profile');
    }
}

function displayUserInfo() {
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userRating = document.getElementById('userRating');
    const problemsSolved = document.getElementById('problemsSolved');

    userName.textContent = state.currentUser.handle;
    userRating.textContent = state.currentUser.rating || 'Unrated';
    userRating.style.color = getRatingColor(state.currentUser.rating);
    problemsSolved.textContent = state.solvedProblems.size;

    userInfo.classList.remove('hidden');
}

function getRatingColor(rating) {
    if (!rating) return '#808080';
    if (rating < 1200) return '#808080';
    if (rating < 1400) return '#008000';
    if (rating < 1600) return '#03a89e';
    if (rating < 1900) return '#0000ff';
    if (rating < 2100) return '#aa00aa';
    if (rating < 2300) return '#ff8c00';
    return '#ff0000';
}

// ===== Contest Type Selection =====
function showContestTypeSelection() {
    document.getElementById('contestTypeSection').classList.remove('hidden');
}

function selectContestType(type) {
    if (type === 'custom') {
        showCustomConfig();
    } else {
        generatePresetContest(type);
    }
}

function showCustomConfig() {
    document.getElementById('contestTypeSection').classList.add('hidden');
    document.getElementById('customConfigSection').classList.remove('hidden');
    
    // Populate tags
    const tagsContainer = document.getElementById('tagsContainer');
    tagsContainer.innerHTML = '';
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
    if (state.selectedTags.has(tag)) {
        state.selectedTags.delete(tag);
    } else {
        state.selectedTags.add(tag);
    }
}

function cancelCustom() {
    document.getElementById('customConfigSection').classList.add('hidden');
    document.getElementById('contestTypeSection').classList.remove('hidden');
    state.selectedTags.clear();
}

async function generateCustomContest() {
    const problemCount = parseInt(document.getElementById('problemCount').value);
    const duration = parseInt(document.getElementById('contestDuration').value);
    const minRating = parseInt(document.getElementById('minRating').value);
    const maxRating = parseInt(document.getElementById('maxRating').value);

    if (minRating >= maxRating) {
        showError('Min rating must be less than max rating');
        return;
    }

    showLoading('Generating custom contest...');
    
    const ratingStep = Math.floor((maxRating - minRating) / problemCount);
    const problems = [];
    
    for (let i = 0; i < problemCount; i++) {
        const min = minRating + (i * ratingStep);
        const max = min + ratingStep;
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

// ===== Contest Generation =====
async function startContest(type, config) {
    const contestProblems = [];
    
    for (const problemSpec of config.problems) {
        const problem = findUnsolvedProblem(problemSpec.rating, config.tags);
        if (problem) {
            contestProblems.push({
                ...problem,
                index: problemSpec.index,
                maxScore: 500 + (problemSpec.rating[0] / 10),
                currentScore: 500 + (problemSpec.rating[0] / 10),
                status: 'pending',
                attempts: 0,
                solvedAt: null
            });
        }
    }

    if (contestProblems.length < config.problems.length) {
        showError('Not enough unsolved problems found for this contest');
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
    state.submissions = [];

    // Hide config sections
    document.getElementById('contestTypeSection').classList.add('hidden');
    document.getElementById('customConfigSection').classList.add('hidden');
    
    // Show contest arena
    displayContestArena();
    startTimer();
}

function findUnsolvedProblem(ratingRange, allowedTags) {
    const [minRating, maxRating] = ratingRange;
    
    const unsolvedProblems = state.allProblems.filter(problem => {
        if (!problem.rating) return false;
        if (problem.rating < minRating || problem.rating > maxRating) return false;
        
        const problemId = `${problem.contestId}${problem.index}`;
        if (state.solvedProblems.has(problemId)) return false;
        
        // Check tags if specified
        if (allowedTags && allowedTags.length > 0) {
            const problemTags = problem.tags || [];
            const hasMatchingTag = problemTags.some(tag => 
                allowedTags.some(allowed => tag.toLowerCase().includes(allowed.toLowerCase()))
            );
            if (!hasMatchingTag) return false;
        }
        
        return true;
    });

    if (unsolvedProblems.length === 0) return null;
    
    // Pick a random problem from matching ones
    return unsolvedProblems[Math.floor(Math.random() * unsolvedProblems.length)];
}

// ===== Contest Display =====
function displayContestArena() {
    const arena = document.getElementById('contestArena');
    arena.classList.remove('hidden');

    // Set contest info
    document.getElementById('contestName').textContent = state.currentContest.name;
    document.getElementById('contestType').textContent = state.currentContest.type.toUpperCase();
    document.getElementById('contestProblemsCount').textContent = `${state.currentContest.problems.length} problems`;
    document.getElementById('contestDuration').textContent = `${state.currentContest.duration} minutes`;

    // Render problems table
    renderProblemsTable();
    
    // Start auto-refresh for submissions (every 30 seconds)
    state.autoRefreshInterval = setInterval(() => {
        refreshSubmissions();
    }, 30000);
}

function renderProblemsTable() {
    const tbody = document.getElementById('problemsTableBody');
    tbody.innerHTML = '';

    state.currentContest.problems.forEach(problem => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="problem-index">${problem.index}</span></td>
            <td>
                <a href="https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}" 
                   target="_blank" 
                   class="problem-link">
                    ${problem.name}
                </a>
            </td>
            <td>${problem.solvedCount || '-'}</td>
            <td>${problem.rating || '-'}</td>
            <td id="score-${problem.index}">${Math.round(problem.currentScore)}</td>
            <td>
                <span class="status-badge ${problem.status}" id="status-${problem.index}">
                    ${getStatusText(problem.status)}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getStatusText(status) {
    const statusMap = {
        pending: 'Not Attempted',
        attempted: 'Attempted',
        solved: 'Solved',
        failed: 'Wrong Answer'
    };
    return statusMap[status] || status;
}

// ===== Timer =====
function startTimer() {
    updateTimer();
    state.timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - state.contestStartTime) / 1000);
    const totalSeconds = state.contestDuration * 60;
    const remaining = Math.max(0, totalSeconds - elapsed);

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    const display = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const timerElement = document.getElementById('timerDisplay');
    timerElement.textContent = display;

    // Update timer color based on time remaining
    if (remaining < 300) { // Less than 5 minutes
        timerElement.className = 'timer-display danger';
    } else if (remaining < 900) { // Less than 15 minutes
        timerElement.className = 'timer-display warning';
    } else {
        timerElement.className = 'timer-display';
    }

    // Update problem scores (decrease over time)
    updateProblemScores(elapsed);

    if (remaining === 0) {
        endContest();
    }
}

function updateProblemScores(elapsedSeconds) {
    state.currentContest.problems.forEach(problem => {
        if (problem.status !== 'solved') {
            const elapsedMinutes = elapsedSeconds / 60;
            const maxScore = problem.maxScore;
            const decreaseRate = maxScore * 0.002; // 0.2% per minute
            problem.currentScore = Math.max(maxScore * 0.3, maxScore - (decreaseRate * elapsedMinutes));
            
            const scoreElement = document.getElementById(`score-${problem.index}`);
            if (scoreElement) {
                scoreElement.textContent = Math.round(problem.currentScore);
            }
        }
    });
}

// ===== Submissions Checking =====
async function refreshSubmissions() {
    if (!state.currentUser || !state.currentContest) return;

    const btn = document.getElementById('refreshSubmissions');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Checking...';

    try {
        const response = await fetch(`https://codeforces.com/api/user.status?handle=${state.currentUser.handle}&from=1&count=50`);
        const data = await response.json();

        if (data.status !== 'OK') throw new Error('Failed to fetch submissions');

        const recentSubmissions = data.result.filter(sub => 
            sub.creationTimeSeconds * 1000 >= state.contestStartTime
        );

        // Check each contest problem
        state.currentContest.problems.forEach(problem => {
            const problemId = `${problem.contestId}${problem.index}`;
            const problemSubmissions = recentSubmissions.filter(sub => 
                `${sub.problem.contestId}${sub.problem.index}` === problemId
            );

            if (problemSubmissions.length > 0) {
                const hasAccepted = problemSubmissions.some(sub => sub.verdict === 'OK');
                const wrongAttempts = problemSubmissions.filter(sub => 
                    sub.verdict !== 'OK' && sub.verdict !== 'TESTING'
                ).length;

                if (hasAccepted && problem.status !== 'solved') {
                    // Problem solved!
                    const solvedSubmission = problemSubmissions.find(sub => sub.verdict === 'OK');
                    problem.status = 'solved';
                    problem.solvedAt = solvedSubmission.creationTimeSeconds * 1000;
                    problem.attempts = wrongAttempts;
                    
                    // Add penalty for wrong attempts (5 minutes each)
                    const penalty = wrongAttempts * 5 * 60 * 1000;
                    
                    addSubmission({
                        problem: problem.index,
                        verdict: 'Accepted',
                        time: new Date(solvedSubmission.creationTimeSeconds * 1000),
                        penalty: wrongAttempts * 5
                    });
                    
                    showSuccess(`Problem ${problem.index} solved!`);
                } else if (wrongAttempts > 0 && problem.status === 'pending') {
                    problem.status = 'attempted';
                    addSubmission({
                        problem: problem.index,
                        verdict: 'Wrong Answer',
                        time: new Date(),
                        penalty: 0
                    });
                }
            }
        });

        renderProblemsTable();
        renderSubmissions();

    } catch (error) {
        showError('Failed to check submissions');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/>
            </svg>
            Refresh Submissions
        `;
    }
}

function addSubmission(submission) {
    state.submissions.unshift(submission);
    if (state.submissions.length > 20) {
        state.submissions = state.submissions.slice(0, 20);
    }
}

function renderSubmissions() {
    const list = document.getElementById('submissionsList');
    
    if (state.submissions.length === 0) {
        list.innerHTML = '<p class="empty-state">No submissions yet. Click on problems to open them in Codeforces!</p>';
        return;
    }

    list.innerHTML = state.submissions.map(sub => `
        <div class="submission-item ${sub.verdict === 'Accepted' ? 'accepted' : 'wrong'}">
            <div class="submission-info">
                <div class="submission-problem">Problem ${sub.problem}: ${sub.verdict}</div>
                <div class="submission-time">${formatTime(sub.time)}</div>
            </div>
            ${sub.penalty > 0 ? `<span class="status-badge failed">+${sub.penalty} min</span>` : ''}
        </div>
    `).join('');
}

function formatTime(date) {
    return date.toLocaleTimeString();
}

// ===== End Contest =====
function endContest() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    
    if (state.autoRefreshInterval) {
        clearInterval(state.autoRefreshInterval);
        state.autoRefreshInterval = null;
    }

    // Calculate results
    const results = calculateResults();
    
    // Save contest
    saveContest(results);
    
    // Hide arena, show results
    document.getElementById('contestArena').classList.add('hidden');
    displayResults(results);
}

function calculateResults() {
    const solvedProblems = state.currentContest.problems.filter(p => p.status === 'solved');
    const totalScore = solvedProblems.reduce((sum, p) => sum + Math.round(p.currentScore), 0);
    const totalPenalty = solvedProblems.reduce((sum, p) => sum + (p.attempts * 5), 0);
    const timeTaken = Date.now() - state.contestStartTime;

    return {
        contestId: state.currentContest.id,
        contestName: state.currentContest.name,
        contestType: state.currentContest.type,
        problems: state.currentContest.problems,
        solvedCount: solvedProblems.length,
        totalProblems: state.currentContest.problems.length,
        totalScore,
        totalPenalty,
        timeTaken,
        date: new Date()
    };
}

function displayResults(results) {
    document.getElementById('resultsSection').classList.remove('hidden');
    
    // Summary
    document.getElementById('solvedCount').textContent = `${results.solvedCount}/${results.totalProblems}`;
    document.getElementById('totalScore').textContent = results.totalScore;
    document.getElementById('timeTaken').textContent = formatDuration(results.timeTaken);
    document.getElementById('penaltyTime').textContent = results.totalPenalty;

    // Problems results
    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = results.problems.map(problem => `
        <tr>
            <td class="problem-index">${problem.index}</td>
            <td>
                <span class="status-badge ${problem.status}">
                    ${getStatusText(problem.status)}
                </span>
            </td>
            <td>${problem.status === 'solved' ? Math.round(problem.currentScore) : 0}</td>
            <td>${problem.solvedAt ? formatDuration(problem.solvedAt - state.contestStartTime) : '-'}</td>
            <td>${problem.attempts || 0}</td>
        </tr>
    `).join('');
}

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ===== Contest History =====
function saveContest(results) {
    state.pastContests.push(results);
    localStorage.setItem('pastContests', JSON.stringify(state.pastContests));
}

function loadPastContests() {
    const saved = localStorage.getItem('pastContests');
    if (saved) {
        state.pastContests = JSON.parse(saved);
    }
}

function viewPastContests() {
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('historySection').classList.remove('hidden');
    document.getElementById('performanceSection').classList.remove('hidden');
    
    renderHistory('all');
    renderPerformanceGraph('overall');
}

function filterHistory(filter) {
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    renderHistory(filter);
}

function renderHistory(filter) {
    const list = document.getElementById('historyList');
    
    let contests = state.pastContests;
    if (filter !== 'all') {
        contests = contests.filter(c => c.contestType === filter);
    }

    if (contests.length === 0) {
        list.innerHTML = '<p class="empty-state">No past contests found</p>';
        return;
    }

    list.innerHTML = contests.slice().reverse().map(contest => `
        <div class="history-item">
            <div class="history-item-info">
                <div class="history-item-title">${contest.contestName}</div>
                <div class="history-item-meta">
                    <span>${new Date(contest.date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>${contest.contestType.toUpperCase()}</span>
                    <span>•</span>
                    <span>${formatDuration(contest.timeTaken)}</span>
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
                <div class="history-stat">
                    <span class="history-stat-value">${contest.totalPenalty}</span>
                    <span class="history-stat-label">Penalty</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== Performance Analytics =====
let performanceChart = null;

function switchPerformanceTab(tab) {
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    renderPerformanceGraph(tab);
}

function renderPerformanceGraph(division) {
    let contests = state.pastContests;
    
    if (division !== 'overall') {
        contests = contests.filter(c => c.contestType === division);
    }

    const ctx = document.getElementById('performanceChart');
    
    if (performanceChart) {
        performanceChart.destroy();
    }

    const labels = contests.map((c, i) => `Contest ${i + 1}`);
    const scores = contests.map(c => c.totalScore);
    const solvedRates = contests.map(c => (c.solvedCount / c.totalProblems) * 100);

    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Score',
                data: scores,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                yAxisID: 'y'
            }, {
                label: 'Solve Rate (%)',
                data: solvedRates,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    labels: {
                        color: getComputedStyle(document.documentElement)
                            .getPropertyValue('--text-primary').trim()
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        color: getComputedStyle(document.documentElement)
                            .getPropertyValue('--text-secondary').trim()
                    },
                    grid: {
                        color: getComputedStyle(document.documentElement)
                            .getPropertyValue('--border-color').trim()
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    min: 0,
                    max: 100,
                    ticks: {
                        color: getComputedStyle(document.documentElement)
                            .getPropertyValue('--text-secondary').trim()
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                },
                x: {
                    ticks: {
                        color: getComputedStyle(document.documentElement)
                            .getPropertyValue('--text-secondary').trim()
                    },
                    grid: {
                        color: getComputedStyle(document.documentElement)
                            .getPropertyValue('--border-color').trim()
                    }
                }
            }
        }
    });

    // Render stats
    renderPerformanceStats(contests);
}

function renderPerformanceStats(contests) {
    const statsDiv = document.getElementById('performanceStats');
    
    if (contests.length === 0) {
        statsDiv.innerHTML = '<p class="empty-state">No data available</p>';
        return;
    }

    const avgScore = Math.round(contests.reduce((sum, c) => sum + c.totalScore, 0) / contests.length);
    const avgSolved = Math.round(contests.reduce((sum, c) => sum + c.solvedCount, 0) / contests.length);
    const totalContests = contests.length;
    const bestScore = Math.max(...contests.map(c => c.totalScore));

    statsDiv.innerHTML = `
        <div class="result-card">
            <div class="result-icon score">📊</div>
            <div class="result-info">
                <span class="result-value">${avgScore}</span>
                <span class="result-label">Avg Score</span>
            </div>
        </div>
        <div class="result-card">
            <div class="result-icon success">✓</div>
            <div class="result-info">
                <span class="result-value">${avgSolved}</span>
                <span class="result-label">Avg Solved</span>
            </div>
        </div>
        <div class="result-card">
            <div class="result-icon time">🏆</div>
            <div class="result-info">
                <span class="result-value">${bestScore}</span>
                <span class="result-label">Best Score</span>
            </div>
        </div>
        <div class="result-card">
            <div class="result-icon info">#</div>
            <div class="result-info">
                <span class="result-value">${totalContests}</span>
                <span class="result-label">Total Contests</span>
            </div>
        </div>
    `;
}

// ===== Navigation Functions =====
function startNewContest() {
    // Reset state
    state.currentContest = null;
    state.contestStartTime = null;
    state.submissions = [];
    
    // Hide all sections
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('historySection').classList.add('hidden');
    document.getElementById('performanceSection').classList.add('hidden');
    document.getElementById('contestArena').classList.add('hidden');
    
    // Show contest type selection
    document.getElementById('contestTypeSection').classList.remove('hidden');
}

function backToContestTypes() {
    document.getElementById('historySection').classList.add('hidden');
    document.getElementById('performanceSection').classList.add('hidden');
    document.getElementById('contestTypeSection').classList.remove('hidden');
}

// ===== Utility Functions =====
function showLoading(message) {
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

function showError(message) {
    const toast = document.getElementById('errorToast');
    document.getElementById('errorMessage').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 5000);
}

function showSuccess(message) {
    const toast = document.getElementById('successToast');
    document.getElementById('successMessage').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function closeToast(toastId) {
    document.getElementById(toastId).classList.add('hidden');
}
