import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../web/js/engine.js';
import { computeStats, leaderboard, awards } from '../../web/js/stats.js';

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = ['Adam', 'Léa', 'Yanis', 'Sarah', 'Hugo', 'Inès', 'Noé', 'Lina', 'Tom', 'Jade', 'Rayan', 'Zoé', 'Paul', 'Emma', 'Malo', 'Nour'];
const mkPlayers = (n) => NAMES.slice(0, n).map((name, i) => ({ id: 'p' + i, name, color: 'c' + i, face: 'f' + i }));
const PAIR = { a: 'Café', b: 'Thé', cat: 'nourriture', lvl: 1, key: 'k1' };

function setup(n, over = {}) {
  const d = E.defaultRoles(n);
  return {
    players: mkPlayers(n), mode: 'classic', undercover: d.u, white: d.w, pair: PAIR,
    options: { vote: 'open', timer: 0, notes: false }, ...over,
  };
}

function deal(g, rng) {
  while (g.phase === 'deal') {
    const free = g.cards.findIndex((c) => c.by < 0);
    g = E.pickCard(g, free);
    g = E.confirmCard(g, rng);
  }
  return g;
}

function talk(g) {
  let n = 0;
  while (g.phase === 'clues') g = E.nextSpeaker(g, g.options.notes ? `indice ${g.round}-${n++}-${g.speakIdx}` : undefined);
  return g;
}

const roleIdx = (g, role) => g.players.map((p, i) => (p.alive && p.role === role ? i : -1)).filter((i) => i >= 0);

/** Élimine directement un joueur donné, quel que soit le mode de vote. */
function voteOut(g, target) {
  g = talk(g);
  g = E.openVote(g);
  if (g.options.vote === 'open') return E.eliminateByShow(g, target);
  while (g.phase === 'vote') {
    const voter = E.currentVoter(g);
    const choice = voter !== target ? target : g.vote.candidates.find((c) => c !== voter);
    g = E.castBallot(g, voter, choice);
  }
  assert.equal(g.phase, 'tally');
  assert.deepEqual(g.vote.top, [target]);
  return E.resolveTally(g);
}

/* ---------- Composition ---------- */

test('composition conseillée et bornes', () => {
  const expected = { 3: [1, 0], 4: [1, 0], 5: [1, 1], 6: [1, 1], 7: [2, 1], 8: [2, 1], 9: [2, 1], 10: [3, 1], 12: [3, 1], 14: [4, 1], 16: [4, 1] };
  for (const [n, [u, w]] of Object.entries(expected)) assert.deepEqual(E.defaultRoles(+n), { u, w }, `n=${n}`);
  for (let n = 3; n <= 16; n++) {
    const max = E.maxInfiltrators(n);
    assert.ok(n - max > max, `les Civils doivent rester majoritaires (n=${n})`);
    for (let u = 0; u <= 9; u++) for (let w = 0; w <= 9; w++) {
      const c = E.clampRoles(n, u, w);
      assert.ok(c.u + c.w >= 1 && c.u + c.w <= max, `clamp n=${n} u=${u} w=${w}`);
      assert.ok(c.u <= Math.max(u, 1) && c.w <= w);
    }
  }
  assert.deepEqual(E.clampRoles(6, 0, 0), { u: 1, w: 0 });
  assert.deepEqual(E.clampRoles(6, 0, 2), { u: 0, w: 2 });
});

test('mode Mystère : toujours au moins un infiltré, jamais trop', () => {
  const rng = seeded(7);
  for (let i = 0; i < 2000; i++) {
    const n = 3 + Math.floor(rng() * 14);
    const { u, w } = E.mysteryRoles(n, rng);
    assert.ok(u + w >= 1 && u + w <= E.maxInfiltrators(n));
  }
});

test('création : validations', () => {
  assert.throws(() => E.createGame(setup(2)), E.GameError);
  assert.throws(() => E.createGame({ ...setup(4), players: [...mkPlayers(3), { id: 'x', name: 'adam' }] }), /s’appellent/);
  assert.throws(() => E.createGame({ ...setup(4), players: [...mkPlayers(3), { id: 'x', name: '  ' }] }), /nom/);
  assert.throws(() => E.createGame(setup(4, { pair: { a: 'Café', b: 'café' } })), /Paire/);
  const g = E.createGame(setup(6), seeded(1));
  assert.equal(g.phase, 'deal');
  assert.equal(g.cards.length, 6);
  assert.deepEqual(g.cards.map((c) => c.role).sort(), ['civil', 'civil', 'civil', 'civil', 'under', 'white']);
  assert.notEqual(g.words.civil, g.words.under);
});

