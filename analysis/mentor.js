/**
 * Mentoring & Recommendation System
 * Provides personalized advice based on user's solving patterns
 */

const MentorSystem = {
    // Topics considered "safe" if solved >= this threshold
    TOPIC_MASTERY_THRESHOLD: 100,
    
    // Rating bucket considered "safe" if solved >= this threshold
    RATING_MASTERY_THRESHOLD: 200,
    
    // Important topics for each rating range
    RATING_TOPIC_PRIORITY: {
        // Newbie (0-1199)
        newbie: [
            'implementation', 'brute force', 'math', 'greedy', 
            'strings', 'sortings', 'constructive algorithms'
        ],
        // Pupil (1200-1399)
        pupil: [
            'implementation', 'math', 'greedy', 'dp', 
            'binary search', 'two pointers', 'strings', 'sortings'
        ],
        // Specialist (1400-1599)
        specialist: [
            'dp', 'greedy', 'binary search', 'two pointers', 
            'dfs and similar', 'graphs', 'math', 'number theory'
        ],
        // Expert (1600-1899)
        expert: [
            'dp', 'graphs', 'dfs and similar', 'trees', 
            'binary search', 'data structures', 'number theory', 'combinatorics'
        ],
        // Candidate Master (1900-2099)
        candidateMaster: [
            'dp', 'graphs', 'trees', 'data structures', 
            'combinatorics', 'number theory', 'bitmasks', 'divide and conquer'
        ],
        // Master+ (2100+)
        master: [
            'dp', 'graphs', 'trees', 'data structures', 
            'flows', 'combinatorics', 'fft', 'geometry', 'game theory'
        ]
    },
    
    // Rating levels to focus on for each rank
    RATING_FOCUS: {
        newbie: [800, 900, 1000, 1100],
        pupil: [1000, 1100, 1200, 1300],
        specialist: [1200, 1300, 1400, 1500],
        expert: [1400, 1500, 1600, 1700, 1800],
        candidateMaster: [1600, 1700, 1800, 1900, 2000],
        master: [1800, 1900, 2000, 2100, 2200, 2300, 2400]
    },
    
    // Virtual rank thresholds based on practice
    VIRTUAL_RANK_THRESHOLDS: {
        legendaryGrandmaster: { minTotal: 3000, min2400: 100, min2000: 300 },
        internationalGrandmaster: { minTotal: 2500, min2400: 50, min2000: 200 },
        grandmaster: { minTotal: 2000, min2200: 50, min1900: 200 },
        internationalMaster: { minTotal: 1500, min2000: 30, min1800: 150 },
        master: { minTotal: 1200, min1900: 30, min1600: 150 },
        candidateMaster: { minTotal: 800, min1700: 30, min1400: 100 },
        expert: { minTotal: 500, min1500: 30, min1200: 80 },
        specialist: { minTotal: 300, min1300: 20, min1000: 60 },
        pupil: { minTotal: 150, min1100: 15, min800: 40 },
        newbie: { minTotal: 0 }
    },
    
    /**
     * Get the rank category based on rating
     * @param {number} rating - User's current rating
     * @returns {string} Rank category
     */
    getRankCategory(rating) {
        if (rating >= 2100) return 'master';
        if (rating >= 1900) return 'candidateMaster';
        if (rating >= 1600) return 'expert';
        if (rating >= 1400) return 'specialist';
        if (rating >= 1200) return 'pupil';
        return 'newbie';
    },
    
    /**
     * Get rank name from rating
     * @param {number} rating - User's rating
     * @returns {string} Rank name
     */
    getRankName(rating) {
        if (rating >= 3000) return 'Legendary Grandmaster';
        if (rating >= 2600) return 'International Grandmaster';
        if (rating >= 2400) return 'Grandmaster';
        if (rating >= 2300) return 'International Master';
        if (rating >= 2100) return 'Master';
        if (rating >= 1900) return 'Candidate Master';
        if (rating >= 1600) return 'Expert';
        if (rating >= 1400) return 'Specialist';
        if (rating >= 1200) return 'Pupil';
        return 'Newbie';
    },
    
    /**
     * Calculate virtual rank based on practice using a hybrid algorithm.
     * 
     * Combines two approaches:
     *   - Suggestion 1 (Weighted Performance): Weighted problem score by difficulty,
     *     exposure bonus for breadth, peak difficulty bonus for ceiling.
     *   - Suggestion 2 (Stability + Peak): Stability rating (highest level with
     *     consistent solves) and peak rating (top-K hardest problems average).
     * 
     * The final virtual rating blends a stability+peak base with volume and
     * breadth adjustments derived from the weighted score approach.
     * 
     * @param {Object} ratingCount - Problems solved by rating bucket (e.g., {800: 50, 900: 30, ...})
     * @param {number} totalSolved - Total problems solved
     * @param {Array} allProblems - Array of all solved problem objects (each with .rating)
     * @returns {Object} Virtual rank info with rank, rating, details, and breakdown
     */
    calculateVirtualRank(ratingCount, totalSolved, allProblems) {
        // --- Insufficient data guard ---
        if (totalSolved < 10 || !allProblems || allProblems.length < 10) {
            return {
                rank: 'Newbie',
                rating: 800,
                details: `Insufficient data — only ${totalSolved} problem(s) solved`,
                breakdown: { totalSolved, stabilityRating: 0, peakRating: 0, weightedScore: 0 }
            };
        }
        
        // Get all rated problem ratings, sorted descending (highest first)
        const allRatings = allProblems
            .map(p => p.rating)
            .filter(r => r > 0)
            .sort((a, b) => b - a);
        
        if (allRatings.length === 0) {
            return {
                rank: 'Newbie',
                rating: 800,
                details: 'No rated problems solved',
                breakdown: { totalSolved, stabilityRating: 0, peakRating: 0, weightedScore: 0 }
            };
        }
        
        // ================================================================
        // PILLAR 1: Stability Rating (from Suggestion 2)
        // The highest difficulty band where the user has cumulatively solved
        // >= stabilityThreshold problems at that level or higher.
        // This represents the difficulty level where the user is "comfortable."
        // ================================================================
        const stabilityThreshold = 25;
        const sortedBuckets = Object.keys(ratingCount)
            .map(Number)
            .filter(r => r > 0)
            .sort((a, b) => b - a); // highest first
        
        let rStability = 0;
        let cumulative = 0;
        for (const r of sortedBuckets) {
            cumulative += (ratingCount[r] || 0);
            if (cumulative >= stabilityThreshold) {
                rStability = r;
                break;
            }
        }
        // Fallback: if user hasn't hit threshold at any level, use average
        if (rStability === 0) {
            rStability = Math.round(allRatings.reduce((a, b) => a + b, 0) / allRatings.length);
        }
        
        // ================================================================
        // PILLAR 2: Peak Rating — Top-K weighted average (from Suggestion 2)
        // Average of top 10 hardest problems solved, with heavier weights
        // on the very hardest to capture true ceiling.
        // ================================================================
        const topK = Math.min(10, allRatings.length);
        let weightedPeakSum = 0;
        let peakWeightSum = 0;
        for (let i = 0; i < topK; i++) {
            const weight = 1.0 - (i * 0.05); // 1.0, 0.95, 0.90, ..., 0.55
            weightedPeakSum += allRatings[i] * weight;
            peakWeightSum += weight;
        }
        const rPeak = weightedPeakSum / peakWeightSum;
        
        // ================================================================
        // PILLAR 3: Weighted Volume Score (from Suggestion 1)
        // w(r) = ((r - 700) / 1000)^α — harder problems contribute more.
        // This rewards quality-weighted practice volume.
        // ================================================================
        const alpha = 1.0;
        let W = 0;
        for (const [r, count] of Object.entries(ratingCount)) {
            const rating = parseInt(r);
            if (rating > 0) {
                const w = Math.pow((rating - 700) / 1000, alpha);
                W += count * w;
            }
        }
        
        // ================================================================
        // PILLAR 4: Exposure Bonus (from Suggestion 1)
        // Breadth of difficulty coverage — solving across many rating bands.
        // E = b_e × ln(1 + bins_solved)
        // ================================================================
        const binsSolved = Object.entries(ratingCount)
            .filter(([r, v]) => parseInt(r) > 0 && v > 0).length;
        
        // ================================================================
        // COMBINE: Base Rating + Adjustments
        // ================================================================
        
        // Base rating: weighted blend of stability and peak (Suggestion 2)
        //   Stability (65%) — represents consistent, proven ability
        //   Peak (35%) — captures ceiling potential (lower weight to avoid
        //                inflating from lucky/tutorial-aided solves)
        const baseRating = rStability * 0.65 + rPeak * 0.35;
        
        // Volume bonus: reward for total quality-weighted work (Suggestion 1)
        // Uses log to apply diminishing returns and prevent farming spam.
        // Capped at 100 to prevent volume alone from distorting rating.
        const volumeBonus = Math.min(100, 25 * Math.log(1 + W / 10));
        
        // Exposure bonus: breadth of difficulty bands attempted (Suggestion 1)
        // Capped at 30 — rewards well-rounded practice but small effect.
        const exposureBonus = Math.min(30, 10 * Math.log(1 + binsSolved));
        
        // Peak difficulty bonus: extra credit for having solved problems
        // harder than the base rating suggests (Suggestion 1)
        // Capped at 70 to prevent a single hard solve from inflating rank.
        const Dmax = allRatings[0];
        const peakDiffBonus = Math.min(70, Math.max(0, (Dmax - baseRating) * 0.1));
        
        // Final virtual rating
        let virtualRating = Math.round(baseRating + volumeBonus + exposureBonus + peakDiffBonus);
        
        // Clamp to valid Codeforces rating range
        virtualRating = Math.max(800, Math.min(3500, virtualRating));
        
        // Map to rank name using standard CF thresholds
        const rank = this.getRankName(virtualRating);
        
        // Build a human-readable details string
        const details = `Rating: ~${virtualRating} | Stability: ${Math.round(rStability)} | ` +
                        `Peak(Top${topK}): ${Math.round(rPeak)} | Hardest: ${Dmax} | ` +
                        `${totalSolved} problems across ${binsSolved} bands`;
        
        return {
            rank,
            rating: virtualRating,
            details,
            breakdown: {
                stabilityRating: Math.round(rStability),
                peakRating: Math.round(rPeak),
                baseRating: Math.round(baseRating),
                weightedScore: Math.round(W * 100) / 100,
                volumeBonus: Math.round(volumeBonus * 10) / 10,
                exposureBonus: Math.round(exposureBonus * 10) / 10,
                peakDiffBonus: Math.round(peakDiffBonus * 10) / 10,
                hardestSolved: Dmax,
                binsSolved,
                totalSolved
            }
        };
    },
    
    /**
     * Analyze user's strengths based on solved problems
     * @param {Object} topicCount - Problems solved by topic
     * @returns {Array} List of strengths
     */
    analyzeStrengths(topicCount) {
        const strengths = [];
        
        // Find topics with high solve count
        const sortedTopics = Object.entries(topicCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        sortedTopics.forEach(([topic, count]) => {
            if (count >= this.TOPIC_MASTERY_THRESHOLD) {
                strengths.push({
                    topic,
                    count,
                    level: 'Mastered',
                    description: `You've solved ${count} ${topic} problems - excellent mastery!`
                });
            } else if (count >= 50) {
                strengths.push({
                    topic,
                    count,
                    level: 'Strong',
                    description: `Good foundation with ${count} ${topic} problems solved`
                });
            }
        });
        
        return strengths;
    },
    
    /**
     * Identify areas for improvement
     * @param {Object} topicCount - Problems solved by topic
     * @param {number} userRating - User's current rating
     * @returns {Array} List of areas to improve
     */
    identifyImprovements(topicCount, userRating) {
        const improvements = [];
        const rankCategory = this.getRankCategory(userRating);
        const priorityTopics = this.RATING_TOPIC_PRIORITY[rankCategory] || [];
        
        priorityTopics.forEach(topic => {
            const count = topicCount[topic] || 0;
            
            if (count < 30) {
                improvements.push({
                    topic,
                    count,
                    priority: 'High',
                    description: `Critical: Only ${count} ${topic} problems. Target: 50+ for your rating`,
                    targetCount: 50
                });
            } else if (count < 50) {
                improvements.push({
                    topic,
                    count,
                    priority: 'Medium',
                    description: `Need more practice: ${count} ${topic} problems. Target: 100+`,
                    targetCount: 100
                });
            } else if (count < this.TOPIC_MASTERY_THRESHOLD) {
                improvements.push({
                    topic,
                    count,
                    priority: 'Low',
                    description: `Good progress: ${count}/${this.TOPIC_MASTERY_THRESHOLD} ${topic} problems`,
                    targetCount: this.TOPIC_MASTERY_THRESHOLD
                });
            }
        });
        
        // Sort by priority
        const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        improvements.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        
        return improvements;
    },
    
    /**
     * Get rating-specific advice
     * @param {number} userRating - User's current rating
     * @param {Object} ratingCount - Problems solved by rating
     * @returns {Object} Rating-based advice
     */
    getRatingAdvice(userRating, ratingCount) {
        const rankCategory = this.getRankCategory(userRating);
        const focusRatings = this.RATING_FOCUS[rankCategory] || [];
        
        const advice = {
            currentLevel: this.getRankName(userRating),
            targetLevel: this.getNextRankName(userRating),
            focusRatings: [],
            generalAdvice: []
        };
        
        // Check each focus rating level
        focusRatings.forEach(rating => {
            const count = ratingCount[rating] || 0;
            const isComplete = count >= this.RATING_MASTERY_THRESHOLD;
            
            advice.focusRatings.push({
                rating,
                count,
                target: this.RATING_MASTERY_THRESHOLD,
                isComplete,
                status: isComplete ? 'Completed' : `${count}/${this.RATING_MASTERY_THRESHOLD}`
            });
        });
        
        // Add general advice based on rank
        switch (rankCategory) {
            case 'newbie':
                advice.generalAdvice = [
                    'Focus on implementation and basic algorithms',
                    'Solve at least 200 problems rated 800-1100',
                    'Build speed and accuracy with simpler problems',
                    'Learn basic math concepts and string manipulation'
                ];
                break;
            case 'pupil':
                advice.generalAdvice = [
                    'Start learning Dynamic Programming basics',
                    'Practice binary search and two pointers',
                    'Aim for 100+ problems at 1200-1300 rating',
                    'Participate in Div. 3 and Div. 4 contests regularly'
                ];
                break;
            case 'specialist':
                advice.generalAdvice = [
                    'Master DP and greedy algorithms',
                    'Learn graph algorithms (DFS, BFS, shortest paths)',
                    'Solve 50+ problems at 1400-1500 rating',
                    'Start participating in Div. 2 contests'
                ];
                break;
            case 'expert':
                advice.generalAdvice = [
                    'Deep dive into advanced DP techniques',
                    'Learn segment trees and other data structures',
                    'Practice problems at 1600-1800 rating range',
                    'Focus on problem-solving speed in contests'
                ];
                break;
            case 'candidateMaster':
                advice.generalAdvice = [
                    'Master advanced data structures',
                    'Learn advanced graph algorithms (flows, etc.)',
                    'Solve problems at 1900-2100 rating regularly',
                    'Aim for consistent Div. 1 participation'
                ];
                break;
            case 'master':
                advice.generalAdvice = [
                    'Focus on rare and advanced topics',
                    'Practice 2200+ rated problems',
                    'Improve contest performance and consistency',
                    'Study problems from Div. 1 contests'
                ];
                break;
        }
        
        return advice;
    },
    
    /**
     * Get next rank name
     * @param {number} rating - Current rating
     * @returns {string} Next rank name
     */
    getNextRankName(rating) {
        if (rating >= 3000) return 'Legendary Grandmaster (Already achieved!)';
        if (rating >= 2600) return 'Legendary Grandmaster (3000+)';
        if (rating >= 2400) return 'International Grandmaster (2600+)';
        if (rating >= 2300) return 'Grandmaster (2400+)';
        if (rating >= 2100) return 'International Master (2300+)';
        if (rating >= 1900) return 'Master (2100+)';
        if (rating >= 1600) return 'Candidate Master (1900+)';
        if (rating >= 1400) return 'Expert (1600+)';
        if (rating >= 1200) return 'Specialist (1400+)';
        return 'Pupil (1200+)';
    },
    
    /**
     * Get topic priorities for the user
     * @param {Object} topicCount - Problems solved by topic
     * @param {number} userRating - User's current rating
     * @returns {Array} Prioritized topics with recommendations
     */
    getTopicPriorities(topicCount, userRating) {
        const rankCategory = this.getRankCategory(userRating);
        const priorityTopics = this.RATING_TOPIC_PRIORITY[rankCategory] || [];
        
        const priorities = priorityTopics.map((topic, index) => {
            const count = topicCount[topic] || 0;
            const isMastered = count >= this.TOPIC_MASTERY_THRESHOLD;
            
            return {
                topic,
                count,
                priority: index + 1,
                isMastered,
                recommendation: isMastered 
                    ? 'Well prepared - maintain with occasional practice'
                    : count < 30 
                        ? 'Critical focus area - solve daily'
                        : 'Continue practicing regularly'
            };
        });
        
        return priorities;
    },
    
    /**
     * Get random problem suggestions based on user profile
     * @param {Object} solvedProblems - User's solved problems data
     * @param {Object} problemset - Available problems from API
     * @param {number} userRating - User's current rating
     * @param {number} count - Number of suggestions to return
     * @returns {Array} Problem suggestions
     */
    getRandomSuggestions(solvedProblems, problemset, userRating, count = 5) {
        const rankCategory = this.getRankCategory(userRating);
        const priorityTopics = this.RATING_TOPIC_PRIORITY[rankCategory] || [];
        const focusRatings = this.RATING_FOCUS[rankCategory] || [];
        
        // Get weak topics
        const weakTopics = priorityTopics.filter(topic => {
            const topicCount = solvedProblems.byTopic[topic] || 0;
            return topicCount < this.TOPIC_MASTERY_THRESHOLD;
        });
        
        // Get set of solved problem IDs
        const solvedSet = new Set(
            solvedProblems.all.map(p => `${p.contestId}-${p.index}`)
        );
        
        // Filter unsolved problems matching criteria
        const candidates = problemset.problems.filter(problem => {
            const problemKey = `${problem.contestId}-${problem.index}`;
            if (solvedSet.has(problemKey)) return false;
            if (!problem.rating) return false;
            
            // Check if rating is in focus range
            const inFocusRange = focusRatings.includes(Math.floor(problem.rating / 100) * 100) ||
                                 focusRatings.some(r => Math.abs(r - problem.rating) <= 100);
            
            // Check if has weak topic
            const hasWeakTopic = problem.tags && 
                problem.tags.some(tag => weakTopics.includes(tag));
            
            // Prefer problems that match focus rating OR have weak topics
            return inFocusRange || hasWeakTopic;
        });
        
        // Shuffle and pick random problems
        const shuffled = candidates.sort(() => Math.random() - 0.5);
        
        // Try to get a diverse selection
        const suggestions = [];
        const usedTopics = new Set();
        const usedRatings = new Set();
        
        for (const problem of shuffled) {
            if (suggestions.length >= count) break;
            
            // Try to get diverse ratings and topics
            const ratingBucket = Math.floor(problem.rating / 100) * 100;
            const mainTopic = problem.tags?.[0] || 'other';
            
            // Allow some overlap but prefer diversity
            if (usedRatings.size < 3 || !usedRatings.has(ratingBucket) || Math.random() > 0.5) {
                if (usedTopics.size < 4 || !usedTopics.has(mainTopic) || Math.random() > 0.5) {
                    suggestions.push({
                        contestId: problem.contestId,
                        index: problem.index,
                        name: problem.name,
                        rating: problem.rating,
                        tags: problem.tags || [],
                        url: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`
                    });
                    
                    usedRatings.add(ratingBucket);
                    usedTopics.add(mainTopic);
                }
            }
        }
        
        // If we don't have enough, fill with any matching problems
        if (suggestions.length < count) {
            for (const problem of shuffled) {
                if (suggestions.length >= count) break;
                
                const alreadyAdded = suggestions.some(
                    s => s.contestId === problem.contestId && s.index === problem.index
                );
                
                if (!alreadyAdded) {
                    suggestions.push({
                        contestId: problem.contestId,
                        index: problem.index,
                        name: problem.name,
                        rating: problem.rating,
                        tags: problem.tags || [],
                        url: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`
                    });
                }
            }
        }
        
        return suggestions;
    },
    
    /**
     * Generate final verdict and recommendations
     * @param {Object} userData - Complete user data
     * @returns {Object} Final verdict with recommendations
     */
    generateVerdict(userData) {
        const { userInfo, solvedProblems, ratingHistory } = userData;
        const currentRating = userInfo.rating || 0;
        const maxRating = userInfo.maxRating || 0;
        
        const virtualRankInfo = this.calculateVirtualRank(
            solvedProblems.byRating, 
            solvedProblems.totalCount,
            solvedProblems.all
        );
        
        const actualRank = this.getRankName(currentRating);
        
        // Compare ranks
        const rankComparison = this.compareRanks(virtualRankInfo.rank, actualRank);
        
        // Generate analysis
        let analysis = '';
        let recommendations = [];
        
        if (rankComparison > 0) {
            analysis = `Your practice-based virtual rank (${virtualRankInfo.rank}) is HIGHER than your actual rank (${actualRank}). ` +
                       `This suggests you have the problem-solving skills to perform better in contests. ` +
                       `Focus on contest-specific skills like time management, reading problems quickly, and handling pressure.`;
            
            recommendations = [
                'Participate in more contests to convert your practice into rating',
                'Practice speed-solving problems under time pressure',
                'Work on reading and understanding problems faster',
                'Analyze your contest performance to identify weak points',
                'Try virtual contests to simulate real contest conditions'
            ];
        } else if (rankComparison < 0) {
            analysis = `Your practice-based virtual rank (${virtualRankInfo.rank}) is LOWER than your actual rank (${actualRank}). ` +
                       `This indicates strong contest performance relative to practice volume. ` +
                       `To sustain and improve your rating, you need to solve more problems, especially at higher difficulties.`;
            
            recommendations = [
                'Increase your daily practice volume',
                'Focus on solving more problems at your rating level and above',
                'Build a stronger foundation in key topics',
                'Upsolve problems from contests you participate in',
                'Set daily or weekly problem-solving goals'
            ];
        } else {
            analysis = `Your practice-based virtual rank (${virtualRankInfo.rank}) matches your actual rank (${actualRank}). ` +
                       `Your practice is well-aligned with your contest performance. ` +
                       `Continue your current approach while gradually increasing difficulty.`;
            
            recommendations = [
                'Maintain your current practice routine',
                'Gradually increase problem difficulty over time',
                'Focus on topics that appear frequently at your rating level',
                'Continue participating in contests regularly',
                'Work on consistency in both practice and contests'
            ];
        }
        
        return {
            virtualRank: virtualRankInfo,
            actualRank,
            actualRating: currentRating,
            maxRating,
            contestCount: ratingHistory.length,
            analysis,
            recommendations,
            rankComparison
        };
    },
    
    /**
     * Compare two ranks (-1, 0, 1)
     * @param {string} rank1 - First rank
     * @param {string} rank2 - Second rank
     * @returns {number} Comparison result
     */
    compareRanks(rank1, rank2) {
        const rankOrder = [
            'Newbie', 'Pupil', 'Specialist', 'Expert', 
            'Candidate Master', 'Master', 'International Master',
            'Grandmaster', 'International Grandmaster', 'Legendary Grandmaster'
        ];
        
        const idx1 = rankOrder.indexOf(rank1);
        const idx2 = rankOrder.indexOf(rank2);
        
        if (idx1 > idx2) return 1;
        if (idx1 < idx2) return -1;
        return 0;
    }
};

// Export for use in other modules
window.MentorSystem = MentorSystem;
