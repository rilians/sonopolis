import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
for (const [w,h,shot] of [[1363,671,'/tmp/s671.png'],[1440,800,'/tmp/s800.png'],[1512,950,'/tmp/s950.png'],[1280,720,null]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('http://localhost:5173/');
  await p.waitForTimeout(900);
  await p.click('.boot__btn');
  await p.waitForTimeout(1700);
  const m = await p.evaluate(() => {
    const panel = document.querySelector('.panel');
    const pr = panel.getBoundingClientRect();
    const dr = document.querySelector('.dock').getBoundingClientRect();
    const btn = document.querySelector('.btn-listen').getBoundingClientRect();
    const hit = document.elementFromPoint(btn.left + btn.width/2, btn.top + btn.height/2);
    const loc = document.querySelector('.btn-ghost').getBoundingClientRect();
    const hit2 = document.elementFromPoint(loc.left + loc.width/2, loc.top + loc.height/2);
    const iso = document.querySelector('.btn-ghost--icon').getBoundingClientRect();
    const hit3 = document.elementFromPoint(iso.left + iso.width/2, iso.top + iso.height/2);
    return {
      panelBottom: Math.round(pr.bottom), dockTop: Math.round(dr.top),
      overflow: panel.scrollHeight - Math.round(pr.height),
      listen: hit?.className.toString().slice(0,20), locate: hit2?.className.toString().slice(0,20), isolate: hit3?.className.toString().slice(0,20),
      clipped: pr.bottom > dr.top,
    };
  });
  console.log(w+'x'+h, JSON.stringify(m));
  if (shot) await p.screenshot({ path: shot, timeout: 60000 });
  await p.close();
}
await b.close();
