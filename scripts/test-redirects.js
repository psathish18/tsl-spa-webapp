const fs = require('fs');
const path = require('path');

async function testRedirects() {
  const results = [];
  const csvPath = path.join(__dirname, '..', 'slug_matching.csv');

  // Read and parse CSV
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  const rows = lines.slice(1).map(line => {
    const values = line.split(',');
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] ? values[i].trim() : '';
    });
    return row;
  });

  console.log(`Loaded ${rows.length} rows from CSV`);

  // Filter rows where slug equality is FALSE
  const filteredRows = rows.filter(row => row['slug equality'] === 'FALSE');
  console.log(`Filtered to ${filteredRows.length} rows where slug equality = FALSE`);

  for (const row of filteredRows) { // Test first 10 for now
    const wordpressSlug = row['wordpress slug'];
    const bloggerSlug = row['blogger_url_slug'];

    if (!wordpressSlug || !bloggerSlug) continue;

    const expectedDestination = '/' + encodeURIComponent(bloggerSlug);

    try {
          const response = await fetch(`http://localhost:3000/${wordpressSlug}`, {
        redirect: 'manual' // Don't follow redirects
      });

      const status = response.status;
      const location = response.headers.get('location');

      const isRedirect = status === 301 || status === 302 || status === 308;
      const correctRedirect = location === expectedDestination;

      results.push({
        wordpressSlug,
        bloggerSlug,
        expectedDestination,
        status,
        location,
        isRedirect,
        correctRedirect
      });

      console.log(`${wordpressSlug} -> ${status} ${location} | Expected: ${expectedDestination} | Correct: ${correctRedirect}`);

    } catch (error) {
      results.push({
        wordpressSlug,
        bloggerSlug,
        error: error.message
      });
      console.log(`${wordpressSlug} -> Error: ${error.message}`);
    }
  }

  // Summary
  const total = results.length;
  const redirects = results.filter(r => r.isRedirect).length;
  const correct = results.filter(r => r.correctRedirect).length;
  const errors = results.filter(r => r.error).length;

  console.log('\n=== SUMMARY ===');
  console.log(`Total tested: ${total}`);
  console.log(`Redirects: ${redirects}`);
  console.log(`Correct redirects: ${correct}`);
  console.log(`Errors: ${errors}`);

  // Save results to file
  fs.writeFileSync(path.join(__dirname, '..', 'redirect-test-results.json'), JSON.stringify(results, null, 2));
}

testRedirects().catch(console.error);