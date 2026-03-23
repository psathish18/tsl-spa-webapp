const fs = require('fs');
const path = require('path');

const SONGS_DIR = path.join(process.cwd(), 'public', 'songs');
const OUTPUT_PATH = path.join(process.cwd(), 'testing', 'tsonglyrics-link-audit.json');
const URL_RE = /https?:\/\/[^"'\s<>]+/g;
const CONCURRENCY = 20;

function collectUrls() {
  const files = fs.readdirSync(SONGS_DIR).filter((f) => f.endsWith('.json'));
  const urls = new Set();

  for (const file of files) {
    const fullPath = path.join(SONGS_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const matches = content.match(URL_RE) || [];

    for (let url of matches) {
      url = url.replace(/\\\//g, '/').replace(/\\+$/g, '');
      if (url.includes('tsonglyrics.com')) {
        urls.add(url);
      }
    }
  }

  return [...urls];
}

async function checkUrl(url) {
  try {
    const first = await fetch(url, { method: 'GET', redirect: 'manual' });
    const location = first.headers.get('location');

    let finalStatus = first.status;
    let finalUrl = url;

    if (first.status >= 300 && first.status < 400 && location) {
      const nextUrl = new URL(location, url).toString();
      finalUrl = nextUrl;
      try {
        const second = await fetch(nextUrl, { method: 'GET', redirect: 'manual' });
        finalStatus = second.status;
      } catch {
        // Keep first response details if follow-up fails.
      }
    }

    return {
      url,
      status: first.status,
      location,
      finalStatus,
      finalUrl,
    };
  } catch (error) {
    return {
      url,
      error: String(error),
    };
  }
}

async function run() {
  const urls = collectUrls();
  const results = new Array(urls.length);
  let index = 0;

  async function worker() {
    while (true) {
      const i = index;
      index += 1;
      if (i >= urls.length) return;

      results[i] = await checkUrl(urls[i]);

      if ((i + 1) % 100 === 0) {
        process.stdout.write(`Checked ${i + 1}/${urls.length}\n`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const summary = {
    total: results.length,
    ok200: results.filter((r) => r.status === 200).length,
    redirect3xx: results.filter((r) => r.status >= 300 && r.status < 400).length,
    notFound404: results.filter((r) => r.status === 404 || r.finalStatus === 404).length,
    error: results.filter((r) => r.error).length,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ summary, results }, null, 2));

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Report written to ${OUTPUT_PATH}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
