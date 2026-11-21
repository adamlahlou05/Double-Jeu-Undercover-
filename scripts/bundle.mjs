// Fabrique dist/double-jeu.html : tout le jeu dans un seul fichier (scripts, styles et polices inclus),
// pratique pour l'ouvrir d'un double-clic ou le publier comme une simple page.
// Option --no-download : pour les hébergements qui interdisent les téléchargements, l'export copie
// la sauvegarde dans le presse-papiers.
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const web = `${root}web/`;

const js = await build({ entryPoints: [`${web}js/app.js`], bundle: true, format: 'iife', minify: true, write: false, target: ['chrome80'], legalComments: 'none' });
let css = await readFile(`${web}css/app.css`, 'utf8');
const fontRe = /url\("\.\.\/fonts\/([^"]+)"\)/g;
for (const m of [...css.matchAll(fontRe)]) {
  const data = await readFile(`${web}fonts/${m[1]}`);
  css = css.replace(m[0], `url("data:font/woff2;base64,${data.toString('base64')}")`);
}
let html = await readFile(`${web}index.html`, 'utf8');
const flag = process.argv.includes('--no-download') ? '<script>window.DJ_NO_DOWNLOAD=true;</script>\n' : '';
html = html
  .replace('<link rel="stylesheet" href="css/app.css">', () => `<style>${css}</style>`)
  .replace('<script type="module" src="js/app.js"></script>', () => `${flag}<script>${js.outputFiles[0].text.replace(/<\/script/g, '<\\/script')}</script>`);
await mkdir(`${root}dist`, { recursive: true });
await writeFile(`${root}dist/double-jeu.html`, html);
console.log(`dist/double-jeu.html : ${(html.length / 1024).toFixed(0)} Ko`);
