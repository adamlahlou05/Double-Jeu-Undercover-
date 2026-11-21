// Tests de bout en bout : l'application réelle, dans Chromium, à la taille d'un téléphone.
// Chaque scénario joue comme un vrai groupe (appuis à l'écran), puis vérifie l'état du jeu,
// la sauvegarde et l'affichage. Usage : npm run e2e   (CHROME_PATH pour imposer un navigateur,
// SHOTS=1 pour garder les captures d'écran dans tests/e2e/shots).

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startServer } from '../../scripts/serve.mjs';
import * as Engine from '../../web/js/engine.js';

const SHOTS = process.env.SHOTS === '1';
const OUT = fileURLToPath(new URL('./shots/', import.meta.url));
if (SHOTS) mkdirSync(OUT, { recursive: true });

const failures = [];
const errors = [];
let page;
let current = '';

const check = (cond, msg) => { if (!cond) { failures.push(`[${current}] ${msg}`); console.log(`  ✗ ${msg}`); } };
const wait = (ms) => page.waitForTimeout(ms);
const $ = (sel) => page.locator(`.screen:not(.leave) ${sel}, #modal ${sel}, #nav ${sel}`).first();
const act = (name, extra = '') => `[data-act="${name}"]${extra}`;
const tap = async (sel, pause = 90) => { await $(sel).click(); await wait(pause); };
const settle = () => wait(380);
const game = () => page.evaluate(() => (window.__dj.DB.game ? JSON.parse(JSON.stringify(window.__dj.DB.game)) : null));
const db = () => page.evaluate(() => JSON.parse(JSON.stringify({ meta: window.__dj.DB.meta, profiles: window.__dj.DB.profiles.map((p) => ({ ...p, photo: p.photo ? 'photo' : '' })), history: window.__dj.DB.history })));
const text = (sel) => $(sel).innerText();
const exists = async (sel) => (await page.locator(`.screen:not(.leave) ${sel}, #modal ${sel}`).count()) > 0;

async function shot(name) {
  const overflow = await page.evaluate(() => {
    const bad = [];
    const w = document.getElementById('app').clientWidth;
    document.querySelectorAll('.screen:not(.leave) *, #modal *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > w + 1.5 || r.left < -1.5) && !el.closest('.hero') && !el.closest('.flip') && getComputedStyle(el).position !== 'fixed') bad.push(`${el.tagName}.${el.className}`.slice(0, 60));
    });
    return bad.slice(0, 4);
  });
  check(overflow.length === 0, `débordement horizontal sur « ${name} » : ${overflow.join(' | ')}`);
  if (SHOTS) await page.screenshot({ path: `${OUT}${name}.png` });
}

const ONLY = process.env.ONLY || '';

async function scenario(name, fn) {
  if (ONLY && !name.includes(ONLY)) return;
  current = name;
  const t = Date.now();
  console.log(`▶ ${name}`);
  try {
    await fn();
  } catch (e) {
    failures.push(`[${name}] exception : ${e.message.split('\n')[0]}`);
    console.log(`  ✗ exception : ${e.message.split('\n').slice(0, 3).join(' / ')}`);
    if (SHOTS) await page.screenshot({ path: `${OUT}FAIL-${name.replace(/[^a-z0-9]+/gi, '-')}.png` }).catch(() => {});
  }
  console.log(`  ${((Date.now() - t) / 1000).toFixed(1)} s`);
}

/* ---------- Gestes réutilisables ---------- */

const PEOPLE = [['Adam', 0, 3], ['Léa', 2, 12], ['Yanis', 3, 7], ['Sarah', 4, 22], ['Hugo', 6, 1], ['Inès', 5, 8], ['Noé', 8, 15], ['Lina', 9, 24]];

async function createProfile(name, color, face) {
  await tap(act('profile-new'));
  await settle();
  await $('#pf-name').fill(name);
  await page.locator('.screen:not(.leave) .swatch').nth(color).click();
  await page.locator('.screen:not(.leave) .facebtn').nth(face).click();
  await tap(act('profile-save'));
  await settle();
}

async function gotoTab(name) {
  await tap(`#nav ${act('tab', `[data-to="${name}"]`)}`.replace('#nav ', ''));
  await settle();
}

/** Prépare une partie avec les n premiers profils, dans l'ordre, et s'arrête sur l'écran des réglages. */
async function toOptions(n) {
  await gotoTab('home');
  await tap(act('new-game'));
  await settle();
  if (await exists(act('new-game-go'))) { await tap(act('new-game-go')); await settle(); }
  if (await exists(act('setup-clear'))) await tap(act('setup-clear'));
  const ids = (await db()).profiles.slice(0, n).map((p) => p.id);
  for (const id of ids) await tap(act('setup-toggle', `[data-id="${id}"]`), 40);
  await tap(act('setup-next'));
  await settle();
}

async function setOptions({ mode = 'classic', vote = 'open', timer = 0, notes = false, u, w, levels } = {}) {
  await tap(act('set-mode', `[data-id="${mode}"]`), 30);
  await tap(act('set-vote', `[data-id="${vote}"]`), 30);
  await tap(act('set-timer', `[data-id="${timer}"]`), 30);
  const s = () => page.evaluate(() => ({ ...window.__dj.S.setup }));
  if ((await s()).notes !== notes) await tap(act('toggle-notes'), 30);
  if (mode !== 'mystery' && u !== undefined) {
    for (let guard = 0; guard < 12; guard++) {
      const cur = await s();
      if (cur.u === u && cur.w === w) break;
      if (cur.u > u) await tap(act('role-step', '[data-k="u"][data-d="-1"]'), 20);
      else if (cur.w > w) await tap(act('role-step', '[data-k="w"][data-d="-1"]'), 20);
      else if (cur.u < u) await tap(act('role-step', '[data-k="u"][data-d="1"]'), 20);
      else if (cur.w < w) await tap(act('role-step', '[data-k="w"][data-d="1"]'), 20);
    }
    const cur = await s();
    check(cur.u === u && cur.w === w, `rôles réglés sur ${cur.u}U/${cur.w}W au lieu de ${u}U/${w}W`);
  }
  if (levels) {
    for (const l of [1, 2, 3]) {
      const on = (await s()).levels.includes(l);
      if (on !== levels.includes(l) && levels.includes(l)) await tap(act('set-level', `[data-id="${l}"]`), 20);
    }
    for (const l of [1, 2, 3]) {
      const on = (await s()).levels.includes(l);
      if (on && !levels.includes(l)) await tap(act('set-level', `[data-id="${l}"]`), 20);
    }
  }
}

