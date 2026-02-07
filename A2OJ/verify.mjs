// Verify scraped data against user-provided URLs
import { readFileSync } from 'fs';

const REAL_URLS = [
  { name: 'Dynamic Programming', url: 'https://a2oj.netlify.app/dynamic%20programming' },
  { name: 'Implementation', url: 'https://a2oj.netlify.app/implementation' },
  { name: 'math', url: 'https://a2oj.netlify.app/math' },
  { name: 'Greedy', url: 'https://a2oj.netlify.app/greedy' },
  { name: 'DFS & BFS & Dijkstra', url: 'https://a2oj.netlify.app/dfs%20&%20bfs%20&%20dijkstra' },
  { name: 'brute force', url: 'https://a2oj.netlify.app/brute%20force.html' },
  { name: 'data structures', url: 'https://a2oj.netlify.app/data%20structure.html' },
  { name: 'Binary Search & Ternary Search', url: 'https://a2oj.netlify.app/binary%20&%20ternary%20search' },
  { name: 'constructive algorithms', url: 'https://a2oj.netlify.app/constructive%20algorithms.html' },
  { name: 'sortings', url: 'https://a2oj.netlify.app/sortings' },
  { name: 'Graphs', url: 'https://a2oj.netlify.app/graphs' },
  { name: 'Geometry', url: 'https://a2oj.netlify.app/geometry' },
  { name: 'Number Theory', url: 'https://a2oj.netlify.app/numbertheory' },
  { name: 'strings', url: 'https://a2oj.netlify.app/strings' },
  { name: 'combinatorics', url: 'https://a2oj.netlify.app/combinatorics' },
  { name: 'trees', url: 'https://a2oj.netlify.app/trees' },
  { name: 'Segment Tree', url: 'https://a2oj.netlify.app/segment%20tree' },
  { name: 'Network Flow', url: 'https://a2oj.netlify.app/network%20flow' },
  { name: 'probabilities', url: 'https://a2oj.netlify.app/probabilities' },
  { name: 'two pointers', url: 'https://a2oj.netlify.app/two%20pointers.html' },
  { name: 'dsu', url: 'https://a2oj.netlify.app/dsu' },
  { name: 'bitmasks', url: 'https://a2oj.netlify.app/bitmasks' },
  { name: 'Matrix Power', url: 'https://a2oj.netlify.app/matrix%20power' },
];

// Load our scraped data
const data = JSON.parse(readFileSync('./data.json', 'utf-8'));

function countProblemsInHtml(html) {
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let count = 0;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const row = match[1];
    if (row.includes('<th')) continue;
    if (/<a\s+href="[^"]*"[^>]*>[\s\S]*?<\/a>/i.test(row)) count++;
  }
  return count;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('Verifying scraped data against real URLs...\n');
  console.log('Category'.padEnd(35), 'Our Data'.padEnd(10), 'Real URL'.padEnd(10), 'Match?');
  console.log('-'.repeat(70));

  let allMatch = true;
  let totalOurs = 0, totalReal = 0;

  for (const entry of REAL_URLS) {
    // Find in our data (case-insensitive)
    const ourCat = data.categories.find(c => 
      c.name.toLowerCase() === entry.name.toLowerCase()
    );
    const ourCount = ourCat ? ourCat.problemCount : 0;
    totalOurs += ourCount;

    // Fetch real URL
    let realCount = '?';
    try {
      const res = await fetch(entry.url);
      if (res.ok) {
        const html = await res.text();
        realCount = countProblemsInHtml(html);
        totalReal += realCount;
      } else {
        realCount = `ERR ${res.status}`;
      }
    } catch (e) {
      realCount = `ERR: ${e.message}`;
    }

    const match = ourCount === realCount ? 'YES' : 'NO <<<';
    if (ourCount !== realCount) allMatch = false;

    console.log(
      entry.name.padEnd(35),
      String(ourCount).padEnd(10),
      String(realCount).padEnd(10),
      match
    );

    await sleep(300);
  }

  console.log('-'.repeat(70));
  console.log('TOTAL'.padEnd(35), String(totalOurs).padEnd(10), String(totalReal).padEnd(10));
  console.log(`\n${allMatch ? 'ALL MATCH - Scraping is correct!' : 'MISMATCHES FOUND - Need to re-scrape!'}`);
}

main();
