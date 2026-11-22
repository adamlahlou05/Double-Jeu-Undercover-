// Fabrique l'icône de l'application et les visuels de la fiche Play Store à partir du logo vectoriel
// (web/js/logo.js) : calques de l'icône adaptative Android, icône 512 px, bannière 1024 × 500.
// Usage : node scripts/make-icons.mjs   (CHROME_PATH pour désigner le navigateur)
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { logoArt, logoMono } from '../web/js/logo.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const res = `${root}android/app/src/main/res`;
const COBALT = '#2A3CE6';
const svg = (inner, box = '0 0 108 108') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="100%" height="100%">${inner}</svg>`;
const page = (body, css = '') => `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:transparent}${css}</style>${body}`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
async function shot(html, w, h, path, transparent = false) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.setContent(html);
  await p.waitForTimeout(150);
  await p.screenshot({ path, omitBackground: transparent });
  await p.close();
}

// 1. Icône adaptative : avant-plan et silhouette, dans les cinq densités (108 dp).
for (const [dir, px] of [['mdpi', 108], ['hdpi', 162], ['xhdpi', 216], ['xxhdpi', 324], ['xxxhdpi', 432]]) {
  await mkdir(`${res}/mipmap-${dir}`, { recursive: true });
  await shot(page(svg(logoArt())), px, px, `${res}/mipmap-${dir}/ic_launcher_foreground.png`, true);
  await shot(page(svg(logoMono())), px, px, `${res}/mipmap-${dir}/ic_launcher_monochrome.png`, true);
}

// 2. Icône de la fiche Play Store : 512 × 512, carré plein (Google applique lui-même les coins arrondis).
const glow = `<defs><radialGradient id="g" cx="50%" cy="42%" r="65%"><stop offset="0" stop-color="#3D52FF"/><stop offset="1" stop-color="${COBALT}"/></radialGradient></defs><rect x="14" y="14" width="80" height="80" fill="url(#g)"/>`;
await mkdir(`${root}store`, { recursive: true });
await shot(page(svg(glow + logoArt(), '14 14 80 80')), 512, 512, `${root}store/icone-512.png`);

// 3. Bannière de la fiche (« feature graphic ») : 1024 × 500.
const font = (await readFile(`${root}web/fonts/fraunces-latin-soft-normal.woff2`).catch(() => null));
const face = font ? `@font-face{font-family:Fr;src:url(data:font/woff2;base64,${font.toString('base64')});font-weight:100 900}` : '';
await shot(page(`<div class="b"><div class="t"><h1>Double<br>Jeu</h1><p>Un mot secret, un intrus,<br>et beaucoup de bluff.</p></div><div class="a">${svg(logoArt(), '18 18 72 72')}</div></div>`,
  `${face}.b{width:1024px;height:500px;background:radial-gradient(circle at 72% 45%,#3D52FF,${COBALT} 62%);display:flex;align-items:center;color:#fff;font-family:Fr,Georgia,serif;overflow:hidden}
.t{padding-left:74px;width:480px}h1{margin:0;font-size:118px;line-height:.86;font-weight:900;letter-spacing:-2px}p{margin:26px 0 0;font:600 30px/1.25 system-ui,sans-serif;opacity:.92}
.a{width:520px;height:520px;margin-left:-10px}`), 1024, 500, `${root}store/banniere-1024x500.png`);

await browser.close();
console.log('Icônes et visuels écrits dans android/app/src/main/res et store/.');
