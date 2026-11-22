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
  'soiree', 'coquin', 'politique', 'foot'];

/** Pack qui débloque chaque thème de base (les thèmes ajoutés par premium.js portent le leur). */
const THEME_PACK = {
  objets: 'pack_quotidien', nourriture: 'pack_quotidien', animaux: 'pack_quotidien', situations: 'pack_quotidien', metiers: 'pack_quotidien',
  geo: 'pack_culture', histoire: 'pack_culture', culture: 'pack_culture', sciences: 'pack_culture', celebrites: 'pack_culture',
  cinema: 'pack_loisirs', musique: 'pack_loisirs', sport: 'pack_loisirs', loisirs: 'pack_loisirs', tech: 'pack_loisirs',
  expressions: 'pack_esprit', abstrait: 'pack_esprit', humour: 'pack_esprit', ecole: 'pack_esprit', elec: 'pack_esprit',
};

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
  // `pack` : produit qui débloque le thème. `extra` : thème vendu en plus de la bibliothèque de base.
  .map((c) => ({ id: c.id, name: c.name, hint: c.hint, pack: c.pack || THEME_PACK[c.id] || null, extra: !!c.pack, pairs: parse(c) }))
  .sort((x, y) => ORDER.indexOf(x.id) - ORDER.indexOf(y.id));

export const CUSTOM_CAT = { id: 'perso', name: 'Nos mots', hint: 'Les paires ajoutées par votre groupe' };

export const TOTAL_PAIRS = CATEGORIES.reduce((n, c) => n + c.pairs.length, 0);

/**
 * Sélection découverte, offerte à tous : des paires faciles prises à tour de rôle dans chaque thème
 * de base, soit un mélange de 150 paires (300 mots) simples dans tous les domaines. Pour choisir ses
 * thèmes et monter en difficulté, il faut débloquer des thèmes.
 */
export const DISCOVERY_SIZE = 150;
export const DISCOVERY_CAT = { id: 'decouverte', name: 'Sélection découverte', hint: 'Un mélange de mots simples, dans tous les domaines' };
export const DISCOVERY_PAIRS = (() => {
  const easy = CATEGORIES.filter((c) => !c.extra).map((c) => c.pairs.filter((p) => p.lvl === 1));
  const out = [];
  for (let rank = 0; out.length < DISCOVERY_SIZE && easy.some((l) => l.length > rank); rank++) {
    for (const l of easy) if (l.length > rank && out.length < DISCOVERY_SIZE) out.push(l[rank]);
  }
  return out;
})();

export function categoryName(id) {
  if (id === CUSTOM_CAT.id) return CUSTOM_CAT.name;
  if (id === DISCOVERY_CAT.id) return DISCOVERY_CAT.name;
  const c = CATEGORIES.find((k) => k.id === id);
  return c ? c.name : id;
}

/** Toutes les paires jouables pour une sélection de thèmes et de niveaux. */
export function buildPool({ cats, levels, custom }) {
  const catSet = new Set(cats), lvlSet = new Set(levels);
  const out = [];
  const seen = new Set();
  for (const c of CATEGORIES) {
    if (!catSet.has(c.id)) continue;
    for (const p of c.pairs) if (lvlSet.has(p.lvl)) { out.push(p); seen.add(p.key); }
  }
  // La sélection découverte ne dépend pas des niveaux ; une paire déjà apportée par son thème n'est pas doublée.
  if (catSet.has(DISCOVERY_CAT.id)) for (const p of DISCOVERY_PAIRS) if (!seen.has(p.key)) out.push(p);
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
