// Écrans de la partie (une fonction par phase du moteur) et fenêtres modales.

import { escapeHtml as esc } from './text.js';
import { icon, roleMark, brandMark } from './icons.js';
import { avatar } from './avatars.js';
import * as E from './engine.js';
import { leaderboard } from './stats.js';
import { plural, listNames, clockLabel } from './dom.js';
import { DB, S, lookOf, nightStats, profileById } from './state.js';
import { roleBadge, recapPoints, recapRounds, wordPair, catsSheet, cameraDialog, WIN_LABEL } from './views.js';

const withRound = (title, g) => `${title}<small>tour ${g.round}</small>`;
const gameTop = (title, right = '') => `<header class="top"><button class="ibtn" data-act="game-menu" aria-label="Menu de la partie">${icon('pause')}</button><h1 class="title">${title}</h1>${right}</header>`;
const peekBtn = `<button class="btn soft sm" data-act="peek">${icon('eye', 18)}Mon mot</button>`;
const who = (g, i, size) => avatar(lookOf(g.players[i]), size);
const nameOf = (g, i) => esc(g.players[i].name);

function outList(g) {
  const out = g.players.map((p, i) => i).filter((i) => !g.players[i].alive);
  if (!out.length) return '';
  return `<div class="outs"><h3>Hors jeu</h3>${out.map((i) => `<div class="out">${who(g, i, 's28')}<span class="grow">${nameOf(g, i)}</span>${roleBadge(g.players[i].role)}</div>`).join('')}</div>`;
}

/* ---------- Distribution ---------- */

function deal(g) {
  const n = g.players.length;
  const p = g.players[g.dealIndex];
  const cols = n === 4 ? 2 : n <= 9 ? 3 : 4;
  const pending = g.pendingCard >= 0;
  const cards = g.cards.map((c, i) => (c.by >= 0
    ? `<div class="dcard taken" data-key="t${i}">${who(g, c.by, 's44')}<span class="nm">${nameOf(g, c.by)}</span></div>`
    : `<button class="dcard" data-key="f${i}" data-act="pick-card" data-i="${i}"${pending ? ' disabled' : ''} aria-label="Carte ${i + 1}">${brandMark(44)}</button>`)).join('');
  return `${gameTop('Distribution', `<span class="pillc">${Math.min(g.dealIndex + 1, n)} / ${n}</span>`)}
<div class="scroll">
  <div class="pass" data-key="deal-${g.dealIndex}">${avatar(lookOf(p), 's72')}<div class="grow"><span class="over">Passe le téléphone à</span><b class="big">${esc(p.name)}</b><span class="sub">${pending ? 'Tu n’avais pas fini de regarder ta carte.' : 'Choisis une carte et lis ton mot en cachette.'}</span></div></div>
  ${pending ? '<button class="btn sun block gap" data-act="reopen-card">Revoir ma carte</button>' : ''}
  <div class="deal c${cols}">${cards}</div>
</div>`;
}

function cardModal(g) {
  if (g.pendingCard < 0) return '';
  const idx = g.cards[g.pendingCard].by;
  const p = g.players[idx];
  const sec = E.secretOf(g, idx);
  const word = sec.white ? '' : sec.word;
  const size = word.length > 26 ? 'xs' : word.length > 16 ? 's' : word.length > 9 ? 'm' : '';
  const front = sec.white
    ? `${roleMark('white', 84)}<b class="word m">Mr. White</b><span>Tu n’as pas de mot. Écoute les indices, bluffe, et devine celui des autres.</span>`
    : `<small>Ton mot secret</small><b class="word ${size}">${esc(word)}</b><span>Retiens-le et ne le montre à personne.</span>`;
  return `<div class="cardview" role="dialog" aria-label="Carte de ${esc(p.name)}">
  <div class="who">${avatar(lookOf(p), 's44')}<b>${esc(p.name)}</b></div>
  <div class="flip${S.gui.cardFlipped ? ' on' : ''}"><div class="flip-in">
    <div class="face back pcard">${brandMark(88)}</div>
    <div class="face front pcard${sec.white ? ' is-white' : ''}">${front}</div>
  </div></div>
  <button class="btn sun lg block" data-act="confirm-card"${S.gui.cardReady ? '' : ' disabled'}>C’est retenu, je cache</button>
</div>`;
}

