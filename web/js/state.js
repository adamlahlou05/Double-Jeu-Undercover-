// État de l'application : données persistées (DB), état d'interface (S), navigation et sélecteurs.

import { loadDb, persist } from './store.js';
import { computeStats } from './stats.js';
import { CATEGORIES, CUSTOM_CAT, buildPool } from './words/index.js';
import * as E from './engine.js';
import { norm } from './text.js';
import { shopActive, ownsPack } from './shop.js';

export const APP_VERSION = '3.0.0';
export const TIMER_CHOICES = [0, 60, 120, 180, 300];

export const DB = loadDb();

export function freshGui() {
  return {
    cardFlipped: false, cardReady: false,
    gate: true,
    tieMode: false, tieSel: [],
    revealShown: false,
    tallyGo: false,
    drawAt: -1, drawDone: false,
    clue: '', guess: '', error: '',
    timer: null,
    confettiFor: '',
    endTab: 'points',
  };
}

export const S = {
  stack: [{ name: 'home', params: {} }],
  dir: 'fade',
  modal: null,
  toast: null,
  setup: null,
  draft: null,
  gui: freshGui(),
  rank: { tab: 'all', sort: 'points' },
  // Ce que la coque Android sait de la boutique : prix affichés par Google Play, pubs prêtes ou non.
  shop: { ads: false, billing: false, prices: {}, privacy: false, test: false },
  hero: null,
  pairDraft: { a: '', b: '' },
  saveFailed: false,
};

/* ---------- Persistance ---------- */

export function save(key) {
  const ok = persist(DB, key);
  if (!ok) S.saveFailed = true;
  return ok;
}

/* ---------- Navigation ---------- */

export const TABS = ['home', 'players', 'ranking', 'history', 'settings'];
export const route = () => S.stack[S.stack.length - 1];

export function go(name, params = {}) {
  S.stack.push({ name, params });
  S.dir = 'forward';
}
export function replace(name, params = {}) {
  S.stack[S.stack.length - 1] = { name, params };
  S.dir = 'fade';
}
export function tab(name) {
  S.stack = [{ name, params: {} }];
  S.dir = 'fade';
}
export function back() {
  if (S.stack.length > 1) { S.stack.pop(); S.dir = 'back'; return true; }
  if (route().name !== 'home') { tab('home'); return true; }
  return false;
}

/* ---------- Sélecteurs ---------- */

export const profileById = (id) => DB.profiles.find((p) => p.id === id) || null;

/** « Joueur 3 » : un nom donné par défaut, pas un nom choisi. */
export const isDefaultName = (name) => /^Joueur \d{1,3}$/.test(String(name || '').trim());

/** Premier « Joueur N » encore libre (en ignorant le profil en cours de modification). */
export function nextDefaultName(exceptId = null) {
  const taken = new Set(DB.profiles.filter((p) => p.id !== exceptId).map((p) => norm(p.name)));
  for (let n = 1; n < 1000; n++) if (!taken.has(norm(`Joueur ${n}`))) return `Joueur ${n}`;
  return 'Joueur';
}

/** Apparence à afficher pour un joueur de partie ou d'historique : le profil vivant s'il existe encore. */
export const lookOf = (player) => profileById(player.id) || player;

let statsCache = null;
let nightCache = null;
export function stats() { return statsCache || (statsCache = computeStats(DB.history)); }
export const NIGHT_MS = 12 * 3600 * 1000;
export function nightStats() {
  const since = Date.now() - NIGHT_MS;
  if (!nightCache || nightCache.since < since - 60000) nightCache = { since, data: computeStats(DB.history, since) };
  return nightCache.data;
}
export function invalidateStats() { statsCache = null; nightCache = null; }

export const activeGame = () => (DB.game && DB.game.phase !== 'end' ? DB.game : null);

const ALL_CATS = CATEGORIES.map((c) => c.id);

