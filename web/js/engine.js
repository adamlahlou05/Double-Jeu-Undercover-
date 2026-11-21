// Moteur de jeu de Double Jeu.
// Logique pure, sans DOM ni stockage : chaque action prend un état, le valide et renvoie un NOUVEL état.
// Toute action impossible dans la phase en cours lève une GameError (l'interface ne peut donc pas
// faire dérailler une partie par une fausse manipulation).

import { norm, guessMatches } from './text.js';

export const ROLE = { CIVIL: 'civil', UNDER: 'under', WHITE: 'white' };
export const ROLE_NAME = { civil: 'Civil', under: 'Undercover', white: 'Mr. White' };
export const POINTS = { civil: 2, white: 6, under: 10 };
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 16;
export const MAX_CLUE = 30;

export const MODES = {
  classic: { id: 'classic', name: 'Classique', hint: 'On joue jusqu’à ce qu’un camp l’emporte.' },
  flash: { id: 'flash', name: 'Éclair', hint: 'Un seul vote : un infiltré tombe et les Civils gagnent, sinon ils perdent.' },
  mystery: { id: 'mystery', name: 'Mystère', hint: 'Le nombre d’infiltrés est tiré au sort et reste secret.' },
};

export class GameError extends Error {
  constructor(message) { super(message); this.name = 'GameError'; }
}

/* ---------- Hasard ---------- */

export function defaultRng() {
  try {
    const a = new Uint32Array(1);
    globalThis.crypto.getRandomValues(a);
    return a[0] / 4294967296;
  } catch (e) {
    return Math.random();
  }
}
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
const clone = (o) => JSON.parse(JSON.stringify(o));

/* ---------- Composition des rôles ---------- */

/** Nombre maximal d'infiltrés (Undercover + Mr. White) : les Civils restent toujours majoritaires au départ. */
export function maxInfiltrators(n) { return Math.max(1, Math.floor((n - 1) / 2)); }

/** Composition conseillée pour n joueurs. */
export function defaultRoles(n) {
  const u = n <= 6 ? 1 : n <= 9 ? 2 : n <= 13 ? 3 : 4;
  const w = n >= 5 ? 1 : 0;
  return clampRoles(n, u, w);
}

/** Ramène une composition dans les bornes autorisées (au moins 1 infiltré, pas plus que le maximum). */
export function clampRoles(n, u, w) {
  const max = maxInfiltrators(n);
  u = Math.max(0, Math.floor(Number(u) || 0));
  w = Math.max(0, Math.floor(Number(w) || 0));
  while (u + w > max) { if (w > 0 && (w >= u || u <= 1)) w--; else u--; }
  if (u + w < 1) u = 1;
  return { u, w };
}

/** Mode Mystère : composition tirée au sort, jamais annoncée aux joueurs. */
export function mysteryRoles(n, rng = defaultRng) {
  const total = 1 + Math.floor(rng() * maxInfiltrators(n));
  let w = 0;
  for (let i = 0; i < total; i++) if (rng() < 0.35) w++;
  return { u: total - w, w };
}

/* ---------- Création ---------- */

/**
 * @param {object} setup
 * @param {Array<{id:string,name:string,color:string,face:string}>} setup.players  dans l'ordre de la table
 * @param {'classic'|'flash'|'mystery'} setup.mode
 * @param {number} setup.undercover
 * @param {number} setup.white
 * @param {{a:string,b:string,cat:string,lvl:number,key:string}} setup.pair
 * @param {{vote:'open'|'secret', timer:number, notes:boolean}} setup.options
 */
