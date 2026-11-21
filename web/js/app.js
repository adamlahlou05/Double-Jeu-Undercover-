// Point d'entrée : rendu, navigation, gestes de l'utilisateur et déroulement de la partie.

import * as E from './engine.js';
import * as V from './views.js';
import * as G from './views-game.js';
import { morphHtml, typo } from './dom.js';
import { sfx, buzz, configureFeedback } from './sfx.js';
import { pickPair, buildPool, CATEGORIES, CUSTOM_CAT } from './words/index.js';
import { norm } from './text.js';
import { suggestLook, avatarSprite, faceId } from './avatars.js';
import * as Cam from './camera.js';
import { exportPayload, parseImport, DEFAULT_SETTINGS } from './store.js';
import {
  DB, S, TABS, save, go, back, tab, route, freshGui, profileById, defaultSetup, fitRoles, quickSetup,
  invalidateStats, activeGame, newId, isDefaultName, nextDefaultName,
} from './state.js';

const $stage = document.getElementById('stage');
const $modal = document.getElementById('modal');
const $nav = document.getElementById('nav');
const $toast = document.getElementById('toast');
const $app = document.getElementById('app');
const native = window.DJNative || null;

const SCREENS = {
  home: V.home, players: V.players, profile: V.profile, setup: V.setup, options: V.options, ranking: V.ranking,
  player: V.player, history: V.history, detail: V.detail, rules: V.rules, settings: V.settings, custom: V.custom, game: G.game,
};

/* ---------- Rendu ---------- */

let screenEl = null;
let screenKey = '';
let modalKey = '';
let enterTimer = 0;
let lastSwap = 0;
const calm = () => !DB.meta.settings.motion || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const raf2 = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));

function guard() {
  const r = route();
  if (r.name === 'game' && !DB.game) tab('home');
  if ((r.name === 'setup' || r.name === 'options') && !S.setup) S.setup = defaultSetup();
  if (r.name === 'options' && S.setup.players.length < E.MIN_PLAYERS) { S.stack.pop(); S.dir = 'back'; }
  if (r.name === 'profile' && !S.draft) back();
}

const keyFor = (r) => (r.name === 'game' ? G.gameKey() : `${r.name}:${r.params.id || ''}`);

function swapScreen(html, key) {
  const el = document.createElement('section');
  el.className = `screen enter dir-${S.dir}`;
  el.innerHTML = html;
  const old = screenEl;
  if (old) {
    old.classList.remove('enter');
    old.classList.add('leave', `dir-${S.dir}`);
    old.setAttribute('aria-hidden', 'true');
    setTimeout(() => { if (old.parentNode) old.parentNode.removeChild(old); }, calm() ? 0 : 300);
  }
  $stage.appendChild(el);
  screenEl = el;
  screenKey = key;
  lastSwap = Date.now();
  clearTimeout(enterTimer);
  enterTimer = setTimeout(() => el.classList.remove('enter'), 950);
  S.dir = 'fade';
}

function renderModal() {
  const m = G.modal();
  if (!m) {
    if (modalKey) { $modal.innerHTML = ''; $modal.className = 'modal-root'; modalKey = ''; }
    return;
  }
  $modal.className = `modal-root open ${m.kind}`;
  const html = typo(m.html);
  if (modalKey !== m.key) {
    $modal.innerHTML = html;
    modalKey = m.key;
    const field = $modal.querySelector('input.field');
    if (field) { try { field.focus(); field.select(); } catch (e) { /* sans gravité */ } }
  } else morphHtml($modal, html);
}

let toastTimer = 0;
function toast(text) {
  S.toast = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { S.toast = null; renderToast(); }, 3200);
  renderToast();
}
function renderToast() {
  if (S.toast) { $toast.textContent = typo(S.toast); $toast.classList.add('on'); } else $toast.classList.remove('on');
}

let awake = null;
function syncEnv(r) {
  const top = TABS.includes(r.name) && S.stack.length === 1;
  $nav.hidden = !top;
  if (top) morphHtml($nav, V.navBar(r.name));
  const inGame = r.name === 'game' && !!activeGame();
  if (native && native.keepAwake && awake !== inGame) { awake = inGame; try { native.keepAwake(inGame); } catch (e) { /* sans gravité */ } }
  if (S.saveFailed) { S.saveFailed = false; toast('Sauvegarde impossible : le stockage du téléphone est peut-être plein.'); }
}

function render() {
  guard();
  const r = route();
  const key = keyFor(r);
  const html = typo((SCREENS[r.name] || V.home)(r.params));
  if (!screenEl || key !== screenKey) swapScreen(html, key); else morphHtml(screenEl, html);
  renderModal();
  syncCamera();
  syncEnv(r);
}

/* ---------- Thème ---------- */