/* ---------- Distribution ---------- */

test('distribution : une carte par joueur, dans l’ordre, sans doublon', () => {
  const rng = seeded(3);
  let g = E.createGame(setup(6), rng);
  assert.throws(() => E.confirmCard(g), /Aucune carte/);
  g = E.pickCard(g, 4);
  assert.equal(g.players[0].role, g.cards[4].role);
  assert.throws(() => E.pickCard(g, 2), /déjà retournée/);
  g = E.confirmCard(g, rng);
  assert.equal(E.currentDealer(g), 1);
  assert.throws(() => E.pickCard(g, 4), /déjà prise/);
  assert.throws(() => E.pickCard(g, 99), E.GameError);
  assert.throws(() => E.nextSpeaker(g), /impossible/);
  g = deal(g, rng);
  assert.equal(g.phase, 'clues');
  assert.equal(g.round, 1);
  assert.ok(g.players.every((p) => p.role));
  const s = E.secretOf(g, roleIdx(g, 'white')[0]);
  assert.deepEqual(s, { white: true, word: '' });
  assert.equal(E.secretOf(g, roleIdx(g, 'civil')[0]).word, g.words.civil);
  assert.equal(E.secretOf(g, roleIdx(g, 'under')[0]).word, g.words.under);
});

/* ---------- Ordre de parole ---------- */

test('Mr. White ne parle jamais en premier, à aucun tour', () => {
  for (let seed = 1; seed <= 400; seed++) {
    const rng = seeded(seed);
    const n = 3 + (seed % 10);
    const max = E.maxInfiltrators(n);
    let g = deal(E.createGame(setup(n, { undercover: 0, white: max }), rng), rng);
    for (let guard = 0; guard < 40 && g.phase !== 'end'; guard++) {
      assert.notEqual(g.players[g.order[0]].role, 'white', `seed ${seed} tour ${g.round}`);
      assert.ok(g.order.every((i) => g.players[i].alive));
      assert.equal(new Set(g.order).size, g.order.length);
      const civ = roleIdx(g, 'civil');
      g = voteOut(g, civ[civ.length - 1]);
      g = E.continueAfterReveal(g, rng);
    }
    assert.equal(g.phase, 'end');
  }
});

test('ordre de parole : suit la table à partir du premier orateur, sans les éliminés', () => {
  const rng = seeded(11);
  let g = deal(E.createGame(setup(7), rng), rng);
  const n = 7;
  const check = () => {
    const start = g.order[0];
    const expected = [];
    for (let k = 0; k < n; k++) { const j = (start + k) % n; if (g.players[j].alive) expected.push(j); }
    assert.deepEqual(g.order, expected);
  };
  check();
  g = voteOut(g, roleIdx(g, 'civil')[0]);
  g = E.continueAfterReveal(g, rng);
  check();
});

test('le premier orateur tourne : personne n’ouvre deux tours avant les autres', () => {
  for (let seed = 1; seed <= 150; seed++) {
    const rng = seeded(seed * 13);
    let g = deal(E.createGame(setup(12, { undercover: 5, white: 0 }), rng), rng);
    const starters = [];
    for (let guard = 0; guard < 30 && g.phase !== 'end'; guard++) {
      starters.push(g.order[0]);
      const civ = roleIdx(g, 'civil');
      // on élimine un Civil qui n'a pas encore ouvert de tour, pour que la rotation reste observable
      const victim = civ.find((i) => !starters.includes(i)) ?? civ[0];
      g = voteOut(g, victim);
      g = E.continueAfterReveal(g, rng);
    }
    const firstRounds = starters.slice(0, 4);
    assert.equal(new Set(firstRounds).size, firstRounds.length, `seed ${seed}: ${starters}`);
  }
});

