// ===== State Management =====
const state = {
    currentUser: null,
    solvedProblems: new Set(),
    allProblems: [],
    currentContest: null,
    contestStartTime: null,
    contestDuration: 120, // minutes
    contestPausedTime: 0, // Total paused time in ms
    isPaused: false,
    pauseStartTime: null,
    timerInterval: null,
    autoRefreshInterval: null,
    submissions: [],
    pastContests: [],
    selectedTags: new Set(),
    selectedDivision: null
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
    
    // Try to restore active contest if page was refreshed
    restoreActiveContest();
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
    state.selectedDivision = type;
    showDivisionPreview(type);
}

function showDivisionPreview(type) {
    // Hide contest type selection
    document.getElementById('contestTypeSection').classList.add('hidden');
    
    // Show division preview section
    const previewSection = document.getElementById('divisionPreviewSection');
    previewSection.classList.remove('hidden');
    
    if (type === 'custom') {
        showCustomConfig();
        return;
    }
    
    const config = CONTEST_CONFIGS[type];
    
    // Populate division preview
    document.getElementById('previewDivisionName').textContent = config.name;
    document.getElementById('previewProblemsCount').textContent = config.problems.length;
    document.getElementById('previewDuration').textContent = config.duration;
    document.getElementById('previewRatingRange').textContent = 
        `${config.problems[0].rating[0]} - ${config.problems[config.problems.length - 1].rating[1]}`;
    
    // Calculate and show division stats
    const divisionStats = calculateDivisionStats(type);
    displayDivisionStats(divisionStats);
    
    // Show past contests for this division
    displayPastContestsForDivision(type);
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
    state.contestPausedTime = 0;
    state.isPaused = false;
    state.submissions = [];

    // Save initial contest snapshot to past contests immediately
    // This prevents data loss if user refreshes or starts another contest
    const initialSnapshot = {
        contestId: state.currentContest.id,
        contestName: state.currentContest.name,
        contestType: state.currentContest.type,
        problems: JSON.parse(JSON.stringify(state.currentContest.problems)), // Deep clone
        solvedCount: 0,
        totalProblems: state.currentContest.problems.length,
        totalScore: 0,
        totalPenalty: 0,
        timeTaken: 0,
        date: new Date(),
        startTime: state.contestStartTime,
        originalDuration: state.contestDuration,
        inProgress: true // Mark as in-progress
    };
    
    state.pastContests.push(initialSnapshot);
    localStorage.setItem('pastContests', JSON.stringify(state.pastContests));

    // Hide config sections
    document.getElementById('contestTypeSection').classList.add('hidden');
    document.getElementById('customConfigSection').classList.add('hidden');
    document.getElementById('divisionPreviewSection').classList.add('hidden');
    
    // Show contest arena
    displayContestArena();
    startTimer();
    
    // Save initial state
    saveContestState();
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
    const elapsed = Math.floor((Date.now() - state.contestStartTime - state.contestPausedTime) / 1000);
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
    
    // Save state periodically
    if (elapsed % 10 === 0) {
        saveContestState();
    }

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
        
        // Update the in-progress contest record in pastContests
        updateInProgressContest();
        
        // Save state after updates
        saveContestState();

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
    
    // Clear active contest state
    clearActiveContestState();
    
    // Hide arena, show results
    document.getElementById('contestArena').classList.add('hidden');
    displayResults(results);
}

function calculateResults() {
    const solvedProblems = state.currentContest.problems.filter(p => p.status === 'solved');
    const totalScore = solvedProblems.reduce((sum, p) => sum + Math.round(p.currentScore), 0);
    const totalPenalty = solvedProblems.reduce((sum, p) => sum + (p.attempts * 5), 0);
    const timeTaken = Date.now() - state.contestStartTime - state.contestPausedTime;

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
        date: new Date(),
        startTime: state.contestStartTime,
        originalDuration: state.contestDuration
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
    // Find if this contest already exists in past contests
    const existingIndex = state.pastContests.findIndex(c => c.contestId === results.contestId);
    
    // Mark as completed
    results.inProgress = false;
    
    if (existingIndex !== -1) {
        // Update existing record
        state.pastContests[existingIndex] = results;
    } else {
        // Add new record (shouldn't happen normally, but fallback)
        state.pastContests.push(results);
    }
    
    localStorage.setItem('pastContests', JSON.stringify(state.pastContests));
}

