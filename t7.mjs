import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1512, height: 950 } });
await p.goto('http://localhost:5173/');
await p.waitForTimeout(1000);
await p.click('.boot__btn');
await p.waitForTimeout(1500);
// set hour directly through a drag to ~18.2
const box = await (await p.$('.dial__svg')).boundingBox();
await p.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.06);
await p.mouse.down();
await p.mouse.move(box.x + box.width * 0.84, box.y + box.height * 0.40, { steps: 12 });
await p.mouse.up();
await p.waitForTimeout(2000);
console.log(await p.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  const haze = document.querySelector('.map-haze');
  const hz = getComputedStyle(haze);
  return {
    hazeVar: cs.getPropertyValue('--haze'),
    bgVar: cs.getPropertyValue('--bg'),
    inkVar: cs.getPropertyValue('--ink'),
    hazeBg: hz.backgroundImage.slice(0, 90),
    hazeOpacity: hz.opacity, hazeBlend: hz.mixBlendMode,
    at350700: (document.elementFromPoint(350, 700) || {}).className,
  };
}));
await b.close();
