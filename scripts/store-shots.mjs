// Captures d'écran pour la fiche Play Store : 1080 × 1920 (9:16), à partir du vrai jeu.
// Usage : node scripts/store-shots.mjs   → store/capture-1..7.png
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';
import * as E from '../web/js/engine.js';

const out = fileURLToPath(new URL('../store/', import.meta.url));
await mkdir(out, { recursive: true });
const { url, server } = await startServer(0);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR' });

// Une tablée de six, avec quelques parties déjà jouées pour le classement.
const TEAM = [['Adam', 'tomate', 'agent'], ['Léa', 'soleil', 'chat'], ['Yanis', 'menthe', 'grenouille'], ['Sarah', 'ciel', 'renard'], ['Hugo', 'lilas', 'robot'], ['Inès', 'rose', 'pingouin']];
const profiles = TEAM.map(([name, color, face], i) => ({ id: 'p' + i, name, color, face, photo: '', createdAt: 1 }));
const players = profiles.map((p) => ({ id: p.id, name: p.name, color: p.color, face: p.face }));
let seed = 7;
const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const dealAll = (g) => { while (g.phase === 'deal') g = E.confirmCard(E.pickCard(g, g.cards.findIndex((c) => c.by < 0))); return g; };
const newGame = (pair, options = { vote: 'open', timer: 120, notes: true }) => dealAll(E.createGame({ players, mode: 'classic', undercover: 1, white: 1, pair, options }, rng));
const history = [];
for (const [a, b] of [['Café', 'Thé'], ['Pile', 'Batterie'], ['Lyon', 'Marseille'], ['Guitare', 'Violon'], ['Sushi', 'Maki']]) {
  let g = newGame({ a, b, cat: 'objets', lvl: 1, key: `${a}|${b}` });
  for (let k = 0; k < 8 && g.phase !== 'end'; k++) {
    const alive = g.players.map((p, i) => (p.alive ? i : -1)).filter((i) => i >= 0);
    g = E.eliminateByShow(E.openVote(g), alive[Math.floor(rng() * alive.length)]);
    if (E.awaitingGuess(g)) g = E.skipGuess(g);
    g = E.continueAfterReveal(g, rng);
  }
  const s = E.summarize(g);
  s.at = Date.now() - history.length * 3600e3;
  history.push(s);
}
const meta = { v: 1, settings: { theme: 'light', sound: false, haptics: false, motion: false }, used: [], recent: [], custom: [], rulesSeen: true, setup: { players: profiles.map((p) => p.id), mode: 'classic', u: 1, w: 1, auto: true, levels: [1, 2], rev: 3, vote: 'open', timer: 120, notes: true } };

await page.addInitScript(() => { window.DJ_TEST = true; });
await page.goto(url);
await page.evaluate(({ meta, profiles, history }) => {
  localStorage.clear();
  localStorage.setItem('dj2:meta', JSON.stringify(meta));
  localStorage.setItem('dj2:profiles', JSON.stringify(profiles));
  localStorage.setItem('dj2:history', JSON.stringify(history));
}, { meta, profiles, history });
await page.reload();
await page.waitForTimeout(900);

let n = 0;
const snap = async () => { await page.waitForTimeout(700); await page.screenshot({ path: `${out}capture-${++n}.png` }); };
const show = async (game, stack) => {
  await page.evaluate(({ game, stack }) => {
    const d = window.__dj;
    d.DB.game = game; d.S.modal = null; d.S.stack = stack;
    d.S.gui.revealShown = true;
    d.S.gui.timer = game && game.options.timer ? { total: 120, left: 96, running: false, last: Date.now() } : null;
    d.render();
  }, { game, stack });
};
const HOME = { name: 'home', params: {} }, GAME = [HOME, { name: 'game', params: {} }];

await snap();                                                         // 1. accueil
let g = E.createGame({ players, mode: 'classic', undercover: 1, white: 1, pair: { a: 'Croissant', b: 'Pain au chocolat', cat: 'nourriture', lvl: 1, key: 'c|p' }, options: { vote: 'open', timer: 120, notes: true } }, rng);
g = E.confirmCard(E.pickCard(g, 2));
g = E.confirmCard(E.pickCard(g, 0));
await show(g, GAME); await snap();                                    // 2. distribution des cartes
g = dealAll(g);
const order = g.order;
['Beurre', 'Boulangerie', 'Matin', 'Feuilleté'].forEach((t, k) => { g = E.setClue(g, order[k], t); });
await show(g, GAME); await snap();                                    // 3. tour de parole
g = E.openVote(g);
await show(g, GAME); await snap();                                    // 4. vote
g = E.eliminateByShow(g, g.players.findIndex((p) => p.role === 'under'));
await show(g, GAME); await snap();                                    // 5. révélation
await show(null, [{ name: 'ranking', params: {} }]); await snap();    // 6. classement
await show(null, [HOME, { name: 'rules', params: {} }]); await snap(); // 7. règles

await browser.close();
server.close();
console.log(`${n} captures écrites dans store/.`);