test('indices : retour arrière et passage au débat', () => {
  const rng = seeded(5);
  let g = deal(E.createGame(setup(4), rng), rng);
  const first = E.currentSpeaker(g);
  g = E.nextSpeaker(g);
  assert.notEqual(E.currentSpeaker(g), first);
  g = E.prevSpeaker(g);
  assert.equal(E.currentSpeaker(g), first);
  g = E.prevSpeaker(g);
  assert.equal(g.speakIdx, 0);
  g = talk(g);
  assert.equal(g.phase, 'debate');
  g = E.prevSpeaker(g);
  assert.equal(g.phase, 'clues');
  assert.equal(g.speakIdx, g.order.length - 1);
});

test('prise de notes : indice obligatoire, sans répétition de toute la partie', () => {
  const rng = seeded(9);
  let g = deal(E.createGame(setup(5, { options: { vote: 'open', timer: 0, notes: true } }), rng), rng);
  assert.throws(() => E.nextSpeaker(g, '  '), /Écris/);
  assert.throws(() => E.nextSpeaker(g, 'x'.repeat(31)), /30/);
  g = E.nextSpeaker(g, '  Chaud ');
  assert.equal(g.clues[0].text, 'Chaud');
  assert.throws(() => E.nextSpeaker(g, 'chauds'), /déjà été dit/);
  assert.throws(() => E.nextSpeaker(g, 'CHAUD'), /déjà été dit/);
  g = E.nextSpeaker(g, 'Tasse');
  g = E.prevSpeaker(g);
  assert.equal(g.clues.length, 1, 'l’indice annulé est retiré');
  g = E.nextSpeaker(g, 'Tasse');
  g = E.nextSpeaker(g, 'Matin');
  g = E.nextSpeaker(g, 'Noir');
  g = E.nextSpeaker(g, 'Sucre');
  assert.equal(g.phase, 'debate');
  const victim = roleIdx(g, 'civil')[0];
  g = E.eliminateByShow(E.openVote(g), victim);
  g = E.continueAfterReveal(g, rng);
  assert.equal(g.round, 2);
  assert.throws(() => E.nextSpeaker(g, 'Tasse'), /déjà été dit/, 'un indice du tour 1 reste interdit au tour 2');
});

/* ---------- Votes ---------- */

test('vote à main levée : élimination, puis victoire des Civils', () => {
  const rng = seeded(21);
  let g = deal(E.createGame(setup(6), rng), rng);
  g = talk(g);
  assert.throws(() => E.eliminateByShow(g, 0), /impossible/);
  g = E.openVote(g);
  assert.throws(() => E.castBallot(g, g.order[0], g.order[1]), /main levée/);
  g = E.backToDebate(g);
  assert.equal(g.phase, 'debate');
  g = E.openVote(g);
  const under = roleIdx(g, 'under')[0];
  g = E.eliminateByShow(g, under);
  assert.equal(g.phase, 'reveal');
  assert.equal(g.players[under].alive, false);
  assert.equal(E.afterReveal(g), 'round');
  g = E.continueAfterReveal(g, rng);
  assert.equal(g.round, 2);
  assert.throws(() => E.eliminateByShow(E.openVote(talk(g)), under), /ne peut pas/);
  const white = roleIdx(g, 'white')[0];
  g = voteOut(g, white);
  assert.ok(E.awaitingGuess(g));
  assert.throws(() => E.continueAfterReveal(g), /proposer/);
  g = E.submitGuess(g, 'Chocolat');
  assert.equal(g.guess.ok, false);
  assert.equal(E.afterReveal(g), 'end');
  g = E.continueAfterReveal(g, rng);
  assert.equal(g.phase, 'end');
  assert.deepEqual(g.result, { winner: 'civils', by: -1 });
  g.players.forEach((p, i) => assert.equal(E.pointsFor(g, i), p.role === 'civil' ? 2 : 0));
});

test('victoire des infiltrés quand il ne reste qu’un Civil', () => {
  const rng = seeded(33);
  let g = deal(E.createGame(setup(6), rng), rng);
  for (let k = 0; k < 3; k++) {
    g = voteOut(g, roleIdx(g, 'civil')[0]);
    assert.equal(E.afterReveal(g), k === 2 ? 'end' : 'round');
    g = E.continueAfterReveal(g, rng);
  }
  assert.equal(g.result.winner, 'infiltres');
  g.players.forEach((p, i) => assert.equal(E.pointsFor(g, i), p.role === 'under' ? 10 : p.role === 'white' ? 6 : 0));
});