export function createGame(setup, rng = defaultRng) {
  const players = setup.players || [];
  const n = players.length;
  if (n < MIN_PLAYERS) throw new GameError(`Il faut au moins ${MIN_PLAYERS} joueurs.`);
  if (n > MAX_PLAYERS) throw new GameError(`Pas plus de ${MAX_PLAYERS} joueurs.`);
  const seen = new Set();
  for (const p of players) {
    const k = norm(p.name);
    if (!k) throw new GameError('Chaque joueur doit avoir un nom.');
    if (seen.has(k)) throw new GameError(`Deux joueurs s’appellent « ${p.name} ».`);
    seen.add(k);
  }
  const pair = setup.pair;
  if (!pair || !pair.a || !pair.b || norm(pair.a) === norm(pair.b)) throw new GameError('Paire de mots invalide.');
  const mode = MODES[setup.mode] ? setup.mode : 'classic';
  const { u, w } = mode === 'mystery' ? mysteryRoles(n, rng) : clampRoles(n, setup.undercover, setup.white);
  const roles = shuffle([
    ...Array(n - u - w).fill(ROLE.CIVIL),
    ...Array(u).fill(ROLE.UNDER),
    ...Array(w).fill(ROLE.WHITE),
  ], rng);
  const flip = rng() < 0.5;
  const opt = setup.options || {};
  const now = Date.now();
  return {
    v: 1,
    id: now.toString(36) + Math.floor(rng() * 1679616).toString(36),
    startedAt: now,
    endedAt: 0,
    mode,
    options: {
      vote: opt.vote === 'secret' ? 'secret' : 'open',
      timer: Math.max(0, Math.min(900, Math.floor(Number(opt.timer) || 0))),
      notes: !!opt.notes,
    },
    words: { civil: flip ? pair.b : pair.a, under: flip ? pair.a : pair.b, cat: pair.cat || '', lvl: pair.lvl || 0, key: pair.key || '' },
    counts: { u, w },
    players: players.map((p) => ({ id: p.id, name: p.name, color: p.color || '', face: p.face || '', role: '', alive: true, outRound: 0, outBy: '' })),
    cards: roles.map((role) => ({ role, by: -1 })),
    phase: 'deal',
    dealIndex: 0,
    pendingCard: -1,
    round: 0,
    order: [],
    starters: [],
    clues: [],
    vote: null,
    log: [],
    last: -1,
    guess: null,
    result: null,
  };
}

/* ---------- Lecture de l'état ---------- */

export const aliveIdx = (g) => g.players.map((p, i) => (p.alive ? i : -1)).filter((i) => i >= 0);
export const currentDealer = (g) => (g.phase === 'deal' ? g.dealIndex : -1);
export const currentVoter = (g) => (g.phase === 'vote' && g.options.vote === 'secret' && g.vote && g.vote.cursor < g.vote.queue.length ? g.vote.queue[g.vote.cursor] : -1);

export function remaining(g) {
  let civil = 0, under = 0, white = 0;
  for (const p of g.players) if (p.alive) { if (p.role === ROLE.CIVIL) civil++; else if (p.role === ROLE.UNDER) under++; else if (p.role === ROLE.WHITE) white++; }
  return { civil, under, white, infiltrators: under + white, alive: civil + under + white };
}

/** Le camp vainqueur si la partie est décidée, sinon ''. */
export function verdict(g) {
  const r = remaining(g);
  if (r.infiltrators === 0) return 'civils';
  if (r.civil <= 1) return 'infiltres';
  return '';
}

function need(g, ...phases) {
  if (!g || !phases.includes(g.phase)) throw new GameError('Action impossible à cette étape de la partie.');
}
const curLog = (g) => g.log[g.log.length - 1];

/* ---------- Distribution ---------- */

/** Le joueur dont c'est le tour choisit une carte : le rôle lui est attribué aussitôt. */
export function pickCard(state, cardIdx) {
  need(state, 'deal');
  const g = clone(state);
  if (g.pendingCard >= 0) throw new GameError('Une carte est déjà retournée.');
  const card = g.cards[cardIdx];
  if (!card || card.by >= 0) throw new GameError('Cette carte est déjà prise.');
  card.by = g.dealIndex;
  g.players[g.dealIndex].role = card.role;
  g.pendingCard = cardIdx;
  return g;
}

/** Le joueur a mémorisé sa carte : au suivant, ou début du premier tour. */
export function confirmCard(state, rng = defaultRng) {
  need(state, 'deal');
  const g = clone(state);
  if (g.pendingCard < 0) throw new GameError('Aucune carte à valider.');
  g.pendingCard = -1;
  g.dealIndex++;
  if (g.dealIndex >= g.players.length) beginRound(g, rng);
  return g;
}

