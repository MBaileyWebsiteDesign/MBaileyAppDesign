// Renders app icons and the social share image from SVG/HTML. Run: node scripts/make-images.mjs
// Outputs to src/assets/img (committed), so the production build doesn't need a browser.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFile } from 'node:fs/promises';

const OUT = 'src/assets/img';
const fav = await readFile(`${OUT}/favicon.svg`, 'utf8');
const mark = await readFile(`${OUT}/logo-mark.svg`, 'utf8');
const bric = (await readFile('node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2')).toString('base64');
const inst = (await readFile('node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-standard-normal.woff2')).toString('base64');

const browser = await chromium.launch();
const page = await browser.newPage();

async function shot(html, w, h, path) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><head><style>
    @font-face{font-family:B;src:url(data:font/woff2;base64,${bric}) format("woff2-variations");font-weight:200 800;font-stretch:75% 100%}
    @font-face{font-family:I;src:url(data:font/woff2;base64,${inst}) format("woff2-variations");font-weight:400 700}
    html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}</style></head><body>${html}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path, omitBackground: false });
}

const square = (size, pad) => `<div style="width:${size}px;height:${size}px;background:#0A1220;display:grid;place-items:center">
  <div style="width:${size - pad * 2}px">${mark.replace('<svg ', '<svg width="100%" ')}</div></div>`;

for (const s of [192, 512]) await shot(fav.replace('<svg ', `<svg width="${s}" height="${s}" `), s, s, `${OUT}/icon-${s}.png`);
await shot(square(512, 110), 512, 512, `${OUT}/icon-maskable-512.png`);
await shot(square(180, 30), 180, 180, `${OUT}/apple-touch-icon.png`);
await shot(fav.replace('<svg ', '<svg width="32" height="32" '), 32, 32, `${OUT}/favicon-32.png`);

await shot(`<div style="width:1200px;height:630px;box-sizing:border-box;padding:80px 90px;background:
    radial-gradient(600px 420px at 85% 30%, rgba(99,228,224,.18), transparent 70%), #0A1220;color:#F5F8FA;font-family:I;display:flex;flex-direction:column;justify-content:space-between">
    <div style="display:flex;align-items:center;gap:20px">
      <div style="width:64px">${mark.replace('<svg ', '<svg width="64" height="64" ')}</div>
      <div style="font:700 34px B;font-stretch:88%">M Bailey <span style="font-weight:400;color:#9DB4C8">App Design</span></div>
    </div>
    <div style="font:700 92px/0.98 B;font-stretch:82%;letter-spacing:-0.035em;max-width:900px">Apps that work everywhere.<br><span style="color:#9DB4C8;font-weight:500">Built for the web.</span></div>
    <div style="font-size:28px;color:#9DB4C8">Bespoke web applications for phone, tablet and desktop &nbsp;<span style="color:#63E4E0">mbaileyappdesign.co.uk</span></div>
  </div>`, 1200, 630, `${OUT}/og.png`);

await browser.close();
console.log('Images written to', OUT);