const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function applyTheme() {
  const s = DB.meta.settings;
  // Dans l'application Android, c'est la coque native qui connaît le thème du téléphone.
  const systemDark = native && native.isNight ? !!native.isNight() : !!darkQuery && darkQuery.matches;
  const dark = s.theme === 'dark' || (s.theme === 'auto' && systemDark);
  const root = document.documentElement;
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.classList.toggle('calm', !s.motion);
  const color = dark ? '#0E1030' : '#2A3CE6';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', color);
  if (native && native.setBars) { try { native.setBars(color); } catch (e) { /* sans gravité */ } }
  configureFeedback(s);
}
if (darkQuery) {
  const onChange = () => { applyTheme(); };
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', onChange); else if (darkQuery.addListener) darkQuery.addListener(onChange);
}

/* ---------- Partie : transitions du moteur ---------- */

let revealTimer = 0;
let drawTimer = 0;
let timerTick = 0;

function stopTimers() { clearTimeout(revealTimer); clearInterval(drawTimer); }

/** Applique une action du moteur, sauvegarde, puis déclenche les effets de la nouvelle phase. */
function play(fn) {
  const before = DB.game;
  const g = fn(before);
  DB.game = g;
  save('game');
  S.dir = 'forward';
  if (g.phase !== before.phase || g.round !== before.round) enterPhase(g, before);
  return g;
}

function enterPhase(g, before) {
  const gui = S.gui;
  gui.error = '';
  gui.tieMode = false;
  gui.tieSel = [];
  if (gui.timer && g.phase !== 'clues') gui.timer.running = false;
  switch (g.phase) {
    case 'clues':
      // Nouveau tour : chrono remis à zéro, à l'arrêt. C'est la table qui le lance quand le débat commence.
      if (!before || before.round !== g.round || !gui.timer) gui.timer = idleTimer(g);
      gui.clue = '';
      break;
    case 'vote':
      gui.gate = true;
      break;
    case 'tally':
      gui.tallyGo = false;
      sfx.cast();
      raf2(() => { gui.tallyGo = true; render(); });
      break;
    case 'draw':
      runDraw(g);
      break;
    case 'reveal':
      gui.guess = '';
      runReveal(g);
      break;
    case 'end':
      finishGame(g);
      break;
    default:
  }
}

function runReveal(g) {
  const gui = S.gui;
  gui.revealShown = false;
  clearTimeout(revealTimer);
  sfx.suspense();
  revealTimer = setTimeout(() => {
    if (DB.game !== g || g.phase !== 'reveal') return;
    gui.revealShown = true;
    const role = g.players[g.last].role;
    if (role === 'civil') sfx.bad(); else sfx.good();
    buzz(40);
    S.dir = 'fade';
    render();
  }, calm() ? 350 : 1700);
}

function runDraw(g) {
  const gui = S.gui;
  gui.drawDone = false;
  gui.drawAt = 0;
  clearInterval(drawTimer);
  const n = g.vote.top.length;
  let ticks = 0;
  const total = calm() ? 1 : 16 + Math.floor(Math.random() * n);
  drawTimer = setInterval(() => {
    if (DB.game !== g || g.phase !== 'draw') { clearInterval(drawTimer); return; }
    ticks++;
    if (ticks >= total) {
      clearInterval(drawTimer);
      gui.drawDone = true;
      sfx.cast();
      buzz(40);
    } else {
      gui.drawAt = ticks % n;
      sfx.tick();
    }
    render();
  }, 130);
}

function finishGame(g) {
  if (!DB.history.some((h) => h.id === g.id)) {
    DB.history.push(E.summarize(g));
    save('history');
    invalidateStats();
  }
  S.gui.endTab = 'points';
  sfx.win();
  buzz([30, 60, 30, 60, 60]);
  if (S.gui.confettiFor !== g.id) {
    S.gui.confettiFor = g.id;
    setTimeout(() => { if (DB.game && DB.game.id === g.id && DB.game.phase === 'end') confetti(g.result.winner); }, 350);
  }
}

/* ---------- Chrono du débat ---------- */

const idleTimer = (g) => (g.options.timer ? { total: g.options.timer, left: g.options.timer, running: false, last: Date.now() } : null);

function startTimer(total) {
  S.gui.timer = { total, left: total, running: true, last: Date.now() };
  ensureTick();
}
function ensureTick() {
  if (timerTick) return;
  timerTick = setInterval(() => {
    const t = S.gui.timer;
    const g = DB.game;
    if (!t || !g || g.phase !== 'clues') { clearInterval(timerTick); timerTick = 0; return; }
    if (!t.running) return;
    const now = Date.now();
    const before = Math.ceil(t.left);
    t.left = Math.max(0, t.left - (now - t.last) / 1000);
    t.last = now;
    const after = Math.ceil(t.left);
    if (t.left <= 0) {
      t.running = false;
      sfx.alarm();
      buzz([220, 120, 220]);
      render();
      return;
    }
    if (after !== before) {
      if (after <= 5) sfx.tick();
      if (after === 10) { render(); return; }
    }
    const txt = document.getElementById('timer-txt');
    const bar = document.getElementById('timer-bar');
    if (txt) txt.textContent = `${Math.floor(after / 60)}:${String(after % 60).padStart(2, '0')}`;
    if (bar) bar.style.width = `${((t.left / t.total) * 100).toFixed(1)}%`;
  }, 200);
}

/* ---------- Confettis ---------- */

