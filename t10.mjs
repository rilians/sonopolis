import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1512, height: 950 } });
await p.goto('http://localhost:5173/');
await p.waitForTimeout(1000);
await p.click('.boot__btn');
await p.waitForTimeout(1500);
await p.keyboard.press('n');   // -> noon
await p.waitForTimeout(2500);
await p.screenshot({ path: '/tmp/j_noon.png', timeout: 60000 });
const box = await (await p.$('.dial__svg')).boundingBox();
await p.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.06);
await p.mouse.down();
await p.mouse.move(box.x + box.width * 0.84, box.y + box.height * 0.40, { steps: 12 });
await p.mouse.up();
await p.waitForTimeout(2500);
await p.screenshot({ path: '/tmp/j_dusk.png', timeout: 60000 });
console.log(await p.evaluate(() => {
  const m = window.__map;
  return { hour: document.querySelector('.dial__time').textContent, bg: m.getPaintProperty('bg','background-color'), ink: getComputedStyle(document.documentElement).getPropertyValue('--ink') };
}));
await b.close();
