/* smoke-test a deployed build: node tools/livecheck.mjs https://... */
import { chromium } from 'playwright';
const url = process.argv[2] || 'https://sonopolis-two.vercel.app';
const b = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const t0 = Date.now();
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.click('.boot__btn');
await p.waitForTimeout(2500);
await p.click('.btn-listen');
await p.waitForTimeout(3000);
const state = await p.evaluate(() => ({
  beacons: document.querySelectorAll('.beacon').length,
  tags: document.querySelectorAll('.district-tag').length,
  plates: document.querySelectorAll('.plate').length,
  channel: document.querySelector('.read-block__v')?.textContent,
  level: document.querySelectorAll('.read-block__v')[1]?.textContent,
  sig: document.querySelector('.sig-strip__peak')?.textContent,
  hour: document.querySelector('.dial__time')?.textContent,
}));
await p.screenshot({ path: '/tmp/live.png', timeout: 60000 });
console.log({ url, ms: Date.now() - t0, ...state, errors: errs.length ? errs.slice(0, 4) : 'none' });
await b.close();