function confetti(winner) {
  if (calm()) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  $app.appendChild(canvas);
  const w = canvas.width = $app.clientWidth;
  const h = canvas.height = $app.clientHeight;
  const ctx = canvas.getContext('2d');
  const palette = winner === 'civils' ? ['#FFD23F', '#FFFDF8', '#7C8BFF', '#FF5A3C'] : winner === 'white' ? ['#FFFDF8', '#FFD23F', '#D8DBFF'] : ['#FF5A3C', '#FFD23F', '#FFFDF8'];
  const parts = Array.from({ length: 110 }, () => ({
    x: Math.random() * w, y: -20 - Math.random() * h * 0.5, vx: (Math.random() - 0.5) * 2.2, vy: 2 + Math.random() * 3.5,
    s: 5 + Math.random() * 7, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3, c: palette[Math.floor(Math.random() * palette.length)],
  }));
  const start = performance.now();
  const frame = (now) => {
    const t = now - start;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = t > 2200 ? Math.max(0, 1 - (t - 2200) / 700) : 1;
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vy += 0.03;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
      ctx.restore();
    }
    if (t < 2900 && canvas.parentNode) requestAnimationFrame(frame); else if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  };
  requestAnimationFrame(frame);
}

/* ---------- Lancement d'une partie ---------- */

function startGame(setup, note) {
  const players = setup.players.map(profileById).filter(Boolean);
  if (players.length < E.MIN_PLAYERS) { toast(`Il faut au moins ${E.MIN_PLAYERS} joueurs.`); return false; }
  const sel = { cats: setup.cats, levels: setup.levels, custom: DB.meta.custom };
  const picked = pickPair({ ...sel, used: DB.meta.used, recentWords: DB.meta.recent });
  if (!picked) { toast('Aucune paire de mots dans cette sélection.'); return false; }
  if (picked.recycled) {
    const keys = new Set(buildPool(sel).map((p) => p.key));
    DB.meta.used = DB.meta.used.filter((k) => !keys.has(k));
    note = 'Tous les mots de cette sélection ont été joués : on repart pour un tour.';
  }
  DB.meta.used.push(picked.pair.key);
  DB.meta.recent = DB.meta.recent.concat([picked.pair.a, picked.pair.b]).slice(-24);
  DB.meta.setup = {
    players: setup.players.slice(), mode: setup.mode, u: setup.u, w: setup.w, auto: setup.auto,
    cats: setup.cats.slice(), known: CATEGORIES.map((c) => c.id), levels: setup.levels.slice(), vote: setup.vote, timer: setup.timer, notes: setup.notes,
  };
  save('meta');
  stopTimers();
  DB.game = E.createGame({
    players: players.map((p) => ({ id: p.id, name: p.name, color: p.color, face: p.face })),
    mode: setup.mode, undercover: setup.u, white: setup.w, pair: picked.pair,
    options: { vote: setup.vote, timer: setup.timer, notes: setup.notes },
  });
  save('game');
  S.gui = freshGui();
  S.modal = null;
  S.setup = null;
  S.stack = [{ name: 'home', params: {} }, { name: 'game', params: {} }];
  S.dir = 'forward';
  if (note) toast(note);
  return true;
}

function clearConfetti() {
  $app.querySelectorAll('.confetti').forEach((c) => c.remove());
}

function dropGame() {
  stopTimers();
  clearConfetti();
  DB.game = null;
  save('game');
  S.gui = freshGui();
}

function openCard() {
  const gui = S.gui;
  S.modal = { type: 'card' };
  gui.cardFlipped = false;
  gui.cardReady = false;
  buzz(15);
  raf2(() => {
    gui.cardFlipped = true;
    sfx.flip();
    render();
    setTimeout(() => { gui.cardReady = true; render(); }, calm() ? 50 : 750);
  });
}

const confirm = (o) => { S.modal = { type: 'confirm', ...o }; };

/** Reprise d'une partie depuis l'accueil : on n'y rejoue ni suspense ni tirage, et rien de secret n'est affiché d'emblée. */
function prepareResume() {
  const g = DB.game;
  const gui = S.gui;
  if (!g) return;
  gui.gate = true;
  gui.revealShown = true;
  gui.drawDone = true;
  gui.tallyGo = true;
  gui.tieMode = false;
  gui.tieSel = [];
  if (g.phase === 'clues' && !gui.timer) gui.timer = idleTimer(g);
}

/* ---------- Appareil photo (photo de profil) ---------- */

const PHOTO_SIZE = 256;
const cameraOpen = () => !!S.modal && S.modal.type === 'camera';

/** Après chaque rendu : la caméra ne tourne que si sa fenêtre est affichée. */
function syncCamera() {
  if (!cameraOpen()) { Cam.stopCamera(); return; }
  if (S.modal.step === 'live' || S.modal.step === 'shot') Cam.attachCamera(document.getElementById('cam-video'));
}