/* ---------- Tour de parole : ordre, indices notés, débat ---------- */

function timerBar() {
  const t = S.gui.timer;
  if (!t) return '';
  const frac = t.total ? Math.max(0, t.left) / t.total : 0;
  const over = t.left <= 0;
  const label = over ? 'Relancer' : t.running ? 'Pause' : t.left < t.total ? 'Reprendre' : 'Lancer';
  return `<div class="timerbar${over ? ' done' : t.left <= 10 ? ' hot' : ''}${t.running ? ' run' : ''}">
    <b id="timer-txt" role="timer" aria-label="Chrono du débat">${clockLabel(t.left)}</b>
    <span class="grow"><span class="tl">${over ? 'Temps écoulé : on vote !' : 'Chrono du débat'}</span><span class="tline"><i id="timer-bar" style="width:${(frac * 100).toFixed(1)}%"></i></span></span>
    <button class="btn soft sm" data-act="${over ? 'timer-reset' : 'timer-toggle'}">${icon(over ? 'replay' : t.running ? 'pause' : 'play', 18)}${label}</button>
  </div>`;
}

function talkInfo(g) {
  const r = E.remaining(g);
  if (g.mode === 'mystery') return `${plural(r.alive, 'joueur')} en jeu. Combien d’infiltrés ? Mystère.`;
  if (g.mode === 'flash') return `${plural(r.alive, 'joueur')}, ${plural(r.infiltrators, 'infiltré')}, un seul vote : visez juste.`;
  return `${plural(r.alive, 'joueur')} en jeu, dont ${plural(r.infiltrators, 'infiltré')}.`;
}

function clues(g) {
  const notes = g.options.notes;
  const rows = g.order.map((i, k) => {
    const now = notes ? E.clueOf(g, i) : '';
    const past = notes ? g.clues.filter((c) => c.by === i && c.round !== g.round) : [];
    const under = `${k === 0 ? '<span class="tag">ouvre le tour</span>' : ''}${past.length ? `<span class="past">${past.map((c) => `<i>${esc(c.text)}</i>`).join('')}</span>` : ''}`;
    const right = !notes ? '' : now ? `<span class="cluechip">${esc(now)}</span>` : `<span class="noteic">${icon('edit', 18)}</span>`;
    const inner = `<i class="n">${k + 1}</i>${who(g, i, 's44')}<span class="grow"><span class="name">${nameOf(g, i)}</span>${under}</span>${right}`;
    return `<li class="${k === 0 ? 'first' : ''}" data-key="o${i}">${notes
      ? `<button class="orow" data-act="clue-edit" data-i="${i}" aria-label="${now ? 'Corriger' : 'Noter'} l’indice de ${nameOf(g, i)}">${inner}</button>`
      : `<div class="orow">${inner}</div>`}</li>`;
  }).join('');
  return `${gameTop(`Tour ${g.round}`, peekBtn)}
<div class="scroll">
  <div class="headline" data-key="talk-${g.round}-${g.order[0]}"><b class="big">${nameOf(g, g.order[0])} commence</b><span class="sub">Chacun donne un seul mot, dans cet ordre. Puis débattez : qui bluffe ? ${talkInfo(g)}</span></div>
  ${timerBar()}
  <ol class="order">${rows}</ol>
  ${notes ? '<p class="lead soft tip">Touche un joueur pour noter son indice. Rien n’est obligatoire.</p>' : ''}
  ${outList(g)}
</div>
<div class="dock"><button class="btn sun lg block" data-act="open-vote">Passer au vote</button></div>`;
}

