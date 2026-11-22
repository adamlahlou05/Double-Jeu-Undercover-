import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, TOTAL_PAIRS, LEVELS, DISCOVERY_CAT, DISCOVERY_PAIRS, DISCOVERY_SIZE, buildPool, pickPair, categoryName } from '../../web/js/words/index.js';
import { norm, guessMatches, pairKey, lev } from '../../web/js/text.js';

test('bibliothèque : volume, niveaux et unicité', () => {
  assert.ok(TOTAL_PAIRS >= 2000, `seulement ${TOTAL_PAIRS} paires`);
  assert.ok(CATEGORIES.length >= 18);
  const keys = new Set();
  for (const c of CATEGORIES) {
    assert.ok(c.name && c.hint, c.id);
    // Un thème de la bibliothèque de base compte au moins 80 paires ; un thème vendu en plus, au moins 55.
    assert.ok(c.pairs.length >= (c.extra ? 55 : 80), `${c.id} : ${c.pairs.length} paires`);
    assert.ok(c.pack, `${c.id} : aucun pack ne débloque ce thème`);
    for (const p of c.pairs) {
      assert.ok([1, 2, 3].includes(p.lvl));
      assert.notEqual(norm(p.a), norm(p.b), `${p.a} | ${p.b}`);
      assert.ok(p.a.length <= 40 && p.b.length <= 40, `${p.a} | ${p.b}`);
      assert.ok(!keys.has(p.key), `doublon ${p.a} | ${p.b}`);
      keys.add(p.key);
    }
  }
  for (const l of LEVELS) assert.ok(buildPool({ cats: CATEGORIES.map((c) => c.id), levels: [l.id] }).length > 300);
  assert.equal(categoryName('animaux'), 'Animaux');
  assert.equal(categoryName('perso'), 'Nos mots');
});

test('tirage : aucune répétition tant que la sélection n’est pas épuisée', () => {
  const sel = { cats: ['animaux'], levels: [3] };
  const size = buildPool(sel).length;
  const used = new Set();
  let seed = 1;
  const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < size; i++) {
    const { pair, recycled } = pickPair({ ...sel, used, rng });
    assert.equal(recycled, false);
    assert.ok(!used.has(pair.key));
    used.add(pair.key);
  }
  assert.equal(used.size, size);
  assert.equal(pickPair({ ...sel, used, rng }).recycled, true);
  assert.equal(pickPair({ cats: [], levels: [1, 2, 3], used, rng }), null);
});

test('tirage : évite les mots vus récemment, et sert les paires perso', () => {
  const rng = () => 0;
  const custom = [['Prof de maths', 'Prof de physique'], ['Kebab du coin', 'Tacos du coin']];
  const first = pickPair({ cats: ['perso'], levels: [1], custom, used: [], rng }).pair;
  assert.equal(first.cat, 'perso');
  const other = pickPair({ cats: ['perso'], levels: [1], custom, used: [], recentWords: [first.a], rng }).pair;
  assert.notEqual(other.key, first.key);
  const forced = pickPair({ cats: ['perso'], levels: [1], custom, used: [], recentWords: [first.a, other.b], rng });
  assert.ok(forced.pair, 'on rejoue un mot récent plutôt que de bloquer la partie');
});

test('proposition de Mr. White : tolérante mais pas naïve', () => {
  const cases = [
    ['pain au chocolat', 'Pain au chocolat', 'Croissant', true],
    ['pain chocolat', 'Pain au chocolat', 'Croissant', true],
    ['résistence', 'Résistance', 'Condensateur', true],
    ['les lunettes', 'Lunettes', 'Lentilles de contact', true],
    ['oeuf au plat', 'Œuf au plat', 'Omelette', true],
    ['pina colada', 'Piña colada', 'Mojito', true],
    ['seigneur des anneaux', 'Le Seigneur des anneaux', 'Harry Potter', true],
    ['avocat', 'Avocat (métier)', 'Juge', true],
    ['jupiter', 'Jupiter (dieu)', 'Zeus', true],
    ['4g', '4G', '5G', true],
    ['5G', '4G', '5G', false],
    ['ctrl z', 'Ctrl+C', 'Ctrl+Z', false],
    ['tram', 'Bus', 'Tram', false],
    ['bug', 'Bus', 'Tram', false],
    ['', 'Bus', 'Tram', false],
    ['courant alternatif', 'Courant continu', 'Courant alternatif', false],
    ['avoir le bourdon', 'Avoir le cafard', 'Avoir le bourdon', false],
    ['avoir le cafar', 'Avoir le cafard', 'Avoir le bourdon', true],
    ['thé', 'Café', '', false],
  ];
  for (const [g, c, u, expected] of cases) assert.equal(guessMatches(g, c, u), expected, `${g} / ${c}`);
  assert.equal(pairKey('Café', 'Thé'), pairKey('thé', 'CAFE'));
  assert.equal(lev('chat', 'chien'), 3);
});

test('sélection découverte : 150 paires faciles, piochées dans tous les thèmes de base', () => {
  assert.equal(DISCOVERY_PAIRS.length, DISCOVERY_SIZE);
  assert.equal(DISCOVERY_SIZE, 150);
  assert.equal(new Set(DISCOVERY_PAIRS.map((p) => p.key)).size, DISCOVERY_SIZE, 'une paire en double');
  assert.ok(DISCOVERY_PAIRS.every((p) => p.lvl === 1), 'la sélection offerte ne contient que des paires faciles');
  const extra = new Set(CATEGORIES.filter((c) => c.extra).map((c) => c.id));
  assert.ok(DISCOVERY_PAIRS.every((p) => !extra.has(p.cat)), 'les thèmes vendus en plus ne donnent aucune paire offerte');
  const per = {};
  for (const p of DISCOVERY_PAIRS) per[p.cat] = (per[p.cat] || 0) + 1;
  assert.ok(Object.keys(per).length >= 18, 'la sélection doit couvrir presque tous les thèmes de base');
  assert.ok(Math.max(...Object.values(per)) <= 9, 'aucun thème ne doit dominer la sélection');
  assert.equal(categoryName(DISCOVERY_CAT.id), 'Sélection découverte');
  // Elle se joue seule, quels que soient les niveaux cochés, et ne double pas un thème débloqué.
  assert.equal(buildPool({ cats: [DISCOVERY_CAT.id], levels: [3], custom: [] }).length, DISCOVERY_SIZE);
  assert.equal(buildPool({ cats: [], levels: [1, 2, 3], custom: [] }).length, 0);
  const geo = CATEGORIES.find((c) => c.id === 'geo');
  const both = buildPool({ cats: ['geo', DISCOVERY_CAT.id], levels: [1, 2, 3], custom: [] });
  assert.equal(both.length, geo.pairs.length + DISCOVERY_SIZE - per.geo);
  assert.equal(new Set(both.map((p) => p.key)).size, both.length);
});