/** Distribution complète. Renvoie ce que chaque joueur a lu sur sa carte. */
async function dealAll({ shots = false } = {}) {
  const seen = [];
  let g = await game();
  const n = g.players.length;
  for (let k = 0; k < n; k++) {
    const passName = await text('.pass .big');
    check(passName.trim() === g.players[k].name, `distribution : le téléphone devrait passer à ${g.players[k].name}, pas à ${passName}`);
    const free = page.locator('.screen:not(.leave) .dcard:not(.taken)');
    const count = await free.count();
    check(count === n - k, `distribution : ${count} cartes libres au lieu de ${n - k}`);
    await free.nth((k * 3) % count).click();
    await page.locator('#modal .flip.on').waitFor({ timeout: 3000 });
    await page.locator('#modal [data-act="confirm-card"]:not([disabled])').waitFor({ timeout: 3000 });
    const who = (await text('.cardview .who b')).trim();
    check(who === g.players[k].name, `carte affichée pour ${who} au lieu de ${g.players[k].name}`);
    const word = (await text('.pcard.front .word')).trim();
    seen.push(word);
    if (shots && k === 0) { await wait(500); await shot('06-carte'); }
    await tap(act('confirm-card'));
    await settle();
    if (shots && k === 2) await shot('05-distribution');
  }
  g = await game();
  check(g.phase === 'clues', `après la distribution, phase ${g.phase}`);
  g.players.forEach((p, i) => {
    const expected = p.role === 'white' ? 'Mr. White' : p.role === 'civil' ? g.words.civil : g.words.under;
    check(seen[i] === expected, `${p.name} (${p.role}) a lu « ${seen[i]} » au lieu de « ${expected} »`);
  });
  check(g.players[g.order[0]].role !== 'white', 'Mr. White ouvre le premier tour');
  return g;
}

/**
 * Le tour de parole : un seul écran. On vérifie que l'ordre complet est affiché, qu'il n'y a qu'un
 * bouton (« Passer au vote ») et, si la prise de notes est active, on note tout le monde dans le désordre.
 */
async function speakAll({ notes = false, tag = 'x' } = {}) {
  const g = await game();
  if (g.phase !== 'clues') return;
  const shown = await page.locator('.screen:not(.leave) .order li .name').evaluateAll((els) => els.map((e) => e.textContent.trim()));
  check(shown.join('|') === g.order.map((i) => g.players[i].name).join('|'), `ordre de parole affiché (${shown.join(', ')}) ≠ ordre du moteur`);
  check((await text('.headline .big')).includes(g.players[g.order[0]].name), 'le premier à parler n’est pas annoncé');
  const buttons = await page.locator('.screen:not(.leave) .dock [data-act]').evaluateAll((els) => els.map((e) => e.dataset.act));
  check(buttons.join() === 'open-vote', `le tour de parole doit n’avoir qu’un bouton, « Passer au vote » (trouvé : ${buttons.join(', ')})`);
  check(!(await exists('[data-act="next-speaker"]')) && !(await exists('[data-act="prev-speaker"]')), 'il reste un bouton à presser joueur par joueur');
  check((await exists('[data-act="clue-edit"]')) === notes, 'la prise de notes ne suit pas le réglage de la partie');
  if (!notes) return;
  for (const i of g.order.slice().reverse()) {
    await tap(act('clue-edit', `[data-i="${i}"]`));
    await wait(160);
    await $('#clue').fill(`${tag}${g.round}j${i}`);
    await tap('form[data-form="clue"] button[type="submit"]');
    await wait(100);
  }
  const after = await game();
  check(after.phase === 'clues' && after.clues.filter((c) => c.round === g.round).length === g.order.length, 'les indices notés dans le désordre ne sont pas tous enregistrés');
}

const roleIdx = (g, role) => g.players.map((p, i) => (p.alive && p.role === role ? i : -1)).filter((i) => i >= 0);

async function waitReveal() {
  await page.locator('.screen:not(.leave) .rolecard').waitFor({ timeout: 6000 });
  await settle();
}

async function eliminateOpen(idx) {
  await tap(act('open-vote'));
  await settle();
  await tap(act('ask-elim', `[data-i="${idx}"]`));
  await wait(250);
  await tap(act('do-elim'));
  await waitReveal();
}

/** Vote secret complet : `choose(voter, candidates, g)` renvoie la cible de chaque votant. */
async function secretVote(choose, { shots = '' } = {}) {
  for (let guard = 0; guard < 40; guard++) {
    const g = await game();
    if (g.phase !== 'vote') break;
    const voter = g.vote.queue[g.vote.cursor];
    check((await text('.pass .big')).trim() === g.players[voter].name, `vote secret : téléphone attendu chez ${g.players[voter].name}`);
    check(!(await exists('.tile')), 'vote secret : les choix sont visibles avant que le votant ait pris le téléphone');
    if (shots && g.vote.cursor === 0) await shot(`${shots}-passe`);
    await tap(act('gate-open'));
    await settle();
    const shown = await page.locator('.screen:not(.leave) .tile').evaluateAll((els) => els.map((e) => Number(e.dataset.i)));
    check(!shown.includes(voter), 'vote secret : un joueur peut voter contre lui-même');
    check(shown.every((i) => g.vote.candidates.includes(i)), 'vote secret : une cible hors candidats est proposée');
    const target = choose(voter, g.vote.candidates.filter((c) => c !== voter), g);
    if (shots && g.vote.cursor === 0) await shot(`${shots}-choix`);
    await tap(act('ask-ballot', `[data-i="${target}"]`));
    await wait(250);
    await tap(act('do-ballot'));
    await settle();
  }
}

async function fresh(seed) {
  await page.evaluate((data) => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('dj2:')) localStorage.removeItem(k);
    if (data) for (const [k, v] of Object.entries(data)) localStorage.setItem('dj2:' + k, JSON.stringify(v));
  }, seed || null);
  await page.reload();
  await wait(700);
}

/* ---------- Scénarios ---------- */