function clueDialog(g) {
  const i = S.modal.i;
  const p = g.players[i];
  if (!p) return '';
  const had = !!E.clueOf(g, i);
  return `<div class="dialog" role="dialog" aria-label="Indice de ${esc(p.name)}">
  ${who(g, i, 's72')}<h2>L’indice de ${esc(p.name)}</h2>
  <form class="dlg-form" data-form="clue" novalidate>
    <input class="field" id="clue" data-in="clue" value="${esc(S.gui.clue)}" maxlength="${E.MAX_CLUE}" placeholder="Son mot" autocomplete="off" autocapitalize="sentences" spellcheck="false" enterkeyhint="done" aria-label="Indice de ${esc(p.name)}">
    ${S.gui.error ? `<p class="err" role="alert">${esc(S.gui.error)}</p>` : ''}
    <div class="dlg-btns"><button class="btn well" type="button" data-act="${had ? 'clue-clear' : 'close-modal'}">${had ? 'Effacer' : 'Annuler'}</button><button class="btn ink" type="submit">Noter</button></div>
  </form>
</div>`;
}

/* ---------- Vote ---------- */

function voteOpen(g) {
  const v = g.vote;
  const tie = S.gui.tieMode;
  const sel = S.gui.tieSel;
  const tiles = v.candidates.map((i) => `<button class="tile xl${tie && sel.includes(i) ? ' on' : ''}" data-act="${tie ? 'tie-toggle' : 'ask-elim'}" data-i="${i}"${tie ? ` aria-pressed="${sel.includes(i)}"` : ''}>${who(g, i, 's72')}<span class="nm">${nameOf(g, i)}</span>${tie && sel.includes(i) ? `<i class="ord">${icon('check', 16)}</i>` : ''}</button>`).join('');
  const second = v.stage === 2;
  const head = tie ? 'Qui est à égalité ?' : second ? 'Qui sort, entre eux ?' : 'Qui éliminez-vous ?';
  const sub = tie
    ? 'Touche tous les joueurs qui ont le même nombre de voix.'
    : second ? 'Tout le monde revote, uniquement entre les ex æquo. Touche celui qui a le plus de voix.'
      : 'À trois, tout le monde pointe un joueur du doigt. Touche celui qui a le plus de voix.';
  const dock = tie
    ? `<button class="btn soft" data-act="tie-cancel">Annuler</button><button class="btn sun block" data-act="tie-go"${sel.length < 2 ? ' disabled' : ''}>${second ? 'Tirer au sort' : 'Départager'}</button>`
    : `${second ? '' : `<button class="btn soft" data-act="back-to-talk" aria-label="Revenir au tour de parole">${icon('back', 20)}</button>`}<button class="btn line block" data-act="tie-mode">Il y a égalité</button>`;
  return `${gameTop(second ? 'Départage' : withRound('Vote', g), peekBtn)}
<div class="scroll">
  <div class="headline"><b class="big">${head}</b><span class="sub">${sub}</span></div>
  <div class="tiles ${v.candidates.length <= 4 ? 'two' : ''}">${tiles}</div>
  ${outList(g)}
</div>
<div class="dock">${dock}</div>`;
}

function voteSecret(g) {
  const v = g.vote;
  const voter = E.currentVoter(g);
  const p = g.players[voter];
  const dots = v.queue.map((_, k) => `<i class="${k < v.cursor ? 'done' : k === v.cursor ? 'cur' : ''}"></i>`).join('');
  const title = v.stage === 2 ? 'Départage' : withRound('Vote', g);
  if (S.gui.gate) {
    return `${gameTop(title)}
<div class="scroll center-col">
  <div class="pass tall" data-key="voter-${v.stage}-${voter}">${avatar(lookOf(p), 's120')}<span class="over">Passe le téléphone à</span><b class="big">${esc(p.name)}</b><span class="sub">${v.stage === 2 ? 'Second vote, entre les ex æquo seulement.' : 'Chacun vote en secret, à son tour.'}</span></div>
  <div class="dots" aria-label="Vote ${v.cursor + 1} sur ${v.queue.length}">${dots}</div>
</div>
<div class="dock col">${v.cursor > 0 ? `<button class="link onbg" data-act="undo-ballot">Erreur de ${nameOf(g, v.queue[v.cursor - 1])} ? Reprendre son vote</button>` : v.stage === 1 ? '<button class="link onbg" data-act="back-to-talk">Revenir au tour de parole</button>' : ''}<button class="btn sun lg block" data-act="gate-open">C’est moi, je vote</button></div>`;
  }
  const targets = v.candidates.filter((i) => i !== voter);
  return `${gameTop(title)}
<div class="scroll">
  <div class="headline"><b class="big">${esc(p.name)}, qui élimines-tu ?</b><span class="sub">Ton vote reste secret jusqu’à la fin de la partie.</span></div>
  <div class="tiles ${targets.length <= 4 ? 'two' : ''}">${targets.map((i) => `<button class="tile xl" data-act="ask-ballot" data-i="${i}">${who(g, i, 's72')}<span class="nm">${nameOf(g, i)}</span></button>`).join('')}</div>
</div>`;
}

