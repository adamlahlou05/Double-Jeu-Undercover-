// Bibliothèque de mots et tirage des paires.
// Les mots viennent de library.js, fabriqué par scripts/import-words.py à partir du classeur
// data/double-jeu-mots.xlsx : c'est le classeur qu'on modifie, jamais library.js.
import LIBRARY from './library.js';
import { norm, pairKey } from '../text.js';

export const LEVELS = [
  { id: 1, name: 'Facile', hint: 'Mots concrets, connus de tous' },
  { id: 2, name: 'Moyen', hint: 'Demande un peu de finesse' },
  { id: 3, name: 'Corsé', hint: 'Subtil, pointu ou tordu' },
];

/**
 * Thèmes, dans l'ordre d'affichage. `pack` : produit qui débloque le thème. `extra` : thème vendu seul,
 * fermé dans la version navigateur. Une paire : { a, b, lvl, cat, key, free, ea, eb } où `free` marque
 * la sélection découverte et `ea` / `eb` sont les explications des deux mots (chaînes vides s'il n'y en a pas).
 */
export const CATEGORIES = LIBRARY.map((c) => ({
  id: c.id, name: c.name, hint: c.hint, pack: c.pack, extra: !!c.extra,
  pairs: c.pairs.map(([lvl, free, a, b, ea = '', eb = '']) => ({ a, b, lvl, cat: c.id, key: pairKey(a, b), free: !!free, ea, eb })),
}));

export const CUSTOM_CAT = { id: 'perso', name: 'Nos mots', hint: 'Les paires ajoutées par votre groupe' };

export const TOTAL_PAIRS = CATEGORIES.reduce((n, c) => n + c.pairs.length, 0);

/**
 * Sélection découverte, offerte à tous : les paires marquées « Offert » dans le classeur, des mots
 * faciles pris dans chaque thème de base. Pour choisir ses thèmes et monter en difficulté, il faut
 * débloquer des thèmes.
 */
export const DISCOVERY_CAT = { id: 'decouverte', name: 'Sélection découverte', hint: 'Un mélange de mots simples, dans tous les domaines' };
export const DISCOVERY_PAIRS = CATEGORIES.flatMap((c) => c.pairs.filter((p) => p.free));

const BY_KEY = new Map(CATEGORIES.flatMap((c) => c.pairs.map((p) => [p.key, p])));

/**
 * Explication d'un mot de la bibliothèque, en deux phrases au plus, ou '' s'il n'y en a pas
 * (mot non expliqué, paire ajoutée par le groupe). `other` est l'autre mot de la paire en jeu.
 */
export function explain(word, other) {
  const p = BY_KEY.get(pairKey(word, other));
  if (!p) return '';
  const w = norm(word);
  return w === norm(p.a) ? p.ea : w === norm(p.b) ? p.eb : '';
}

/** Niveau d'une paire de la bibliothèque (0 si elle n'en fait pas partie). */
export const pairLevel = (a, b) => (BY_KEY.get(pairKey(a, b)) || { lvl: 0 }).lvl;

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