test('Mr. White devine le mot : il gagne seul', () => {
  const rng = seeded(41);
  let g = deal(E.createGame(setup(7), rng), rng);
  const white = roleIdx(g, 'white')[0];
  g = voteOut(g, white);
  assert.throws(() => E.submitGuess(g, ''), /proposition/);
  g = E.submitGuess(g, `  ${g.words.civil.toUpperCase()} `);
  assert.equal(g.guess.ok, true);
  assert.throws(() => E.submitGuess(g, 'encore'), /Aucune/);
  g = E.continueAfterReveal(g, rng);
  assert.deepEqual(g.result, { winner: 'white', by: white });
  g.players.forEach((p, i) => assert.equal(E.pointsFor(g, i), i === white ? 6 : 0));
});

test('Mr. White : le mot de l’Undercover est refusé, la table peut contester', () => {
  const rng = seeded(43);
  let g = deal(E.createGame(setup(6), rng), rng);
  const white = roleIdx(g, 'white')[0];
  g = voteOut(g, white);
  const wrong = E.submitGuess(g, g.words.under);
  assert.equal(wrong.guess.ok, false);
  const accepted = E.overrideGuess(wrong);
  assert.deepEqual([accepted.guess.ok, accepted.guess.forced], [true, true]);
  assert.equal(E.continueAfterReveal(accepted, rng).result.winner, 'white');
  const skipped = E.skipGuess(g);
  assert.equal(skipped.guess.ok, false);
  assert.equal(E.continueAfterReveal(skipped, rng).phase, 'clues');
  assert.throws(() => E.overrideGuess(g), /contester/);
});

test('mode Éclair : un seul vote décide de tout', () => {
  const rng = seeded(51);
  const base = deal(E.createGame(setup(6, { mode: 'flash' }), rng), rng);
  let g = E.continueAfterReveal(voteOut(base, roleIdx(base, 'civil')[0]), rng);
  assert.equal(g.result.winner, 'infiltres');
  g = E.continueAfterReveal(voteOut(base, roleIdx(base, 'under')[0]), rng);
  assert.equal(g.result.winner, 'civils');
  g = voteOut(base, roleIdx(base, 'white')[0]);
  assert.equal(E.continueAfterReveal(E.skipGuess(g), rng).result.winner, 'civils');
  assert.equal(E.continueAfterReveal(E.submitGuess(g, g.words.civil), rng).result.winner, 'white');
});

test('égalité à main levée : départage, puis tirage au sort', () => {
  const rng = seeded(61);
  let g = deal(E.createGame(setup(6), rng), rng);
  g = E.openVote(talk(g));
  assert.throws(() => E.declareTie(g, [0]), /au moins deux/);
  g = E.declareTie(g, [0, 3, 3]);
  assert.equal(g.phase, 'tiebreak');
  assert.deepEqual(g.vote.candidates, [0, 3]);
  assert.throws(() => E.eliminateByShow(g, 0), /impossible/);
  g = E.startRevote(g);
  assert.throws(() => E.eliminateByShow(g, 1), /ne peut pas/);
  const direct = E.eliminateByShow(g, 3);
  assert.equal(direct.last, 3);
  g = E.declareTie(g, [0, 3], rng);
  assert.equal(g.phase, 'draw');
  assert.ok([0, 3].includes(g.vote.drawn));
  const drawn = g.vote.drawn;
  g = E.confirmDraw(g);
  assert.equal(g.phase, 'reveal');
  assert.equal(g.last, drawn);
  assert.equal(g.log[0].drawn, true);
});