function tiebreak(g) {
  const tied = g.vote.candidates;
  return `${gameTop('Égalité')}
<div class="scroll center-col">
  <div class="tied">${tied.map((i) => `<span class="mini">${who(g, i, 's72')}<span>${nameOf(g, i)}</span></span>`).join('')}</div>
  <b class="big">Égalité !</b>
  <p class="lead center">${listNames(tied.map((i) => nameOf(g, i)))} donnent chacun un nouvel indice. Ensuite, tout le monde revote, entre eux seulement.</p>
</div>
<div class="dock"><button class="btn sun lg block" data-act="start-revote">On revote</button></div>`;
}

function tally(g) {
  const v = g.vote;
  const total = v.queue.length;
  const rows = v.candidates.slice().sort((a, b) => v.counts[b] - v.counts[a]).map((i) => {
    const c = v.counts[i];
    return `<div class="tally-row${v.top.includes(i) ? ' top' : ''}">${who(g, i, 's44')}<span class="grow"><span class="name">${nameOf(g, i)}</span><span class="tbar"><i style="--w:${Math.round((c / total) * 100)}%"></i></span></span><b>${c}</b></div>`;
  }).join('');
  const names = listNames(v.top.map((i) => nameOf(g, i)));
  const single = v.top.length === 1;
  const verdictText = single
    ? `${names} sort du jeu, avec ${v.counts[v.top[0]]} voix sur ${total}.`
    : v.stage === 1 ? `Égalité entre ${names}.` : `Toujours égalité entre ${names} : le sort va décider.`;
  return `${gameTop('Dépouillement')}
<div class="scroll">
  <div class="headline"><b class="big">${single ? 'Le verdict' : 'Égalité !'}</b><span class="sub">${verdictText}</span></div>
  <div class="panel tally${S.gui.tallyGo ? ' go' : ''}">${rows}</div>
</div>
<div class="dock"><button class="btn sun lg block" data-act="resolve-tally">${single ? 'Révéler son rôle' : v.stage === 1 ? 'Départager' : 'Tirer au sort'}</button></div>`;
}

function draw(g) {
  const v = g.vote;
  const done = S.gui.drawDone;
  return `${gameTop('Tirage au sort')}
<div class="scroll center-col">
  <b class="big">Le sort décide</b>
  <div class="tied draw">${v.top.map((i, k) => `<span class="mini${(done ? i === v.drawn : k === S.gui.drawAt) ? ' lit' : ''}">${who(g, i, 's72')}<span>${nameOf(g, i)}</span></span>`).join('')}</div>
  <p class="lead center">${done ? `Le sort désigne ${nameOf(g, v.drawn)}.` : 'Deux égalités de suite : personne ne choisit, c’est le hasard.'}</p>
</div>
<div class="dock"><button class="btn sun lg block" data-act="confirm-draw"${done ? '' : ' disabled'}>Révéler son rôle</button></div>`;
}

/* ---------- Révélation ---------- */

