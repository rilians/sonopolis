/* regenerate the README gallery into docs/ */
import { chromium } from 'playwright';

const b = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const errs = [];
const ctx = await b.newContext({ viewport: { width: 1512, height: 950 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

await p.goto('http://localhost:5173/');
await p.waitForTimeout(1200);
await p.screenshot({ path: 'docs/01-boot.png', timeout: 60000 });

await p.click('.boot__btn');
await p.waitForTimeout(1600);
await p.click('.btn-listen');
await p.waitForTimeout(3200);
await p.screenshot({ path: 'docs/02-city-night.png', timeout: 60000 });

// panel close-up: spectrum mode + signature strip
await p.click('.modes button:nth-child(2)');
await p.waitForTimeout(1600);
await p.screenshot({ path: 'docs/03-panel-spectrum.png', clip: { x: 1104, y: 88, width: 400, height: 620 }, timeout: 60000 });
await p.click('.modes button:nth-child(3)');

// auto scan
await p.click('.tour');
await p.waitForTimeout(10500);
await p.screenshot({ path: 'docs/04-auto-scan.png', timeout: 60000 });
await p.click('.tour');
await p.waitForTimeout(700);

// noon
await p.keyboard.press('n');
await p.waitForTimeout(3200);
await p.screenshot({ path: 'docs/05-city-noon.png', timeout: 60000 });

// dusk via the dial
const box = await (await p.$('.dial__svg')).boundingBox();
await p.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.06);
await p.mouse.down();
await p.mouse.move(box.x + box.width * 0.84, box.y + box.height * 0.4, { steps: 14 });
await p.mouse.up();
await p.waitForTimeout(3000);
await p.screenshot({ path: 'docs/06-city-dusk.png', timeout: 60000 });

// isolate
await p.click('.btn-ghost--icon');
await p.waitForTimeout(1800);
await p.screenshot({ path: 'docs/07-isolate.png', timeout: 60000 });
await p.keyboard.press('Escape');
await p.waitForTimeout(1200);
await ctx.close();

// phone + tablet
for (const [path, w, h] of [['docs/08-mobile.png', 390, 844], ['docs/09-tablet.png', 768, 1024]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const q = await c.newPage();
  q.on('pageerror', (e) => errs.push('mobile pageerror: ' + e.message));
  await q.goto('http://localhost:5173/');
  await q.waitForTimeout(1200);
  await q.click('.boot__btn');
  await q.waitForTimeout(1500);
  await q.click('.btn-listen');
  await q.waitForTimeout(2600);
  await q.screenshot({ path, timeout: 60000 });
  await c.close();
}

console.log('errors:', errs.length ? errs.slice(0, 5) : 'none');
await b.close();
