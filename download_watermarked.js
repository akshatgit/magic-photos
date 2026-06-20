/**
 * download_watermarked.js
 *
 * Downloads the public, watermarked preview images for a Magic Memories album.
 * These are the same images a logged-out visitor sees on the album page — no
 * authentication and no purchase bypass. The public API rejects direct requests
 * unless the Origin is the storefront, so we load the real album page in a
 * headless browser and let its own session fetch the watermarked variants.
 *
 * Usage: node download_watermarked.js
 * Requires: puppeteer-core + a local Chrome at /usr/bin/google-chrome
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ALBUM_CODE = 'SPSTI205AEKX0';
const ALBUM_URL  = `https://mymagicphotos.com/dep/?c=${ALBUM_CODE}&s=SPST&dm=cc`;
const API_BASE   = 'https://public-api.mmos.magicmemories.com/api/v1';
const OUT_DIR    = path.join(__dirname, 'downloads');

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  // Load the album page so the browser holds the storefront session/Origin
  // that the public API requires.
  await page.goto(ALBUM_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // Pull the album metadata (public endpoint) to get the content IDs.
  const contentIds = await page.evaluate(async (apiBase, code) => {
    const res = await fetch(`${apiBase}/albums/${code}?page=1&size=1000`);
    const data = await res.json();
    return (data.contents || []).map(c => c.id);
  }, API_BASE, ALBUM_CODE);

  console.log(`Found ${contentIds.length} photos`);

  // Fetch each watermarked preview through the authenticated page session.
  let n = 0;
  for (const id of contentIds) {
    n++;
    const bytes = await page.evaluate(async (apiBase, id) => {
      const res = await fetch(`${apiBase}/contents/${id}/watermarked.jpg`);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return Array.from(new Uint8Array(buf));
    }, API_BASE, id);

    if (!bytes) { console.log(`  [${n}] FAILED ${id}`); continue; }

    const file = path.join(OUT_DIR, `photo_${String(n).padStart(2, '0')}_${id}.jpg`);
    fs.writeFileSync(file, Buffer.from(bytes));
    console.log(`  [${n}/${contentIds.length}] ${id}: ${Math.round(bytes.length / 1024)}KB`);
  }

  await browser.close();
  console.log(`\nDone — saved to ${OUT_DIR}`);
})().catch(e => { console.error(e); process.exit(1); });