function reveal(g) {
  const p = g.players[g.last];
  const left = p.outBy === 'left';
  if (!S.gui.revealShown) {
    return `${gameTop('Révélation')}
<div class="scroll center-col">
  <div class="suspense">${avatar(lookOf(p), 's120')}<i class="ring"></i></div>
  <p class="over big2">${esc(p.name)} ${left ? 'quitte la table. Son rôle…' : 'était…'}</p>
  <div class="dots wait" aria-hidden="true"><i></i><i></i><i></i></div>
</div>`;
  }
  const role = p.role;
  const next = E.afterReveal(g);
  const r = E.remaining(g);
  let body = '';
  let dock = '';
  if (E.awaitingGuess(g)) {
    body = `<p class="lead center">Mr. White est démasqué. Dernière chance : s’il trouve le mot des Civils, il gagne la partie à lui seul.</p>
    <form class="inline" data-form="guess" novalidate><input class="field" id="guess" data-in="guess" value="${esc(S.gui.guess)}" maxlength="60" placeholder="Le mot des Civils" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" aria-label="Proposition de Mr. White"><button class="btn sun" type="submit">Valider</button></form>
    ${S.gui.error ? `<p class="err onbg" role="alert">${esc(S.gui.error)}</p>` : ''}
    <button class="link onbg" data-act="skip-guess">Aucune idée, on passe</button>`;
  } else {
    if (role === 'white' && !left && g.guess) {
      const gs = g.guess;
      body = `<div class="verdict ${gs.ok ? 'ok' : 'ko'}" data-key="verdict-${gs.ok}"><span>${gs.text ? `« ${esc(gs.text)} »` : 'Aucune proposition'}</span><b>${gs.ok ? 'Bonne réponse !' : 'Raté.'}</b></div>
      <button class="link onbg" data-act="override-guess">${gs.ok ? 'Ce n’était pas le bon mot ? Refuser la réponse' : 'La table accepte quand même ? Compter bon'}</button>`;
    } else {
      body = `<p class="lead center">${left ? 'La partie continue avec les autres.' : role === 'civil' ? 'Aïe : c’était un Civil.' : 'Bien vu : un infiltré de moins.'}</p>`;
    }
    if (next === 'round' && g.mode !== 'mystery') body += `<p class="lead center soft">Il reste ${plural(r.civil, 'Civil')} et ${plural(r.infiltrators, 'infiltré')}.</p>`;
    dock = `<div class="dock"><button class="btn sun lg block" data-act="after-reveal">${next === 'end' ? 'Voir le résultat' : left ? 'Reprendre la partie' : 'Tour suivant'}</button></div>`;
  }
  return `${gameTop('Révélation')}
<div class="scroll center-col">
  <div class="rolecard ${role}">${avatar(lookOf(p), 's72')}<span class="over">${esc(p.name)} était</span>${roleMark(role, 76)}<b class="rolename">${E.ROLE_NAME[role]}</b></div>
  ${body}
</div>${dock}`;
}

/* ---------- Fin de partie ---------- */

function end(g) {
  const h = DB.history.find((x) => x.id === g.id) || E.summarize(g);
  const res = g.result;
  const byName = res.by >= 0 ? esc(g.players[res.by].name) : '';
  const text = res.winner === 'white'
    ? `${byName} a deviné le mot des Civils.`
    : res.winner === 'civils' ? 'Tous les infiltrés ont été démasqués.'
      : g.mode === 'flash' ? 'Les Civils se sont trompés de cible.' : 'Il ne reste qu’un Civil : les infiltrés ont tenu jusqu’au bout.';
  const tabName = S.gui.endTab;
  const tabs = [['points', 'Points'], ['night', 'Soirée'], ['rounds', 'Déroulé']].map(([id, name]) => `<button class="${tabName === id ? 'on' : ''}" data-act="end-tab" data-id="${id}" aria-pressed="${tabName === id}">${name}</button>`).join('');
  let panel;
  if (tabName === 'night') {
    const ns = nightStats();
    const rows = leaderboard(g.players.map((p) => profileById(p.id) || p), ns);
    panel = `<div class="panel list"><h3>Classement de la soirée</h3>${rows.map((r) => `<div class="row"><i class="rk">${r.rank}</i>${avatar(r.profile, 's44')}<span class="grow"><span class="name">${esc(r.profile.name)}</span><span class="meta">${plural(r.s.wins, 'victoire')} en ${plural(r.s.games, 'partie')}</span></span><b class="val">${r.s.points}</b></div>`).join('')}<p class="hint">Points marqués depuis 12 heures par les joueurs de cette partie.</p></div>`;
  } else if (tabName === 'rounds') {
    panel = `<div class="panel">${recapRounds(h)}</div>`;
  } else {
    panel = `<div class="panel list">${recapPoints(h)}</div>`;
  }
  return `${gameTop('Fin de partie')}
<div class="scroll">
  <div class="win ${res.winner}" data-key="win">${roleMark(res.winner === 'civils' ? 'civil' : res.winner === 'white' ? 'white' : 'under', 72)}<h2>${WIN_LABEL[res.winner]}</h2><p>${text}</p></div>
  ${wordPair(h)}
  <div class="seg onbg">${tabs}</div>
  ${panel}
</div>
<div class="dock col"><button class="btn sun lg block" data-act="replay">${icon('replay', 20)}Rejouer</button><div class="dock-row"><button class="btn soft block" data-act="end-settings">Changer les réglages</button><button class="btn soft block" data-act="end-home">Accueil</button></div></div>`;
}

