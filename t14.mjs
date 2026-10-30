import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
for (const [w,h] of [[1440,721],[1440,750],[1440,760],[1366,768],[1536,864]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('http://localhost:5173/');
  await p.waitForTimeout(700);
  await p.click('.boot__btn');
  await p.waitForTimeout(1400);
  const m = await p.evaluate(() => {
    const panel = document.querySelector('.panel');
    const pr = panel.getBoundingClientRect();
    const dr = document.querySelector('.dock').getBoundingClientRect();
    return { gap: Math.round(dr.top - pr.bottom), overflow: panel.scrollHeight - Math.round(pr.height), desc: getComputedStyle(document.querySelector('.panel__desc')).display };
  });
  console.log(`${w}x${h}`, JSON.stringify(m));
  await p.close();
}
await b.close();