/** Le mot (ou l'absence de mot) d'un joueur. */
export function secretOf(g, idx) {
  const p = g.players[idx];
  if (!p || !p.role) return null;
  if (p.role === ROLE.WHITE) return { white: true, word: '' };
  return { white: false, word: p.role === ROLE.CIVIL ? g.words.civil : g.words.under };
}

/* ---------- Tours de parole ---------- */

function chooseOrder(g, rng) {
  const alive = aliveIdx(g);
  // Mr. White ne parle jamais en premier : il n'a aucun mot sur lequel s'appuyer.
  // Le premier orateur est tiré au sort (et non « le suivant ») pour ne trahir personne,
  // en évitant de redonner la main à quelqu'un qui a déjà ouvert un tour.
  const eligible = alive.filter((i) => g.players[i].role !== ROLE.WHITE);
  let pool = eligible.filter((i) => !g.starters.includes(i));
  if (!pool.length) { g.starters = []; pool = eligible; }
  if (!pool.length) pool = alive;
  const starter = pick(pool, rng);
  g.starters.push(starter);
  const n = g.players.length;
  g.order = [];
  for (let k = 0; k < n; k++) { const j = (starter + k) % n; if (g.players[j].alive) g.order.push(j); }
}

function beginRound(g, rng) {
  g.round++;
  chooseOrder(g, rng);
  g.vote = null;
  g.phase = 'clues';
  g.log.push({ round: g.round, order: g.order.slice(), votes: [], tie: null, drawn: false, left: [], out: -1, role: '', guess: null });
}

/**
 * Vérifie un indice saisi : pas trop long, lisible, jamais déjà donné dans la partie.
 * `by` désigne le joueur dont on note l'indice : son indice du tour en cours peut être remplacé.
 */
export function checkClue(g, text, by = -1) {
  const t = String(text || '').trim().replace(/\s+/g, ' ');
  if (!t) return { ok: false, error: 'Écris l’indice avant de valider.' };
  if (t.length > MAX_CLUE) return { ok: false, error: `Un indice fait ${MAX_CLUE} caractères au plus.` };
  const k = norm(t);
  if (!k) return { ok: false, error: 'Cet indice n’est pas lisible.' };
  const dup = g.clues.find((c) => norm(c.text) === k && !(c.round === g.round && c.by === by));
  if (dup) return { ok: false, error: `« ${dup.text} » a déjà été dit par ${g.players[dup.by].name}.` };
  return { ok: true, text: t };
}

/** L'indice noté pour un joueur au tour en cours, ou ''. */
export function clueOf(g, idx) {
  const c = g.clues.find((x) => x.round === g.round && x.by === idx);
  return c ? c.text : '';
}

/**
 * Note (ou corrige) l'indice d'un joueur pour le tour en cours, dans n'importe quel ordre.
 * La prise de notes est facultative : rien n'oblige à noter tout le monde avant de voter.
 */
export function setClue(state, idx, text) {
  need(state, 'clues');
  if (!state.options.notes) throw new GameError('La prise de notes n’est pas activée pour cette partie.');
  const p = state.players[idx];
  if (!p || !p.alive) throw new GameError('Ce joueur n’est plus en jeu.');
  const c = checkClue(state, text, idx);
  if (!c.ok) throw new GameError(c.error);
  const g = clone(state);
  const at = g.clues.findIndex((x) => x.round === g.round && x.by === idx);
  if (at >= 0) g.clues[at].text = c.text; else g.clues.push({ round: g.round, by: idx, text: c.text });
  return g;
}

/** Efface l'indice noté pour un joueur au tour en cours (erreur de saisie). */
export function clearClue(state, idx) {
  need(state, 'clues');
  const g = clone(state);
  const at = g.clues.findIndex((x) => x.round === g.round && x.by === idx);
  if (at >= 0) g.clues.splice(at, 1);
  return g;
}