async function run(url) {
  await scenario('premier lancement et profils', async () => {
    await page.goto(url);
    await wait(900);
    check((await text('.wordmark')).includes('Double'), 'écran d’accueil absent');
    await shot('01-accueil');
    await gotoTab('players');
    check(await exists('.empty'), 'état vide des joueurs absent');
    await shot('02-joueurs-vide');
    for (const [name, c, f] of PEOPLE.slice(0, 6)) await createProfile(name, c, f);
    check((await db()).profiles.length === 6, 'les 6 profils ne sont pas créés');
    // nom en double refusé
    await tap(act('profile-new'));
    await settle();
    await $('#pf-name').fill('  adam ');
    await tap(act('profile-save'));
    check(await exists('.err'), 'un nom en double est accepté');
    // « Joueur N » est un texte indicatif, pas une valeur : champ vide, et nom par défaut si on n'écrit rien.
    await $('#pf-name').fill('');
    check((await $('#pf-name').getAttribute('placeholder')) === 'Joueur 1', 'le nom par défaut n’est pas proposé en texte indicatif');
    check((await $('#pf-name').inputValue()) === '', 'le champ du nom n’est pas vide');
    await shot('03-profil');
    // photo : uniquement par la caméra intégrée (plus de galerie, plus d'appli Appareil photo)
    check(!(await exists('input[type="file"]')), 'le choix dans la galerie est encore proposé');
    await tap(act('camera-open'));
    await page.locator('#modal .camframe.is-live').waitFor({ timeout: 6000 });
    await wait(500);
    const cam = await page.evaluate(() => {
      const d = document.querySelector('#modal .dialog.cam').getBoundingClientRect();
      const v = document.getElementById('cam-video');
      const m = window.__dj.S.modal;
      return { w: d.width, h: d.height, vw: innerWidth, vh: innerHeight, playing: v.videoWidth > 0 && !v.paused, facing: m.facing, many: m.many, mirror: m.mirror };
    });
    check(cam.facing === 'user', 'la caméra avant ne s’ouvre pas par défaut');
    check(cam.playing, 'l’aperçu de la caméra ne s’affiche pas');
    check(cam.w < cam.vw && cam.h < cam.vh * 0.8, `la caméra n’est pas dans une fenêtre de taille moyenne (${Math.round(cam.w)} × ${Math.round(cam.h)})`);
    check(cam.many && (await exists('[data-act="camera-flip"]')), 'le bouton pour changer de caméra est absent');
    await shot('03b-camera');
    await tap(act('camera-flip'));
    await page.locator('#modal .camframe.is-live').waitFor({ timeout: 6000 });
    check((await page.evaluate(() => window.__dj.S.modal.facing)) === 'environment', 'le passage à la caméra arrière ne fonctionne pas');
    await tap(act('camera-flip'));
    await page.locator('#modal .camframe.is-live').waitFor({ timeout: 6000 });
    await wait(400);
    await tap(act('camera-shoot'));
    check(await exists('.camframe.is-shot'), 'la photo prise n’est pas montrée');
    check((await exists('[data-act="camera-keep"]')) && (await exists('[data-act="camera-retake"]')), 'il manque « Garder » ou « Reprendre »');
    await shot('03c-camera-apercu');
    await tap(act('camera-retake'));
    check(await exists('.camframe.is-live'), '« Reprendre » ne relance pas l’aperçu');
    await wait(300);
    await tap(act('camera-shoot'));
    await tap(act('camera-keep'));
    await page.locator('.screen:not(.leave) .preview .av.photo img').waitFor({ timeout: 3000 });
    const photo = await page.evaluate(() => new Promise((resolve) => {
      const url = window.__dj.S.draft.photo;
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight, jpeg: url.startsWith('data:image/jpeg'), size: url.length, live: !!window.__dj.Cam.cameraStream() });
      img.onerror = () => resolve({ w: 0, h: 0, jpeg: false, size: 0, live: true });
      img.src = url;
    }));
    check(photo.w === 256 && photo.h === 256 && photo.jpeg, `la photo n’est pas un carré compressé de 256 px (${photo.w} × ${photo.h})`);
    check(photo.size < 60000, `la photo est trop lourde (${photo.size} caractères)`);
    check(!photo.live, 'la caméra reste allumée après la photo');
    await tap(act('profile-save'));
    await settle();
    let d = await db();
    check(d.profiles.length === 7 && d.profiles[6].photo === 'photo', 'la photo du profil n’est pas enregistrée');
    check(d.profiles.length === 7 && d.profiles[6].name === 'Joueur 1', `un nom laissé vide ne donne pas « Joueur 1 » (${d.profiles[6] && d.profiles[6].name})`);
    // autorisation refusée : message clair, et on retombe sur les personnages
    await tap(act('profile-new'));
    await settle();
    check((await $('#pf-name').getAttribute('placeholder')) === 'Joueur 2', 'le nom indicatif ne suit pas les noms déjà pris');
    await page.evaluate(() => {
      window.__gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('refus'), { name: 'NotAllowedError' }));
    });
    await tap(act('camera-open'));
    await page.locator('#modal .camframe.is-error').waitFor({ timeout: 4000 });
    check((await text('.cam-msg')).includes('pas autorisé'), 'le refus de l’appareil photo n’est pas expliqué');
    await shot('03d-camera-refus');
    await tap(act('close-modal'));
    check(!(await exists('.camframe')) && (await exists('.facebtn')), 'après un refus, on ne retombe pas sur les personnages');
    await page.evaluate(() => { navigator.mediaDevices.getUserMedia = window.__gum; });
    await tap(act('back'));
    await settle();
    await shot('04-joueurs');
    // persistance après fermeture
    await page.reload();
    await wait(700);
    d = await db();
    check(d.profiles.length === 7 && d.profiles[1].name === 'Léa', 'les profils ne survivent pas à un redémarrage');
    // modification et suppression
    await gotoTab('players');
    await tap(act('go', `[data-id="${d.profiles[6].id}"]`));
    await settle();
    await tap(act('profile-edit'));
    await settle();
    check((await $('#pf-name').inputValue()) === '' && (await $('#pf-name').getAttribute('placeholder')) === 'Joueur 1', 'un nom par défaut doit se présenter comme un champ vide');
    await tap(act('draft-photo-clear'));
    await $('#pf-name').fill('Noé B.');
    await tap(act('profile-save'));
    await settle();
    check((await db()).profiles[6].name === 'Noé B.' && (await db()).profiles[6].photo === '', 'modification du profil non enregistrée');
    await tap(act('profile-edit'));
    await settle();
    await tap(act('profile-delete'));
    await wait(250);
    await tap(act('profile-delete-go'));
    await settle();
    check((await db()).profiles.length === 6, 'suppression du profil non enregistrée');
  });

  await scenario('partie classique à main levée, victoire des Civils', async () => {
    await toOptions(6);
    await shot('07-reglages');
    await tap(act('open-cats'));
    await wait(350);
    await shot('08-themes');
    await tap(act('close-modal'));
    await setOptions({ mode: 'classic', vote: 'open', timer: 0, notes: false, u: 1, w: 1 });
    await tap(act('start-game'));
    await settle();
    let g = await dealAll({ shots: true });
    await speakAll();
    await shot('09-tour-de-parole');
    // « Mon mot »
    await tap(act('peek'));
    await wait(300);
    await tap(act('peek-pick', `[data-i="${roleIdx(g, 'civil')[0]}"]`));
    await wait(250);
    check(!(await exists('.peekword')), 'le mot est affiché avant confirmation');
    await tap(act('peek-show'));
    check((await text('.peekword')).trim() === g.words.civil, 'le rappel du mot est faux');
    await tap(act('close-modal'));
    // vote : un Civil tombe
    await tap(act('open-vote'));
    await settle();
    await shot('11-vote');
    const civ = roleIdx(g, 'civil')[0];
    await tap(act('ask-elim', `[data-i="${civ}"]`));
    await wait(300);
    await shot('12-confirmation');
    await tap(act('do-elim'));
    await wait(500);
    await shot('13-suspense');
    await waitReveal();
    check((await text('.rolename')).trim() === 'Civil', 'rôle révélé incorrect');
    await shot('14-revelation-civil');
    await tap(act('after-reveal'));
    await settle();
    g = await game();
    check(g.round === 2 && g.phase === 'clues' && !g.order.includes(civ), 'le tour 2 ne démarre pas correctement');
    check(g.players[g.order[0]].role !== 'white', 'Mr. White ouvre le tour 2');
    // tour 2 : Mr. White tombe et se trompe
    await speakAll();
    const white = roleIdx(g, 'white')[0];
    await eliminateOpen(white);
    check(await exists('#guess'), 'Mr. White n’a pas sa dernière chance');
    check(!(await exists(act('after-reveal'))), 'on peut continuer sans la proposition de Mr. White');
    await shot('15-mr-white');
    await $('#guess').fill(g.words.under);
    await tap('form[data-form="guess"] button[type="submit"]');
    await wait(300);
    check((await text('.verdict b')).includes('Raté'), 'le mot de l’Undercover est accepté comme bonne réponse');
    await shot('16-rate');
    await tap(act('after-reveal'));
    await settle();
    // tour 3 : l'Undercover tombe
    await speakAll();
    g = await game();
    await eliminateOpen(roleIdx(g, 'under')[0]);
    check((await text(act('after-reveal'))).includes('résultat'), 'le bouton n’annonce pas la fin');
    await shot('17-revelation-undercover');
    await tap(act('after-reveal'));
    await wait(900);
    g = await game();
    check(g.phase === 'end' && g.result.winner === 'civils', `résultat ${JSON.stringify(g.result)}`);
    await shot('18-fin-civils');
    await tap(act('end-tab', '[data-id="rounds"]'));
    await shot('19-fin-deroule');
    await tap(act('end-tab', '[data-id="night"]'));
    await shot('20-fin-soiree');
    const d = await db();
    check(d.history.length === 1, 'la partie n’est pas dans l’historique');
    const h = d.history[0];
    check(h.players.filter((p) => p.won).length === 4 && h.players.every((p) => p.pts === (p.role === 'civil' ? 2 : 0)), 'points mal attribués');
    check(d.meta.used.length === 1, 'la paire jouée n’est pas marquée comme utilisée');
  });

  await scenario('rejouer : nouvelle paire, vote secret avec égalité puis tirage, Mr. White devine', async () => {
    const before = (await db()).history[0];
    await tap(act('end-settings'));
    await settle();
    await setOptions({ mode: 'classic', vote: 'secret', timer: 120, notes: true, u: 1, w: 1 });
    await tap(act('start-game'));
    await settle();
    let g = await dealAll();
    check(g.words.key !== before.log && ![before.civil, before.under].includes(g.words.civil), 'la même paire est ressortie');
    // indices notés en touchant un joueur, sans ordre imposé : répétition refusée, correction possible
    const [first, second] = g.order;
    await tap(act('clue-edit', `[data-i="${second}"]`));
    await wait(200);
    await $('#clue').fill('Rouge');
    await tap('form[data-form="clue"] button[type="submit"]');
    check((await game()).clues.length === 1 && (await game()).clues[0].by === second, 'on ne peut pas noter le deuxième joueur avant le premier');
    await tap(act('clue-edit', `[data-i="${first}"]`));
    await wait(200);
    await $('#clue').fill('rouges');
    await tap('form[data-form="clue"] button[type="submit"]');
    check((await text('.err')).includes('déjà été dit'), 'un indice répété est accepté');
    check((await game()).clues.length === 1, 'un indice refusé est quand même enregistré');
    await shot('21-indice-refuse');
    await tap(act('close-modal'));
    await tap(act('clue-edit', `[data-i="${second}"]`));
    await wait(200);
    check((await $('#clue').inputValue()) === 'Rouge', 'l’indice déjà noté n’est pas repris pour correction');
    await tap(act('clue-clear'));
    check((await game()).clues.length === 0, 'effacer un indice ne fonctionne pas');
    await speakAll({ notes: true, tag: 'mot' });
    // chrono : à l'arrêt tant que la table ne l'a pas lancé
    check(await exists('#timer-txt'), 'le chrono du débat est absent');
    await wait(700);
    check((await text('#timer-txt')).trim() === '2:00', 'le chrono démarre tout seul avant le débat');
    await tap(act('timer-toggle'));
    await wait(1300);
    const t1 = await text('#timer-txt');
    check(t1.trim() !== '2:00', `le chrono ne tourne pas (${t1})`);
    await tap(act('timer-toggle'));
    const t2 = await text('#timer-txt');
    await wait(700);
    check((await text('#timer-txt')) === t2, 'la pause du chrono ne fonctionne pas');
    await shot('22-tour-notes-chrono');
    await tap(act('open-vote'));
    await settle();
    g = await game();
    const q = g.vote.queue;
    const [a, b] = [q[0], q[1]];
    // 3 voix contre a, 3 contre b
    const plan = { [q[0]]: b, [q[1]]: a, [q[2]]: a, [q[3]]: a, [q[4]]: b, [q[5]]: b };
    // erreur de manipulation : le premier votant reprend son bulletin
    await tap(act('gate-open'));
    await settle();
    await tap(act('ask-ballot', `[data-i="${q[2]}"]`));
    await wait(250);
    await tap(act('do-ballot'));
    await settle();
    await tap(act('undo-ballot'));
    await settle();
    g = await game();
    check(g.vote.cursor === 0 && Object.keys(g.vote.ballots).length === 0, 'la reprise d’un bulletin ne fonctionne pas');
    await secretVote((voter) => plan[voter], { shots: '23-vote-secret' });
    await wait(1200);
    g = await game();
    check(g.phase === 'tally' && g.vote.top.length === 2, `dépouillement attendu, phase ${g.phase}`);
    await shot('24-depouillement');
    await tap(act('resolve-tally'));
    await settle();
    check((await game()).phase === 'tiebreak', 'l’égalité ne mène pas au départage');
    await shot('25-egalite');
    await tap(act('start-revote'));
    await settle();
    // revote : encore 3-3
    const plan2 = { [q[0]]: b, [q[1]]: a, [q[2]]: a, [q[3]]: b, [q[4]]: a, [q[5]]: b };
    await secretVote((voter, cands) => (cands.includes(plan2[voter]) ? plan2[voter] : cands[0]));
    await wait(1000);
    await tap(act('resolve-tally'));
    await page.locator('.screen:not(.leave) [data-act="confirm-draw"]:not([disabled])').waitFor({ timeout: 8000 });
    g = await game();
    check(g.phase === 'draw' && [a, b].includes(g.vote.drawn), 'tirage au sort incorrect');
    await shot('26-tirage');
    await tap(act('confirm-draw'));
    await waitReveal();
    g = await game();
    const out = g.players[g.last];
    if (out.role === 'white') { await tap(act('skip-guess')); await wait(200); }
    await tap(act('after-reveal'));
    await settle();
    g = await game();
    // On fait tomber Mr. White s'il est encore là, et il devine.
    const white = roleIdx(g, 'white')[0];
    if (g.phase !== 'end' && white !== undefined) {
      await speakAll({ notes: true, tag: 'bis' });
      await tap(act('open-vote'));
      await settle();
      await secretVote((voter, cands) => (voter !== white ? white : cands[0]));
      await wait(1000);
      await tap(act('resolve-tally'));
      await waitReveal();
      await $('#guess').fill(`  ${g.words.civil.toUpperCase()}  `);
      await tap('form[data-form="guess"] button[type="submit"]');
      await wait(300);
      check((await text('.verdict b')).includes('Bonne'), 'la bonne réponse de Mr. White est refusée');
      await shot('27-mr-white-devine');
      await tap(act('after-reveal'));
      await wait(900);
      g = await game();
      check(g.result.winner === 'white' && g.result.by === white, 'Mr. White devrait gagner seul');
      await shot('28-fin-mr-white');
      const h = (await db()).history[1];
      check(h.players[white].pts === 6 && h.players.filter((p) => p.pts > 0).length === 1, 'points de Mr. White incorrects');
      check(h.clues.length >= 6, 'les indices notés ne sont pas dans l’historique');
    }
    check((await db()).history.length === 2, 'la deuxième partie n’est pas enregistrée');
  });

  await scenario('partie interrompue : fermeture pendant la distribution puis pendant un vote', async () => {
    await tap(act('end-settings'));
    await settle();
    await setOptions({ mode: 'classic', vote: 'secret', timer: 0, notes: false, u: 1, w: 1 });
    await tap(act('start-game'));
    await settle();
    // deux joueurs ont pris leur carte, le troisième la regarde quand l'appli se ferme
    for (let k = 0; k < 2; k++) {
      await page.locator('.screen:not(.leave) .dcard:not(.taken)').first().click();
      await page.locator('#modal [data-act="confirm-card"]:not([disabled])').waitFor();
      await tap(act('confirm-card'));
      await settle();
    }
    await page.locator('.screen:not(.leave) .dcard:not(.taken)').first().click();
    await page.locator('#modal .flip.on').waitFor();
    const before = await game();
    await page.reload();
    await wait(800);
    check(!(await exists('.pcard')), 'après redémarrage, un mot secret est visible sans action');
    check(await exists(act('resume')), 'l’accueil ne propose pas de reprendre la partie');
    await shot('29-reprise');
    await tap(act('resume'));
    await settle();
    let g = await game();
    check(g.dealIndex === 2 && g.pendingCard === before.pendingCard, 'la distribution ne reprend pas au bon joueur');
    check(await exists(act('reopen-card')), 'le joueur interrompu ne peut pas revoir sa carte');
    check((await page.locator('.screen:not(.leave) .dcard:not(.taken):not([disabled])').count()) === 0, 'on peut prendre une autre carte pendant qu’une carte est en attente');
    await shot('30-carte-en-attente');
    await tap(act('reopen-card'));
    await page.locator('#modal [data-act="confirm-card"]:not([disabled])').waitFor();
    await tap(act('confirm-card'));
    await settle();
    for (let k = 3; k < 6; k++) {
      await page.locator('.screen:not(.leave) .dcard:not(.taken)').first().click();
      await page.locator('#modal [data-act="confirm-card"]:not([disabled])').waitFor();
      await tap(act('confirm-card'));
      await settle();
    }
    await speakAll();
    await tap(act('open-vote'));
    await settle();
    // deux bulletins déposés, puis fermeture
    g = await game();
    for (let k = 0; k < 2; k++) {
      await tap(act('gate-open'));
      await settle();
      await page.locator('.screen:not(.leave) .tile').first().click();
      await wait(250);
      await tap(act('do-ballot'));
      await settle();
    }
    await page.reload();
    await wait(800);
    await tap(act('resume'));
    await settle();
    g = await game();
    check(g.phase === 'vote' && g.vote.cursor === 2 && Object.keys(g.vote.ballots).length === 2, 'le vote ne reprend pas où il en était');
    check((await text('.pass .big')).trim() === g.players[g.vote.queue[2]].name, 'le vote ne reprend pas au bon votant');
    check(!(await exists('.tile')), 'après reprise, l’écran de vote est ouvert sans passage de téléphone');
    // un joueur quitte la table en plein vote
    const leaver = roleIdx(g, 'civil')[0];
    await tap(act('game-menu'));
    await wait(350);
    await shot('31-menu');
    await tap(act('ask-leave'));
    await wait(300);
    await tap(act('leave-pick', `[data-i="${leaver}"]`));
    await wait(250);
    await tap(act('do-leave'));
    await waitReveal();
    check(!(await exists('#guess')), 'un joueur qui part a droit à la dernière chance');
    await tap(act('after-reveal'));
    await settle();
    g = await game();
    check(g.phase === 'clues' && g.vote === null && !g.players[leaver].alive, 'après un départ, le vote entamé n’est pas annulé');
    // abandon
    await tap(act('game-menu'));
    await wait(300);
    await tap(act('ask-abandon'));
    await wait(250);
    await tap(act('do-abandon'));
    await settle();
    check((await game()) === null && !(await exists(act('resume'))), 'la partie abandonnée est encore là');
    check((await db()).history.length === 2, 'une partie abandonnée a été comptée');
  });

  await scenario('modes Éclair et Mystère, égalité à main levée, redistribution', async () => {
    await toOptions(5);
    await setOptions({ mode: 'flash', vote: 'open', timer: 0, notes: false, u: 1, w: 1 });
    await tap(act('start-game'));
    await settle();
    // redistribution après une carte vue par erreur
    const first = await game();
    await page.locator('.screen:not(.leave) .dcard:not(.taken)').first().click();
    await page.locator('#modal [data-act="confirm-card"]:not([disabled])').waitFor();
    await tap(act('confirm-card'));
    await settle();
    await tap(act('game-menu'));
    await wait(300);
    await tap(act('ask-redeal'));
    await wait(250);
    await tap(act('do-redeal'));
    await settle();
    let g = await game();
    check(g.id !== first.id && g.dealIndex === 0 && g.words.civil !== first.words.civil, 'la redistribution ne repart pas de zéro avec un nouveau mot');
    g = await dealAll();
    await speakAll();
    await tap(act('open-vote'));
    await settle();
    // égalité déclarée entre deux joueurs, puis encore égalité → tirage
    const pair = [g.order[0], g.order[1]];
    await tap(act('tie-mode'));
    await tap(act('tie-toggle', `[data-i="${pair[0]}"]`));
    check(await page.locator('.screen:not(.leave) [data-act="tie-go"][disabled]').count() === 1, 'on peut départager avec un seul joueur');
    await tap(act('tie-toggle', `[data-i="${pair[1]}"]`));
    await shot('32-egalite-main-levee');
    await tap(act('tie-go'));
    await settle();
    await tap(act('start-revote'));
    await settle();
    g = await game();
    check(g.vote.stage === 2 && (await page.locator('.screen:not(.leave) .tile').count()) === 2, 'le revote ne se limite pas aux ex æquo');
    await tap(act('tie-mode'));
    await tap(act('tie-toggle', `[data-i="${pair[0]}"]`));
    await tap(act('tie-toggle', `[data-i="${pair[1]}"]`));
    await tap(act('tie-go'));
    await page.locator('.screen:not(.leave) [data-act="confirm-draw"]:not([disabled])').waitFor({ timeout: 8000 });
    await tap(act('confirm-draw'));
    await waitReveal();
    g = await game();
    const out = g.players[g.last];
    if (out.role === 'white') { await tap(act('skip-guess')); await wait(200); }
    await tap(act('after-reveal'));
    await wait(900);
    g = await game();
    check(g.phase === 'end', 'le mode Éclair ne s’arrête pas après un vote');
    check(g.result.winner === (out.role === 'civil' ? 'infiltres' : 'civils'), `Éclair : vainqueur ${g.result.winner} pour un éliminé ${out.role}`);
    await shot('33-fin-eclair');
    // Mystère : la composition n'est pas annoncée
    await tap(act('end-settings'));
    await settle();
    await setOptions({ mode: 'mystery', vote: 'open' });
    check(!(await exists('.counts')), 'en mode Mystère, la composition est réglable');
    await shot('34-reglages-mystere');
    await tap(act('start-game'));
    await settle();
    g = await dealAll();
    await speakAll();
    const debate = await text('.headline');
    check(debate.includes('Mystère') && !/dont \d/.test(debate), 'le mode Mystère révèle le nombre d’infiltrés');
    // les infiltrés gagnent : on élimine des Civils jusqu'à la fin
    for (let guard = 0; guard < 6; guard++) {
      g = await game();
      if (g.phase === 'end') break;
      if (g.phase === 'clues') await speakAll();
      g = await game();
      await eliminateOpen(roleIdx(g, 'civil')[0]);
      await tap(act('after-reveal'));
      await wait(700);
    }
    g = await game();
    check(g.phase === 'end' && g.result.winner === 'infiltres', 'victoire des infiltrés attendue');
    await shot('35-fin-infiltres');
    await tap(act('end-home'));
    await settle();
    check((await db()).history.length === 4, 'les parties Éclair et Mystère ne sont pas enregistrées');
  });

  await scenario('classement, statistiques, historique', async () => {
    const d = await db();
    const total = d.history.reduce((a, h) => a + h.players.reduce((x, p) => x + p.pts, 0), 0);
    await gotoTab('ranking');
    await shot('36-classement');
    const shown = await page.evaluate(() => Array.from(document.querySelectorAll('.screen:not(.leave) .pod .step b, .screen:not(.leave) .panel.list .val')).map((e) => parseInt(e.textContent, 10) || 0).reduce((a, b) => a + b, 0));
    check(shown === total, `le classement affiche ${shown} points, l’historique en contient ${total}`);
    await tap(act('rank-sort', '[data-id="wins"]'));
    await tap(act('rank-tab', '[data-id="night"]'));
    await shot('37-classement-soiree');
    await tap(act('rank-tab', '[data-id="all"]'));
    await tap('.pod.p1');
    await settle();
    check(await exists('.kpis'), 'la fiche du joueur n’affiche pas ses statistiques');
    await shot('38-fiche-joueur');
    await tap(act('back'));
    await settle();
    await gotoTab('history');
    check((await page.locator('.screen:not(.leave) .panel.list .row').count()) === 4, 'l’historique ne liste pas les 4 parties');
    await shot('39-historique');
    await tap('.panel.list .row');
    await settle();
    check(await exists('.round'), 'le détail de la partie est vide');
    await shot('40-detail-partie');
    await tap(act('history-delete'));
    await wait(250);
    await tap(act('history-delete-go'));
    await settle();
    const after = await db();
    check(after.history.length === 3, 'la suppression d’une partie ne fonctionne pas');
    await gotoTab('ranking');
    const total2 = after.history.reduce((a, h) => a + h.players.reduce((x, p) => x + p.pts, 0), 0);
    await tap(act('rank-sort', '[data-id="points"]'));
    const shown2 = await page.evaluate(() => Array.from(document.querySelectorAll('.screen:not(.leave) .pod .step b, .screen:not(.leave) .panel.list .val')).map((e) => parseInt(e.textContent, 10) || 0).reduce((a, b) => a + b, 0));
    check(shown2 === total2, 'le classement n’est pas recalculé après la suppression d’une partie');
  });

  await scenario('réglages, mots perso, sauvegarde, thème sombre', async () => {
    await gotoTab('settings');
    await shot('41-reglages-appli');
    await tap(act('set-theme', '[data-id="dark"]'));
    check((await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark', 'le thème sombre ne s’applique pas');
    await tap(act('toggle-sound'));
    await tap(act('toggle-motion'));
    check((await db()).meta.settings.sound === false && (await db()).meta.settings.motion === false, 'les réglages ne sont pas enregistrés');
    check(await page.evaluate(() => document.documentElement.classList.contains('calm')), 'les animations ne sont pas coupées');
    await tap(act('toggle-motion'));
    await shot('42-reglages-nuit');
    // mots perso
    await tap(act('go', '[data-to="custom"]'));
    await settle();
    await $('#pair-a').fill('Le prof de maths');
    await $('#pair-b').fill('Le prof de physique');
    await tap('form[data-form="pair"] button[type="submit"]');
    await $('#pair-a').fill('le prof de physique');
    await $('#pair-b').fill('Le prof de Maths');
    await tap('form[data-form="pair"] button[type="submit"]');
    check((await text('.err')).includes('déjà'), 'une paire perso en double est acceptée');
    await $('#pair-a').fill('Pareil');
    await $('#pair-b').fill('pareil');
    await tap('form[data-form="pair"] button[type="submit"]');
    check((await db()).meta.custom.length === 1, 'les paires perso sont mal enregistrées');
    await shot('43-nos-mots');
    await tap(act('back'));
    await settle();
    // une partie avec uniquement les mots perso
    await toOptions(4);
    await tap(act('open-cats'));
    await wait(300);
    await tap(act('cats-none'));
    await tap(act('toggle-cat', '[data-id="perso"]'));
    await tap(act('close-modal'));
    await wait(200);
    await tap(act('start-game'));
    await settle();
    let g = await game();
    check(['Le prof de maths', 'Le prof de physique'].includes(g.words.civil), 'la paire perso n’est pas servie');
    await shot('44-distribution-nuit');
    await tap(act('game-menu'));
    await wait(300);
    await tap(act('ask-abandon'));
    await wait(250);
    await tap(act('do-abandon'));
    await settle();
    // export puis import
    await gotoTab('settings');
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), tap(act('export-data'))]);
    const path = await download.path();
    const { readFileSync } = await import('node:fs');
    const saved = JSON.parse(readFileSync(path, 'utf8'));
    check(saved.app === 'double-jeu' && saved.profiles.length === 6 && saved.history.length === 3, 'le fichier de sauvegarde est incomplet');
    await tap(act('ask-reset-all'));
    await wait(250);
    await tap(act('reset-all-go'));
    await settle();
    let d = await db();
    check(d.profiles.length === 0 && d.history.length === 0 && d.meta.custom.length === 0, 'tout effacer laisse des données');
    await gotoTab('settings');
    await page.locator('#import-file').setInputFiles({ name: 'sauvegarde.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
    await page.locator('#modal [data-act="import-go"]').waitFor({ timeout: 3000 });
    await tap(act('import-go'));
    await settle();
    d = await db();
    check(d.profiles.length === 6 && d.history.length === 3 && d.meta.custom.length === 1 && d.meta.settings.theme === 'dark', 'l’import ne restaure pas les données');
    await page.locator('#import-file').setInputFiles({ name: 'faux.json', mimeType: 'application/json', buffer: Buffer.from('{"pas":"une sauvegarde"}') });
    await wait(400);
    check((await page.locator('#toast.on').count()) === 1 && (await db()).profiles.length === 6, 'un fichier invalide n’est pas refusé proprement');
    // écrans en thème sombre
    await gotoTab('home');
    await shot('45-accueil-nuit');
    await tap(act('go', '[data-to="rules"]'));
    await settle();
    await shot('46-regles-nuit');
    await tap(act('back'));
    await settle();
    await gotoTab('settings');
    await tap(act('set-theme', '[data-id="light"]'));
    await tap(act('toggle-sound'));
  });

  await scenario('bouton retour, données abîmées, épuisement des mots', async () => {
    await gotoTab('home');
    check((await page.evaluate(() => window.DJ.back())) === false, 'retour sur l’accueil : l’appli devrait laisser Android la mettre en arrière-plan');
    await gotoTab('ranking');
    check((await page.evaluate(() => window.DJ.back())) === true, 'retour depuis un onglet : devrait revenir à l’accueil');
    await settle();
    check(await exists('.wordmark'), 'le bouton retour ne ramène pas à l’accueil');
    // en partie, retour = menu (jamais de sortie accidentelle)
    await tap(act('quick-game'));
    await settle();
    check((await page.evaluate(() => window.DJ.back())) === true && (await exists('.sheet')), 'en partie, le bouton retour devrait ouvrir le menu');
    check((await page.evaluate(() => window.DJ.back())) === true && !(await exists('.sheet')), 'le bouton retour devrait fermer le menu');
    await page.locator('.screen:not(.leave) .dcard:not(.taken)').first().click();
    await page.locator('#modal .flip.on').waitFor();
    await page.evaluate(() => window.DJ.back());
    check(await exists('.cardview'), 'le bouton retour ferme la carte secrète sans la valider');
    await page.locator('#modal [data-act="confirm-card"]:not([disabled])').waitFor();
    await tap(act('confirm-card'));
    await settle();
    await tap(act('game-menu'));
    await wait(300);
    await tap(act('menu-home'));
    await settle();
    check(await exists(act('resume')), 'retour à l’accueil depuis le menu : la partie devrait rester disponible');
    await tap(act('new-game'));
    await wait(300);
    check(await exists(act('new-game-go')), 'une nouvelle partie écrase la partie en cours sans prévenir');
    await tap(act('close-modal'));
    // tiroirs de sauvegarde abîmés : l'appli démarre quand même
    await page.evaluate(() => { localStorage.setItem('dj2:game', '{oups'); localStorage.setItem('dj2:meta', '"n’importe quoi"'); localStorage.setItem('dj2:history', '[{"id":1},null,42]'); });
    await page.reload();
    await wait(800);
    check(await exists('.wordmark') && !(await exists(act('resume'))), 'des données abîmées empêchent le démarrage');
    check((await db()).profiles.length === 6 && (await db()).history.length === 0, 'la lecture tolérante des données ne fonctionne pas');
    // sélection minuscule : les mots tournent sans jamais bloquer
    await fresh({ profiles: (await db()).profiles, meta: { v: 1, settings: { motion: false }, custom: [['Alpha', 'Bêta'], ['Gamma', 'Delta']], setup: { players: (await db()).profiles.slice(0, 3).map((p) => p.id), cats: ['perso'], levels: [1], mode: 'flash' } } });
    const words = [];
    for (let k = 0; k < 5; k++) {
      await gotoTab('home');
      await tap(act('quick-game'));
      await settle();
      const g = await game();
      check(!!g, `partie ${k + 1} : impossible de démarrer avec une sélection épuisée`);
      if (!g) break;
      words.push(g.words.key);
      await page.evaluate(() => window.DJ.back());
      await wait(200);
      await tap(act('ask-abandon'));
      await wait(200);
      await tap(act('do-abandon'));
      await settle();
    }
    check(words.length === 5 && words[0] !== words[1] && words[2] !== words[3], `les deux paires ne tournent pas : ${words.join(',')}`);
  });

  await scenario('petit écran, 12 joueurs', async () => {
    await page.setViewportSize({ width: 360, height: 640 });
    const profiles = PEOPLE.concat([['Tom', 1, 5], ['Jade', 7, 9], ['Rayan', 10, 18], ['Zoé', 11, 20]]).map(([name, c, f], i) => ({ id: 'q' + i, name, color: ['tomate', 'soleil', 'menthe', 'ciel', 'rose', 'lilas', 'mandarine', 'anis', 'lagon', 'framboise', 'sable', 'ardoise'][c], face: ['sourire', 'lunettes', 'moustache', 'chapeau', 'loup', 'monocle', 'beret', 'casquette', 'couronne', 'noeud', 'casque', 'pirate', 'rondes', 'hautdeforme', 'bonnet', 'chat', 'diable', 'ange', 'clown', 'ninja', 'barbe', 'alien', 'chignon', 'meche', 'couettes', 'cowboy'][f], photo: '', createdAt: 1 }));
    await fresh({ profiles });
    await shot('47-accueil-360');
    await toOptions(12);
    await shot('48-reglages-360');
    const s = await page.evaluate(() => ({ ...window.__dj.S.setup }));
    check(s.u === 3 && s.w === 1, `composition conseillée pour 12 : ${s.u}U/${s.w}W`);
    await tap(act('back'));
    await settle();
    await shot('49-joueurs-360');
    await tap(act('setup-next'));
    await settle();
    await setOptions({ mode: 'classic', vote: 'open' });
    await tap(act('start-game'));
    await settle();
    await shot('50-distribution-12');
    const g = await dealAll();
    check(g.players.filter((p) => p.role === 'under').length === 3 && g.players.filter((p) => p.role === 'white').length === 1, 'rôles distribués ≠ réglages');
    await shot('51-indices-12');
    await speakAll();
    await tap(act('open-vote'));
    await settle();
    await shot('52-vote-12');
    await page.setViewportSize({ width: 390, height: 844 });
  });
}

