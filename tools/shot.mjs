import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:5173/';
const out = process.argv[3] || '/tmp/shot.png';
const click = process.argv[4] || '';
const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1512, height: 950 }, deviceScaleFactor: 1 });
const errs = [];
page.on('console', m => { if (m.type()==='error' || m.type()==='warning') errs.push(m.type()+': '+m.text().slice(0,300)); });
page.on('pageerror', e => errs.push('PAGEERROR: '+e.message.slice(0,300)));
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(2500);
if (click) { await page.click(click).catch(e=>errs.push('clickfail '+e.message)); }
await page.waitForTimeout(3000);
await page.screenshot({ path: out });
console.log('ERRORS:\n' + errs.slice(0,25).join('\n'));
await browser.close();
