const fs = require('fs');
const path = require('path');

const SONGS_DIR = path.join(process.cwd(), 'public', 'songs');
const OUT = path.join(process.cwd(), 'testing', 'song-link-slug-validation.json');
const URL_RE = /https?:\/\/[^"'\s<>]+/g;

function main() {
  const files = fs.readdirSync(SONGS_DIR).filter((f) => f.endsWith('.json'));
  const slugSet = new Set(files.map((f) => f.replace(/\.json$/, '')));

  const broken = [];
  let checked = 0;

  for (const file of files) {
    const content = fs.readFileSync(path.join(SONGS_DIR, file), 'utf8');
    const urls = content.match(URL_RE) || [];

    for (let url of urls) {
      url = url.replace(/\\\//g, '/').replace(/\\+$/g, '');
      const match = url.match(/^https?:\/\/tsonglyrics\.com\/([^?#]+)$/);
      if (!match) continue;

      const route = match[1];
      if (!route.endsWith('.html')) continue;

      checked += 1;
      const slug = route.replace(/\.html$/, '').replace(/\/$/, '');

      if (!slugSet.has(slug)) {
        broken.push({ file, url, slug });
      }
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ checked, brokenCount: broken.length, broken }, null, 2));

  console.log(JSON.stringify({ checked, brokenCount: broken.length }, null, 2));
  for (const row of broken.slice(0, 30)) {
    console.log(`${row.file} -> ${row.url}`);
  }
}

main();