async function openCamera(facing) {
  const many = cameraOpen() ? !!S.modal.many : false;
  S.modal = { type: 'camera', step: 'wait', facing, mirror: facing === 'user', many, shot: '', error: '', denied: false, canSettings: !!(native && native.openAppSettings) };
  render();
  try {
    const cam = await Cam.startCamera(facing);
    if (!cameraOpen()) { Cam.stopCamera(); return; }
    S.modal = { ...S.modal, step: 'live', mirror: cam.mirror };
    render();
    const n = await Cam.countCameras();
    if (cameraOpen() && S.modal.many !== n > 1) { S.modal = { ...S.modal, many: n > 1 }; render(); }
  } catch (err) {
    if (err && err.name === 'Cancelled') return;
    Cam.stopCamera();
    if (!cameraOpen()) return;
    S.modal = { ...S.modal, step: 'error', ...Cam.cameraProblem(err) };
    S.modal.error = S.modal.text;
    render();
  }
}

// Appli mise en arrière-plan : on éteint la caméra. Au retour, l'aperçu reprend tout seul.
// (Pendant la question d'autorisation d'Android, l'ouverture est simplement en attente : on n'y touche pas.)
document.addEventListener('visibilitychange', () => {
  if (!cameraOpen()) return;
  const step = S.modal.step;
  if (document.hidden) {
    if (step === 'live' || step === 'shot') Cam.stopCamera();
  } else if (step === 'live' && !Cam.cameraStream()) {
    openCamera(S.modal.facing);
  }
});

/* ---------- Profils ---------- */

function saveProfile() {
  const d = S.draft;
  if (!d) return;
  // Champ laissé vide : le joueur garde le nom indicatif (« Joueur 3 »).
  const name = d.name.trim().replace(/\s+/g, ' ') || d.fallback;
  const clash = DB.profiles.find((p) => p.id !== d.id && norm(p.name) === norm(name));
  if (clash) { d.error = `« ${clash.name} » existe déjà : choisis un autre nom.`; return; }
  if (d.id) {
    const p = profileById(d.id);
    if (p) Object.assign(p, { name, color: d.color, face: d.face, photo: d.photo });
  } else {
    const p = { id: newId('p'), name, color: d.color, face: d.face, photo: d.photo, createdAt: Date.now() };
    DB.profiles.push(p);
    if (d.then === 'setup' && S.setup && S.setup.players.length < E.MAX_PLAYERS) { S.setup.players.push(p.id); fitRoles(S.setup); }
  }
  save('profiles');
  S.draft = null;
  back();
}

/* ---------- Données ---------- */

function exportData() {
  const text = exportPayload(DB);
  const name = `double-jeu-${new Date().toISOString().slice(0, 10)}.json`;
  if (native && native.exportFile) { native.exportFile(name, text); return; }
  if (window.DJ_NO_DOWNLOAD) {
    // Page hébergée là où les téléchargements sont interdits : la sauvegarde passe par le presse-papiers.
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast('Sauvegarde copiée : colle-la dans une note pour la garder.'), () => toast('Copie impossible ici. L’export fonctionne dans l’application Android.'));
    } else {
      toast('Export indisponible ici. Il fonctionne dans l’application Android.');
    }
    return;
  }
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('Sauvegarde téléchargée.');
  } catch (e) {
    toast('Export impossible dans ce navigateur.');
  }
}

function wipeAll() {
  dropGame();
  DB.profiles = [];
  DB.history = [];
  DB.meta = { v: 1, settings: { ...DEFAULT_SETTINGS }, setup: null, used: [], recent: [], custom: [], rulesSeen: false };
  save('profiles'); save('history'); save('meta');
  invalidateStats();
  S.setup = null;
  applyTheme();
}

/* ---------- Actions (attribut data-act) ---------- */

