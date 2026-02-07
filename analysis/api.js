/**
 * Codeforces API Module
 * Handles all API interactions with Codeforces
 */

const CodeforcesAPI = {
    BASE_URL: 'https://codeforces.com/api',
    
    /**
     * Fetch user information
     * @param {string} handle - Codeforces username
     * @returns {Promise<Object>} User info
     */
    async getUserInfo(handle) {
        const response = await fetch(`${this.BASE_URL}/user.info?handles=${handle}`);
        const data = await response.json();
        
        if (data.status !== 'OK') {
            throw new Error(data.comment || 'Failed to fetch user info');
        }
        
        return data.result[0];
    },
    
    /**
     * Fetch user's submission history
     * @param {string} handle - Codeforces username
     * @returns {Promise<Array>} Array of submissions
     */
    async getUserSubmissions(handle) {
        const response = await fetch(`${this.BASE_URL}/user.status?handle=${handle}`);
        const data = await response.json();
        
        if (data.status !== 'OK') {
            throw new Error(data.comment || 'Failed to fetch submissions');
        }
        
        return data.result;
    },
    
    /**
     * Fetch user's rating history
     * @param {string} handle - Codeforces username
     * @returns {Promise<Array>} Array of rating changes
     */
    async getUserRating(handle) {
        const response = await fetch(`${this.BASE_URL}/user.rating?handle=${handle}`);
        const data = await response.json();
        
        if (data.status !== 'OK') {
            throw new Error(data.comment || 'Failed to fetch rating history');
        }
        
        return data.result;
    },
    
    /**
     * Fetch problemset (for recommendations)
     * @param {Array<string>} tags - Optional tags to filter
     * @returns {Promise<Object>} Problemset data
     */
    async getProblemset(tags = []) {
        let url = `${this.BASE_URL}/problemset.problems`;
        if (tags.length > 0) {
            url += `?tags=${tags.join(';')}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status !== 'OK') {
            throw new Error(data.comment || 'Failed to fetch problemset');
        }
        
        return data.result;
    },
    
    /**
     * Fetch all data for a user
     * @param {string} handle - Codeforces username
     * @returns {Promise<Object>} Combined user data
     */
    async fetchAllUserData(handle) {
        try {
            const [userInfo, submissions, ratingHistory] = await Promise.all([
                this.getUserInfo(handle),
                this.getUserSubmissions(handle),
                this.getUserRating(handle)
            ]);
            
            // Process submissions to get solved problems
            const solvedProblems = this.processSolvedProblems(submissions);
            
            // Get problemset for recommendations
            const problemset = await this.getProblemset();
            
            return {
                userInfo,
                submissions,
                ratingHistory,
                solvedProblems,
                problemset
            };
        } catch (error) {
            console.error('Error fetching user data:', error);
            throw error;
        }
    },
    
    /**
     * Process submissions to extract unique solved problems
     * @param {Array} submissions - Raw submissions array
     * @returns {Object} Processed solved problems data
     */
    processSolvedProblems(submissions) {
        const solved = new Map();
        const dailyProblems = new Map();
        const topicCount = new Map();
        const ratingCount = new Map();
        
        // Process each submission
        submissions.forEach(sub => {
            if (sub.verdict !== 'OK') return;
            
            const problemKey = `${sub.problem.contestId}-${sub.problem.index}`;
            
            // Only count first AC for each problem
            if (!solved.has(problemKey)) {
                const problem = {
                    contestId: sub.problem.contestId,
                    index: sub.problem.index,
                    name: sub.problem.name,
                    rating: sub.problem.rating || 0,
                    tags: sub.problem.tags || [],
                    solvedAt: sub.creationTimeSeconds * 1000
                };
                
                solved.set(problemKey, problem);
                
                // Group by date
                const date = new Date(problem.solvedAt).toISOString().split('T')[0];
                if (!dailyProblems.has(date)) {
                    dailyProblems.set(date, []);
                }
                dailyProblems.get(date).push(problem);
                
                // Count by topic/tag
                problem.tags.forEach(tag => {
                    topicCount.set(tag, (topicCount.get(tag) || 0) + 1);
                });
                
                // Count by rating
                if (problem.rating > 0) {
                    const ratingBucket = Math.floor(problem.rating / 100) * 100;
                    ratingCount.set(ratingBucket, (ratingCount.get(ratingBucket) || 0) + 1);
                }
            }
        });
        
        // Sort daily problems by rating within each day
        dailyProblems.forEach((problems, date) => {
            problems.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        });
        
        return {
            all: Array.from(solved.values()),
            byDate: Object.fromEntries(dailyProblems),
            byTopic: Object.fromEntries(topicCount),
            byRating: Object.fromEntries(ratingCount),
            totalCount: solved.size
        };
    },
    
    /**
     * Calculate daily scores based on the formula
     * DailyScore = Σ (100 × 2^((r-800)/400)) × (count_r)^γ
     * @param {Object} dailyProblems - Problems grouped by date
     * @param {number} gamma - Diminishing returns exponent (default 0.90)
     * @returns {Object} Daily scores
     */
    calculateDailyScores(dailyProblems, gamma = 0.90) {
        const scores = {};
        
        Object.entries(dailyProblems).forEach(([date, problems]) => {
            // Group problems by rating bucket for this day
            const ratingBuckets = {};
            
            problems.forEach(problem => {
                if (problem.rating > 0) {
                    const bucket = Math.floor(problem.rating / 100) * 100;
                    ratingBuckets[bucket] = (ratingBuckets[bucket] || 0) + 1;
                }
            });
            
            // Calculate score using the formula
            let dailyScore = 0;
            
            Object.entries(ratingBuckets).forEach(([rating, count]) => {
                const r = parseInt(rating);
                const basePoints = 100 * Math.pow(2, (r - 800) / 400);
                const bucketScore = basePoints * Math.pow(count, gamma);
                dailyScore += bucketScore;
            });
            
            scores[date] = {
                score: Math.round(dailyScore * 100) / 100,
                problemCount: problems.length,
                ratingBreakdown: ratingBuckets
            };
        });
        
        return scores;
    },
    
    /**
     * Get problems per day with gaps filled
     * @param {Object} dailyProblems - Problems grouped by date
     * @param {Date} startDate - Start date for range
     * @param {Date} endDate - End date for range
     * @returns {Array} Array of {date, count} with gaps
     */
    getProblemsPerDayWithGaps(dailyProblems, startDate = null, endDate = null) {
        const dates = Object.keys(dailyProblems).sort();
        
        if (dates.length === 0) return [];
        
        const start = startDate ? new Date(startDate) : new Date(dates[0]);
        const end = endDate ? new Date(endDate) : new Date(dates[dates.length - 1]);
        
        const result = [];
        const current = new Date(start);
        
        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            const problems = dailyProblems[dateStr] || [];
            
            result.push({
                date: dateStr,
                count: problems.length,
                problems: problems
            });
            
            current.setDate(current.getDate() + 1);
        }
        
        return result;
    },
    
    /**
     * Get rating distribution for progress bars (800-2400)
     * @param {Object} ratingCount - Problems count by rating
     * @returns {Array} Rating distribution with progress
     */
    getRatingDistribution(ratingCount) {
        const distribution = [];
        const target = 200;
        
        for (let rating = 800; rating <= 2400; rating += 100) {
            const count = ratingCount[rating] || 0;
            const percentage = Math.min((count / target) * 100, 100);
            const isComplete = count >= target;
            
            distribution.push({
                rating,
                count,
                target,
                percentage,
                isComplete
            });
        }
        
        return distribution;
    }
};

// Export for use in other modules
window.CodeforcesAPI = CodeforcesAPI;
