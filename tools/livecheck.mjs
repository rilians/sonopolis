/* Smoke-test a deployed build.
   node tools/livecheck.mjs https://sonopolis-two.vercel.app            */
import { chromium } from 'playwright';

const url = process.argv[2] || 'https://sonopolis-two.vercel.app';
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1366, height: 768 }, // the 1366x768 class
  { name: 'phone', width: 390, height: 844 },
];

const b = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});

let failed = false;

for (const vp of VIEWPORTS) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  await p.click('.boot__btn');
  await p.waitForTimeout(2500);
  await p.click('.btn-listen');
  await p.waitForTimeout(2500);

  const state = await p.evaluate(() => {
    const rect = (s) => document.querySelector(s)?.getBoundingClientRect() ?? null;
    const hitOf = (sel) => {
      const r = rect(sel);
      if (!r) return 'missing';
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!el) return 'missing';
      return el.closest(sel) ? 'ok' : 'BLOCKED by ' + String(el.className).slice(0, 24);
    };
    const panel = rect('.panel');
    const dock = rect('.dock');
    return {
      beacons: document.querySelectorAll('.beacon').length,
      plates: document.querySelectorAll('.plate').length,
      channel: document.querySelector('.read-block__v')?.textContent,
      level: document.querySelectorAll('.read-block__v')[1]?.textContent,
      cardBottom: Math.round(panel?.bottom ?? 0),
      dockTop: Math.round(dock?.top ?? 0),
      gaps: Math.round((dock?.top ?? 0) - (panel?.bottom ?? 0)),
      overflow: document.querySelector('.panel').scrollHeight - Math.round(panel.height),
      listen: hitOf('.btn-listen'),
      locate: hitOf('.btn-ghost'),
      isolate: hitOf('.btn-ghost--icon'),
    };
  });

  const ok =
    state.beacons === 10 &&
    state.plates === 10 &&
    state.overflow <= 1 &&
    state.listen === 'ok' &&
    state.locate === 'ok' &&
    state.isolate === 'ok' &&
    state.gaps >= 0 &&
    errs.length === 0;

  if (!ok) failed = true;
  console.log(`${ok ? '✓' : '✗'} ${vp.name} ${vp.width}x${vp.height}`, JSON.stringify({ ...state, errors: errs.slice(0, 3) }));
  await p.close();
}

await b.close();
process.exit(failed ? 1 : 0);