/* ---------- Vote ---------- */

function newVote(g, candidates, stage) {
  const alive = aliveIdx(g);
  return {
    stage,
    candidates: (candidates && candidates.length ? candidates : alive).slice(),
    queue: g.order.filter((i) => g.players[i].alive),
    cursor: 0,
    ballots: {},
    counts: {},
    top: [],
    drawn: -1,
  };
}

/** Tout le monde a parlé et débattu : on ouvre le vote. */
export function openVote(state) {
  need(state, 'clues');
  const g = clone(state);
  g.vote = newVote(g, null, 1);
  g.phase = 'vote';
  return g;
}

/** Retour du vote vers le tour de parole, tant qu'aucun bulletin n'a été déposé. */
export function backToTalk(state) {
  need(state, 'vote');
  const g = clone(state);
  if (g.vote.stage !== 1 || g.vote.cursor > 0) throw new GameError('Le vote a déjà commencé.');
  g.vote = null;
  g.phase = 'clues';
  return g;
}

/** Vote à main levée : le groupe désigne directement l'éliminé. */
export function eliminateByShow(state, idx) {
  need(state, 'vote');
  const g = clone(state);
  if (g.options.vote !== 'open') throw new GameError('Ce vote se fait en secret, chacun son tour.');
  if (!g.vote.candidates.includes(idx) || !g.players[idx].alive) throw new GameError('Ce joueur ne peut pas être éliminé.');
  curLog(g).votes.push({ stage: g.vote.stage, open: true, out: idx });
  eliminate(g, idx, 'vote');
  return g;
}

/** Vote à main levée : égalité déclarée entre plusieurs joueurs. 1re fois : départage ; 2e fois : tirage au sort. */
export function declareTie(state, idxs, rng = defaultRng) {
  need(state, 'vote');
  const g = clone(state);
  if (g.options.vote !== 'open') throw new GameError('Les égalités sont calculées automatiquement en vote secret.');
  const tied = Array.from(new Set(idxs || [])).filter((i) => g.vote.candidates.includes(i) && g.players[i].alive);
  if (tied.length < 2) throw new GameError('Une égalité concerne au moins deux joueurs.');
  curLog(g).votes.push({ stage: g.vote.stage, open: true, tie: tied.slice() });
  resolveTie(g, tied, rng);
  return g;
}

function resolveTie(g, tied, rng) {
  if (g.vote.stage === 1) {
    curLog(g).tie = tied.slice();
    g.vote = newVote(g, tied, 2);
    g.phase = 'tiebreak';
  } else {
    g.vote.top = tied.slice();
    g.vote.drawn = pick(tied, rng);
    curLog(g).drawn = true;
    g.phase = 'draw';
  }
}

/** Après le nouvel indice des ex æquo, on revote entre eux. */
export function startRevote(state) {
  need(state, 'tiebreak');
  const g = clone(state);
  g.phase = 'vote';
  return g;
}

/** Vote secret : le votant courant dépose son bulletin. */
export function castBallot(state, voterIdx, targetIdx) {
  need(state, 'vote');
  const g = clone(state);
  const v = g.vote;
  if (g.options.vote !== 'secret') throw new GameError('Ce vote se fait à main levée.');
  if (v.queue[v.cursor] !== voterIdx) throw new GameError('Ce n’est pas à ce joueur de voter.');
  if (targetIdx === voterIdx) throw new GameError('On ne vote pas contre soi-même.');
  if (!v.candidates.includes(targetIdx) || !g.players[targetIdx].alive) throw new GameError('Ce joueur ne peut pas recevoir de voix.');
  v.ballots[voterIdx] = targetIdx;
  v.cursor++;
  if (v.cursor >= v.queue.length) {
    v.counts = {};
    for (const c of v.candidates) v.counts[c] = 0;
    for (const k of Object.keys(v.ballots)) v.counts[v.ballots[k]]++;
    const max = Math.max(...v.candidates.map((c) => v.counts[c]));
    v.top = v.candidates.filter((c) => v.counts[c] === max);
    curLog(g).votes.push({ stage: v.stage, ballots: clone(v.ballots) });
    g.phase = 'tally';
  }
  return g;
}

