import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1512, height: 950 } });
await p.goto('http://localhost:5173/');
await p.waitForTimeout(1000);
await p.click('.boot__btn');
await p.waitForTimeout(1600);
const box = await (await p.$('.dial__svg')).boundingBox();
await p.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.06);
await p.mouse.down();
await p.mouse.move(box.x + box.width * 0.84, box.y + box.height * 0.40, { steps: 12 });
await p.mouse.up();
await p.waitForTimeout(2200);
console.log(await p.evaluate(() => {
  const m = window.__map;
  return {
    bg: m.getPaintProperty('bg', 'background-color'),
    block: JSON.stringify(m.getPaintProperty('blocks', 'fill-extrusion-color')).slice(0, 120),
    loaded: m.isStyleLoaded(),
    hour: document.querySelector('.dial__time').textContent,
  };
}));
await b.close();
