// Sauvegarde locale. Quatre tiroirs indépendants (meta, profiles, history, game) pour ne réécrire
// que ce qui change. Dans l'application Android, chaque tiroir est un fichier écrit de façon atomique
// par la coque native (window.DJNative) ; dans un navigateur, on se rabat sur localStorage.

import { upgradeGame } from './engine.js';
import { cleanEco } from './shop.js';

const NS = 'dj2:';
const KEYS = ['meta', 'profiles', 'history', 'game'];
const native = typeof window !== 'undefined' && window.DJNative ? window.DJNative : null;
const memory = {};

export const isNative = !!native;

function rawRead(key) {
  try {
    if (native) return native.read(key) || '';
    return window.localStorage.getItem(NS + key) || '';
  } catch (e) {
    return memory[key] || '';
  }
}

function rawWrite(key, text) {
  memory[key] = text;
  try {
    if (native) return native.write(key, text) !== false;
    window.localStorage.setItem(NS + key, text);
    return true;
  } catch (e) {
    return false;
  }
}

function readJson(key) {
  const tryParse = (t) => { try { return t ? JSON.parse(t) : undefined; } catch (e) { return undefined; } };
  let v = tryParse(rawRead(key));
  // Fichier principal illisible : on reprend la copie de secours gardée par la coque native.
  if (v === undefined && native && native.readBackup) v = tryParse(native.readBackup(key));
  return v;
}

export const DEFAULT_SETTINGS = { theme: 'auto', sound: true, haptics: true, motion: true };

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const arr = (v) => (Array.isArray(v) ? v : []);

export function cleanProfile(p) {
  if (!p || typeof p !== 'object') return null;
  const name = str(p.name, 16).trim();
  const id = str(p.id, 40);
  if (!name || !id) return null;
  const photo = typeof p.photo === 'string' && p.photo.startsWith('data:image/') && p.photo.length < 400000 ? p.photo : '';
  return { id, name, color: str(p.color, 20), face: str(p.face, 20), photo, createdAt: Number(p.createdAt) || Date.now() };
}

function cleanMeta(m) {
  m = m && typeof m === 'object' ? m : {};
  const s = m.settings && typeof m.settings === 'object' ? m.settings : {};
  return {
    v: 1,
    settings: {
      theme: ['auto', 'light', 'dark'].includes(s.theme) ? s.theme : DEFAULT_SETTINGS.theme,
      sound: s.sound !== false,
      haptics: s.haptics !== false,
      motion: s.motion !== false,
    },
    setup: m.setup && typeof m.setup === 'object' ? m.setup : null,
    used: arr(m.used).filter((k) => typeof k === 'string').slice(-6000),
    recent: arr(m.recent).filter((k) => typeof k === 'string').slice(-24),
    custom: arr(m.custom).filter((p) => Array.isArray(p) && p.length === 2 && p[0] && p[1]).map((p) => [str(p[0], 40), str(p[1], 40)]),
    rulesSeen: !!m.rulesSeen,
    // Réserve de parties et achats connus (voir shop.js).
    eco: cleanEco(m.eco),
  };
}

function cleanHistory(h) {
  return arr(h).filter((r) => r && typeof r === 'object' && r.id && Array.isArray(r.players) && r.winner && Number(r.at) > 0);
}

function cleanGame(g) {
  if (!g || typeof g !== 'object' || g.v !== 1 || !Array.isArray(g.players) || !Array.isArray(g.cards)) return null;
  if (g.players.length !== g.cards.length || !g.phase || !g.words) return null;
  return upgradeGame(g);
}

/** Charge toutes les données, en tolérant les tiroirs vides ou abîmés. */
export function loadDb() {
  const seen = new Set();
  const profiles = arr(readJson('profiles')).map(cleanProfile).filter((p) => p && !seen.has(p.id) && seen.add(p.id));
  return {
    meta: cleanMeta(readJson('meta')),
    profiles,
    history: cleanHistory(readJson('history')),
    game: cleanGame(readJson('game')),
  };
}

/** Écrit un tiroir. Renvoie false si l'écriture a échoué (stockage plein ou indisponible). */
export function persist(db, key) {
  if (!KEYS.includes(key)) return false;
  return rawWrite(key, JSON.stringify(db[key] === undefined ? null : db[key]));
}

/** Contenu d'une sauvegarde exportable (la partie en cours n'en fait pas partie). */
export function exportPayload(db) {
  return JSON.stringify({ app: 'double-jeu', format: 1, exportedAt: new Date().toISOString(), meta: db.meta, profiles: db.profiles, history: db.history });
}

/** Lit une sauvegarde exportée. Lève une erreur lisible si le fichier ne convient pas. */
export function parseImport(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { throw new Error('Ce fichier n’est pas une sauvegarde lisible.'); }
  if (!data || data.app !== 'double-jeu') throw new Error('Ce fichier ne vient pas de Double Jeu.');
  const seen = new Set();
  return {
    meta: cleanMeta(data.meta),
    profiles: arr(data.profiles).map(cleanProfile).filter((p) => p && !seen.has(p.id) && seen.add(p.id)),
    history: cleanHistory(data.history),
  };
}
