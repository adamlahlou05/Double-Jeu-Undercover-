import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, TOTAL_PAIRS, LEVELS, buildPool, pickPair, categoryName } from '../../web/js/words/index.js';
import { norm, guessMatches, pairKey, lev } from '../../web/js/text.js';

test('bibliothèque : volume, niveaux et unicité', () => {
  assert.ok(TOTAL_PAIRS >= 2000, `seulement ${TOTAL_PAIRS} paires`);
  assert.ok(CATEGORIES.length >= 18);
  const keys = new Set();
  for (const c of CATEGORIES) {
    assert.ok(c.name && c.hint, c.id);
    assert.ok(c.pairs.length >= 80, `${c.id} : ${c.pairs.length} paires`);
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