/** Vote secret : le dernier votant s'est trompé, on lui rend la main. */
export function undoBallot(state) {
  need(state, 'vote');
  const g = clone(state);
  const v = g.vote;
  if (g.options.vote !== 'secret' || v.cursor <= 0) throw new GameError('Aucun bulletin à reprendre.');
  v.cursor--;
  delete v.ballots[v.queue[v.cursor]];
  return g;
}

/** Vote secret : après l'affichage du dépouillement, on applique le résultat. */
export function resolveTally(state, rng = defaultRng) {
  need(state, 'tally');
  const g = clone(state);
  const top = g.vote.top;
  if (top.length === 1) eliminate(g, top[0], 'vote');
  else resolveTie(g, top, rng);
  return g;
}

/** Le tirage au sort a été montré : le joueur tiré est éliminé. */
export function confirmDraw(state) {
  need(state, 'draw');
  const g = clone(state);
  eliminate(g, g.vote.drawn, 'vote');
  return g;
}

/* ---------- Élimination, révélation, fin ---------- */

function eliminate(g, idx, by) {
  const p = g.players[idx];
  p.alive = false;
  p.outRound = g.round;
  p.outBy = by;
  g.last = idx;
  g.guess = null;
  const l = curLog(g);
  if (by === 'vote') { l.out = idx; l.role = p.role; } else l.left.push(idx);
  g.phase = 'reveal';
}

const mustGuess = (g) => g.phase === 'reveal' && g.last >= 0 && g.players[g.last].role === ROLE.WHITE && g.players[g.last].outBy === 'vote';

/** Mr. White, démasqué, doit-il encore proposer un mot ? */
export const awaitingGuess = (g) => mustGuess(g) && !g.guess;

/** Mr. White tente de deviner le mot des Civils. */
export function submitGuess(state, text) {
  need(state, 'reveal');
  if (!awaitingGuess(state)) throw new GameError('Aucune proposition attendue.');
  const t = String(text || '').trim().slice(0, 60);
  if (!t) throw new GameError('Écris une proposition.');
  const g = clone(state);
  g.guess = { text: t, ok: guessMatches(t, g.words.civil, g.counts.u > 0 ? g.words.under : ''), forced: false };
  curLog(g).guess = clone(g.guess);
  return g;
}

/** Mr. White n'a aucune idée. */
export function skipGuess(state) {
  need(state, 'reveal');
  if (!awaitingGuess(state)) throw new GameError('Aucune proposition attendue.');
  const g = clone(state);
  g.guess = { text: '', ok: false, forced: false };
  curLog(g).guess = clone(g.guess);
  return g;
}

/** La table conteste le verdict automatique (synonyme accepté, faute de frappe trop généreuse…). */
export function overrideGuess(state) {
  need(state, 'reveal');
  if (!mustGuess(state) || !state.guess) throw new GameError('Aucun verdict à contester.');
  const g = clone(state);
  g.guess.ok = !g.guess.ok;
  g.guess.forced = true;
  curLog(g).guess = clone(g.guess);
  return g;
}

/** Ce qui se passera après la révélation : 'end' ou 'round'. */
export function afterReveal(g) {
  const p = g.players[g.last];
  if (p.role === ROLE.WHITE && g.guess && g.guess.ok) return 'end';
  if (g.mode === 'flash' && p.outBy === 'vote') return 'end';
  return verdict(g) ? 'end' : 'round';
}

/** Suite de la partie après la révélation d'un rôle. */
export function continueAfterReveal(state, rng = defaultRng) {
  need(state, 'reveal');
  if (awaitingGuess(state)) throw new GameError('Mr. White doit d’abord proposer un mot.');
  const g = clone(state);
  const p = g.players[g.last];
  if (p.role === ROLE.WHITE && g.guess && g.guess.ok) return finish(g, 'white', g.last);
  if (g.mode === 'flash' && p.outBy === 'vote') return finish(g, p.role === ROLE.CIVIL ? 'infiltres' : 'civils', -1);
  const v = verdict(g);
  if (v) return finish(g, v, -1);
  if (p.outBy === 'left') resumeAfterLeave(g, rng);
  else beginRound(g, rng);
  return g;
}