/** Le pont natif de l'application Android, simulé : mêmes fonctions que la coque Java (window.DJNative). */
async function nativeBridge(browser, url) {
  await scenario('pont natif Android (simulé) : fichiers, copie de secours, thème, écran allumé, export', async () => {
    const main = page;
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'fr-FR' });
    page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`erreur JavaScript (pont natif) : ${e.message}`));
    await page.addInitScript(() => {
      window.DJ_TEST = true;
      const calls = [];
      window.__calls = calls;
      const get = (k) => localStorage.getItem('native:' + k) || '';
      window.DJNative = {
        read: (k) => get(k),
        readBackup: (k) => { calls.push(['readBackup', k]); return localStorage.getItem('nativebak:' + k) || ''; },
        write: (k, v) => { calls.push(['write', k]); const old = get(k); if (old) localStorage.setItem('nativebak:' + k, old); localStorage.setItem('native:' + k, v); return true; },
        isNight: () => localStorage.getItem('native-night') === '1',
        setBars: (c) => { calls.push(['setBars', c]); },
        keepAwake: (on) => { calls.push(['keepAwake', on]); },
        vibrate: (p) => { calls.push(['vibrate', p]); },
        exportFile: (name, text) => { calls.push(['exportFile', name, text.length]); setTimeout(() => window.DJ.exported(true), 30); },
      };
    });
    const calls = () => page.evaluate(() => window.__calls.slice());
    try {
      await page.goto(url);
      await wait(800);
      await gotoTab('players');
      for (const [name, c, f] of PEOPLE.slice(0, 3)) await createProfile(name, c, f);
      const stored = await page.evaluate(() => ({ native: JSON.parse(localStorage.getItem('native:profiles') || '[]').length, web: localStorage.getItem('dj2:profiles') }));
      check(stored.native === 3 && stored.web === null, 'les profils ne sont pas écrits par le pont natif');
      // thème du téléphone
      await page.evaluate(() => { localStorage.setItem('native-night', '1'); window.DJ.themeChanged(); });
      check((await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark', 'le thème sombre du téléphone n’est pas suivi');
      check((await calls()).some((c) => c[0] === 'setBars' && c[1] === '#0E1030'), 'la couleur des barres système n’est pas transmise');
      // partie : écran maintenu allumé, sauvegarde à chaque étape
      await toOptions(3);
      await tap(act('start-game'));
      await settle();
      check((await calls()).some((c) => c[0] === 'keepAwake' && c[1] === true), 'l’écran n’est pas maintenu allumé pendant la partie');
      await page.locator('.screen:not(.leave) .dcard:not(.taken)').first().click();
      await page.locator('#modal [data-act="confirm-card"]:not([disabled])').waitFor();
      check((await calls()).some((c) => c[0] === 'vibrate'), 'aucune vibration demandée');
      await tap(act('confirm-card'));
      await settle();
      await page.reload();
      await wait(800);
      check(await exists(act('resume')), 'la partie n’est pas relue depuis les fichiers natifs');
      const g = await game();
      check(g && g.dealIndex === 1, 'la partie relue n’est pas au bon point');
      // fichier principal abîmé : la copie de secours prend le relais
      await page.evaluate(() => localStorage.setItem('native:profiles', '{"coupé'));
      await page.reload();
      await wait(800);
      const d = await db();
      check(d.profiles.length >= 2, `copie de secours non utilisée (${d.profiles.length} profils)`);
      check((await calls()).some((c) => c[0] === 'readBackup' && c[1] === 'profiles'), 'la copie de secours n’est pas lue');
      // export
      await gotoTab('settings');
      await tap(act('export-data'));
      await wait(300);
      check((await calls()).some((c) => c[0] === 'exportFile' && /^double-jeu-\d{4}-\d{2}-\d{2}\.json$/.test(c[1]) && c[2] > 100), 'l’export ne passe pas par le pont natif');
      check((await page.locator('#toast.on').innerText()).includes('enregistrée'), 'pas de confirmation après l’export');
      // abandon : l'écran peut de nouveau s'éteindre
      await gotoTab('home');
      await tap(act('resume'));
      await settle();
      await page.evaluate(() => window.DJ.back());
      await wait(300);
      await tap(act('ask-abandon'));
      await wait(250);
      await tap(act('do-abandon'));
      await settle();
      const all = await calls();
      const last = all.filter((c) => c[0] === 'keepAwake').pop();
      check(last && last[1] === false, 'l’écran reste maintenu allumé après la partie');
    } finally {
      await ctx.close();
      page = main;
    }
  });
}

/* ---------- Lancement ---------- */

const { server, url } = await startServer(0);
// Caméras factices de Chromium (deux, comme sur un téléphone) : la photo de profil se teste sans matériel.
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream=device-count=2'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1, isMobile: true, hasTouch: true, acceptDownloads: true, locale: 'fr-FR' });
page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`erreur JavaScript : ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console : ${m.text()}`); });
await page.addInitScript(() => { window.DJ_TEST = true; });

try {
  await run(url);
  await nativeBridge(browser, url);
} finally {
  await browser.close();
  server.close();
}

if (errors.length) { console.log('\nErreurs dans la page :'); for (const e of new Set(errors)) console.log(' - ' + e); }
if (failures.length) { console.log(`\n${failures.length} vérification(s) en échec :`); for (const f of failures) console.log(' - ' + f); }
if (errors.length || failures.length) process.exit(1);
console.log('\nTous les scénarios passent, sans erreur dans la page.');
