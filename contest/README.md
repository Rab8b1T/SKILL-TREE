# Virtual Contest Platform

A comprehensive virtual contest platform for Codeforces that simulates real contest experience with personalized problem selection.

## Features

### 🎯 Core Features

1. **User Profile Integration**
   - Fetch Codeforces user data via API
   - Track solved problems automatically
   - Display user rating and statistics
   - Default user: `rab8bit`

2. **Multiple Contest Types**
   - **DIV 4**: Beginner-friendly (800-1500 rating)
   - **DIV 3**: Easy-medium level (800-1700 rating)
   - **DIV 2**: Intermediate (1000-2200 rating)
   - **DIV 1**: Advanced (1500-2800 rating)
   - **Custom**: Create your own contest

3. **Smart Problem Selection**
   - Only shows unsolved problems
   - Rating-based difficulty progression
   - Topic/tag filtering for custom contests
   - Realistic difficulty curves matching actual Codeforces divisions

4. **Contest Experience**
   - Real-time countdown timer
   - Dynamic scoring (decreases over time)
   - Penalty system (5 minutes per wrong submission)
   - Live submission tracking
   - Problem status indicators (Pending/Attempted/Solved/Failed)

5. **Submission Verification**
   - Automatic verification via Codeforces API
   - Track wrong submissions and penalties
   - Real-time status updates
   - Submission history panel

6. **Results & Analytics**
   - Detailed performance summary
   - Problem-wise breakdown
   - Time tracking for each problem
   - Score calculation with penalties

7. **Contest History**
   - Save all past contests locally
   - Filter by division type
   - Performance metrics tracking
   - View detailed contest results

8. **Performance Analytics**
   - Interactive charts using Chart.js
   - Division-wise performance graphs
   - Score trends over time
   - Solve rate analysis
   - Average statistics (score, problems solved, best performance)

9. **Theme Support**
   - Dark and light themes
   - Persistent theme selection
   - Smooth transitions

## Division Structure

### DIV 4 (Beginner)
- **Target**: Unrated - 1399
- **Duration**: 2 hours
- **Problems**: 6-8
- **Rating Range**: 800-1500
- **Focus**: Implementation, math, greedy, basic algorithms

### DIV 3 (Lower-Mid Level)
- **Target**: ≤1599
- **Duration**: 2-2.5 hours
- **Problems**: 6-7
- **Rating Range**: 800-1700
- **Focus**: Greedy, DP, data structures, graphs

### DIV 2 (Intermediate)
- **Target**: ~1200-2100
- **Duration**: 2 hours
- **Problems**: 5-6
- **Rating Range**: 1000-2200
- **Focus**: DP, graphs, advanced algorithms

### DIV 1 (Advanced)
- **Target**: 1900+
- **Duration**: 2-2.5 hours
- **Problems**: 5-6
- **Rating Range**: 1500-2800
- **Focus**: Advanced DP, graphs, combinatorics, number theory

## Custom Contest Options

When creating a custom contest, you can configure:

1. **Number of Problems**: 3-10 problems
2. **Duration**: 60-180 minutes
3. **Rating Range**: Custom min/max ratings
4. **Topic Filters**: Select from 25+ available tags
   - Implementation, Math, Greedy, DP, Data Structures
   - Graphs, Binary Search, Trees, Strings
   - Number Theory, Combinatorics, and more

## Scoring System

- **Base Score**: Calculated based on problem rating (500 + rating/10)
- **Score Decay**: 0.2% per minute
- **Minimum Score**: 30% of base score
- **Penalty**: 5 minutes per wrong submission
- **Time Tracking**: Exact solve time from contest start

## How to Use

1. **Enter Handle**: Input your Codeforces username (default: rab8bit)
2. **Load Profile**: System fetches your submissions and profile data
3. **Select Contest Type**: Choose from DIV 1-4 or create custom
4. **Start Contest**: Timer begins, problems are displayed
5. **Solve Problems**: Click problem links to open in Codeforces
6. **Submit Solutions**: Submit on Codeforces as usual
7. **Refresh Status**: Click "Refresh Submissions" to update status
8. **View Results**: After contest ends, see detailed analytics

## Technical Details

### API Integration
- Codeforces API for user data, submissions, and problemset
- Rate limiting considerations
- Error handling for API failures

### Data Storage
- LocalStorage for past contests
- JSON format for contest records
- Persistent theme preferences

### Problem Selection Algorithm
1. Filter by rating range
2. Filter by topic tags (if specified)
3. Exclude already solved problems
4. Randomly select from matching problems
5. Ensure progressive difficulty

### Timer & Score Updates
- Updates every second
- Real-time score calculation
- Visual indicators for time remaining
- Auto-end contest when timer reaches zero

## Files Structure

```
contest/
├── index.html          # Main HTML structure
├── styles.css          # Responsive styling
├── script.js           # Core functionality
└── sample-contests.json # Sample contest data
```

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- LocalStorage support needed for history

## Future Enhancements

Possible additions:
- Virtual rating calculation
- Upsolving mode
- Friends comparison
- Contest recommendations based on rating
- Export contest results
- Share contest with friends

## Notes

- Problems are fetched from Codeforces public API
- Submissions are verified via API (requires internet)
- Contest data is stored locally in browser
- No server-side storage required
- Privacy-focused: only public Codeforces data used

## Credits

Built as part of the SKILL TREE learning platform.
Uses Codeforces API for problem data and verification.
Charts powered by Chart.js.