function updateInProgressContest() {
    if (!state.currentContest) return;
    
    const existingIndex = state.pastContests.findIndex(c => c.contestId === state.currentContest.id);
    if (existingIndex === -1) return;
    
    // Update the record with current progress
    const solvedProblems = state.currentContest.problems.filter(p => p.status === 'solved');
    const totalScore = solvedProblems.reduce((sum, p) => sum + Math.round(p.currentScore), 0);
    const totalPenalty = solvedProblems.reduce((sum, p) => sum + (p.attempts * 5), 0);
    const timeTaken = Date.now() - state.contestStartTime - state.contestPausedTime;
    
    state.pastContests[existingIndex] = {
        ...state.pastContests[existingIndex],
        problems: JSON.parse(JSON.stringify(state.currentContest.problems)),
        solvedCount: solvedProblems.length,
        totalScore,
        totalPenalty,
        timeTaken,
        inProgress: true
    };
    
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

    list.innerHTML = contests.slice().reverse().map((contest, idx) => {
        const contestIdx = state.pastContests.length - 1 - idx;
        const isInProgress = contest.inProgress;
        return `
        <div class="history-item ${isInProgress ? 'in-progress-contest' : ''}">
            <div class="history-item-info">
                <div class="history-item-title">
                    ${contest.contestName} 
                    ${isInProgress ? '<span class="in-progress-badge">In Progress</span>' : ''}
                </div>
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
            <div class="history-actions">
                <button class="btn-mini" onclick="resumePastContest(${contestIdx})">${isInProgress ? 'Continue' : 'Resume'}</button>
                <button class="btn-mini-danger" onclick="deletePastContest(${contestIdx})">Delete</button>
            </div>
        </div>
    `;
    }).join('');
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
    state.contestPausedTime = 0;
    state.isPaused = false;
    state.submissions = [];
    state.selectedDivision = null;
    
    // Clear saved state
    clearActiveContestState();
    
    // Hide all sections
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('historySection').classList.add('hidden');
    document.getElementById('performanceSection').classList.add('hidden');
    document.getElementById('contestArena').classList.add('hidden');
    document.getElementById('divisionPreviewSection').classList.add('hidden');
    
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
        allProblems: state.allProblems
    };
    
    localStorage.setItem('activeContest', JSON.stringify(contestState));
}

function restoreActiveContest() {
    const savedState = localStorage.getItem('activeContest');
    if (!savedState) return;
    
    try {
        const contestState = JSON.parse(savedState);
        
        // Restore state
        state.currentUser = contestState.currentUser;
        state.solvedProblems = new Set(contestState.solvedProblems);
        state.allProblems = contestState.allProblems || [];
        state.currentContest = contestState.currentContest;
        state.contestStartTime = contestState.contestStartTime;
        state.contestDuration = contestState.contestDuration || 120;
        state.contestPausedTime = contestState.contestPausedTime || 0;
        state.isPaused = contestState.isPaused || false;
        state.pauseStartTime = contestState.pauseStartTime;
        state.submissions = contestState.submissions || [];
        state.selectedDivision = contestState.selectedDivision;
        
        // If was paused before refresh, recalculate paused time
        if (state.isPaused && state.pauseStartTime) {
            // Time spent paused before refresh
            const priorPausedTime = state.contestPausedTime;
            // Time elapsed since page was paused until now
            const additionalPausedTime = Date.now() - state.pauseStartTime;
            state.contestPausedTime = priorPausedTime + additionalPausedTime;
            // Reset pause start time to now
            state.pauseStartTime = Date.now();
        }
        
        // Show restored contest
        if (state.currentUser) {
            displayUserInfo();
            document.getElementById('userInfo').classList.remove('hidden');
            document.getElementById('handleSection').classList.remove('hidden');
        }
        
        if (state.isPaused) {
            // Show paused contest
            displayContestArena();
            document.getElementById('pauseBtn').style.display = 'none';
            document.getElementById('resumeBtn').style.display = 'inline-flex';
            document.getElementById('timerDisplay').classList.add('paused');
            showSuccess('Contest restored! Click Resume to continue.');
        } else {
            // Resume active contest
            displayContestArena();
            startTimer();
            document.getElementById('pauseBtn').style.display = 'inline-flex';
            document.getElementById('resumeBtn').style.display = 'none';
            showSuccess('Active contest restored!');
        }
        
    } catch (error) {
        console.error('Failed to restore contest:', error);
        localStorage.removeItem('activeContest');
    }
}

function clearActiveContestState() {
    localStorage.removeItem('activeContest');
}

