import { chromium, devices } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const shots = [
  ['/tmp/m_390.png', 390, 844, true],
  ['/tmp/m_768.png', 768, 1024, true],
  ['/tmp/m_844x390.png', 844, 390, false],
];
for (const [path, w, h, touch] of shots) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('http://localhost:5173/');
  await p.waitForTimeout(1000);
  await p.click('.boot__btn');
  await p.waitForTimeout(1500);
  await p.click('.btn-listen');
  await p.waitForTimeout(2500);
  await p.screenshot({ path, timeout: 60000 });
  console.log(path, errs.slice(0,3));
  await ctx.close();
}
await b.close();
