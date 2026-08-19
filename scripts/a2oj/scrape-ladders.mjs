// Ladder Scraper - Fetches all ladder problems from a2oj.netlify.app
import { writeFileSync } from 'fs';

const BASE = 'https://a2oj.netlify.app';

const LADDERS = [
    // According to Div - Updated (Suggested)
    { slug: 'div2a', name: 'Div. 2A (Updated)', group: 'Div (Updated)', format: 'div', expected: 100 },
    { slug: 'div2b', name: 'Div. 2B (Updated)', group: 'Div (Updated)', format: 'div', expected: 100 },
    { slug: 'div2c', name: 'Div. 2C (Updated)', group: 'Div (Updated)', format: 'div', expected: 100 },
    { slug: 'div2d', name: 'Div. 2D (Updated)', group: 'Div (Updated)', format: 'div', expected: 100 },
    { slug: 'div2e', name: 'Div. 2E (Updated)', group: 'Div (Updated)', format: 'div', expected: 100 },
    // According to Div - Older
    { slug: 'div2a_old', name: 'Div. 2A (Older)', group: 'Div (Older)', format: 'div', expected: 100 },
    { slug: 'div2b_old', name: 'Div. 2B (Older)', group: 'Div (Older)', format: 'div', expected: 100 },
    { slug: 'div2c_old', name: 'Div. 2C (Older)', group: 'Div (Older)', format: 'div', expected: 100 },
    { slug: 'div2d_old', name: 'Div. 2D (Older)', group: 'Div (Older)', format: 'div', expected: 100 },
    { slug: 'div2e_old', name: 'Div. 2E (Older)', group: 'Div (Older)', format: 'div', expected: 100 },
    // According to Rating
    { slug: 'ladder11', name: 'Rating < 1300', group: 'Rating', format: 'rating', expected: 100 },
    { slug: 'ladder12', name: 'Rating 1300-1399', group: 'Rating', format: 'rating', expected: 100 },
    { slug: 'ladder13', name: 'Rating 1400-1499', group: 'Rating', format: 'rating', expected: 100 },
    { slug: 'ladder14', name: 'Rating 1500-1599', group: 'Rating', format: 'rating', expected: 100 },
    { slug: 'ladder15', name: 'Rating 1600-1699', group: 'Rating', format: 'rating', expected: 100 },
    { slug: 'ladder16', name: 'Rating 1700-1799', group: 'Rating', format: 'rating', expected: 100 },
    { slug: 'ladder17', name: 'Rating 1800-1899', group: 'Rating', format: 'rating', expected: 100 },
    { slug: 'ladder18', name: 'Rating 1900-1999', group: 'Rating', format: 'rating', expected: 100 },
    { slug: 'ladder19', name: 'Rating 2000-2099', group: 'Rating', format: 'rating', expected: 100 },
    { slug: 'ladder20', name: 'Rating 2100-2199', group: 'Rating', format: 'rating', expected: 100 },
    { slug: 'ladder21', name: 'Rating >= 2200', group: 'Rating', format: 'rating', expected: 100 },
    // Rating Extra
    { slug: 'ladder22', name: 'Rating < 1300 (Extra)', group: 'Rating (Extra)', format: 'rating', expected: 200 },
    { slug: 'ladder23', name: 'Rating 1300-1399 (Extra)', group: 'Rating (Extra)', format: 'rating', expected: 200 },
    { slug: 'ladder24', name: 'Rating 1400-1499 (Extra)', group: 'Rating (Extra)', format: 'rating', expected: 200 },
    { slug: 'ladder25', name: 'Rating 1500-1599 (Extra)', group: 'Rating (Extra)', format: 'rating', expected: 200 },
    { slug: 'ladder26', name: 'Rating 1600-1699 (Extra)', group: 'Rating (Extra)', format: 'rating', expected: 200 },
    { slug: 'ladder27', name: 'Rating 1700-1799 (Extra)', group: 'Rating (Extra)', format: 'rating', expected: 200 },
    { slug: 'ladder28', name: 'Rating 1800-1899 (Extra)', group: 'Rating (Extra)', format: 'rating', expected: 200 },
    { slug: 'ladder29', name: 'Rating 1900-1999 (Extra)', group: 'Rating (Extra)', format: 'rating', expected: 200 },
    { slug: 'ladder30', name: 'Rating 2000-2099 (Extra)', group: 'Rating (Extra)', format: 'rating', expected: 200 },
    { slug: 'ladder31', name: 'Rating 2100-2199 (Extra)', group: 'Rating (Extra)', format: 'rating', expected: 200 },
    { slug: 'ladder32', name: 'Rating >= 2200 (Extra)', group: 'Rating (Extra)', format: 'rating', expected: 200 },
];