test('vote secret : dépouillement, égalité, revote, tirage', () => {
  const rng = seeded(71);
  let g = deal(E.createGame(setup(6, { options: { vote: 'secret', timer: 0, notes: false } }), rng), rng);
  g = E.openVote(talk(g));
  assert.throws(() => E.eliminateByShow(g, 0), /secret/);
  assert.throws(() => E.declareTie(g, [0, 1]), /automatiquement/);
  const q = g.vote.queue.slice();
  assert.deepEqual(q, g.order);
  assert.throws(() => E.castBallot(g, q[1], q[0]), /pas à ce joueur/);
  assert.throws(() => E.castBallot(g, q[0], q[0]), /soi-même/);
  assert.throws(() => E.undoBallot(g), /Aucun bulletin/);
  g = E.castBallot(g, q[0], q[1]);
  g = E.undoBallot(g);
  assert.equal(E.currentVoter(g), q[0]);
  assert.deepEqual(g.vote.ballots, {});
  // 3 voix contre q[1], 3 voix contre q[0] → égalité
  const [a, b] = [q[0], q[1]];
  const targets = [b, a, a, a, b, b];
  q.forEach((voter, i) => { g = E.castBallot(g, voter, targets[i]); });
  assert.equal(g.phase, 'tally');
  assert.deepEqual(g.vote.top.slice().sort(), [a, b].sort());
  assert.equal(g.vote.counts[a], 3);
  assert.throws(() => E.backToDebate(g), /impossible/);
  g = E.resolveTally(g, rng);
  assert.equal(g.phase, 'tiebreak');
  g = E.startRevote(g);
  assert.equal(g.vote.stage, 2);
  assert.deepEqual(g.vote.candidates.slice().sort(), [a, b].sort());
  const c = q[2];
  assert.throws(() => E.castBallot(g, q[0], c), /ne peut pas recevoir/);
  assert.throws(() => E.backToDebate(g), /déjà commencé/);
  // revote : a vote b (obligé), b vote a, puis 2-2 → encore égalité
  const second = [b, a, a, b, a, b];
  q.forEach((voter, i) => { g = E.castBallot(g, voter, second[i]); });
  assert.equal(g.phase, 'tally');
  g = E.resolveTally(g, rng);
  assert.equal(g.phase, 'draw');
  g = E.confirmDraw(g);
  assert.ok([a, b].includes(g.last));
  assert.equal(g.log[0].votes.length, 2);
});

test('vote secret : majorité simple', () => {
  const rng = seeded(73);
  let g = deal(E.createGame(setup(5, { options: { vote: 'secret', timer: 0, notes: false } }), rng), rng);
  const target = roleIdx(g, 'under')[0];
  g = voteOut(g, target);
  assert.equal(g.phase, 'reveal');
  assert.equal(g.last, target);
  assert.equal(Object.keys(g.log[0].votes[0].ballots).length, 5);
});

/* ---------- Départ d'un joueur ---------- */

test('un joueur quitte pendant les indices : on reprend au bon orateur', () => {
  const rng = seeded(81);
  let g = deal(E.createGame(setup(7), rng), rng);
  assert.throws(() => E.playerLeaves(E.createGame(setup(7), rng), 0), /impossible/);
  g = E.nextSpeaker(E.nextSpeaker(g));
  const speaker = E.currentSpeaker(g);
  const leaver = g.order.find((i) => i !== speaker && g.players[i].role === 'civil' && g.order.indexOf(i) > g.speakIdx);
  g = E.playerLeaves(g, leaver);
  assert.equal(g.phase, 'reveal');
  assert.equal(E.awaitingGuess(g), false);
  g = E.continueAfterReveal(g, rng);
  assert.equal(g.phase, 'clues');
  assert.equal(g.round, 1);
  assert.equal(E.currentSpeaker(g), speaker);
  assert.ok(!g.order.includes(leaver));
  assert.throws(() => E.playerLeaves(g, leaver), /plus en jeu/);
  // l'orateur courant s'en va : le suivant prend la parole
  const next = g.order[g.speakIdx + 1];
  g = E.continueAfterReveal(E.playerLeaves(g, speaker), rng);
  assert.equal(E.currentSpeaker(g), next);
});

test('un joueur quitte pendant un vote secret : le vote est annulé, retour au débat', () => {
  const rng = seeded(83);
  let g = deal(E.createGame(setup(7, { options: { vote: 'secret', timer: 0, notes: false } }), rng), rng);
  g = E.openVote(talk(g));
  g = E.castBallot(g, g.vote.queue[0], g.vote.queue[1]);
  const leaver = roleIdx(g, 'civil')[0];
  g = E.continueAfterReveal(E.playerLeaves(g, leaver), rng);
  assert.equal(g.phase, 'debate');
  assert.equal(g.vote, null);
  g = E.openVote(g);
  assert.ok(!g.vote.queue.includes(leaver));
  assert.equal(g.vote.cursor, 0);
});