/** Un thème de pack n'est jouable que s'il a été débloqué (ou avec le jeu illimité). Hors application : jamais. */
export const catOpen = (c) => !c.pack || (shopActive() && ownsPack(DB.meta.eco, c.pack));
/** Identifiants des thèmes jouables sur cet appareil. */
export const openCats = () => CATEGORIES.filter(catOpen).map((c) => c.id);
// Thèmes de la version 2.0 : sert à repérer les thèmes ajoutés depuis par une mise à jour.
const CATS_V20 = ['objets', 'nourriture', 'animaux', 'situations', 'metiers', 'ecole', 'loisirs', 'sport', 'cinema', 'musique',
  'celebrites', 'geo', 'histoire', 'culture', 'sciences', 'tech', 'expressions', 'abstrait', 'humour'];

/** Réglages proposés pour une nouvelle partie : ceux de la dernière, nettoyés. */
export function defaultSetup() {
  const last = DB.meta.setup || {};
  const players = (Array.isArray(last.players) ? last.players : []).filter((id) => profileById(id)).slice(0, E.MAX_PLAYERS);
  const open = openCats();
  let cats = Array.isArray(last.cats) ? last.cats.filter((c) => open.includes(c) || c === CUSTOM_CAT.id) : open.slice();
  // Un thème apparu avec une mise à jour, ou un pack qui vient d'être débloqué, est coché d'office :
  // il ne peut pas avoir été écarté par le joueur.
  const known = Array.isArray(last.known) ? last.known : CATS_V20;
  if (Array.isArray(last.cats)) for (const c of open) if (!known.includes(c) && !cats.includes(c)) cats.push(c);
  if (!cats.length) cats = open.slice();
  let levels = Array.isArray(last.levels) ? last.levels.filter((l) => [1, 2, 3].includes(l)) : [1, 2];
  // Le niveau « Corsé » est décoché par défaut. Les réglages enregistrés avant la version 3 sont remis
  // sur ce défaut une fois ; ensuite, le choix du joueur est conservé.
  if (last.rev !== 3) levels = levels.filter((l) => l !== 3);
  if (!levels.length) levels = [1, 2];
  const s = {
    players,
    mode: E.MODES[last.mode] ? last.mode : 'classic',
    u: 1, w: 1,
    auto: last.auto !== false,
    cats, levels,
    // Thèmes jouables au moment où ce réglage est proposé : un pack débloqué plus tard sera coché d'office.
    known: open.slice(),
    vote: last.vote === 'secret' ? 'secret' : 'open',
    timer: TIMER_CHOICES.includes(last.timer) ? last.timer : 0,
    notes: !!last.notes,
  };
  const n = Math.max(players.length, E.MIN_PLAYERS);
  const roles = s.auto ? E.defaultRoles(n) : E.clampRoles(n, last.u, last.w);
  s.u = roles.u; s.w = roles.w;
  return s;
}

/** Réajuste les rôles quand le nombre de joueurs change. */
export function fitRoles(setup) {
  const n = Math.max(setup.players.length, E.MIN_PLAYERS);
  const r = setup.auto ? E.defaultRoles(n) : E.clampRoles(n, setup.u, setup.w);
  setup.u = r.u; setup.w = r.w;
}

/** Paires disponibles pour un réglage donné : total et jamais jouées. */
export function poolInfo(setup) {
  const pool = buildPool({ cats: setup.cats, levels: setup.levels, custom: DB.meta.custom });
  const used = new Set(DB.meta.used);
  let fresh = 0;
  for (const p of pool) if (!used.has(p.key)) fresh++;
  return { total: pool.length, fresh };
}

/** La dernière équipe peut-elle rejouer telle quelle ? */
export function quickSetup() {
  const last = DB.meta.setup;
  if (!last || !Array.isArray(last.players)) return null;
  if (last.players.length < E.MIN_PLAYERS || !last.players.every((id) => profileById(id))) return null;
  const s = defaultSetup();
  return poolInfo(s).total ? s : null;
}

export function newId(prefix) {
  return prefix + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);
}
