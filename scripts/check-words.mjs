// Contrôle qualité de la bibliothèque de mots : doublons, mots identiques, longueurs, réutilisations.
import { CATEGORIES, TOTAL_PAIRS, DISCOVERY_PAIRS } from '../web/js/words/index.js';
import { norm } from '../web/js/text.js';

const MAX_LEN = 60;
const MAX_EXPL = 220;
const problems = [];
const seenPair = new Map();
const wordUse = new Map();
let byLevel = { 1: 0, 2: 0, 3: 0 };
let explained = 0;
const cites = (text, word) => ` ${norm(text)} `.includes(` ${norm(word)} `);

for (const c of CATEGORIES) {
  for (const p of c.pairs) {
    byLevel[p.lvl]++;
    const na = norm(p.a), nb = norm(p.b);
    if (na === nb) problems.push(`[${c.id}] mots identiques : ${p.a} | ${p.b}`);
    if (seenPair.has(p.key)) problems.push(`[${c.id}] paire en double : ${p.a} | ${p.b} (déjà dans ${seenPair.get(p.key)})`);
    else seenPair.set(p.key, c.id);
    if (/[()|]/.test(p.a + p.b)) problems.push(`[${c.id}] parenthèse ou barre dans un mot : ${p.a} | ${p.b}`);
    if (p.free && p.lvl !== 1) problems.push(`[${c.id}] paire offerte qui n'est pas « Facile » : ${p.a} | ${p.b}`);
    // Explications : les deux ou aucune, courtes, et jamais l'autre mot de la paire (ce serait le donner).
    if (!!p.ea !== !!p.eb) problems.push(`[${c.id}] une seule explication : ${p.a} | ${p.b}`);
    if (p.ea && p.eb) {
      explained++;
      for (const [w, other, e] of [[p.a, p.b, p.ea], [p.b, p.a, p.eb]]) {
        if (e.length > MAX_EXPL) problems.push(`[${c.id}] explication trop longue (${e.length}) : ${w}`);
        if (cites(e, other)) problems.push(`[${c.id}] l'explication de « ${w} » cite l'autre mot « ${other} »`);
        if (!/[.!?…»]$/.test(e)) problems.push(`[${c.id}] explication sans ponctuation finale : ${w}`);
      }
    }
    for (const w of [p.a, p.b]) {
      if (w.length > MAX_LEN) problems.push(`[${c.id}] trop long (${w.length}) : ${w}`);
      const k = norm(w);
      if (!wordUse.has(k)) wordUse.set(k, []);
      wordUse.get(k).push(`${c.id}: ${p.a} | ${p.b}`);
    }
  }
}
// Un même mot dans deux thèmes différents est toléré (homonymes : « Avocat » le fruit et le métier).
// Trois emplois, ou deux dans le même thème, sont refusés.
const homonyms = [];
for (const [k, uses] of wordUse) {
  if (uses.length < 2) continue;
  const cats = new Set(uses.map((u) => u.split(':')[0]));
  if (uses.length > 2 || cats.size < uses.length) problems.push(`mot réutilisé ×${uses.length} « ${k} » → ${uses.join('  //  ')}`);
  else homonyms.push(k);
}

console.log(`Paires : ${TOTAL_PAIRS}  (facile ${byLevel[1]}, moyen ${byLevel[2]}, corsé ${byLevel[3]}) ; ${explained} expliquées ; ${DISCOVERY_PAIRS.length} offertes`);
for (const c of CATEGORIES) console.log(`  ${c.name.padEnd(24)} ${String(c.pairs.length).padStart(4)}`);
if (problems.length) {
  console.log(`\n${problems.length} point(s) à corriger :`);
  for (const p of problems) console.log(' - ' + p);
  process.exit(1);
}
console.log(`\nAucun doublon. ${homonyms.length} homonymes tolérés entre thèmes${process.argv.includes('--verbose') ? ' : ' + homonyms.join(', ') : ''}.`);
