import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
for (const [w,h] of [[1366,671],[1366,700],[1440,721],[1440,760],[1440,800],[1920,950]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('http://localhost:5173/');
  await p.waitForTimeout(800);
  await p.click('.boot__btn');
  await p.waitForTimeout(1500);
  const m = await p.evaluate(() => {
    const panel = document.querySelector('.panel');
    const pr = panel.getBoundingClientRect();
    const dr = document.querySelector('.dock').getBoundingClientRect();
    const ok = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); const el = document.elementFromPoint(r.left+r.width/2, r.top+r.height/2); return el && (el.closest(sel) ? 'ok' : 'BLOCKED'); };
    return {
      bottom: Math.round(pr.bottom), dock: Math.round(dr.top),
      overflow: panel.scrollHeight - Math.round(pr.height),
      desc: getComputedStyle(document.querySelector('.panel__desc')).display,
      listen: ok('.btn-listen'), locate: ok('.btn-ghost'), iso: ok('.btn-ghost--icon'),
    };
  });
  console.log(`${w}x${h}`, JSON.stringify(m));
  await p.close();
}
await b.close();
