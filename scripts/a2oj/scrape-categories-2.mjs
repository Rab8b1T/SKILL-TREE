// Fetch the 13 directly-linked categories that the main scraper missed
import { readFileSync, writeFileSync } from 'fs';

const BASE_URL = 'https://a2oj.netlify.app';

// These are the categories with direct URLs visible on the main page
const MISSING_CATEGORIES = [
  { id: 101, name: 'Implementation', url: `${BASE_URL}/implementation`, expectedCount: 1054 },
  { id: 102, name: 'math', url: `${BASE_URL}/math`, expectedCount: 679 },
  { id: 103, name: 'Greedy', url: `${BASE_URL}/greedy`, expectedCount: 599 },
  { id: 104, name: 'sortings', url: `${BASE_URL}/sortings`, expectedCount: 316 },
  { id: 105, name: 'Graphs', url: `${BASE_URL}/graphs`, expectedCount: 291 },
  { id: 106, name: 'Geometry', url: `${BASE_URL}/geometry`, expectedCount: 254 },
  { id: 107, name: 'Number Theory', url: `${BASE_URL}/numbertheory`, expectedCount: 251 },
  { id: 108, name: 'strings', url: `${BASE_URL}/strings`, expectedCount: 216 },
  { id: 109, name: 'combinatorics', url: `${BASE_URL}/combinatorics`, expectedCount: 215 },
  { id: 110, name: 'trees', url: `${BASE_URL}/trees`, expectedCount: 202 },
  { id: 111, name: 'probabilities', url: `${BASE_URL}/probabilities`, expectedCount: 153 },
  { id: 112, name: 'dsu', url: `${BASE_URL}/dsu`, expectedCount: 116 },
  { id: 113, name: 'bitmasks', url: `${BASE_URL}/bitmasks`, expectedCount: 113 },
];

function decodeHTMLEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&ndash;/g, '\u2013')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}

function detectPlatform(link) {
  if (!link) return 'Unknown';
  const l = link.toLowerCase();
  if (l.includes('codeforces.com')) return 'Codeforces';
  if (l.includes('spoj.com') || l.includes('spoj.pl') || l.includes('spoj.br') || l.includes('pl.spoj')) return 'SPOJ';
  if (l.includes('uva.onlinejudge.org')) return 'UVA';
  if (l.includes('urionlinejudge.com') || l.includes('beecrowd.com')) return 'URI';
  if (l.includes('codechef.com')) return 'CodeChef';
  if (l.includes('topcoder.com')) return 'TopCoder';
  if (l.includes('acm.timus.ru')) return 'Timus';
  if (l.includes('poj.org')) return 'PKU';
  if (l.includes('tju.edu')) return 'TJU';
  if (l.includes('zju.edu')) return 'ZOJ';
  if (l.includes('icpcarchive') || l.includes('livearchive')) return 'Live Archive';
  if (l.includes('a2oj') || l.includes('p?ID=')) return 'A2OJ';
  return 'Other';
}

async function getCategoryProblems(categoryUrl) {
  const res = await fetch(categoryUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const problems = [];
  
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1];
    if (row.includes('<th')) continue;
    
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      cells.push(cellMatch[1].trim());
    }
    
    if (cells.length < 2) continue;
    
    for (let i = 0; i < Math.min(cells.length, 3); i++) {
      const linkMatch = /<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i.exec(cells[i]);
      if (linkMatch) {
        const idx = parseInt(stripTags(cells[0]));
        if (isNaN(idx)) continue;
        
        let link = decodeHTMLEntities(linkMatch[1].trim());
        const name = decodeHTMLEntities(stripTags(linkMatch[2]));
        
        if (link.startsWith('p?ID=')) link = `https://a2oj.com/${link}`;
        
        const platformFromLink = detectPlatform(link);
        let platformText = cells[i + 1] ? decodeHTMLEntities(stripTags(cells[i + 1])).trim() : '';
        let platform = platformText || platformFromLink;
        if (platform.includes('SPOJ')) platform = 'SPOJ';
        
        let year = cells[i + 2] ? decodeHTMLEntities(stripTags(cells[i + 2])).trim() : '';
        let contest = cells[i + 3] ? decodeHTMLEntities(stripTags(cells[i + 3])).trim() : '';
        let difficulty = parseInt(stripTags(cells[cells.length - 1])) || 0;
        
        const problem = { id: idx, name, link, platform, year, contest, difficulty };
        
        if (platformFromLink === 'Codeforces') {
          const cfMatch = link.match(/problem\/(\d+)\/([A-Z]\d?)/i);
          if (cfMatch) {
            problem.cfContestId = parseInt(cfMatch[1]);
            problem.cfIndex = cfMatch[2].toUpperCase();
          }
        }
        
        problems.push(problem);
        break;
      }
    }
  }
  
  return problems;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Load existing data
  const existingJson = JSON.parse(readFileSync('./data.json', 'utf-8'));
  const existingNames = new Set(existingJson.categories.map(c => c.name.toLowerCase()));
  
  console.log(`Existing data: ${existingJson.categories.length} categories`);
  
  let added = 0;
  
  for (const cat of MISSING_CATEGORIES) {
    // Skip if already exists (case-insensitive check)
    if (existingNames.has(cat.name.toLowerCase())) {
      console.log(`"${cat.name}" already exists, skipping`);
      continue;
    }
    
    process.stdout.write(`Fetching "${cat.name}" from ${cat.url}... `);
    
    try {
      const problems = await getCategoryProblems(cat.url);
      const slug = cat.name.toLowerCase()
        .replace(/[&]/g, 'and')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      existingJson.categories.push({
        id: cat.id,
        name: cat.name,
        slug,
        problemCount: problems.length,
        expectedCount: cat.expectedCount,
        problems
      });
      
      added++;
      console.log(`OK (${problems.length} problems)`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
    
    await sleep(700);
  }
  
  // Sort categories by problem count descending (matching original order)
  existingJson.categories.sort((a, b) => b.problemCount - a.problemCount);
  
  // Reassign IDs
  existingJson.categories.forEach((cat, i) => { cat.id = i + 1; });
  
  // Update metadata
  existingJson.lastUpdated = new Date().toISOString();
  const totalProblems = existingJson.categories.reduce((sum, c) => sum + c.problemCount, 0);
  
  console.log(`\nAdded ${added} categories`);
  console.log(`Total: ${existingJson.categories.length} categories, ${totalProblems} problems`);
  
  // Save
  const jsContent = `// A2OJ Problem Data - Auto-generated on ${new Date().toISOString()}
// Total: ${totalProblems} problems across ${existingJson.categories.length} categories
const A2OJ_DATA = ${JSON.stringify(existingJson, null, 2)};
`;
  
  writeFileSync('./data.js', jsContent);
  writeFileSync('./data.json', JSON.stringify(existingJson, null, 2));
  console.log('Saved updated data.js and data.json');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
