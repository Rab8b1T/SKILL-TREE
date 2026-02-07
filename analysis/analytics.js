/**
 * Analytics & Charts Module
 * Handles all chart rendering and visualization
 */

const Analytics = {
    charts: {},
    
    // Chart color schemes
    colors: {
        primary: '#3b82f6',
        secondary: '#6366f1',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#06b6d4',
        
        // Rating colors
        rating800: '#808080',
        rating1200: '#008000',
        rating1400: '#03a89e',
        rating1600: '#0000ff',
        rating1900: '#aa00aa',
        rating2100: '#ff8c00',
        rating2400: '#ff0000',
        
        // Topic colors (rainbow)
        topicColors: [
            '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
            '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#f59e0b',
            '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
            '#06b6d4', '#0ea5e9'
        ]
    },
    
    /**
     * Get chart.js theme based on current theme
     * @returns {Object} Chart theme config
     */
    getChartTheme() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        
        return {
            gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            textColor: isDark ? '#cbd5e1' : '#475569',
            backgroundColor: isDark ? '#1e293b' : '#ffffff'
        };
    },
    
    /**
     * Get rating color
     * @param {number} rating - Problem rating
     * @returns {string} Color hex
     */
    getRatingColor(rating) {
        if (rating >= 2400) return this.colors.rating2400;
        if (rating >= 2100) return this.colors.rating2100;
        if (rating >= 1900) return this.colors.rating1900;
        if (rating >= 1600) return this.colors.rating1600;
        if (rating >= 1400) return this.colors.rating1400;
        if (rating >= 1200) return this.colors.rating1200;
        return this.colors.rating800;
    },
    
    /**
     * Create problems per day chart
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Array} data - Daily problem data with gaps
     */
    createProblemsPerDayChart(canvas, data) {
        const theme = this.getChartTheme();
        
        // Destroy existing chart
        if (this.charts.problemsPerDay) {
            this.charts.problemsPerDay.destroy();
        }
        
        const labels = data.map(d => d.date);
        const counts = data.map(d => d.count);
        
        // Create gradient for bars
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 350);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.4)');
        
        this.charts.problemsPerDay = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Problems Solved',
                    data: counts,
                    backgroundColor: gradient,
                    borderColor: this.colors.primary,
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.9,
                    categoryPercentage: 0.9
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
                        display: false
                    },
                    tooltip: {
                        backgroundColor: theme.backgroundColor,
                        titleColor: theme.textColor,
                        bodyColor: theme.textColor,
                        borderColor: theme.gridColor,
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: (items) => {
                                return `Date: ${items[0].label}`;
                            },
                            label: (item) => {
                                const count = item.raw;
                                if (count === 0) return 'No problems solved (gap day)';
                                return `Problems solved: ${count}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: theme.gridColor
                        },
                        ticks: {
                            color: theme.textColor,
                            maxRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: 30
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: theme.gridColor
                        },
                        ticks: {
                            color: theme.textColor,
                            stepSize: 1
                        }
                    }
                }
            }
        });
    },
    
    /**
     * Create daily score chart
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} scores - Daily scores data
     * @param {Array} dates - Date array with gaps
     */
    createDailyScoreChart(canvas, scores, dates) {
        const theme = this.getChartTheme();
        
        // Destroy existing chart
        if (this.charts.dailyScore) {
            this.charts.dailyScore.destroy();
        }
        
        const labels = dates.map(d => d.date);
        const scoreData = dates.map(d => {
            const dayScore = scores[d.date];
            return dayScore ? dayScore.score : 0;
        });
        
        // Create gradient for line
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 350);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
        
        this.charts.dailyScore = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Daily Score',
                    data: scoreData,
                    borderColor: this.colors.success,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: this.colors.success,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
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
                        display: false
                    },
                    tooltip: {
                        backgroundColor: theme.backgroundColor,
                        titleColor: theme.textColor,
                        bodyColor: theme.textColor,
                        borderColor: theme.gridColor,
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: (items) => {
                                return `Date: ${items[0].label}`;
                            },
                            label: (item) => {
                                const score = item.raw;
                                const dayData = scores[item.label];
                                
                                if (score === 0) return 'No activity (gap day)';
                                
                                const lines = [`Score: ${score.toFixed(2)}`];
                                
                                if (dayData && dayData.ratingBreakdown) {
                                    lines.push('');
                                    lines.push('Breakdown:');
                                    Object.entries(dayData.ratingBreakdown)
                                        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                                        .forEach(([rating, count]) => {
                                            const basePoints = 100 * Math.pow(2, (parseInt(rating) - 800) / 400);
                                            lines.push(`  ${rating}: ${count} × ${basePoints.toFixed(0)} base`);
                                        });
                                }
                                
                                return lines;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: theme.gridColor
                        },
                        ticks: {
                            color: theme.textColor,
                            maxRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: 30
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: theme.gridColor
                        },
                        ticks: {
                            color: theme.textColor
                        }
                    }
                }
            }
        });
    },
    
    /**
     * Create topic distribution pie/doughnut chart
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} topicData - Topic counts
     */
    createTopicChart(canvas, topicData) {
        const theme = this.getChartTheme();
        
        // Destroy existing chart
        if (this.charts.topic) {
            this.charts.topic.destroy();
        }
        
        // Sort topics and get top 15
        const sortedTopics = Object.entries(topicData)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);
        
        const labels = sortedTopics.map(([topic]) => topic);
        const counts = sortedTopics.map(([, count]) => count);
        
        // Assign colors
        const backgroundColors = labels.map((_, i) => 
            this.colors.topicColors[i % this.colors.topicColors.length]
        );
        
        this.charts.topic = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: counts,
                    backgroundColor: backgroundColors,
                    borderColor: theme.backgroundColor,
                    borderWidth: 2,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: theme.textColor,
                            padding: 15,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: theme.backgroundColor,
                        titleColor: theme.textColor,
                        bodyColor: theme.textColor,
                        borderColor: theme.gridColor,
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: (item) => {
                                const total = counts.reduce((a, b) => a + b, 0);
                                const percentage = ((item.raw / total) * 100).toFixed(1);
                                return `${item.label}: ${item.raw} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },
    
    /**
     * Update chart theme when theme changes
     */
    updateChartsTheme() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.update();
            }
        });
    },
    
    /**
     * Render daily problems list
     * @param {HTMLElement} container - Container element
     * @param {Object} dailyProblems - Problems grouped by date
     * @param {Date} startDate - Optional start date filter
     * @param {Date} endDate - Optional end date filter
     */
    renderDailyProblemsList(container, dailyProblems, startDate = null, endDate = null) {
        container.innerHTML = '';
        
        // Get all dates and sort descending (newest first)
        let dates = Object.keys(dailyProblems).sort().reverse();
        
        // Apply date filter if provided
        if (startDate) {
            const startStr = startDate.toISOString().split('T')[0];
            dates = dates.filter(d => d >= startStr);
        }
        if (endDate) {
            const endStr = endDate.toISOString().split('T')[0];
            dates = dates.filter(d => d <= endStr);
        }
        
        if (dates.length === 0) {
            container.innerHTML = '<p class="no-data">No problems found for the selected date range.</p>';
            return;
        }
        
        dates.forEach(date => {
            const problems = dailyProblems[date];
            const dayCard = document.createElement('div');
            dayCard.className = 'day-card';
            
            // Group problems by rating
            const ratingGroups = {};
            problems.forEach(problem => {
                const ratingBucket = problem.rating ? 
                    Math.floor(problem.rating / 100) * 100 : 'unrated';
                if (!ratingGroups[ratingBucket]) {
                    ratingGroups[ratingBucket] = [];
                }
                ratingGroups[ratingBucket].push(problem);
            });
            
            // Sort rating groups
            const sortedRatings = Object.keys(ratingGroups)
                .filter(r => r !== 'unrated')
                .map(r => parseInt(r))
                .sort((a, b) => a - b);
            
            if (ratingGroups['unrated']) {
                sortedRatings.push('unrated');
            }
            
            // Format date nicely
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            dayCard.innerHTML = `
                <div class="day-header" onclick="this.parentElement.querySelector('.day-content').classList.toggle('expanded')">
                    <span class="day-date">${formattedDate}</span>
                    <div class="day-count">
                        <span>${problems.length} problem${problems.length !== 1 ? 's' : ''}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                </div>
                <div class="day-content">
                    ${sortedRatings.map(rating => {
                        const ratingClass = rating === 'unrated' ? '' : `rating-${rating}`;
                        return `
                            <div class="rating-group">
                                <span class="rating-label ${ratingClass}">${rating === 'unrated' ? 'Unrated' : rating}</span>
                                <div class="problem-list">
                                    ${ratingGroups[rating].map(p => `
                                        <a href="https://codeforces.com/problemset/problem/${p.contestId}/${p.index}" 
                                           target="_blank" 
                                           class="problem-chip"
                                           title="${p.name}">
                                            ${p.contestId}${p.index}
                                            <span class="problem-name">${this.truncate(p.name, 25)}</span>
                                        </a>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
            container.appendChild(dayCard);
        });
    },
    
    /**
     * Render topic distribution grid
     * @param {HTMLElement} container - Container element
     * @param {Object} topicData - Topic counts
     */
    renderTopicGrid(container, topicData) {
        container.innerHTML = '';
        
        // Sort topics by count
        const sortedTopics = Object.entries(topicData)
            .sort((a, b) => b[1] - a[1]);
        
        const maxCount = sortedTopics[0]?.[1] || 1;
        
        sortedTopics.forEach(([topic, count], index) => {
            const percentage = (count / maxCount) * 100;
            const card = document.createElement('div');
            card.className = 'topic-card';
            
            const color = this.colors.topicColors[index % this.colors.topicColors.length];
            
            card.innerHTML = `
                <div class="topic-name">${topic}</div>
                <div class="topic-bar">
                    <div class="topic-bar-fill" style="width: ${percentage}%; background: ${color};"></div>
                </div>
                <div class="topic-count">${count} problems</div>
            `;
            
            container.appendChild(card);
        });
    },
    
    /**
     * Render rating progress bars
     * @param {HTMLElement} container - Container element
     * @param {Array} distribution - Rating distribution data
     */
    renderRatingBars(container, distribution) {
        container.innerHTML = '';
        
        distribution.forEach(item => {
            const barItem = document.createElement('div');
            barItem.className = 'rating-bar-item';
            
            const color = this.getRatingColor(item.rating);
            const fillClass = item.isComplete ? 'complete' : 'incomplete';
            
            barItem.innerHTML = `
                <div class="rating-bar-header">
                    <span class="rating-bar-label" style="color: ${color};">${item.rating}</span>
                    <span class="rating-bar-count">${item.count}/${item.target}</span>
                </div>
                <div class="rating-bar-track">
                    <div class="rating-bar-fill ${fillClass}" style="width: ${item.percentage}%;">
                        ${item.percentage >= 15 ? `<span class="rating-bar-percent">${Math.round(item.percentage)}%</span>` : ''}
                    </div>
                </div>
            `;
            
            container.appendChild(barItem);
        });
    },
    
    /**
     * Truncate text
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncate(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
};

// Export for use in other modules
window.Analytics = Analytics;
