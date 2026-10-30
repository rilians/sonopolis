import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:5173/');
await p.waitForTimeout(900);
await p.click('.boot__btn');
await p.waitForTimeout(600);
await p.click('.btn-listen');
await p.waitForTimeout(1500);
const out=[];
for (let i=1;i<=10;i++){
  await p.click(`.plate:nth-child(${i})`);
  await p.waitForTimeout(1800);
  const r = await p.evaluate(()=>({s:window.__sonopolis.scene?.id, lvl:+window.__sonopolis.level.toFixed(3), db:window.__sonopolis.db(), peak:+(window.__sonopolis.peak).toFixed(3)}));
  out.push(r);
}
console.log(out.map(o=>`${o.s.padEnd(12)} lvl ${o.lvl}  db ${o.db}`).join('\n'));
await b.close();