// ===== Pause/Resume Functionality =====
function pauseContest() {
    if (!state.currentContest || state.isPaused) return;
    
    state.isPaused = true;
    state.pauseStartTime = Date.now();
    
    // Stop timers
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    if (state.autoRefreshInterval) {
        clearInterval(state.autoRefreshInterval);
        state.autoRefreshInterval = null;
    }
    
    // Update UI
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('resumeBtn').style.display = 'inline-flex';
    document.getElementById('timerDisplay').classList.add('paused');
    
    saveContestState();
    showSuccess('Contest paused');
}

function resumeContest() {
    if (!state.currentContest || !state.isPaused) return;
    
    // Calculate paused duration
    const pauseDuration = Date.now() - state.pauseStartTime;
    state.contestPausedTime += pauseDuration;
    state.isPaused = false;
    state.pauseStartTime = null;
    
    // Update UI
    document.getElementById('pauseBtn').style.display = 'inline-flex';
    document.getElementById('resumeBtn').style.display = 'none';
    document.getElementById('timerDisplay').classList.remove('paused');
    
    // Restart timers
    startTimer();
    state.autoRefreshInterval = setInterval(() => {
        refreshSubmissions();
    }, 30000);
    
    saveContestState();
    showSuccess('Contest resumed');
}

// ===== Division Statistics =====
function calculateDivisionStats(divisionType) {
    const divisionContests = state.pastContests.filter(c => c.contestType === divisionType);
    
    if (divisionContests.length === 0) {
        return {
            averageScore: 0,
            averageTime: 0,
            averageSolved: 0,
            totalContests: 0,
            bestScore: 0,
            averageProblemSolveTime: {}
        };
    }
    
    const totalScore = divisionContests.reduce((sum, c) => sum + c.totalScore, 0);
    const totalTime = divisionContests.reduce((sum, c) => sum + c.timeTaken, 0);
    const totalSolved = divisionContests.reduce((sum, c) => sum + c.solvedCount, 0);
    const bestScore = Math.max(...divisionContests.map(c => c.totalScore));
    
    // Calculate average solve time per problem index
    const problemSolveTimes = {};
    divisionContests.forEach(contest => {
        contest.problems.forEach(problem => {
            if (problem.status === 'solved' && problem.solvedAt) {
                const solveTime = problem.solvedAt - contest.startTime;
                if (!problemSolveTimes[problem.index]) {
                    problemSolveTimes[problem.index] = [];
                }
                problemSolveTimes[problem.index].push(solveTime);
            }
        });
    });
    
    const averageProblemSolveTime = {};
    Object.keys(problemSolveTimes).forEach(index => {
        const times = problemSolveTimes[index];
        const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
        averageProblemSolveTime[index] = avg;
    });
    
    return {
        averageScore: Math.round(totalScore / divisionContests.length),
        averageTime: Math.round(totalTime / divisionContests.length),
        averageSolved: (totalSolved / divisionContests.length).toFixed(1),
        totalContests: divisionContests.length,
        bestScore,
        averageProblemSolveTime
    };
}

function displayDivisionStats(stats) {
    const statsContainer = document.getElementById('divisionStatsContainer');
    
    if (stats.totalContests === 0) {
        statsContainer.innerHTML = '<p class="empty-state">No past contests for this division yet. Be the first to complete one!</p>';
        return;
    }
    
    statsContainer.innerHTML = `
        <div class="division-stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-info">
                <span class="stat-value">${stats.averageScore}</span>
                <span class="stat-label">Avg Score</span>
            </div>
        </div>
        <div class="division-stat-card">
            <div class="stat-icon">⏱</div>
            <div class="stat-info">
                <span class="stat-value">${formatDuration(stats.averageTime)}</span>
                <span class="stat-label">Avg Time</span>
            </div>
        </div>
        <div class="division-stat-card">
            <div class="stat-icon">✓</div>
            <div class="stat-info">
                <span class="stat-value">${stats.averageSolved}</span>
                <span class="stat-label">Avg Solved</span>
            </div>
        </div>
        <div class="division-stat-card">
            <div class="stat-icon">🏆</div>
            <div class="stat-info">
                <span class="stat-value">${stats.bestScore}</span>
                <span class="stat-label">Best Score</span>
            </div>
        </div>
        <div class="division-stat-card">
            <div class="stat-icon">#</div>
            <div class="stat-info">
                <span class="stat-value">${stats.totalContests}</span>
                <span class="stat-label">Total Attempts</span>
            </div>
        </div>
    `;
    
    // Display average solve time per problem
    if (Object.keys(stats.averageProblemSolveTime).length > 0) {
        const solveTimeHtml = Object.entries(stats.averageProblemSolveTime)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([index, time]) => `
                <div class="problem-time-stat">
                    <span class="problem-index-small">${index}</span>
                    <span class="problem-time">${formatDuration(time)}</span>
                </div>
            `).join('');
        
        document.getElementById('avgSolveTimePerProblem').innerHTML = `
            <h4 style="margin-bottom: 12px; font-size: 15px;">Average Solve Time Per Problem</h4>
            <div class="problem-times-grid">${solveTimeHtml}</div>
        `;
    }
}