test('le départ du dernier infiltré donne la victoire aux Civils, sans dernière chance', () => {
  const rng = seeded(85);
  let g = deal(E.createGame(setup(4, { undercover: 0, white: 1 }), rng), rng);
  const white = roleIdx(g, 'white')[0];
  g = E.playerLeaves(g, white);
  assert.equal(E.awaitingGuess(g), false);
  g = E.continueAfterReveal(g, rng);
  assert.deepEqual(g.result, { winner: 'civils', by: -1 });
});

/* ---------- Parties aléatoires complètes ---------- */

function playRandom(seed) {
  const rng = seeded(seed);
  const n = 3 + Math.floor(rng() * 14);
  const max = E.maxInfiltrators(n);
  const mode = ['classic', 'classic', 'flash', 'mystery'][Math.floor(rng() * 4)];
  const u = Math.floor(rng() * (max + 1));
  const w = Math.floor(rng() * (max + 1));
  const options = { vote: rng() < 0.5 ? 'open' : 'secret', timer: 0, notes: rng() < 0.4 };
  let g = E.createGame(setup(n, { mode, undercover: u, white: w, options }), rng);
  const order = g.cards.map((_, i) => i).sort(() => rng() - 0.5);
  for (const c of order) { g = E.pickCard(g, c); g = E.confirmCard(g, rng); }
  let clueN = 0, steps = 0;
  const roles = g.players.map((p) => p.role);
  assert.equal(roles.filter((r) => r !== 'civil').length, g.counts.u + g.counts.w);
  while (g.phase !== 'end') {
    assert.ok(++steps < 2000, `partie sans fin (seed ${seed}, phase ${g.phase})`);
    const alive = E.aliveIdx(g);
    if (g.phase !== 'reveal') assert.ok(alive.length >= 3, `seed ${seed}: moins de 3 joueurs en jeu en phase ${g.phase}`);
    if (['clues', 'debate', 'vote', 'tiebreak', 'tally'].includes(g.phase) && rng() < 0.02 && alive.length > 3) {
      g = E.playerLeaves(g, alive[Math.floor(rng() * alive.length)]);
      continue;
    }
    switch (g.phase) {
      case 'clues':
        if (g.speakIdx === 0) assert.notEqual(g.players[E.currentSpeaker(g)].role, 'white', `seed ${seed}: Mr. White ouvre le tour`);
        if (rng() < 0.05 && g.speakIdx > 0) g = E.prevSpeaker(g);
        else g = E.nextSpeaker(g, g.options.notes ? `mot${seed}x${clueN++}` : undefined);
        break;
      case 'debate':
        g = E.openVote(g);
        break;
      case 'vote':
        if (g.options.vote === 'open') {
          const c = g.vote.candidates;
          if (rng() < 0.25 && c.length >= 2) g = E.declareTie(g, c.slice().sort(() => rng() - 0.5).slice(0, 2 + Math.floor(rng() * Math.min(2, c.length - 1))), rng);
          else g = E.eliminateByShow(g, c[Math.floor(rng() * c.length)]);
        } else {
          const voter = E.currentVoter(g);
          const targets = g.vote.candidates.filter((c) => c !== voter);
          assert.ok(targets.length > 0, `seed ${seed}: aucun choix pour le votant`);
          g = E.castBallot(g, voter, targets[Math.floor(rng() * targets.length)]);
        }
        break;
      case 'tally': {
        const total = Object.values(g.vote.counts).reduce((a, b) => a + b, 0);
        assert.equal(total, g.vote.queue.length, 'un bulletin par joueur en vie');
        g = E.resolveTally(g, rng);
        break;
      }
      case 'tiebreak':
        g = E.startRevote(g);
        break;
      case 'draw':
        assert.ok(g.vote.top.includes(g.vote.drawn));
        g = E.confirmDraw(g);
        break;
      case 'reveal':
        if (E.awaitingGuess(g)) {
          const r = rng();
          g = r < 0.3 ? E.submitGuess(g, g.words.civil) : r < 0.6 ? E.submitGuess(g, 'n’importe quoi') : E.skipGuess(g);
        }
        g = E.continueAfterReveal(g, rng);
        break;
      default:
        assert.fail(`phase inattendue ${g.phase}`);
    }
  }
  // Cohérence du résultat
  const r = E.remaining(g);
  const res = g.result;
  if (res.winner === 'white') {
    assert.equal(g.players[res.by].role, 'white');
    assert.ok(g.guess && g.guess.ok);
  } else if (g.mode !== 'flash' || g.players[g.last].outBy === 'left') {
    if (res.winner === 'civils') assert.equal(r.infiltrators, 0);
    else { assert.ok(r.civil <= 1); assert.ok(r.infiltrators >= 1); }
  } else {
    assert.equal(res.winner, g.players[g.last].role === 'civil' ? 'infiltres' : 'civils');
  }
  const sum = E.summarize(g);
  assert.equal(sum.players.length, n);
  for (const p of sum.players) assert.equal(p.won, p.pts > 0);
  for (const l of g.log) for (const v of l.votes) if (v.ballots) for (const [voter, target] of Object.entries(v.ballots)) assert.notEqual(+voter, target);
  return sum;
}

