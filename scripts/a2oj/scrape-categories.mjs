// A2OJ Data Scraper v2 - Targeted approach
// Run with: node scraper.mjs

const BASE_URL = 'https://a2oj.netlify.app';

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

async function fetchHTML(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return await response.text();
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
  if (l.includes('acm.sgu.ru') || l.includes('sgu')) return 'SGU';
  if (l.includes('a2oj') || l.includes('p?ID=')) return 'A2OJ';
  return 'Other';
}

async function getCategoryProblems(categoryUrl) {
  const html = await fetchHTML(categoryUrl);
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
    
    // Find the cell with a link
    for (let i = 0; i < Math.min(cells.length, 3); i++) {
      const linkMatch = /<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i.exec(cells[i]);
      if (linkMatch) {
        const idx = parseInt(stripTags(cells[0]));
        if (isNaN(idx)) continue;
        
        let link = decodeHTMLEntities(linkMatch[1].trim());
        const name = decodeHTMLEntities(stripTags(linkMatch[2]));
        
        if (link.startsWith('p?ID=')) {
          link = `https://a2oj.com/${link}`;
        }
        
        const platformFromLink = detectPlatform(link);
        
        // Get platform text from the next cell
        let platformText = '';
        if (cells[i + 1]) platformText = decodeHTMLEntities(stripTags(cells[i + 1])).trim();
        
        // Use platform text if available and meaningful, else detect from link
        let platform = platformText || platformFromLink;
        // Clean up platform names
        if (platform === 'SPOJ Poland') platform = 'SPOJ';
        if (platform === 'SPOJ Brazil') platform = 'SPOJ';
        
        let year = '';
        if (cells[i + 2]) year = decodeHTMLEntities(stripTags(cells[i + 2])).trim();
        
        let contest = '';
        if (cells[i + 3]) contest = decodeHTMLEntities(stripTags(cells[i + 3])).trim();
        
        // Difficulty is the last cell
        let difficulty = parseInt(stripTags(cells[cells.length - 1])) || 0;
        
        const problem = { id: idx, name, link, platform, year, contest, difficulty };
        
        // Extract CF contest/problem info for API matching
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

async function getAllCategoryUrls() {
  const html = await fetchHTML(`${BASE_URL}/categories`);
  const categories = [];
  
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
    
    if (cells.length >= 3) {
      const id = parseInt(stripTags(cells[0]));
      const linkMatch = /<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i.exec(cells[1]);
      const count = parseInt(stripTags(cells[2]));
      
      if (linkMatch && id) {
        let href = decodeHTMLEntities(linkMatch[1].trim());
        const name = decodeHTMLEntities(stripTags(linkMatch[2]));
        
        if (!href.startsWith('http')) {
          if (!href.startsWith('/')) href = '/' + href;
          href = BASE_URL + href;
        }
        
        categories.push({ id, name, url: href, expectedCount: count });
      }
    }
  }
  
  return categories;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function tryFetchCategory(name, urls) {
  for (const url of urls) {
    try {
      const problems = await getCategoryProblems(url);
      if (problems.length > 0) {
        return { url, problems };
      }
    } catch (e) {
      // Try next URL
    }
    await sleep(200);
  }
  return null;
}

async function main() {
  console.log('Fetching categories from A2OJ...');
  const allCategories = await getAllCategoryUrls();
  console.log(`Found ${allCategories.length} categories in the table\n`);
  
  const data = { 
    lastUpdated: new Date().toISOString(),
    categories: [] 
  };
  
  let totalProblems = 0;
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < allCategories.length; i++) {
    const cat = allCategories[i];
    const slug = cat.name.toLowerCase()
      .replace(/[&]/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    process.stdout.write(`[${i + 1}/${allCategories.length}] "${cat.name}"... `);
    
    // Try the primary URL first
    let result = null;
    try {
      const problems = await getCategoryProblems(cat.url);
      if (problems.length > 0) {
        result = { url: cat.url, problems };
      }
    } catch (e) {
      // Primary URL failed, try alternates
    }
    
    // If primary failed, try alternate URL patterns
    if (!result) {
      const nameLower = cat.name.toLowerCase();
      const alternateUrls = [
        `${BASE_URL}/${nameLower}`,
        `${BASE_URL}/${nameLower}.html`,
        `${BASE_URL}/${encodeURIComponent(nameLower)}`,
        `${BASE_URL}/${nameLower.replace(/\s+/g, '%20')}.html`,
      ];
      // Remove duplicates and the primary URL
      const uniqueAlts = [...new Set(alternateUrls)].filter(u => u !== cat.url);
      result = await tryFetchCategory(cat.name, uniqueAlts);
    }
    
    if (result) {
      data.categories.push({
        id: cat.id,
        name: cat.name,
        slug,
        problemCount: result.problems.length,
        expectedCount: cat.expectedCount,
        problems: result.problems
      });
      totalProblems += result.problems.length;
      successCount++;
      console.log(`OK (${result.problems.length} problems)`);
    } else {
      failCount++;
      console.log(`SKIP (not available on static site)`);
    }
    
    await sleep(500);
  }
  
  console.log(`\n========================================`);
  console.log(`Success: ${successCount} categories (${totalProblems} problems)`);
  console.log(`Skipped: ${failCount} categories (not on static site)`);
  console.log(`========================================\n`);
  
  // Save as JavaScript for the web app
  const fs = await import('fs');
  const jsContent = `// A2OJ Problem Data - Auto-generated on ${new Date().toISOString()}
// Total: ${totalProblems} problems across ${data.categories.length} categories
const A2OJ_DATA = ${JSON.stringify(data, null, 2)};
`;
  
  fs.writeFileSync('./data.js', jsContent);
  console.log('Saved to data.js');
  
  fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
  console.log('Saved to data.json');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
