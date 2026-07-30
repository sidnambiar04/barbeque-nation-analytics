const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { recognize } = require('tesseract.js');

(async () => {
  console.log('starting probe');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.barbequenation.com/restaurants/bangalore/j-p-nagar', { waitUntil: 'domcontentloaded' });
  console.log('page loaded');
  await page.locator('#menu-section img[alt="Menu item"]').nth(2).click({ force: true });
  await page.waitForTimeout(1000);
  const src = await page.locator('[role="dialog"] img').nth(2).getAttribute('src');
  console.log('image src:', src);
  const b64 = await page.evaluate(async (u) => {
    const res = await fetch(u, { headers: { referer: location.href } });
    const buf = await res.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }, src);
  const imgPath = path.join(process.cwd(), 'tmp_menu.jpg');
  fs.writeFileSync(imgPath, Buffer.from(b64, 'base64'));
  console.log('saved image:', imgPath);
  const { data } = await recognize(imgPath, 'eng');
  console.log('LINE_COUNT:', (data.lines || []).length);
  console.log('TEXT:\n', data.text.slice(0, 4000));
  console.log('LINES:\n', (data.lines || []).slice(0, 80).map((line, index) => `${index + 1}. ${line.text} | conf=${line.confidence} | bbox=${JSON.stringify(line.bbox)}`).join('\n'));
  await browser.close();
})();
