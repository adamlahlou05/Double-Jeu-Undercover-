// Règles de la boutique : réserve de parties, récompense des pubs, parties de secours, achats.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as Shop from '../../web/js/shop.js';
import { CATEGORIES } from '../../web/js/words/index.js';

const { SHOP } = Shop;
const fresh = () => Shop.cleanEco(undefined);

test('installation : des parties offertes, donc une première partie sans aucune pub', () => {
  const eco = fresh();
  assert.equal(eco.credits, SHOP.START);
  assert.ok(SHOP.START >= 1);
  assert.equal(eco.played, 0);
  assert.equal(Shop.canStart(eco), true);
  assert.equal(Shop.isPremium(eco), false);
});

test('chaque partie consomme une partie de la réserve, jusqu’à zéro', () => {
  let eco = fresh();
  for (let i = 0; i < SHOP.START; i++) { assert.ok(Shop.canStart(eco)); eco = Shop.spend(eco); }
  assert.equal(eco.credits, 0);
  assert.equal(eco.played, SHOP.START);
  assert.equal(Shop.canStart(eco), false);
  assert.equal(Shop.spend(eco).credits, 0, 'la réserve ne devient jamais négative');
});

test('une pub vue jusqu’au bout redonne des parties, sans dépasser le plafond', () => {
  let eco = { ...fresh(), credits: 0 };
  eco = Shop.reward(eco);
  assert.equal(eco.credits, SHOP.REWARD);
  for (let i = 0; i < 20; i++) eco = Shop.reward(eco);
  assert.equal(eco.credits, SHOP.MAX);
});

test('jeu illimité : aucune partie consommée, tous les packs ouverts', () => {
  let eco = Shop.withOwned({ ...fresh(), credits: 0 }, [SHOP.PREMIUM]);
  assert.ok(Shop.isPremium(eco));
  assert.ok(Shop.canStart(eco));
  eco = Shop.spend(eco);
  assert.equal(eco.credits, 0);
  assert.equal(eco.played, 1);
  for (const p of Shop.PACKS) assert.ok(Shop.ownsPack(eco, p.id));
});

test('packs : achetés un par un, et retirés si Google Play ne les confirme plus', () => {
  let eco = Shop.withOwned(fresh(), ['pack_foot', 'inconnu']);
  assert.deepEqual(eco.owned, ['pack_foot']);
  assert.ok(Shop.ownsPack(eco, 'pack_foot'));
  assert.ok(!Shop.ownsPack(eco, 'pack_soiree'));
  eco = Shop.withOwned(eco, []);
  assert.ok(!Shop.ownsPack(eco, 'pack_foot'), 'un achat remboursé est retiré');
});

test('parties de secours : limitées par 24 heures', () => {
  const t0 = 1_800_000_000_000;
  let eco = fresh();
  assert.equal(Shop.rescuesLeft(eco, t0), SHOP.RESCUE_PER_DAY);
  for (let i = 0; i < SHOP.RESCUE_PER_DAY; i++) eco = Shop.useRescue(eco, t0 + i * 1000);
  assert.equal(Shop.rescuesLeft(eco, t0 + 5000), 0);
  assert.equal(Shop.rescuesLeft(eco, t0 + 25 * 3600 * 1000), SHOP.RESCUE_PER_DAY, 'le lendemain, elles reviennent');
});

test('état enregistré abîmé : remis d’aplomb sans cadeau indu', () => {
  assert.equal(Shop.cleanEco({ credits: 9999 }).credits, SHOP.MAX);
  assert.equal(Shop.cleanEco({ credits: -4 }).credits, 0);
  assert.equal(Shop.cleanEco({ credits: 'abc' }).credits, SHOP.START);
  assert.deepEqual(Shop.cleanEco({ owned: ['premium', 'x', 42] }).owned, ['premium']);
  assert.deepEqual(Shop.cleanEco({ rescues: 'non' }).rescues, []);
});

test('chaque pack vendu correspond à un thème de la bibliothèque, et inversement', () => {
  for (const p of Shop.PACKS) {
    const cat = CATEGORIES.find((c) => c.id === p.cat);
    assert.ok(cat, `thème manquant pour ${p.id}`);
    assert.equal(cat.pack, p.id);
  }
  for (const c of CATEGORIES.filter((k) => k.pack)) assert.ok(Shop.PACKS.some((p) => p.id === c.pack), `pack inconnu : ${c.pack}`);
  assert.equal(Shop.PRODUCT_IDS.length, new Set(Shop.PRODUCT_IDS).size);
  assert.equal(Shop.shopActive(), false, 'pas de boutique hors de l’application');
});