const ACT = {
  back() { S.modal = null; back(); },
  tab(d) { S.modal = null; tab(d.to); },
  go(d) { go(d.to, d.id ? { id: d.id } : {}); },
  'close-modal'() { S.modal = null; },

  /* Accueil */
  'new-game'() {
    if (activeGame()) {
      confirm({ title: 'Une partie est en cours', text: 'En préparer une nouvelle abandonne celle-ci : elle ne comptera pas dans les scores.', yes: 'Nouvelle partie', no: 'Garder', act: 'new-game-go', danger: true });
      return;
    }
    S.setup = defaultSetup();
    go('setup');
  },
  'new-game-go'() { S.modal = null; dropGame(); S.setup = defaultSetup(); go('setup'); },
  'quick-game'() { const s = quickSetup(); if (s) startGame(s); },
  resume() { prepareResume(); go('game'); },

  /* Profils */
  'profile-new'(d) {
    if (DB.profiles.length >= 60) { toast('60 profils, c’est le maximum.'); return; }
    S.draft = { id: null, name: '', fallback: nextDefaultName(), photo: '', error: '', then: d.then || '', ...suggestLook(DB.profiles) };
    go('profile');
  },
  'profile-edit'(d) {
    const p = profileById(d.id);
    if (!p) return;
    // Un nom par défaut (« Joueur 3 ») n'est qu'une indication : le champ s'ouvre vide, prêt à recevoir le vrai nom.
    const auto = isDefaultName(p.name);
    S.draft = { id: p.id, name: auto ? '' : p.name, fallback: auto ? p.name : nextDefaultName(p.id), color: p.color, face: faceId(p.face), photo: p.photo || '', error: '', then: '' };
    go('profile');
  },
  'draft-color'(d) { S.draft.color = d.id; },
  'draft-face'(d) { S.draft.face = d.id; S.draft.photo = ''; },
  'draft-photo-clear'() { S.draft.photo = ''; },
  'camera-open'() { if (S.draft) openCamera('user'); return false; },
  'camera-flip'() { if (cameraOpen()) openCamera(S.modal.facing === 'user' ? 'environment' : 'user'); return false; },
  'camera-retry'() { if (cameraOpen()) openCamera(S.modal.facing); return false; },
  'camera-settings'() { if (native && native.openAppSettings) { try { native.openAppSettings(); } catch (e) { /* sans gravité */ } } S.modal = null; },
  'camera-shoot'() {
    if (!cameraOpen() || S.modal.step !== 'live') return false;
    const url = Cam.snapshot(document.getElementById('cam-video'), PHOTO_SIZE, S.modal.mirror);
    if (!url) { toast('L’image arrive : réessaie dans une seconde.'); return true; }
    S.modal = { ...S.modal, step: 'shot', shot: url };
    sfx.flip();
    buzz(20);
    return true;
  },
  'camera-retake'() {
    if (!cameraOpen()) return false;
    if (!Cam.cameraStream()) { openCamera(S.modal.facing); return false; }
    S.modal = { ...S.modal, step: 'live', shot: '' };
    return true;
  },
  'camera-keep'() {
    if (cameraOpen() && S.modal.shot && S.draft) S.draft.photo = S.modal.shot;
    S.modal = null;
  },
  'profile-save'() { saveProfile(); },
  'profile-delete'() {
    const p = profileById(S.draft && S.draft.id);
    if (!p) return;
    confirm({ title: `Supprimer ${p.name} ?`, text: 'Son profil disparaît du classement. Les parties déjà jouées restent dans l’historique.', yes: 'Supprimer', act: 'profile-delete-go', danger: true, who: p });
  },
  'profile-delete-go'() {
    const id = S.draft && S.draft.id;
    DB.profiles = DB.profiles.filter((p) => p.id !== id);
    if (DB.meta.setup && Array.isArray(DB.meta.setup.players)) { DB.meta.setup.players = DB.meta.setup.players.filter((x) => x !== id); save('meta'); }
    if (S.setup) { S.setup.players = S.setup.players.filter((x) => x !== id); fitRoles(S.setup); }
    save('profiles');
    S.draft = null;
    S.modal = null;
    tab('players');
  },

  /* Préparation */
  'setup-toggle'(d) {
    const s = S.setup;
    const at = s.players.indexOf(d.id);
    if (at >= 0) s.players.splice(at, 1);
    else if (s.players.length >= E.MAX_PLAYERS) { toast(`${E.MAX_PLAYERS} joueurs au maximum.`); return; } else s.players.push(d.id);
    fitRoles(s);
    sfx.tap();
  },
  'setup-clear'() { S.setup.players = []; fitRoles(S.setup); },
  'setup-next'() { if (S.setup.players.length >= E.MIN_PLAYERS) { fitRoles(S.setup); go('options'); } },
  'set-mode'(d) { if (E.MODES[d.id]) S.setup.mode = d.id; },
  'role-step'(d) {
    const s = S.setup;
    const n = s.players.length;
    const u = s.u + (d.k === 'u' ? Number(d.d) : 0), w = s.w + (d.k === 'w' ? Number(d.d) : 0);
    if (u < 0 || w < 0 || u + w < 1 || u + w > E.maxInfiltrators(n)) return;
    s.u = u; s.w = w; s.auto = false;
  },
  'role-reset'() { S.setup.auto = true; fitRoles(S.setup); },
  'set-level'(d) {
    const s = S.setup, id = Number(d.id);
    if (s.levels.includes(id)) { if (s.levels.length > 1) s.levels = s.levels.filter((l) => l !== id); else toast('Garde au moins un niveau.'); } else s.levels = s.levels.concat(id).sort();
  },
  'open-cats'() { S.modal = { type: 'cats' }; },
  'toggle-cat'(d) {
    const s = S.setup;
    s.cats = s.cats.includes(d.id) ? s.cats.filter((c) => c !== d.id) : s.cats.concat(d.id);
  },
  'cats-all'() { S.setup.cats = CATEGORIES.map((c) => c.id).concat(DB.meta.custom.length ? [CUSTOM_CAT.id] : []); },
  'cats-none'() { S.setup.cats = []; },
  'set-vote'(d) { S.setup.vote = d.id === 'secret' ? 'secret' : 'open'; },
  'set-timer'(d) { S.setup.timer = Number(d.id) || 0; },
  'toggle-notes'() { S.setup.notes = !S.setup.notes; },
  'start-game'() { startGame(S.setup); },

  /* Partie : distribution */
  'pick-card'(d) { play((g) => E.pickCard(g, Number(d.i))); openCard(); },
  'reopen-card'() { if (DB.game && DB.game.pendingCard >= 0) openCard(); },
  'confirm-card'() {
    if (!S.gui.cardReady) return false;
    S.modal = null;
    sfx.hide();
    play((g) => E.confirmCard(g));
    return true;
  },

  /* Partie : tour de parole */
  'clue-edit'(d) {
    const g = DB.game, i = Number(d.i);
    if (!g || g.phase !== 'clues' || !g.options.notes) return;
    S.gui.clue = E.clueOf(g, i);
    S.gui.error = '';
    S.modal = { type: 'clue', i };
  },
  'clue-clear'() {
    const m = S.modal;
    S.modal = null;
    if (m && m.type === 'clue') play((g) => E.clearClue(g, m.i));
  },
  'open-vote'() { play((g) => E.openVote(g)); },
  'back-to-talk'() { play((g) => E.backToTalk(g)); S.dir = 'back'; },
  'timer-toggle'() { const t = S.gui.timer; if (t) { t.running = !t.running; t.last = Date.now(); ensureTick(); } },
  'timer-reset'() { const t = S.gui.timer; if (t) startTimer(t.total); },

  /* Partie : vote à main levée */
  'ask-elim'(d) {
    const p = DB.game.players[Number(d.i)];
    confirm({ title: `Éliminer ${p.name} ?`, text: 'Son rôle sera révélé à tout le monde.', yes: 'Éliminer', act: 'do-elim', data: { i: d.i }, danger: true, who: profileById(p.id) || p });
  },
  'do-elim'(d) { S.modal = null; play((g) => E.eliminateByShow(g, Number(d.i))); },
  'tie-mode'() { S.gui.tieMode = true; S.gui.tieSel = []; },
  'tie-cancel'() { S.gui.tieMode = false; S.gui.tieSel = []; },
  'tie-toggle'(d) {
    const i = Number(d.i), sel = S.gui.tieSel;
    S.gui.tieSel = sel.includes(i) ? sel.filter((x) => x !== i) : sel.concat(i);
  },
  'tie-go'() { const sel = S.gui.tieSel.slice(); play((g) => E.declareTie(g, sel)); },
  'start-revote'() { play((g) => E.startRevote(g)); },

  /* Partie : vote secret */
  'gate-open'() { S.gui.gate = false; S.dir = 'forward'; },
  'ask-ballot'(d) {
    const p = DB.game.players[Number(d.i)];
    confirm({ title: `Voter contre ${p.name} ?`, text: 'Ton vote est secret. Une fois le téléphone passé, il ne se change plus.', yes: 'Voter', act: 'do-ballot', data: { i: d.i }, who: profileById(p.id) || p });
  },
  'do-ballot'(d) {
    S.modal = null;
    S.gui.gate = true;
    play((g) => E.castBallot(g, E.currentVoter(g), Number(d.i)));
    sfx.cast();
    buzz(20);
  },
  'undo-ballot'() { play((g) => E.undoBallot(g)); S.gui.gate = true; S.dir = 'back'; },
  'resolve-tally'() { play((g) => E.resolveTally(g)); },
  'confirm-draw'() { if (!S.gui.drawDone) return false; play((g) => E.confirmDraw(g)); return true; },

  /* Partie : révélation */
  'skip-guess'() { play((g) => E.skipGuess(g)); sfx.bad(); },
  'override-guess'() { play((g) => E.overrideGuess(g)); },
  'after-reveal'() {
    const before = DB.game;
    const g = play((x) => E.continueAfterReveal(x));
    // Après un départ, l'ordre de parole a pu être retiré au sort : on le dit, pour que personne ne s'étonne.
    if (g.phase === 'clues' && g.round === before.round && before.order.filter((i) => g.players[i].alive).join() !== g.order.join()) toast('Nouvel ordre de parole tiré au sort.');
  },

  /* Partie : menu */
  'game-menu'() { S.modal = { type: 'menu' }; },
  'menu-rules'() { S.modal = null; go('rules'); },
  'menu-home'() { S.modal = null; tab('home'); },
  peek() { S.modal = { type: 'peek', step: 'pick' }; },
  'peek-pick'(d) { S.modal = { type: 'peek', step: 'gate', i: Number(d.i) }; },
  'peek-show'() { if (S.modal && S.modal.type === 'peek') S.modal = { ...S.modal, step: 'show' }; },
  'ask-leave'() { S.modal = { type: 'leave' }; },
  'leave-pick'(d) {
    const p = DB.game.players[Number(d.i)];
    confirm({ title: `${p.name} quitte la table ?`, text: 'Son rôle sera révélé et la partie continuera avec les autres.', yes: 'Confirmer', act: 'do-leave', data: { i: d.i }, danger: true, who: profileById(p.id) || p });
  },
  'do-leave'(d) { S.modal = null; play((g) => E.playerLeaves(g, Number(d.i))); },
  'ask-redeal'() { confirm({ title: 'Redistribuer les cartes ?', text: 'La partie repart de zéro avec un nouveau mot.', yes: 'Redistribuer', act: 'do-redeal' }); },
  'do-redeal'() { S.modal = null; dropGame(); startGame(defaultSetup(), 'Nouvelle distribution, nouveau mot.'); },
  'ask-abandon'() { confirm({ title: 'Abandonner la partie ?', text: 'Elle ne comptera pas dans les scores ni dans l’historique.', yes: 'Abandonner', no: 'Continuer', act: 'do-abandon', danger: true }); },
  'do-abandon'() { S.modal = null; dropGame(); tab('home'); toast('Partie abandonnée.'); },

  /* Fin de partie */
  'end-tab'(d) { S.gui.endTab = d.id; },
  replay() { dropGame(); const s = quickSetup(); if (s) startGame(s); else { S.setup = defaultSetup(); S.stack = [{ name: 'home', params: {} }, { name: 'setup', params: {} }]; } },
  'end-settings'() {
    dropGame();
    S.setup = defaultSetup();
    S.stack = [{ name: 'home', params: {} }, { name: 'setup', params: {} }];
    if (S.setup.players.length >= E.MIN_PLAYERS) S.stack.push({ name: 'options', params: {} });
    S.dir = 'forward';
  },
  'end-home'() { dropGame(); tab('home'); },

  /* Classement, historique */
  'rank-tab'(d) { S.rank.tab = d.id === 'night' ? 'night' : 'all'; },
  'rank-sort'(d) { S.rank.sort = d.id; },
  'history-delete'(d) { confirm({ title: 'Supprimer cette partie ?', text: 'Ses points seront retirés des scores et des statistiques.', yes: 'Supprimer', act: 'history-delete-go', data: { id: d.id }, danger: true }); },
  'history-delete-go'(d) {
    DB.history = DB.history.filter((h) => h.id !== d.id);
    save('history');
    invalidateStats();
    S.modal = null;
    back();
    toast('Partie supprimée.');
  },

  /* Réglages */
  'set-theme'(d) { DB.meta.settings.theme = ['auto', 'light', 'dark'].includes(d.id) ? d.id : 'auto'; save('meta'); applyTheme(); },
  'toggle-sound'() { const s = DB.meta.settings; s.sound = !s.sound; save('meta'); applyTheme(); if (s.sound) sfx.good(); },
  'toggle-haptics'() { const s = DB.meta.settings; s.haptics = !s.haptics; save('meta'); applyTheme(); if (s.haptics) buzz(30); },
  'toggle-motion'() { const s = DB.meta.settings; s.motion = !s.motion; save('meta'); applyTheme(); },
  'ask-reset-used'() { confirm({ title: 'Rejouer tous les mots ?', text: 'Les paires déjà sorties pourront revenir dans les prochaines parties.', yes: 'Remettre à zéro', act: 'reset-used-go' }); },
  'reset-used-go'() { DB.meta.used = []; DB.meta.recent = []; save('meta'); S.modal = null; toast('Tous les mots peuvent ressortir.'); },
  'export-data'() { exportData(); },
  'ask-reset-scores'() { confirm({ title: 'Effacer les scores ?', text: 'L’historique et toutes les statistiques seront supprimés. Les profils restent.', yes: 'Effacer', act: 'reset-scores-go', danger: true }); },
  'reset-scores-go'() { DB.history = []; save('history'); invalidateStats(); S.modal = null; toast('Scores et historique effacés.'); },
  'ask-reset-all'() { confirm({ title: 'Tout effacer ?', text: 'Joueurs, scores, historique, mots perso et réglages : l’appli repart de zéro.', yes: 'Tout effacer', act: 'reset-all-go', danger: true }); },
  'reset-all-go'() { wipeAll(); S.modal = null; tab('home'); toast('Tout est effacé.'); },
  'import-go'() {
    const data = S.pendingImport;
    S.pendingImport = null;
    S.modal = null;
    if (!data) return;
    dropGame();
    DB.meta = data.meta; DB.profiles = data.profiles; DB.history = data.history;
    save('meta'); save('profiles'); save('history');
    invalidateStats();
    S.setup = null;
    applyTheme();
    toast('Sauvegarde importée.');
  },
  'pair-delete'(d) { DB.meta.custom.splice(Number(d.i), 1); save('meta'); },
};

