import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
for (const [path, w, h] of [['/tmp/m_844x390.png', 844, 390], ['/tmp/m_390b.png', 390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('http://localhost:5173/');
  await p.waitForTimeout(1000);
  await p.click('.boot__btn');
  await p.waitForTimeout(1400);
  await p.click('.btn-listen');
  await p.waitForTimeout(2200);
  // scroll panel back to top to see the head
  await p.evaluate(() => document.querySelectorAll('.panel').forEach(p => (p.scrollTop = 0)));
  await p.waitForTimeout(400);
  await p.screenshot({ path, timeout: 60000 });
  await ctx.close();
}
await b.close();
