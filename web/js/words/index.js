// Assemble la bibliothèque de mots et fournit le tirage des paires.
import nature from './nature.js';
import monde from './monde.js';
import vie from './vie.js';
import divertissement from './divertissement.js';
import esprit from './esprit.js';
import premium from './premium.js';
import { norm, pairKey } from '../text.js';

export const LEVELS = [
  { id: 1, name: 'Facile', hint: 'Mots concrets, connus de tous' },
  { id: 2, name: 'Moyen', hint: 'Demande un peu de finesse' },
  { id: 3, name: 'Corsé', hint: 'Subtil, pointu ou tordu' },
];

const ORDER = ['objets', 'nourriture', 'animaux', 'situations', 'metiers', 'ecole', 'loisirs', 'sport', 'cinema', 'musique',
  'celebrites', 'geo', 'histoire', 'culture', 'sciences', 'elec', 'tech', 'expressions', 'abstrait', 'humour',
  'soiree', 'politique', 'foot'];

function parse(cat) {
  const out = [];
  let lvl = 1;
  for (const line of cat.w.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    if (s[0] === '#') { lvl = Number(s.slice(1)) || 1; continue; }
    const i = s.indexOf('|');
    if (i < 0) continue;
    const a = s.slice(0, i).trim(), b = s.slice(i + 1).trim();
    if (a && b) out.push({ a, b, lvl, cat: cat.id, key: pairKey(a, b) });
  }
  return out;
}

const RAW = [...nature, ...monde, ...vie, ...divertissement, ...esprit, ...premium];

export const CATEGORIES = RAW
  // `pack` : identifiant du produit qui débloque le thème (absent pour les thèmes offerts).
  .map((c) => ({ id: c.id, name: c.name, hint: c.hint, pack: c.pack || null, pairs: parse(c) }))
  .sort((x, y) => ORDER.indexOf(x.id) - ORDER.indexOf(y.id));

export const CUSTOM_CAT = { id: 'perso', name: 'Nos mots', hint: 'Les paires ajoutées par votre groupe' };

export const TOTAL_PAIRS = CATEGORIES.reduce((n, c) => n + c.pairs.length, 0);
/** Paires des thèmes offerts (hors packs à débloquer). */
export const FREE_PAIRS = CATEGORIES.filter((c) => !c.pack).reduce((n, c) => n + c.pairs.length, 0);
export const FREE_CATS = CATEGORIES.filter((c) => !c.pack).length;

export function categoryName(id) {
  if (id === CUSTOM_CAT.id) return CUSTOM_CAT.name;
  const c = CATEGORIES.find((k) => k.id === id);
  return c ? c.name : id;
}

/** Toutes les paires jouables pour une sélection de thèmes et de niveaux. */
export function buildPool({ cats, levels, custom }) {
  const catSet = new Set(cats), lvlSet = new Set(levels);
  const out = [];
  for (const c of CATEGORIES) {
    if (!catSet.has(c.id)) continue;
    for (const p of c.pairs) if (lvlSet.has(p.lvl)) out.push(p);
  }
  if (catSet.has(CUSTOM_CAT.id)) {
    for (const p of custom || []) out.push({ a: p[0], b: p[1], lvl: 0, cat: CUSTOM_CAT.id, key: pairKey(p[0], p[1]) });
  }
  return out;
}

/**
 * Tire une paire sans répétition : jamais une paire déjà jouée tant que la sélection n'est pas épuisée,
 * et pas de mot vu dans les dernières parties quand c'est évitable.
 * @returns {{pair: object, recycled: boolean}|null}
 */
export function pickPair({ cats, levels, custom, used, recentWords, rng }) {
  const pool = buildPool({ cats, levels, custom });
  if (!pool.length) return null;
  const usedSet = used instanceof Set ? used : new Set(used || []);
  let fresh = pool.filter((p) => !usedSet.has(p.key));
  let recycled = false;
  if (!fresh.length) { fresh = pool; recycled = true; }
  const recent = new Set((recentWords || []).map(norm));
  const calm = fresh.filter((p) => !recent.has(norm(p.a)) && !recent.has(norm(p.b)));
  const from = calm.length ? calm : fresh;
  const r = rng || Math.random;
  return { pair: from[Math.floor(r() * from.length)], recycled };
}