/* ---------- Saisie, formulaires, fichiers ---------- */

const IN = {
  'draft-name'(v) { if (S.draft) { S.draft.name = v; S.draft.error = ''; } },
  clue(v) { S.gui.clue = v; },
  guess(v) { S.gui.guess = v; },
  'pair-a'(v) { S.pairDraft.a = v; },
  'pair-b'(v) { S.pairDraft.b = v; },
};

const FORMS = {
  profile() { saveProfile(); },
  clue() {
    const g = DB.game, m = S.modal;
    if (!g || !m || m.type !== 'clue') return;
    const check = E.checkClue(g, S.gui.clue, m.i);
    if (!check.ok) { S.gui.error = check.error; buzz(30); return; }
    play((x) => E.setClue(x, m.i, check.text));
    S.modal = null;
    S.gui.clue = '';
    S.gui.error = '';
    sfx.tap();
  },
  guess() {
    const text = S.gui.guess.trim();
    if (!text) { S.gui.error = 'Écris une proposition, ou touche « Aucune idée, on passe ».'; return; }
    const g = play((x) => E.submitGuess(x, text));
    S.gui.error = '';
    if (g.guess.ok) { sfx.good(); buzz([30, 40, 30]); } else { sfx.bad(); buzz(60); }
  },
  pair(form) {
    const d = S.pairDraft;
    const a = d.a.trim().replace(/\s+/g, ' '), b = d.b.trim().replace(/\s+/g, ' ');
    const na = norm(a), nb = norm(b);
    d.error = '';
    if (!na || !nb) { d.error = 'Remplis les deux mots.'; return; }
    if (na === nb) { d.error = 'Les deux mots doivent être différents.'; return; }
    if (DB.meta.custom.length >= 300) { d.error = '300 paires perso, c’est le maximum.'; return; }
    const dup = DB.meta.custom.some((p) => { const x = norm(p[0]), y = norm(p[1]); return (x === na && y === nb) || (x === nb && y === na); });
    if (dup) { d.error = 'Cette paire est déjà dans la liste.'; return; }
    DB.meta.custom.unshift([a, b]);
    if (DB.meta.setup && Array.isArray(DB.meta.setup.cats) && !DB.meta.setup.cats.includes(CUSTOM_CAT.id)) DB.meta.setup.cats.push(CUSTOM_CAT.id);
    save('meta');
    S.pairDraft = { a: '', b: '' };
    form.querySelectorAll('input').forEach((i) => { i.value = ''; });
    const first = form.querySelector('input');
    if (first) first.focus();
  },
};

