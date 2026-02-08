/**
 * Main Application
 * Codeforces Profile Analyzer
 */

const App = {
    // Current user data
    userData: null,
    dailyScores: null,
    problemsWithGaps: null,
    
    // DOM Elements
    elements: {},
    
    /**
     * Initialize the application
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadTheme();
        this.setDefaultDates();
        
        console.log('Codeforces Profile Analyzer initialized');
    },
    
    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Search
            usernameInput: document.getElementById('usernameInput'),
            analyzeBtn: document.getElementById('analyzeBtn'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            errorMessage: document.getElementById('errorMessage'),
            
            // Theme
            themeToggle: document.getElementById('themeToggle'),
            
            // Sections
            profileSection: document.getElementById('profileSection'),
            dailyProblemsSection: document.getElementById('dailyProblemsSection'),
            topicSection: document.getElementById('topicSection'),
            analyticsSection: document.getElementById('analyticsSection'),
            ratingBarsSection: document.getElementById('ratingBarsSection'),
            mentoringSection: document.getElementById('mentoringSection'),
            verdictSection: document.getElementById('verdictSection'),
            
            // Profile
            userAvatar: document.getElementById('userAvatar'),
            userHandle: document.getElementById('userHandle'),
            userRank: document.getElementById('userRank'),
            userRating: document.getElementById('userRating'),
            userMaxRating: document.getElementById('userMaxRating'),
            totalSolved: document.getElementById('totalSolved'),
            totalContests: document.getElementById('totalContests'),
            
            // Daily Problems
            dailyStartDate: document.getElementById('dailyStartDate'),
            dailyEndDate: document.getElementById('dailyEndDate'),
            dailyFilterBtn: document.getElementById('dailyFilterBtn'),
            dailyResetBtn: document.getElementById('dailyResetBtn'),
            dailyProblemsList: document.getElementById('dailyProblemsList'),
            
            // Topics
            topicGrid: document.getElementById('topicGrid'),
            topicChart: document.getElementById('topicChart'),
            
            // Analytics
            analyticsStartDate: document.getElementById('analyticsStartDate'),
            analyticsEndDate: document.getElementById('analyticsEndDate'),
            analyticsFilterBtn: document.getElementById('analyticsFilterBtn'),
            analyticsResetBtn: document.getElementById('analyticsResetBtn'),
            problemsPerDayChart: document.getElementById('problemsPerDayChart'),
            dailyScoreChart: document.getElementById('dailyScoreChart'),
            
            // Rating Bars
            ratingBarsContainer: document.getElementById('ratingBarsContainer'),
            
            // Chart Stats
            avgProblemsPerDay: document.getElementById('avgProblemsPerDay'),
            maxProblemsPerDay: document.getElementById('maxProblemsPerDay'),
            avgDailyScore: document.getElementById('avgDailyScore'),
            maxDailyScore: document.getElementById('maxDailyScore'),
            
            // Mentoring
            strengthsList: document.getElementById('strengthsList'),
            improvementsList: document.getElementById('improvementsList'),
            ratingAdvice: document.getElementById('ratingAdvice'),
            topicPriorities: document.getElementById('topicPriorities'),
            refreshSuggestions: document.getElementById('refreshSuggestions'),
            suggestionsList: document.getElementById('suggestionsList'),
            
            // Verdict
            virtualRank: document.getElementById('virtualRank'),
            virtualRankDetails: document.getElementById('virtualRankDetails'),
            actualRank: document.getElementById('actualRank'),
            actualRankDetails: document.getElementById('actualRankDetails'),
            verdictAnalysis: document.getElementById('verdictAnalysis'),
            finalRecommendations: document.getElementById('finalRecommendations')
        };
    },
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Analyze button
        this.elements.analyzeBtn.addEventListener('click', () => this.analyze());
        
        // Enter key on input
        this.elements.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.analyze();
        });
        
        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Daily problems filter
        this.elements.dailyFilterBtn.addEventListener('click', () => this.filterDailyProblems());
        this.elements.dailyResetBtn.addEventListener('click', () => this.resetDailyFilter());
        
        // Analytics filter
        this.elements.analyticsFilterBtn.addEventListener('click', () => this.filterAnalytics());
        this.elements.analyticsResetBtn.addEventListener('click', () => this.resetAnalyticsFilter());
        
        // Refresh suggestions
        this.elements.refreshSuggestions.addEventListener('click', () => this.refreshProblemSuggestions());
    },
    
    /**
     * Load saved theme
     */
    loadTheme() {
        const savedTheme = localStorage.getItem('cf-analyzer-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    },
    
    /**
     * Toggle theme
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('cf-analyzer-theme', newTheme);
        
        // Update charts
        if (this.userData) {
            this.renderCharts();
        }
    },
    
    /**
     * Set default dates
     */
    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        const yearAgoStr = yearAgo.toISOString().split('T')[0];
        
        this.elements.dailyEndDate.value = today;
        this.elements.dailyStartDate.value = yearAgoStr;
        this.elements.analyticsEndDate.value = today;
        this.elements.analyticsStartDate.value = yearAgoStr;
    },
    
    /**
     * Show loading state
     */
    showLoading() {
        this.elements.loadingIndicator.classList.add('active');
        this.elements.analyzeBtn.disabled = true;
        this.elements.errorMessage.classList.remove('active');
    },
    
    /**
     * Hide loading state
     */
    hideLoading() {
        this.elements.loadingIndicator.classList.remove('active');
        this.elements.analyzeBtn.disabled = false;
    },
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.classList.add('active');
    },
    
    /**
     * Hide all sections
     */
    hideSections() {
        const sections = [
            'profileSection', 'dailyProblemsSection', 'topicSection',
            'analyticsSection', 'ratingBarsSection', 'mentoringSection', 'verdictSection'
        ];
        
        sections.forEach(section => {
            this.elements[section].classList.add('hidden');
        });
    },
    
    /**
     * Show all sections
     */
    showSections() {
        const sections = [
            'profileSection', 'dailyProblemsSection', 'topicSection',
            'analyticsSection', 'ratingBarsSection', 'mentoringSection', 'verdictSection'
        ];
        
        sections.forEach(section => {
            this.elements[section].classList.remove('hidden');
        });
    },
    
    /**
     * Main analyze function
     */
    async analyze() {
        const username = this.elements.usernameInput.value.trim();
        
        if (!username) {
            this.showError('Please enter a Codeforces username');
            return;
        }
        
        this.showLoading();
        this.hideSections();
        
        try {
            // Fetch all user data
            this.userData = await CodeforcesAPI.fetchAllUserData(username);
            
            // Calculate daily scores
            this.dailyScores = CodeforcesAPI.calculateDailyScores(this.userData.solvedProblems.byDate);
            
            // Get problems with gaps
            this.problemsWithGaps = CodeforcesAPI.getProblemsPerDayWithGaps(
                this.userData.solvedProblems.byDate
            );
            
            // Render all sections
            this.renderProfile();
            this.renderDailyProblems();
            this.renderTopics();
            this.renderCharts();
            this.renderRatingBars();
            this.renderMentoring();
            this.renderVerdict();
            
            // Show all sections
            this.showSections();
            
            // Scroll to profile
            this.elements.profileSection.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Error analyzing profile:', error);
            this.showError(`Error: ${error.message || 'Failed to fetch user data. Please check the username and try again.'}`);
        } finally {
            this.hideLoading();
        }
    },
    
    /**
     * Render profile section
     */
    renderProfile() {
        const { userInfo, ratingHistory, solvedProblems } = this.userData;
        
        // Avatar
        this.elements.userAvatar.src = userInfo.titlePhoto || 'https://userpic.codeforces.org/no-avatar.jpg';
        
        // Handle
        this.elements.userHandle.textContent = userInfo.handle;
        this.elements.userHandle.style.color = this.getRankColor(userInfo.rating || 0);
        
        // Rank
        const rankName = userInfo.rank || 'Unrated';
        this.elements.userRank.textContent = rankName.charAt(0).toUpperCase() + rankName.slice(1);
        this.elements.userRank.className = 'profile-rank rank-' + (rankName || 'newbie').replace(' ', '-').toLowerCase();
        
        // Stats
        this.elements.userRating.textContent = userInfo.rating || 'Unrated';
        this.elements.userMaxRating.textContent = userInfo.maxRating || 'N/A';
        this.elements.totalSolved.textContent = solvedProblems.totalCount;
        this.elements.totalContests.textContent = ratingHistory.length;
    },
    
    /**
     * Render daily problems section
     */
    renderDailyProblems() {
        Analytics.renderDailyProblemsList(
            this.elements.dailyProblemsList,
            this.userData.solvedProblems.byDate
        );
    },
    
    /**
     * Filter daily problems by date
     */
    filterDailyProblems() {
        const startDate = this.elements.dailyStartDate.value ? 
            new Date(this.elements.dailyStartDate.value) : null;
        const endDate = this.elements.dailyEndDate.value ? 
            new Date(this.elements.dailyEndDate.value) : null;
        
        Analytics.renderDailyProblemsList(
            this.elements.dailyProblemsList,
            this.userData.solvedProblems.byDate,
            startDate,
            endDate
        );
    },
    
    /**
     * Reset daily problems filter
     */
    resetDailyFilter() {
        this.setDefaultDates();
        this.renderDailyProblems();
    },
    
    /**
     * Render topics section
     */
    renderTopics() {
        // Render topic grid
        Analytics.renderTopicGrid(
            this.elements.topicGrid,
            this.userData.solvedProblems.byTopic
        );
        
        // Render topic chart
        Analytics.createTopicChart(
            this.elements.topicChart,
            this.userData.solvedProblems.byTopic
        );
    },
    
    /**
     * Render analytics charts
     */
    renderCharts() {
        // Get filtered date range
        const startDate = this.elements.analyticsStartDate.value ? 
            new Date(this.elements.analyticsStartDate.value) : null;
        const endDate = this.elements.analyticsEndDate.value ? 
            new Date(this.elements.analyticsEndDate.value) : null;
        
        // Get problems with gaps for the date range
        const problemsWithGaps = CodeforcesAPI.getProblemsPerDayWithGaps(
            this.userData.solvedProblems.byDate,
            startDate,
            endDate
        );
        
        // Create problems per day chart
        Analytics.createProblemsPerDayChart(
            this.elements.problemsPerDayChart,
            problemsWithGaps
        );
        
        // Create daily score chart
        Analytics.createDailyScoreChart(
            this.elements.dailyScoreChart,
            this.dailyScores,
            problemsWithGaps
        );
        
        // Calculate and display averages
        this.updateChartAverages(problemsWithGaps);
    },
    
    /**
     * Calculate and update chart averages and maximums
     * @param {Array} problemsWithGaps - Daily problems data
     */
    updateChartAverages(problemsWithGaps) {
        // Calculate average and max problems per day (only counting active days)
        const activeDays = problemsWithGaps.filter(d => d.count > 0);
        const totalProblems = activeDays.reduce((sum, d) => sum + d.count, 0);
        const avgProblems = activeDays.length > 0 ? (totalProblems / activeDays.length).toFixed(2) : 0;
        const maxProblems = activeDays.length > 0 ? Math.max(...activeDays.map(d => d.count)) : 0;
        
        // Calculate average and max daily score (only counting active days)
        let totalScore = 0;
        let maxScore = 0;
        let scoreDays = 0;
        
        problemsWithGaps.forEach(d => {
            const dayScore = this.dailyScores[d.date];
            if (dayScore && dayScore.score > 0) {
                totalScore += dayScore.score;
                maxScore = Math.max(maxScore, dayScore.score);
                scoreDays++;
            }
        });
        
        const avgScore = scoreDays > 0 ? (totalScore / scoreDays).toFixed(1) : 0;
        
        // Update display
        this.elements.avgProblemsPerDay.textContent = avgProblems;
        this.elements.maxProblemsPerDay.textContent = maxProblems;
        this.elements.avgDailyScore.textContent = avgScore;
        this.elements.maxDailyScore.textContent = Math.round(maxScore);
    },
    
    /**
     * Filter analytics by date
     */
    filterAnalytics() {
        this.renderCharts();
    },
    
    /**
     * Reset analytics filter
     */
    resetAnalyticsFilter() {
        this.setDefaultDates();
        this.renderCharts();
    },
    
    /**
     * Render rating bars section
     */
    renderRatingBars() {
        const distribution = CodeforcesAPI.getRatingDistribution(
            this.userData.solvedProblems.byRating
        );
        
        Analytics.renderRatingBars(
            this.elements.ratingBarsContainer,
            distribution
        );
    },
    
    /**
     * Render mentoring section
     */
    renderMentoring() {
        const { userInfo, solvedProblems } = this.userData;
        const userRating = userInfo.rating || 0;
        
        // Render strengths
        const strengths = MentorSystem.analyzeStrengths(solvedProblems.byTopic);
        this.renderStrengths(strengths);
        
        // Render improvements
        const improvements = MentorSystem.identifyImprovements(solvedProblems.byTopic, userRating);
        this.renderImprovements(improvements);
        
        // Render rating advice
        const advice = MentorSystem.getRatingAdvice(userRating, solvedProblems.byRating);
        this.renderRatingAdvice(advice);
        
        // Render topic priorities
        const priorities = MentorSystem.getTopicPriorities(solvedProblems.byTopic, userRating);
        this.renderTopicPriorities(priorities);
        
        // Render problem suggestions
        this.refreshProblemSuggestions();
    },
    
    /**
     * Render strengths list
     * @param {Array} strengths - Strengths data
     */
    renderStrengths(strengths) {
        if (strengths.length === 0) {
            this.elements.strengthsList.innerHTML = `
                <div class="mentor-item">
                    <div class="mentor-item-content">
                        <div class="mentor-item-title">Keep practicing!</div>
                        <div class="mentor-item-desc">Solve more problems to develop your strengths. Aim for 50+ problems in key topics.</div>
                    </div>
                </div>
            `;
            return;
        }
        
        this.elements.strengthsList.innerHTML = strengths.slice(0, 5).map((s, i) => `
            <div class="mentor-item">
                <div class="mentor-item-icon" style="background: ${Analytics.colors.topicColors[i]}; color: white;">
                    ${s.level === 'Mastered' ? '★' : '✓'}
                </div>
                <div class="mentor-item-content">
                    <div class="mentor-item-title">${s.topic}</div>
                    <div class="mentor-item-desc">${s.description}</div>
                </div>
            </div>
        `).join('');
    },
    
    /**
     * Render improvements list
     * @param {Array} improvements - Improvements data
     */
    renderImprovements(improvements) {
        if (improvements.length === 0) {
            this.elements.improvementsList.innerHTML = `
                <div class="mentor-item">
                    <div class="mentor-item-content">
                        <div class="mentor-item-title">Great job!</div>
                        <div class="mentor-item-desc">You have a solid foundation in all priority topics for your rating.</div>
                    </div>
                </div>
            `;
            return;
        }
        
        const priorityColors = {
            'High': '#ef4444',
            'Medium': '#f59e0b',
            'Low': '#10b981'
        };
        
        this.elements.improvementsList.innerHTML = improvements.slice(0, 5).map(imp => `
            <div class="mentor-item">
                <div class="mentor-item-icon" style="background: ${priorityColors[imp.priority]}; color: white;">
                    ${imp.priority === 'High' ? '!' : imp.priority === 'Medium' ? '◆' : '○'}
                </div>
                <div class="mentor-item-content">
                    <div class="mentor-item-title">${imp.topic} <span style="font-size: 0.8em; opacity: 0.7;">(${imp.priority} Priority)</span></div>
                    <div class="mentor-item-desc">${imp.description}</div>
                </div>
            </div>
        `).join('');
    },
    
    /**
     * Render rating advice
     * @param {Object} advice - Rating advice data
     */
    renderRatingAdvice(advice) {
        this.elements.ratingAdvice.innerHTML = `
            <div class="mentor-item">
                <div class="mentor-item-content">
                    <div class="mentor-item-title">Current: ${advice.currentLevel}</div>
                    <div class="mentor-item-desc">Target: ${advice.targetLevel}</div>
                </div>
            </div>
            <div class="mentor-item" style="flex-direction: column; align-items: flex-start;">
                <div class="mentor-item-title" style="margin-bottom: 8px;">Focus Rating Levels:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${advice.focusRatings.map(r => `
                        <span style="
                            padding: 4px 12px;
                            border-radius: 6px;
                            font-size: 0.85rem;
                            background: ${r.isComplete ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'};
                            color: ${r.isComplete ? '#10b981' : '#3b82f6'};
                        ">
                            ${r.rating}: ${r.status}
                        </span>
                    `).join('')}
                </div>
            </div>
            ${advice.generalAdvice.map(a => `
                <div class="mentor-item">
                    <div class="mentor-item-icon" style="background: var(--accent-primary); color: white;">→</div>
                    <div class="mentor-item-content">
                        <div class="mentor-item-desc">${a}</div>
                    </div>
                </div>
            `).join('')}
        `;
    },
    
    /**
     * Render topic priorities
     * @param {Array} priorities - Topic priorities data
     */
    renderTopicPriorities(priorities) {
        this.elements.topicPriorities.innerHTML = priorities.map((p, i) => `
            <div class="mentor-item">
                <div class="mentor-item-icon" style="background: ${p.isMastered ? '#10b981' : Analytics.colors.topicColors[i]}; color: white;">
                    ${p.priority}
                </div>
                <div class="mentor-item-content">
                    <div class="mentor-item-title">
                        ${p.topic}
                        <span style="font-size: 0.8em; opacity: 0.7;">(${p.count}/${MentorSystem.TOPIC_MASTERY_THRESHOLD})</span>
                    </div>
                    <div class="mentor-item-desc">${p.recommendation}</div>
                </div>
            </div>
        `).join('');
    },
    
    /**
     * Refresh problem suggestions
     */
    refreshProblemSuggestions() {
        if (!this.userData) return;
        
        const { userInfo, solvedProblems, problemset } = this.userData;
        const suggestions = MentorSystem.getRandomSuggestions(
            solvedProblems,
            problemset,
            userInfo.rating || 0,
            5
        );
        
        if (suggestions.length === 0) {
            this.elements.suggestionsList.innerHTML = `
                <div class="suggestion-card">
                    <div class="suggestion-header">
                        <span class="suggestion-name">No suggestions available</span>
                    </div>
                    <p>Try refreshing or check back later.</p>
                </div>
            `;
            return;
        }
        
        this.elements.suggestionsList.innerHTML = suggestions.map(s => `
            <div class="suggestion-card">
                <div class="suggestion-header">
                    <span class="suggestion-name">${s.contestId}${s.index} - ${s.name}</span>
                    <span class="suggestion-rating rating-${Math.floor(s.rating / 100) * 100}">${s.rating}</span>
                </div>
                <div class="suggestion-tags">
                    ${s.tags.slice(0, 4).map(t => `<span class="suggestion-tag">${t}</span>`).join('')}
                </div>
                <a href="${s.url}" target="_blank" class="suggestion-link">
                    Solve on Codeforces
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
            </div>
        `).join('');
    },
    
    /**
     * Render verdict section
     */
    renderVerdict() {
        const verdict = MentorSystem.generateVerdict(this.userData);
        
        // Virtual rank
        this.elements.virtualRank.textContent = verdict.virtualRank.rank;
        this.elements.virtualRank.style.color = this.getRankColor(verdict.virtualRank.rating);
        this.elements.virtualRankDetails.textContent = verdict.virtualRank.details;
        
        // Actual rank
        this.elements.actualRank.textContent = verdict.actualRank;
        this.elements.actualRank.style.color = this.getRankColor(verdict.actualRating);
        this.elements.actualRankDetails.textContent = `Rating: ${verdict.actualRating} (Max: ${verdict.maxRating}) | ${verdict.contestCount} contests`;
        
        // Analysis
        this.elements.verdictAnalysis.innerHTML = `<p>${verdict.analysis}</p>`;
        
        // Recommendations
        this.elements.finalRecommendations.innerHTML = verdict.recommendations.map((rec, i) => `
            <div class="recommendation-item">
                <div class="recommendation-number">${i + 1}</div>
                <div class="recommendation-text">${rec}</div>
            </div>
        `).join('');
    },
    
    /**
     * Get rank color based on rating
     * @param {number} rating - User rating
     * @returns {string} Color
     */
    getRankColor(rating) {
        if (rating >= 3000) return '#ff0000';
        if (rating >= 2600) return '#ff0000';
        if (rating >= 2400) return '#ff0000';
        if (rating >= 2300) return '#ff8c00';
        if (rating >= 2100) return '#ff8c00';
        if (rating >= 1900) return '#aa00aa';
        if (rating >= 1600) return '#0000ff';
        if (rating >= 1400) return '#03a89e';
        if (rating >= 1200) return '#008000';
        return '#808080';
    },
    
    /**
     * Get approximate rating from rank name
     * @param {string} rank - Rank name
     * @returns {number} Approximate rating
     */
    getApproxRating(rank) {
        const ratings = {
            'Newbie': 900,
            'Pupil': 1300,
            'Specialist': 1500,
            'Expert': 1750,
            'Candidate Master': 2000,
            'Master': 2200,
            'International Master': 2350,
            'Grandmaster': 2500,
            'International Grandmaster': 2700,
            'Legendary Grandmaster': 3200
        };
        return ratings[rank] || 900;
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
