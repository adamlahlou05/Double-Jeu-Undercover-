// État de l'application : données persistées (DB), état d'interface (S), navigation et sélecteurs.

import { loadDb, persist } from './store.js';
import { computeStats } from './stats.js';
import { CATEGORIES, CUSTOM_CAT, buildPool } from './words/index.js';
import * as E from './engine.js';

export const APP_VERSION = '2.0.0';
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

/** Réglages proposés pour une nouvelle partie : ceux de la dernière, nettoyés. */
export function defaultSetup() {
  const last = DB.meta.setup || {};
  const players = (Array.isArray(last.players) ? last.players : []).filter((id) => profileById(id)).slice(0, E.MAX_PLAYERS);
  let cats = Array.isArray(last.cats) ? last.cats.filter((c) => ALL_CATS.includes(c) || c === CUSTOM_CAT.id) : ALL_CATS.slice();
  if (!cats.length) cats = ALL_CATS.slice();
  let levels = Array.isArray(last.levels) ? last.levels.filter((l) => [1, 2, 3].includes(l)) : [1, 2];
  if (!levels.length) levels = [1, 2];
  const s = {
    players,
    mode: E.MODES[last.mode] ? last.mode : 'classic',
    u: 1, w: 1,
    auto: last.auto !== false,
    cats, levels,
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
