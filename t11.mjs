import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1363, height: 671 } });
await p.goto('http://localhost:5173/');
await p.waitForTimeout(1000);
await p.click('.boot__btn');
await p.waitForTimeout(1800);
console.log(await p.evaluate(() => {
  const r = (s) => { const e=document.querySelector(s); if(!e) return null; const b=e.getBoundingClientRect(); return {t:Math.round(b.top),b:Math.round(b.bottom),h:Math.round(b.height)}; };
  const btn = document.querySelector('.btn-listen');
  const bb = btn.getBoundingClientRect();
  const hit = document.elementFromPoint(bb.left + bb.width/2, bb.top + bb.height/2);
  return {
    panel: r('.panel'), dock: r('.dock'), ribbon: r('.ribbon'),
    btn: {t: Math.round(bb.top), b: Math.round(bb.bottom)},
    hit: hit ? hit.className.toString().slice(0,40) : null,
    panelScroll: document.querySelector('.panel').scrollHeight,
    vh: innerHeight,
  };
}));
await p.screenshot({ path: '/tmp/x671.png', timeout: 60000 });
await b.close();