test('2 500 parties aléatoires se terminent toutes de façon cohérente', () => {
  const winners = { civils: 0, infiltres: 0, white: 0 };
  const history = [];
  for (let seed = 1; seed <= 2500; seed++) {
    const sum = playRandom(seed);
    winners[sum.winner]++;
    if (seed <= 300) history.push(sum);
  }
  assert.ok(winners.civils > 100 && winners.infiltres > 100 && winners.white > 30, JSON.stringify(winners));
  // Les statistiques retombent exactement sur l'historique
  const stats = computeStats(history);
  const totalPts = history.reduce((a, h) => a + h.players.reduce((x, p) => x + p.pts, 0), 0);
  assert.equal(Object.values(stats).reduce((a, s) => a + s.points, 0), totalPts);
  for (const s of Object.values(stats)) {
    assert.equal(s.roles.civil.g + s.roles.under.g + s.roles.white.g, s.games);
    assert.equal(s.roles.civil.w + s.roles.under.w + s.roles.white.w, s.wins);
    assert.ok(s.bestStreak >= s.streak && s.goodVotes <= s.votes && s.guessOk <= s.guessTries);
  }
  const profiles = NAMES.map((name, i) => ({ id: 'p' + i, name }));
  const board = leaderboard(profiles, stats);
  for (let i = 1; i < board.length; i++) assert.ok(board[i - 1].s.points >= board[i].s.points);
  assert.equal(board[0].rank, 1);
  assert.ok(Array.isArray(awards(profiles, stats)));
  const recent = computeStats(history, history[150].at);
  assert.ok(Object.values(recent).reduce((a, s) => a + s.games, 0) <= Object.values(stats).reduce((a, s) => a + s.games, 0));
});

test('résumé de partie : contenu de la fiche d’historique', () => {
  const rng = seeded(91);
  let g = deal(E.createGame(setup(5, { options: { vote: 'secret', timer: 60, notes: true } }), rng), rng);
  assert.throws(() => E.summarize(g), /terminée/);
  g = voteOut(g, roleIdx(g, 'under')[0]);
  g = E.continueAfterReveal(g, rng);
  g = voteOut(g, roleIdx(g, 'white')[0]);
  g = E.continueAfterReveal(E.submitGuess(g, 'raté'), rng);
  const s = E.summarize(g);
  assert.equal(s.winner, 'civils');
  assert.equal(s.rounds, 2);
  assert.equal(s.vote, 'secret');
  assert.equal(s.log.length, 2);
  assert.equal(s.log[1].guess.text, 'raté');
  assert.equal(s.clues.length, 5 + 4);
  assert.ok(s.players.every((p) => p.id && p.name && p.role));
  const stats = computeStats([s]);
  const whiteId = s.players.find((p) => p.role === 'white').id;
  assert.deepEqual([stats[whiteId].guessTries, stats[whiteId].guessOk], [1, 0]);
  const civilId = s.players.find((p) => p.role === 'civil').id;
  assert.equal(stats[civilId].votes, 2);
  assert.equal(stats[civilId].goodVotes, 2);
});