const FILES = {
  import(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = parseImport(String(reader.result || ''));
        S.pendingImport = data;
        confirm({ title: 'Importer cette sauvegarde ?', text: `${data.profiles.length} joueur${data.profiles.length > 1 ? 's' : ''} et ${data.history.length} partie${data.history.length > 1 ? 's' : ''}. Les données actuelles de ce téléphone seront remplacées.`, yes: 'Importer', act: 'import-go', danger: true });
      } catch (e) {
        toast(e.message || 'Fichier illisible.');
      }
      render();
    };
    reader.onerror = () => toast('Impossible de lire ce fichier.');
    reader.readAsText(file);
  },
};

function run(fn, ...args) {
  try {
    if (fn(...args) !== false) render();
  } catch (e) {
    if (e instanceof E.GameError) { toast(e.message); render(); } else throw e;
  }
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest ? ev.target.closest('[data-act]') : null;
  if (!el) {
    if (ev.target === $modal && S.modal && S.modal.type !== 'card') { S.modal = null; render(); }
    return;
  }
  if (el.disabled) return;
  // Anti double-appui : on ignore le toucher qui suit immédiatement un changement d'écran.
  if (!window.DJ_TEST && Date.now() - lastSwap < 260 && !$modal.contains(el)) return;
  const fn = ACT[el.dataset.act];
  if (fn) run(fn, el.dataset, el);
});
document.addEventListener('input', (ev) => {
  const k = ev.target.dataset ? ev.target.dataset.in : '';
  if (k && IN[k]) IN[k](ev.target.value);
});
document.addEventListener('change', (ev) => {
  const k = ev.target.dataset ? ev.target.dataset.file : '';
  if (k && FILES[k]) { FILES[k](ev.target.files && ev.target.files[0]); ev.target.value = ''; }
});
document.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const k = ev.target.dataset ? ev.target.dataset.form : '';
  if (k && FORMS[k]) run(FORMS[k], ev.target);
});