function finish(g, winner, by) {
  g.result = { winner, by };
  g.phase = 'end';
  g.endedAt = Date.now();
  g.vote = null;
  return g;
}

/**
 * Un joueur quitte la table en cours de partie. Son rôle est révélé (sans dernière chance pour Mr. White),
 * puis la partie reprend là où elle en était, ou se termine si un camp a gagné.
 */
export function playerLeaves(state, idx) {
  need(state, 'clues', 'vote', 'tiebreak', 'tally');
  const g = clone(state);
  const p = g.players[idx];
  if (!p || !p.alive) throw new GameError('Ce joueur n’est plus en jeu.');
  // On mémorise où l'on en était : la partie reprend toujours au tour de parole
  // (un vote entamé est annulé, il manquerait un votant).
  g.resume = { talking: g.phase === 'clues', opener: g.order[0] === idx };
  eliminate(g, idx, 'left');
  return g;
}

function resumeAfterLeave(g, rng) {
  const r = g.resume || { talking: false, opener: false };
  delete g.resume;
  g.order = g.order.filter((i) => g.players[i].alive);
  g.vote = null;
  // Celui qui ouvrait le tour est parti avant qu'un indice soit noté : on retire l'ordre au sort.
  // Le tirage est fait dans tous les cas (et pas seulement si Mr. White se retrouvait premier),
  // pour que le changement d'ordre ne trahisse personne.
  if (r.talking && r.opener && !g.clues.some((c) => c.round === g.round)) {
    chooseOrder(g, rng);
    curLog(g).order = g.order.slice();
  }
  g.phase = 'clues';
}

/**
 * Remet à niveau une partie sauvegardée par une version précédente : le tour de parole et le débat
 * ne font plus qu'une seule étape, sans validation joueur par joueur.
 */
export function upgradeGame(g) {
  if (!g || typeof g !== 'object') return g;
  if (g.phase === 'debate') g.phase = 'clues';
  if (g.resume && typeof g.resume === 'object' && 'phase' in g.resume) {
    g.resume = { talking: g.resume.phase === 'clues', opener: false };
  }
  delete g.speakIdx;
  return g;
}

/* ---------- Points et résumé ---------- */

/** Points gagnés par un joueur. Tout le camp vainqueur marque, même les éliminés. */
export function pointsFor(g, idx) {
  const res = g.result;
  if (!res) return 0;
  const role = g.players[idx].role;
  if (res.winner === 'civils') return role === ROLE.CIVIL ? POINTS.civil : 0;
  if (res.winner === 'infiltres') return role === ROLE.UNDER ? POINTS.under : role === ROLE.WHITE ? POINTS.white : 0;
  if (res.winner === 'white') return idx === res.by ? POINTS.white : 0;
  return 0;
}

/** Fiche compacte d'une partie terminée, pour l'historique et les statistiques. */
export function summarize(g) {
  if (g.phase !== 'end' || !g.result) throw new GameError('La partie n’est pas terminée.');
  return {
    id: g.id,
    at: g.endedAt,
    dur: Math.max(0, g.endedAt - g.startedAt),
    mode: g.mode,
    vote: g.options.vote,
    u: g.counts.u,
    w: g.counts.w,
    civil: g.words.civil,
    under: g.words.under,
    cat: g.words.cat,
    lvl: g.words.lvl,
    winner: g.result.winner,
    by: g.result.by,
    rounds: g.round,
    players: g.players.map((p, i) => ({
      id: p.id, name: p.name, color: p.color, face: p.face, role: p.role,
      pts: pointsFor(g, i), won: pointsFor(g, i) > 0, alive: p.alive, outRound: p.outRound, outBy: p.outBy,
    })),
    log: clone(g.log),
    clues: clone(g.clues),
  };
}