function displayPastContestsForDivision(divisionType) {
    const divisionContests = state.pastContests.filter(c => c.contestType === divisionType);
    const listContainer = document.getElementById('divisionPastContestsList');
    
    if (divisionContests.length === 0) {
        listContainer.innerHTML = '<p class="empty-state">No past contests for this division</p>';
        return;
    }
    
    listContainer.innerHTML = divisionContests.slice(-5).reverse().map((contest, idx) => {
        const contestIdx = state.pastContests.indexOf(contest);
        const isInProgress = contest.inProgress;
        return `
        <div class="mini-contest-card">
            <div class="mini-contest-info">
                <span class="mini-contest-date">${new Date(contest.date).toLocaleDateString()}${isInProgress ? ' (In Progress)' : ''}</span>
                <span class="mini-contest-stats">${contest.solvedCount}/${contest.totalProblems} • ${contest.totalScore} pts</span>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn-mini" onclick="resumePastContest(${contestIdx})">${isInProgress ? 'Continue' : 'Resume'}</button>
                <button class="btn-mini-danger" onclick="deletePastContest(${contestIdx})">Delete</button>
            </div>
        </div>
    `;
    }).join('');
}

function resumePastContest(contestIndex) {
    const contest = state.pastContests[contestIndex];
    if (!contest) return;
    
    if (confirm(`Resume contest from ${new Date(contest.date).toLocaleString()}?\nYou had solved ${contest.solvedCount}/${contest.totalProblems} problems.`)) {
        // Restore contest state
        state.currentContest = {
            id: Date.now(),
            type: contest.contestType,
            name: contest.contestName,
            problems: contest.problems,
            duration: contest.originalDuration || 120,
            startTime: contest.startTime || Date.now()
        };
        
        state.contestStartTime = Date.now() - contest.timeTaken;
        state.contestPausedTime = 0;
        state.isPaused = false;
        state.submissions = [];
        state.selectedDivision = contest.contestType;
        
        // Hide preview, show arena
        document.getElementById('divisionPreviewSection').classList.add('hidden');
        displayContestArena();
        startTimer();
        
        showSuccess('Contest resumed! Continue solving from where you left off.');
        saveContestState();
    }
}

function startContestFromPreview() {
    if (state.selectedDivision === 'custom') {
        generateCustomContest();
    } else {
        generatePresetContest(state.selectedDivision);
    }
}

function backFromPreview() {
    document.getElementById('divisionPreviewSection').classList.add('hidden');
    document.getElementById('contestTypeSection').classList.remove('hidden');
    state.selectedDivision = null;
}

function deletePastContest(contestIndex) {
    if (confirm('Are you sure you want to delete this contest record?')) {
        state.pastContests.splice(contestIndex, 1);
        localStorage.setItem('pastContests', JSON.stringify(state.pastContests));
        
        // Refresh display based on current view
        if (!document.getElementById('historySection').classList.contains('hidden')) {
            renderHistory(document.querySelector('.filter-btn.active')?.dataset.filter || 'all');
        }
        
        if (!document.getElementById('divisionPreviewSection').classList.contains('hidden')) {
            // Refresh division preview
            if (state.selectedDivision) {
                const divisionStats = calculateDivisionStats(state.selectedDivision);
                displayDivisionStats(divisionStats);
                displayPastContestsForDivision(state.selectedDivision);
            }
        }
        
        showSuccess('Contest record deleted');
    }
}

function viewAllPastContests() {
    document.getElementById('divisionPreviewSection').classList.add('hidden');
    document.getElementById('historySection').classList.remove('hidden');
    document.getElementById('performanceSection').classList.remove('hidden');
    
    renderHistory('all');
    renderPerformanceGraph('overall');
}