export function game() {
  const g = DB.game;
  if (!g) return '<div class="scroll"></div>';
  switch (g.phase) {
    case 'deal': return deal(g);
    case 'clues': return clues(g);
    case 'vote': return g.options.vote === 'secret' ? voteSecret(g) : voteOpen(g);
    case 'tiebreak': return tiebreak(g);
    case 'tally': return tally(g);
    case 'draw': return draw(g);
    case 'reveal': return reveal(g);
    case 'end': return end(g);
    default: return '<div class="scroll"></div>';
  }
}

/** Clé d'écran : un changement de clé déclenche une transition, sinon l'écran est mis à jour sur place. */
export function gameKey() {
  const g = DB.game;
  if (!g) return 'game/none';
  const v = g.vote;
  switch (g.phase) {
    case 'deal': return `game/deal/${g.id}`;
    case 'clues': return `game/clues/${g.round}`;
    case 'vote': return g.options.vote === 'secret' ? `game/vote/${g.round}/${v.stage}/${v.cursor}/${S.gui.gate ? 'gate' : 'pick'}` : `game/vote/${g.round}/${v.stage}`;
    case 'tiebreak': return `game/tie/${g.round}`;
    case 'tally': return `game/tally/${g.round}/${v.stage}`;
    case 'draw': return `game/draw/${g.round}`;
    case 'reveal': return `game/reveal/${g.round}/${g.last}/${S.gui.revealShown ? 'shown' : 'wait'}`;
    case 'end': return `game/end/${g.id}`;
    default: return 'game/x';
  }
}

/* ---------- Fenêtres modales ---------- */

function menuSheet(g) {
  const inDeal = g.phase === 'deal';
  const canLeave = ['clues', 'vote', 'tiebreak', 'tally'].includes(g.phase);
  const row = (act, ic, title, hint, cls = '') => `<button class="rowbtn ${cls}" data-act="${act}"><span class="opt-ic">${icon(ic, 20)}</span><span class="grow"><b>${title}</b><span>${hint}</span></span></button>`;
  return `<div class="sheet" role="dialog" aria-label="Menu de la partie">
  <div class="sheet-head"><h2>Partie en pause</h2></div>
  <div class="sheet-body">
    ${inDeal ? '' : row('peek', 'eye', 'Revoir mon mot', 'Pour celui ou celle qui a un doute.')}
    ${row('menu-rules', 'book', 'Règles du jeu', 'La partie reste où elle en est.')}
    ${canLeave ? row('ask-leave', 'door', 'Un joueur quitte la table', 'Son rôle est révélé et la partie continue.') : ''}
    ${inDeal ? row('ask-redeal', 'swap', 'Redistribuer', 'Quelqu’un a vu une carte ? On repart avec un nouveau mot.') : ''}
    ${row('menu-home', 'cards', 'Retour à l’accueil', 'La partie est gardée : tu la reprends quand tu veux.')}
    ${row('ask-abandon', 'close', 'Abandonner la partie', 'Elle ne comptera pas dans les scores.', 'danger')}
  </div>
  <button class="btn ink block" data-act="close-modal">Reprendre la partie</button>
</div>`;
}