/* ---------- Bouton retour (Android) et clavier ---------- */

function handleBack() {
  if (S.modal) {
    if (S.modal.type === 'card') return true;
    S.modal = null;
    render();
    return true;
  }
  const r = route();
  if (r.name === 'game') {
    if (DB.game && DB.game.phase === 'end') { dropGame(); tab('home'); } else S.modal = { type: 'menu' };
    render();
    return true;
  }
  const moved = back();
  if (moved) render();
  return moved;
}

window.DJ = {
  back: handleBack,
  exported(ok) { toast(ok ? 'Sauvegarde enregistrée.' : 'Export annulé.'); },
  themeChanged() { applyTheme(); },
};
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') handleBack(); });

/* ---------- Démarrage ---------- */

function boot() {
  // Une partie terminée mais encore affichée à la fermeture : elle est déjà dans l'historique, on la range.
  if (DB.game && DB.game.phase === 'end') {
    if (!DB.history.some((h) => h.id === DB.game.id)) { try { DB.history.push(E.summarize(DB.game)); save('history'); } catch (e) { /* partie illisible : ignorée */ } }
    DB.game = null;
    save('game');
  }
  // Les dessins des personnages sont déclarés une fois pour toute la page.
  if (!document.getElementById('av-sprite')) document.body.insertAdjacentHTML('afterbegin', avatarSprite());
  applyTheme();
  render();
  document.documentElement.classList.add('ready');
}

window.__dj = { S, DB, E, Cam, render };
boot();
