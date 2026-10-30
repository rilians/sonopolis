import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.goto('http://localhost:5173/');
await p.waitForTimeout(900);
await p.click('.boot__btn');
await p.waitForTimeout(1500);
console.log(await p.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); if(!e) return null; const b = e.getBoundingClientRect(); return {t: Math.round(b.top), b: Math.round(b.bottom), h: Math.round(b.height)}; };
  return { vh: window.innerHeight, doc: document.documentElement.clientHeight, app: r('.app'), hud: r('.hud'), dock: r('.dock'), plates: r('.plates'), plate: r('.plate'), ribbon: r('.ribbon'), panel: r('.panel'), bodyH: document.body.scrollHeight };
}));
await b.close();