function extractCFProblemId(url) {
    const m = url.match(/\/problem(?:set\/problem)?\/(\d+)\/([A-Za-z0-9]+)/);
    if (m) return { contestId: parseInt(m[1]), index: m[2].toUpperCase() };
    const m2 = url.match(/\/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/);
    if (m2) return { contestId: parseInt(m2[1]), index: m2[2].toUpperCase() };
    return null;
}

async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.text();
        } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
}

async function scrapeLadder(ladder) {
    const url = `${BASE}/${ladder.slug}`;
    console.log(`Fetching ${ladder.name} from ${url}...`);
    const html = await fetchWithRetry(url);
    const problems = [];

    if (ladder.format === 'div') {
        // Div format: 3 columns - ID | Problem (link+name) | Difficulty (CF rating)
        const regex = /<tr[^>]*>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<\/tr>/gi;
        let m;
        while ((m = regex.exec(html)) !== null) {
            const cf = extractCFProblemId(m[2].trim());
            problems.push({
                id: parseInt(m[1]),
                name: m[3].trim(),
                link: m[2].trim(),
                rating: parseInt(m[4]),
                difficulty: 0,
                cfContestId: cf?.contestId || null,
                cfIndex: cf?.index || null,
            });
        }
    } else {
        // Rating format: 4 columns - ID | Problem Name (link+name) | Online Judge | Difficulty Level
        const regex = /<tr[^>]*>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>\s*<\/td>\s*<td[^>]*>\s*([^<]+)\s*<\/td>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<\/tr>/gi;
        let m;
        while ((m = regex.exec(html)) !== null) {
            const cf = extractCFProblemId(m[2].trim());
            problems.push({
                id: parseInt(m[1]),
                name: m[3].trim(),
                link: m[2].trim(),
                rating: 0,
                difficulty: parseInt(m[5]),
                platform: m[4].trim(),
                cfContestId: cf?.contestId || null,
                cfIndex: cf?.index || null,
            });
        }
    }

    console.log(`  -> ${problems.length} / ${ladder.expected} problems`);
    return {
        slug: ladder.slug,
        name: ladder.name,
        group: ladder.group,
        expectedCount: ladder.expected,
        problemCount: problems.length,
        problems,
    };
}

async function main() {
    console.log(`Scraping ${LADDERS.length} ladders...\n`);
    const results = [];
    let totalProblems = 0;

    for (const ladder of LADDERS) {
        try {
            const data = await scrapeLadder(ladder);
            results.push(data);
            totalProblems += data.problems.length;
            await new Promise(r => setTimeout(r, 300));
        } catch (e) {
            console.error(`  FAILED: ${e.message}`);
            results.push({ slug: ladder.slug, name: ladder.name, group: ladder.group, expectedCount: ladder.expected, problemCount: 0, problems: [] });
        }
    }

    const output = { lastUpdated: new Date().toISOString(), totalProblems, ladders: results };
    writeFileSync('data.json', JSON.stringify(output, null, 2));
    writeFileSync('data.js', `const LADDER_DATA = ${JSON.stringify(output)};`);

    console.log(`\n=== Done ===`);
    console.log(`Total ladders: ${results.length}`);
    console.log(`Total problems: ${totalProblems}`);

    let mismatches = 0;
    for (const r of results) {
        if (r.problemCount !== r.expectedCount) {
            console.log(`  MISMATCH: ${r.name} - got ${r.problemCount}, expected ${r.expectedCount}`);
            mismatches++;
        }
    }
    if (mismatches === 0) console.log('All problem counts match!');
}

main().catch(console.error);