function peekSheet(g) {
  const m = S.modal;
  if (m.step === 'show') {
    const sec = E.secretOf(g, m.i);
    return `<div class="dialog" role="dialog"><span class="over ink">${sec.white ? 'Ton rôle' : 'Ton mot secret'}</span><b class="word peekword">${sec.white ? 'Mr. White' : esc(sec.word)}</b>${sec.white ? '<p class="hint">Tu n’as pas de mot.</p>' : ''}<button class="btn ink block" data-act="close-modal">Cacher</button></div>`;
  }
  if (m.step === 'gate') {
    return `<div class="dialog" role="dialog">${who(g, m.i, 's96')}<h2>Écran réservé à ${nameOf(g, m.i)}</h2><p class="hint">Les autres détournent les yeux.</p><div class="dlg-btns"><button class="btn well" data-act="close-modal">Annuler</button><button class="btn ink" data-act="peek-show">Afficher</button></div></div>`;
  }
  return `<div class="sheet" role="dialog" aria-label="Revoir son mot"><div class="sheet-head"><h2>Qui veut revoir son mot ?</h2></div><div class="sheet-body">${E.aliveIdx(g).map((i) => `<button class="rowbtn" data-act="peek-pick" data-i="${i}">${who(g, i, 's44')}<span class="grow"><b>${nameOf(g, i)}</b></span>${icon('next', 20)}</button>`).join('')}</div><button class="btn well block" data-act="close-modal">Fermer</button></div>`;
}

function leaveSheet(g) {
  return `<div class="sheet" role="dialog" aria-label="Un joueur quitte la table"><div class="sheet-head"><h2>Qui quitte la table ?</h2></div><p class="hint">Son rôle sera révélé, sans dernière chance pour Mr. White. La partie continue avec les autres.</p><div class="sheet-body">${E.aliveIdx(g).map((i) => `<button class="rowbtn" data-act="leave-pick" data-i="${i}">${who(g, i, 's44')}<span class="grow"><b>${nameOf(g, i)}</b></span>${icon('next', 20)}</button>`).join('')}</div><button class="btn well block" data-act="close-modal">Annuler</button></div>`;
}

function confirmDialog(m) {
  const data = Object.keys(m.data || {}).map((k) => ` data-${k}="${esc(m.data[k])}"`).join('');
  return `<div class="dialog" role="alertdialog" aria-label="${esc(m.title)}">${m.who ? avatar(m.who, 's96') : ''}<h2>${esc(m.title)}</h2>${m.text ? `<p class="hint">${esc(m.text)}</p>` : ''}<div class="dlg-btns"><button class="btn well" data-act="close-modal">${esc(m.no || 'Annuler')}</button><button class="btn ${m.danger ? 'tomato' : 'ink'}" data-act="${m.act}"${data}>${esc(m.yes)}</button></div></div>`;
}

/** @returns {{html:string, kind:string, key:string}|null} */
export function modal() {
  const m = S.modal;
  if (!m) return null;
  const g = DB.game;
  switch (m.type) {
    case 'card': return g ? { html: cardModal(g), kind: 'k-full', key: `card-${g.pendingCard}` } : null;
    case 'menu': return g ? { html: menuSheet(g), kind: 'k-sheet', key: 'menu' } : null;
    case 'peek': return g ? { html: peekSheet(g), kind: m.step === 'pick' ? 'k-sheet' : 'k-center', key: `peek-${m.step}` } : null;
    case 'leave': return g ? { html: leaveSheet(g), kind: 'k-sheet', key: 'leave' } : null;
    case 'clue': return g && g.phase === 'clues' ? { html: clueDialog(g), kind: 'k-center k-top', key: `clue-${m.i}` } : null;
    case 'cats': return { html: catsSheet(), kind: 'k-sheet', key: 'cats' };
    case 'camera': return { html: cameraDialog(m), kind: 'k-center', key: 'camera' };
    case 'confirm': return { html: confirmDialog(m), kind: 'k-center', key: `confirm-${m.act}-${m.title}` };
    default: return null;
  }
}
