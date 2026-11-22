// Écrans hors partie : accueil, joueurs, préparation, classement, historique, règles, réglages.
// Chaque fonction renvoie le HTML d'un écran ; aucune ne modifie l'état.

import { escapeHtml as esc } from './text.js';
import { icon, roleMark, brandMark, logoMark } from './icons.js';
import { avatar, COLORS, FACES, faceId } from './avatars.js';
import { CATEGORIES, CUSTOM_CAT, DISCOVERY_CAT, DISCOVERY_PAIRS, LEVELS, TOTAL_PAIRS, categoryName } from './words/index.js';
import { shopActive, isPremium, trialEnd } from './shop.js';
import { reserveChip, shop as shopScreen } from './views-shop.js';
import * as E from './engine.js';
import { leaderboard, awards, winRate, average, emptyStats } from './stats.js';
import { num, plural, pct, listNames, dayLabel, timeLabel, durationLabel } from './dom.js';
import { isNative } from './store.js';
import {
  DB, S, APP_VERSION, TIMER_CHOICES, TABS, profileById, lookOf, stats, nightStats, activeGame, poolInfo, quickSetup, catOpen, discoveryOn,
} from './state.js';

export const st = (i) => `data-st style="--i:${i}"`;

export function topBar(title, { back = false, left = '', right = '' } = {}) {
  const l = back ? `<button class="ibtn" data-act="back" aria-label="Retour">${icon('back')}</button>` : left;
  return `<header class="top">${l}<h1 class="title">${title}</h1>${right}</header>`;
}

export const roleBadge = (role) => `<span class="badge ${role}">${E.ROLE_NAME[role] || ''}</span>`;
const WIN_LABEL = { civils: 'Victoire des Civils', infiltres: 'Victoire des infiltrés', white: 'Victoire de Mr. White' };
const WIN_SHORT = { civils: 'Civils', infiltres: 'Infiltrés', white: 'Mr. White' };
const MODE_ICON = { classic: 'cards', flash: 'bolt', mystery: 'mask' };

/* ---------- Barre d'onglets ---------- */

const TAB_META = {
  home: ['Jouer', 'cards'],
  players: ['Joueurs', 'users'],
  ranking: ['Classement', 'trophy'],
  history: ['Historique', 'clock'],
  settings: ['Réglages', 'sliders'],
};

export function navBar(current) {
  return TABS.map((t) => `<button class="${t === current ? 'on' : ''}" data-act="tab" data-to="${t}" aria-current="${t === current ? 'page' : 'false'}"><span class="pill">${icon(TAB_META[t][1], 22)}</span><span>${TAB_META[t][0]}</span></button>`).join('');
}

/* ---------- Accueil ---------- */

function heroPair() {
  if (S.hero) return S.hero;
  const short = [];
  for (const c of CATEGORIES) for (const p of c.pairs) if (p.lvl === 1 && p.a.length <= 6 && p.b.length <= 6 && !/\s/.test(p.a + p.b)) short.push(p);
  S.hero = short[Math.floor(Math.random() * short.length)] || { a: 'Café', b: 'Thé' };
  return S.hero;
}

function resumeLabel(g) {
  if (g.phase === 'deal') return `Distribution : ${g.dealIndex} carte${g.dealIndex > 1 ? 's' : ''} sur ${g.players.length}`;
  return `Tour ${g.round}, ${plural(E.remaining(g).alive, 'joueur')} en jeu`;
}

export function home() {
  const g = activeGame();
  const hero = heroPair();
  const quick = !g && quickSetup();
  const team = quick ? quick.players.map(profileById) : [];
  return `<div class="scroll home">
  ${reserveChip()}
  <header class="brandrow" ${st(0)}><h1 class="wordmark">Double<br>Jeu</h1>${logoMark(92)}</header>
  <p class="tagline" ${st(1)}>Un mot secret, un intrus, et beaucoup de bluff.</p>
  <div class="hero" aria-hidden="true">
    <div class="c c1"><span>${esc(hero.b)}</span></div>
    <div class="c c3"><span>?</span></div>
    <div class="c c2"><span>${esc(hero.a)}</span></div>
  </div>
  ${g ? `<div class="panel resume" ${st(2)}><div class="grow"><b>Partie en cours</b><span class="hint">${resumeLabel(g)}</span></div><button class="btn ink sm" data-act="resume">Reprendre</button></div>` : ''}
  <div class="stack" ${st(3)}>
    <button class="btn sun lg block" data-act="new-game">${g ? 'Nouvelle partie' : 'Jouer'}</button>
    ${quick ? `<button class="btn soft block quick" data-act="quick-game"><span class="avs">${team.slice(0, 5).map((p) => avatar(p, 's28')).join('')}${team.length > 5 ? `<i class="more">+${team.length - 5}</i>` : ''}</span><span>Même équipe, on rejoue</span></button>` : ''}
    <button class="btn line block" data-act="go" data-to="rules">${icon('book', 20)}Règles du jeu</button>
  </div>
  <p class="foot" ${st(4)}>${discoveryOn() ? `${num(DISCOVERY_PAIRS.length)} paires offertes, ${num(TOTAL_PAIRS)} avec l’illimité` : `${num(CATEGORIES.filter(catOpen).reduce((n, c) => n + c.pairs.length, 0))} paires de mots dans ${CATEGORIES.filter(catOpen).length} thèmes`}</p>
</div>`;
}

/* ---------- Joueurs ---------- */

function statLine(s) {
  if (!s || !s.games) return 'Pas encore de partie';
  return `${plural(s.games, 'partie')}, ${plural(s.points, 'point')}`;
}

export function players() {
  const all = stats();
  const list = DB.profiles;
  const body = list.length
    ? `<p class="lead">Touche un joueur pour voir ses scores, le crayon pour changer son nom ou sa photo, la corbeille pour le supprimer.</p>
       <div class="panel list">${list.map((p, i) => `<div class="row prow" ${st(Math.min(i, 10))}><button class="prow-main" data-act="go" data-to="player" data-id="${p.id}" aria-label="${esc(p.name)}, voir ses statistiques">${avatar(p, 's44')}<span class="grow"><span class="name">${esc(p.name)}</span><span class="meta">${statLine(all[p.id])}</span></span></button><button class="ibtn onpaper" data-act="profile-edit" data-id="${p.id}" aria-label="Modifier ${esc(p.name)}">${icon('edit', 20)}</button><button class="ibtn onpaper del" data-act="profile-delete" data-id="${p.id}" aria-label="Supprimer ${esc(p.name)}">${icon('trash', 20)}</button></div>`).join('')}</div>`
    : `<div class="empty">${avatar({ color: 'soleil', face: 'agent' }, 's96')}<h2>Personne à table pour l’instant</h2><p>Crée un profil par joueur : prénom, couleur, personnage ou photo. Ils sont enregistrés sur ce téléphone et seront là à chaque partie.</p></div>`;
  return `${topBar('Joueurs')}<div class="scroll">${body}</div><div class="dock"><button class="btn sun block" data-act="profile-new">${icon('plus', 20)}Ajouter un joueur</button></div>`;
}

export function profile() {
  const d = S.draft;
  if (!d) return topBar('Profil', { back: true }) + '<div class="scroll"></div>';
  const editing = !!d.id;
  const colors = COLORS.map((c) => `<button class="swatch${d.color === c.id ? ' on' : ''}" style="--c:${c.hex}" data-act="draft-color" data-id="${c.id}" aria-label="${c.name}" aria-pressed="${d.color === c.id}">${d.color === c.id ? icon('check', 18) : ''}</button>`).join('');
  const mine = faceId(d.face);
  const faces = FACES.map((f) => `<button class="facebtn${!d.photo && mine === f.id ? ' on' : ''}" data-act="draft-face" data-id="${f.id}" aria-label="${esc(f.name)}" aria-pressed="${!d.photo && mine === f.id}">${avatar({ color: d.color, face: f.id }, 's56')}</button>`).join('');
  return `${topBar(editing ? 'Modifier le profil' : 'Nouveau joueur', { back: true, right: editing ? `<button class="ibtn" data-act="profile-delete" aria-label="Supprimer ce joueur">${icon('trash')}</button>` : '' })}
<div class="scroll">
  <div class="preview">
    <div class="pv">${avatar(d, 's120')}<button class="pvcam" type="button" data-act="camera-open" aria-label="${d.photo ? 'Refaire la photo' : 'Prendre une photo'}">${icon('camera', 22)}</button></div>
    <div class="pvbtns"><button class="btn soft sm" type="button" data-act="camera-open">${icon('camera', 18)}${d.photo ? 'Refaire la photo' : 'Prendre une photo'}</button>${d.photo ? `<button class="btn soft sm" type="button" data-act="draft-photo-clear">${icon('close', 18)}Retirer</button>` : ''}</div>
  </div>
  <form class="panel" data-form="profile" novalidate>
    <label class="lbl" for="pf-name">Prénom ou surnom</label>
    <input class="field" id="pf-name" data-in="draft-name" value="${esc(d.name)}" maxlength="16" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" placeholder="${esc(d.fallback)}">
    ${d.error ? `<p class="err" role="alert">${esc(d.error)}</p>` : `<p class="hint">Champ vide : ce sera « ${esc(d.fallback)} ».</p>`}
  </form>
  <div class="panel">
    <h3>Couleur</h3>
    <div class="swatches">${colors}</div>
  </div>
  <div class="panel">
    <h3>Personnage</h3>
    ${d.photo ? '<p class="hint">La photo remplace le personnage. Elle reste sur ce téléphone.</p>' : ''}
    <div class="faces">${faces}</div>
  </div>
  ${editing ? `<button class="btn del block" type="button" data-act="profile-delete">${icon('trash', 20)}Supprimer ce joueur</button>` : ''}
</div>
<div class="dock"><button class="btn sun block" data-act="profile-save">${editing ? 'Enregistrer' : 'Créer le joueur'}</button></div>`;
}

/** Appareil photo intégré : aperçu carré dans une fenêtre de taille moyenne, jamais en plein écran. */
export function cameraDialog(m) {
  const live = m.step === 'live', shot = m.step === 'shot', wait = m.step === 'wait', error = m.step === 'error';
  const flip = (live || wait) && m.many
    ? `<button class="camflip" type="button" data-act="camera-flip" aria-label="${m.facing === 'user' ? 'Passer à la caméra arrière' : 'Passer à la caméra avant'}"${wait ? ' disabled' : ''}>${icon('swap', 22)}</button>` : '';
  const msg = wait ? '<div class="cam-msg"><div class="dots wait" aria-hidden="true"><i></i><i></i><i></i></div><span>Ouverture de l’appareil photo…</span></div>'
    : error ? `<div class="cam-msg">${icon('camera', 40)}<span role="alert">${esc(m.error)}</span></div>` : '';
  const btns = error
    ? `${m.denied && m.canSettings ? '<button class="link" type="button" data-act="camera-settings">Ouvrir les réglages de l’appli</button>' : ''}
       <div class="dlg-btns"><button class="btn well" type="button" data-act="camera-retry">Réessayer</button><button class="btn ink" type="button" data-act="close-modal">Choisir un personnage</button></div>`
    : shot
      ? '<div class="dlg-btns"><button class="btn well" type="button" data-act="camera-retake">Reprendre</button><button class="btn ink" type="button" data-act="camera-keep">Garder</button></div>'
      : `<div class="dlg-btns"><button class="btn well" type="button" data-act="close-modal">Annuler</button><button class="btn ink" type="button" data-act="camera-shoot"${live ? '' : ' disabled'}>${icon('camera', 20)}Prendre</button></div>`;
  return `<div class="dialog cam" role="dialog" aria-label="Photo de profil">
  <h2>${shot ? 'On la garde ?' : 'Photo de profil'}</h2>
  <div class="camframe is-${m.step}${m.mirror ? ' mirror' : ''}">
    <video id="cam-video" autoplay playsinline muted></video>
    <img class="camshot" src="${shot ? m.shot : 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='}" alt="${shot ? 'Photo prise' : ''}">
    ${msg}${flip}
  </div>
  ${btns}
</div>`;
}

/* ---------- Préparation d'une partie ---------- */

export function setup() {
  const s = S.setup;
  const n = s.players.length;
  if (!DB.profiles.length) {
    return `${topBar('Qui joue ?', { back: true })}<div class="scroll"><div class="empty">${avatar({ color: 'menthe', face: 'renard' }, 's96')}<h2>Il faut des joueurs</h2><p>Crée au moins ${E.MIN_PLAYERS} profils pour lancer une partie.</p></div></div>
<div class="dock"><button class="btn sun block" data-act="profile-new" data-then="setup">${icon('plus', 20)}Créer un joueur</button></div>`;
  }
  const manage = !!S.manage;
  const tiles = DB.profiles.map((p) => {
    const at = s.players.indexOf(p.id);
    if (manage) return `<button class="tile edit" data-act="profile-edit" data-id="${p.id}" data-then="setup" aria-label="Modifier ${esc(p.name)}">${avatar(p, 's56')}<span class="nm">${esc(p.name)}</span><i class="ord pen">${icon('edit', 15)}</i></button>`;
    return `<button class="tile${at >= 0 ? ' on' : ''}" data-act="setup-toggle" data-id="${p.id}" aria-pressed="${at >= 0}">${avatar(p, 's56')}<span class="nm">${esc(p.name)}</span>${at >= 0 ? `<i class="ord">${at + 1}</i>` : ''}</button>`;
  }).join('');
  const msg = n < E.MIN_PLAYERS ? `Encore ${plural(E.MIN_PLAYERS - n, 'joueur')} à choisir` : `${plural(n, 'joueur')} à table`;
  const extra = manage
    ? `<button class="tile add done" data-act="setup-manage" aria-pressed="true"><span class="plus">${icon('check', 26)}</span><span class="nm">Terminé</span></button>`
    : `<button class="tile add" data-act="profile-new" data-then="setup"><span class="plus">${icon('plus', 26)}</span><span class="nm">Nouveau</span></button><button class="tile add" data-act="setup-manage" aria-pressed="false"><span class="plus">${icon('edit', 26)}</span><span class="nm">Modifier</span></button>`;
  return `${topBar('Qui joue ?', { back: true, right: n && !manage ? `<button class="btn soft sm" data-act="setup-clear">Vider</button>` : '' })}
<div class="scroll">
  <p class="lead">${manage ? 'Touche un joueur pour changer son nom, sa photo, ou le supprimer.' : 'Touche les joueurs dans l’ordre où vous êtes assis : c’est l’ordre des tours de parole.'}</p>
  <div class="tiles">${tiles}${extra}</div>
</div>
<div class="dock col">${manage
    ? '<button class="btn sun block" data-act="setup-manage">Terminé</button>'
    : `<p class="dock-note">${msg}</p><button class="btn sun block" data-act="setup-next"${n < E.MIN_PLAYERS ? ' disabled' : ''}>Continuer</button>`}</div>`;
}

function stepper(label, value, key, canMinus, canPlus, role) {
  return `<div class="count ${role}">${roleMark(role, 44)}<b>${value}</b><span>${label}</span>
    <div class="stepper"><button data-act="role-step" data-k="${key}" data-d="-1"${canMinus ? '' : ' disabled'} aria-label="Un ${label} de moins">${icon('minus', 20)}</button><button data-act="role-step" data-k="${key}" data-d="1"${canPlus ? '' : ' disabled'} aria-label="Un ${label} de plus">${icon('plus', 20)}</button></div></div>`;
}

export function options() {
  const s = S.setup;
  const n = s.players.length;
  const max = E.maxInfiltrators(n);
  const civ = n - s.u - s.w;
  const rec = E.defaultRoles(n);
  const info = poolInfo(s);
  const team = s.players.map(profileById).filter(Boolean);
  const modes = Object.values(E.MODES).map((m) => `<button class="opt${s.mode === m.id ? ' on' : ''}" data-act="set-mode" data-id="${m.id}" aria-pressed="${s.mode === m.id}"><span class="opt-ic">${icon(MODE_ICON[m.id], 22)}</span><span class="grow"><b>${m.name}</b><span>${m.hint}</span></span><i class="radio"></i></button>`).join('');
  const roles = s.mode === 'mystery'
    ? `<p class="hint">Entre 1 et ${max} infiltré${max > 1 ? 's' : ''}, Undercover ou Mr. White : personne ne sait combien, ni lesquels.</p>`
    : `<div class="counts">
        <div class="count civil">${roleMark('civil', 44)}<b>${civ}</b><span>Civil${civ > 1 ? 's' : ''}</span><div class="stepper ghost"></div></div>
        ${stepper('Undercover', s.u, 'u', s.u > 0 && s.u + s.w > 1, s.u + s.w < max, 'under')}
        ${stepper('Mr. White', s.w, 'w', s.w > 0 && s.u + s.w > 1, s.u + s.w < max, 'white')}
      </div>
      <p class="hint">${s.u === rec.u && s.w === rec.w ? `Composition conseillée pour ${n} joueurs.` : `<button class="link" data-act="role-reset">Revenir à la composition conseillée</button>`}</p>`;
  const levels = LEVELS.map((l) => `<button class="chip${s.levels.includes(l.id) ? ' on' : ''}" data-act="set-level" data-id="${l.id}" aria-pressed="${s.levels.includes(l.id)}">${l.name}</button>`).join('');
  const openList = CATEGORIES.filter(catOpen);
  const nThemes = openList.filter((c) => s.cats.includes(c.id)).length;
  const withDisco = discoveryOn() && s.cats.includes(DISCOVERY_CAT.id);
  const themesLabel = !openList.length ? 'Sélection découverte'
    : nThemes === openList.length && !discoveryOn() ? 'Tous les thèmes'
      : `${nThemes ? `${nThemes} thème${nThemes > 1 ? 's' : ''}` : 'Aucun thème'}${withDisco ? ' et la sélection découverte' : ''}`;
  const timers = TIMER_CHOICES.map((t) => `<button class="chip${s.timer === t ? ' on' : ''}" data-act="set-timer" data-id="${t}" aria-pressed="${s.timer === t}">${t ? `${t / 60} min` : 'Sans'}</button>`).join('');
  return `${topBar('La partie', { back: true })}
<div class="scroll">
  <button class="teamstrip" data-act="back" aria-label="Modifier les joueurs"><span class="avs">${team.slice(0, 7).map((p) => avatar(p, 's36')).join('')}${team.length > 7 ? `<i class="more">+${team.length - 7}</i>` : ''}</span><span class="grow">${plural(n, 'joueur')}</span>${icon('edit', 18)}</button>
  <div class="panel"><h3>Mode de jeu</h3><div class="opts">${modes}</div></div>
  <div class="panel"><h3>Rôles</h3>${roles}</div>
  <div class="panel">
    <h3>Mots</h3>
    ${openList.length ? `<div class="chips">${levels}</div>` : ''}
    <button class="rowbtn" data-act="open-cats"><span class="grow"><b>Thèmes</b><span>${themesLabel}</span></span>${icon('next', 20)}</button>
    ${shopActive() && discoveryOn() && !openList.length ? `<button class="rowbtn teaser" data-act="shop-open"><span class="opt-ic gold">${icon('crown', 20)}</span><span class="grow"><b>Choisir ses thèmes et sa difficulté</b><span>${CATEGORIES.length} thèmes, ${num(TOTAL_PAIRS)} paires, niveaux Moyen et Corsé.</span></span>${icon('next', 20)}</button>` : ''}
    <p class="hint">${info.total ? `${plural(info.total, 'paire')} dans cette sélection, dont ${num(info.fresh)} jamais jouée${info.fresh > 1 ? 's' : ''}.` : 'Aucune paire dans cette sélection : ajoute un niveau ou un thème.'}</p>
  </div>
  <div class="panel">
    <h3>Vote</h3>
    <div class="seg"><button class="${s.vote === 'open' ? 'on' : ''}" data-act="set-vote" data-id="open" aria-pressed="${s.vote === 'open'}">${icon('hand', 18)}À main levée</button><button class="${s.vote === 'secret' ? 'on' : ''}" data-act="set-vote" data-id="secret" aria-pressed="${s.vote === 'secret'}">${icon('lock', 18)}Secret</button></div>
    <p class="hint">${s.vote === 'open' ? 'Tout le monde pointe du doigt en même temps, puis on touche le joueur désigné.' : 'Chacun vote à son tour sur le téléphone. L’appli compte les voix et gère les égalités.'}</p>
  </div>
  <div class="panel">
    <h3>Chrono du débat</h3>
    <div class="chips">${timers}</div>
    <p class="hint">${s.timer ? 'Le chrono s’affiche pendant le tour de parole : la table le lance quand le débat commence.' : 'Sans chrono : on vote quand tout le monde a parlé.'}</p>
    <button class="rowbtn switchrow" data-act="toggle-notes" role="switch" aria-checked="${s.notes}"><span class="grow"><b>Noter les indices</b><span>Touche un joueur pour noter son mot : l’appli refuse les répétitions et garde la liste sous les yeux.</span></span><i class="switch${s.notes ? ' on' : ''}"></i></button>
  </div>
</div>
<div class="dock"><button class="btn sun lg block" data-act="start-game"${info.total ? '' : ' disabled'}>Distribuer les cartes</button></div>`;
}

export function catsSheet() {
  const s = S.setup;
  const used = new Set(DB.meta.used);
  const lv = new Set(s.levels);
  const now = Date.now();
  const row = (id, name, hint, count, fresh, tag = '') => `<button class="rowbtn check${s.cats.includes(id) ? ' on' : ''}" data-act="toggle-cat" data-id="${id}" aria-pressed="${s.cats.includes(id)}"><i class="box">${icon('check', 16)}</i><span class="grow"><b>${name}${tag}</b><span>${hint}</span></span><em>${count ? `${num(fresh)}/${num(count)}` : '0'}</em></button>`;
  const locked = (c) => `<button class="rowbtn check locked" data-act="unlock-open" data-id="${c.id}" aria-label="${esc(c.name)}, thème verrouillé"><i class="box">${icon('lock', 14)}</i><span class="grow"><b>${c.name}</b><span>${c.hint}</span></span><em>${num(c.pairs.length)}</em></button>`;
  const open = [], shut = [];
  for (const c of CATEGORIES) {
    if (catOpen(c)) {
      const ps = c.pairs.filter((p) => lv.has(p.lvl));
      const end = shopActive() ? trialEnd(DB.meta.eco, c.id, now) : 0;
      const tag = end ? `<i class="trial">essai, encore ${Math.max(1, Math.round((end - now) / 3600000))} h</i>` : '';
      open.push(row(c.id, c.name, c.hint, ps.length, ps.filter((p) => !used.has(p.key)).length, tag));
    } else if (shopActive()) shut.push(locked(c));
  }
  const disco = discoveryOn() ? row(DISCOVERY_CAT.id, DISCOVERY_CAT.name, DISCOVERY_CAT.hint, DISCOVERY_PAIRS.length, DISCOVERY_PAIRS.filter((p) => !used.has(p.key)).length, '<i class="trial free">offerte</i>') : '';
  const custom = DB.meta.custom.length ? row(CUSTOM_CAT.id, CUSTOM_CAT.name, CUSTOM_CAT.hint, DB.meta.custom.length, DB.meta.custom.length) : '';
  return `<div class="sheet tall" role="dialog" aria-label="Thèmes">
  <div class="sheet-head"><h2>Thèmes</h2>${open.length ? '<button class="btn well sm" data-act="cats-all">Tout</button><button class="btn well sm" data-act="cats-none">Aucun</button>' : ''}</div>
  <p class="hint">${shut.length ? 'Touche un thème verrouillé pour l’essayer avec une pub, ou le débloquer.' : 'À droite : paires jamais jouées sur le total, pour les niveaux choisis.'}</p>
  <div class="sheet-body">${disco}${custom}${open.join('')}${shut.length ? `<h3 class="locksect">${icon('lock', 16)}À débloquer</h3>${shut.join('')}` : ''}</div>
  <button class="btn ink block" data-act="close-modal">Valider</button>
</div>`;
}

/* ---------- Classement ---------- */

function podium(rows, valueOf) {
  const top = rows.slice(0, 3);
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
  return `<div class="podium n${top.length}">${order.map((r) => `<button class="pod p${rows.indexOf(r) + 1}" data-act="go" data-to="player" data-id="${r.profile.id}">${avatar(r.profile, rows.indexOf(r) === 0 ? 's96' : 's72')}<span class="nm">${esc(r.profile.name)}</span><span class="step"><b>${valueOf(r)}</b><i>${r.rank === 1 ? '1er' : r.rank + 'e'}</i></span></button>`).join('')}</div>`;
}

export function ranking() {
  const night = S.rank.tab === 'night';
  const data = night ? nightStats() : stats();
  const sort = S.rank.sort;
  const profiles = DB.profiles.filter((p) => data[p.id] && data[p.id].games);
  const rows = leaderboard(profiles, data, sort);
  const valueOf = (r) => (sort === 'wins' ? plural(r.s.wins, 'victoire') : sort === 'avg' ? `${average(r.s).toFixed(1).replace('.', ',')} pt/partie` : plural(r.s.points, 'point'));
  const sorts = [['points', 'Points'], ['wins', 'Victoires'], ['avg', 'Moyenne']].map(([id, name]) => `<button class="chip bg${sort === id ? ' on' : ''}" data-act="rank-sort" data-id="${id}" aria-pressed="${sort === id}">${name}</button>`).join('');
  const list = rows.slice(3).map((r) => `<button class="row" data-act="go" data-to="player" data-id="${r.profile.id}"><i class="rk">${r.rank}</i>${avatar(r.profile, 's44')}<span class="grow"><span class="name">${esc(r.profile.name)}</span><span class="meta">${plural(r.s.games, 'partie')}, ${pct(winRate(r.s))} de victoires</span></span><b class="val">${sort === 'wins' ? r.s.wins : sort === 'avg' ? average(r.s).toFixed(1).replace('.', ',') : r.s.points}</b></button>`).join('');
  const aw = night ? [] : awards(DB.profiles, data);
  const body = rows.length
    ? `${podium(rows, valueOf)}${list ? `<div class="panel list">${list}</div>` : ''}
       ${aw.length ? `<h2 class="sect">Distinctions</h2><div class="panel list">${aw.map((a) => `<div class="row">${avatar(a.p, 's44')}<span class="grow"><span class="name">${a.title}</span><span class="meta">${esc(a.p.name)} : ${a.text}</span></span></div>`).join('')}</div>` : ''}`
    : `<div class="empty">${icon('trophy', 56)}<h2>${night ? 'Pas de partie ce soir' : 'Le podium est libre'}</h2><p>${night ? 'Ce classement compte les parties des 12 dernières heures.' : 'Les points s’ajoutent ici à la fin de chaque partie.'}</p></div>`;
  return `${topBar('Classement')}
<div class="scroll">
  <div class="seg onbg"><button class="${night ? '' : 'on'}" data-act="rank-tab" data-id="all" aria-pressed="${!night}">Général</button><button class="${night ? 'on' : ''}" data-act="rank-tab" data-id="night" aria-pressed="${night}">Cette soirée</button></div>
  <div class="chips center">${sorts}</div>
  ${body}
</div>`;
}

/* ---------- Fiche d'un joueur ---------- */

function roleBar(label, role, r) {
  const rate = r.g ? r.w / r.g : 0;
  return `<div class="rolebar">${roleMark(role, 36)}<span class="grow"><span class="rb-top"><b>${label}</b><span>${r.g ? `${r.w} victoire${r.w > 1 ? 's' : ''} sur ${r.g}` : 'Jamais joué'}</span></span><span class="bar ${role}"><i style="width:${Math.round(rate * 100)}%"></i></span></span></div>`;
}

export function player(params) {
  const p = profileById(params.id);
  if (!p) return `${topBar('Joueur', { back: true })}<div class="scroll"><div class="empty"><h2>Ce joueur n’existe plus</h2></div></div>`;
  const s = stats()[p.id] || emptyStats();
  const games = DB.history.filter((h) => h.players.some((x) => x.id === p.id)).sort((a, b) => b.at - a.at).slice(0, 8);
  const form = s.form.map((w) => `<i class="${w ? 'w' : 'l'}">${w ? 'V' : 'D'}</i>`).join('');
  const more = [
    ['Meilleure série', plural(s.bestStreak, 'victoire')],
    ['Encore en vie à la fin', s.games ? pct(s.survived / s.games) : '–'],
    ['Hors jeu dès le premier vote', plural(s.firstOut, 'fois', 'fois')],
    ['Mot deviné en Mr. White', s.guessTries ? `${s.guessOk} sur ${s.guessTries}` : '–'],
    ['Votes sur un infiltré', s.votes ? `${pct(s.goodVotes / s.votes)} (vote secret)` : '–'],
  ].map(([k, v]) => `<div class="row"><span class="grow">${k}</span><b>${v}</b></div>`).join('');
  return `${topBar(esc(p.name), { back: true })}
<div class="scroll">
  <div class="preview">${avatar(p, 's120')}
    <div class="pvbtns"><button class="btn soft sm" data-act="profile-edit" data-id="${p.id}">${icon('edit', 18)}Modifier</button><button class="btn soft sm" data-act="profile-delete" data-id="${p.id}">${icon('trash', 18)}Supprimer</button></div>
  </div>
  ${s.games ? `<div class="kpis">
    <div class="kpi"><b>${num(s.points)}</b><span>point${s.points > 1 ? 's' : ''}</span></div>
    <div class="kpi"><b>${num(s.games)}</b><span>partie${s.games > 1 ? 's' : ''}</span></div>
    <div class="kpi"><b>${pct(winRate(s))}</b><span>de victoires</span></div>
    <div class="kpi"><b>${average(s).toFixed(1).replace('.', ',')}</b><span>points par partie</span></div>
  </div>
  ${form ? `<div class="formrow"><span>Dernières parties</span><span class="streak">${form}</span></div>` : ''}
  <div class="panel"><h3>Par rôle</h3>${roleBar('Civil', 'civil', s.roles.civil)}${roleBar('Undercover', 'under', s.roles.under)}${roleBar('Mr. White', 'white', s.roles.white)}</div>
  <div class="panel list">${more}</div>
  <h2 class="sect">Parties récentes</h2>
  <div class="panel list">${games.map((h) => historyRow(h, p.id)).join('')}</div>`
    : `<div class="empty small"><h2>Aucune partie jouée</h2><p>Ses statistiques apparaîtront après sa première partie.</p></div>`}
</div>`;
}

/* ---------- Historique ---------- */

function historyRow(h, focusId) {
  const me = focusId ? h.players.find((x) => x.id === focusId) : null;
  const lead = me
    ? `<span class="res ${me.won ? 'w' : 'l'}">${me.won ? `+${me.pts}` : '0'}</span>`
    : `<span class="res win-${h.winner}">${icon(h.winner === 'civils' ? 'users' : h.winner === 'white' ? 'quest' : 'mask', 20)}</span>`;
  const sub = me ? `${E.ROLE_NAME[me.role]}, ${dayLabel(h.at).toLowerCase()}` : `${WIN_SHORT[h.winner]} en ${plural(h.rounds, 'tour')}, ${timeLabel(h.at)}`;
  return `<button class="row" data-act="go" data-to="detail" data-id="${h.id}">${lead}<span class="grow"><span class="name">${esc(h.civil)}${h.u ? ` / ${esc(h.under)}` : ''}</span><span class="meta">${sub}</span></span><span class="avs tiny">${h.players.slice(0, 4).map((x) => avatar(lookOf(x), 's28')).join('')}${h.players.length > 4 ? `<i class="more">+${h.players.length - 4}</i>` : ''}</span></button>`;
}

export function history() {
  const list = DB.history.slice().sort((a, b) => b.at - a.at);
  if (!list.length) {
    return `${topBar('Historique')}<div class="scroll"><div class="empty">${icon('clock', 56)}<h2>Aucune partie terminée</h2><p>Chaque partie finie est rangée ici, avec les mots, les rôles et le déroulé.</p></div></div>`;
  }
  const groups = [];
  for (const h of list.slice(0, 200)) {
    const label = dayLabel(h.at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(h); else groups.push({ label, items: [h] });
  }
  return `${topBar('Historique')}<div class="scroll">${groups.map((g) => `<h2 class="sect">${g.label}</h2><div class="panel list">${g.items.map((h) => historyRow(h)).join('')}</div>`).join('')}${list.length > 200 ? `<p class="foot">Les 200 parties les plus récentes sont affichées. Les ${num(list.length)} comptent toutes dans les statistiques.</p>` : ''}</div>`;
}

/** Détail commun à l'écran de fin et à l'historique : points, puis déroulé tour par tour. */
export function recapPoints(h) {
  return h.players.map((p) => `<div class="row">${avatar(lookOf(p), 's44')}<span class="grow"><span class="name">${esc(p.name)}</span><span class="meta">${p.alive ? 'En vie à la fin' : p.outBy === 'left' ? `Départ au tour ${p.outRound}` : `Hors jeu au tour ${p.outRound}`}</span></span>${roleBadge(p.role)}<b class="pts${p.pts ? ' plus' : ''}">${p.pts ? '+' + p.pts : '0'}</b></div>`).join('');
}

export function recapRounds(h) {
  const name = (i) => esc(h.players[i] ? h.players[i].name : '?');
  return (h.log || []).map((l) => {
    const clues = (h.clues || []).filter((c) => c.round === l.round);
    const lines = [];
    if (clues.length) lines.push(`<div class="clues">${clues.map((c) => `<span><b>${name(c.by)}</b> ${esc(c.text)}</span>`).join('')}</div>`);
    for (const v of l.votes || []) {
      if (v.ballots) {
        const counts = {};
        Object.values(v.ballots).forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
        const tally = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map((t) => `${name(+t)} ${counts[t]}`).join(', ');
        const who = Object.keys(v.ballots).map((voter) => `${name(+voter)} → ${name(v.ballots[voter])}`).join(', ');
        lines.push(`<p><b>${v.stage === 2 ? 'Revote' : 'Vote'} :</b> ${tally}.</p><p class="fine">${who}</p>`);
      } else if (v.tie) {
        lines.push(`<p><b>Égalité</b> entre ${listNames(v.tie.map(name))}${v.stage === 2 ? ', départagée par tirage au sort' : ''}.</p>`);
      }
    }
    for (const i of l.left || []) lines.push(`<p><b>${name(i)}</b> quitte la partie (${E.ROLE_NAME[h.players[i].role]}).</p>`);
    if (l.out >= 0) {
      lines.push(`<p><b>${name(l.out)}</b> sort du jeu : ${E.ROLE_NAME[l.role]}.</p>`);
      if (l.guess) lines.push(`<p>${l.guess.text ? `Sa proposition, « ${esc(l.guess.text)} » : ${l.guess.ok ? 'bonne réponse' : 'raté'}${l.guess.forced ? ' (décision de la table)' : ''}.` : 'Aucune proposition de mot.'}</p>`);
    }
    return `<div class="round"><h4>Tour ${l.round}</h4><p class="fine">Ordre : ${l.order.map(name).join(', ')}</p>${lines.join('')}</div>`;
  }).join('');
}

export function wordPair(h) {
  return `<div class="wordpair${h.u ? '' : ' one'}"><div class="wcard civil"><small>Mot des Civils</small><b>${esc(h.civil)}</b></div>${h.u ? `<div class="wcard under"><small>Mot de l’Undercover</small><b>${esc(h.under)}</b></div>` : ''}</div>`;
}

export function detail(params) {
  const h = DB.history.find((x) => x.id === params.id);
  if (!h) return `${topBar('Partie', { back: true })}<div class="scroll"><div class="empty"><h2>Cette partie a été supprimée</h2></div></div>`;
  const by = h.winner === 'white' && h.players[h.by] ? `${esc(h.players[h.by].name)} a deviné le mot des Civils.` : h.winner === 'civils' ? 'Tous les infiltrés ont été démasqués.' : 'Les infiltrés ont tenu jusqu’au bout.';
  return `${topBar(dayLabel(h.at), { back: true, right: `<button class="ibtn" data-act="history-delete" data-id="${h.id}" aria-label="Supprimer cette partie">${icon('trash')}</button>` })}
<div class="scroll">
  <div class="win ${h.winner} small">${roleMark(h.winner === 'civils' ? 'civil' : h.winner === 'white' ? 'white' : 'under', 56)}<h2>${WIN_LABEL[h.winner]}</h2><p>${by}</p></div>
  ${wordPair(h)}
  <p class="lead meta-line">${E.MODES[h.mode] ? E.MODES[h.mode].name : ''}, ${categoryName(h.cat)}, ${timeLabel(h.at)}, ${durationLabel(h.dur)}</p>
  <div class="panel list"><h3>Points</h3>${recapPoints(h)}</div>
  <div class="panel"><h3>Déroulé</h3>${recapRounds(h)}</div>
</div>`;
}

/* ---------- Règles ---------- */

export function rules() {
  const roles = [
    ['civil', 'Civil', 'Reçoit le mot commun. Doit démasquer les infiltrés sans trop en dire.'],
    ['under', 'Undercover', 'Reçoit un mot voisin, et ne sait pas qu’il est l’Undercover. À lui de le comprendre.'],
    ['white', 'Mr. White', 'Ne reçoit aucun mot, et il le sait. Il écoute, bluffe et tente de deviner.'],
  ].map(([r, n, t]) => `<div class="rule-role ${r}">${roleMark(r, 52)}<span class="grow"><b>${n}</b><span>${t}</span></span></div>`).join('');
  const steps = [
    ['La distribution', 'Chacun son tour prend le téléphone, choisit une carte et lit son mot en cachette.'],
    ['Les indices', 'L’appli affiche l’ordre de parole du tour. Chacun dit un seul mot en rapport avec le sien. Mr. White ne parle jamais en premier, et un indice déjà donné ne se répète pas.'],
    ['Le débat', 'On discute librement : qui a un mot bizarre ? Qui est resté trop vague ?'],
    ['Le vote', 'À main levée ou en secret sur le téléphone. Le joueur le plus désigné est éliminé et son rôle est révélé.'],
    ['Et on recommence', 'Nouveau tour d’indices avec les survivants, jusqu’à la victoire d’un camp.'],
  ].map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join('');
  return `${topBar('Règles du jeu', { back: true })}
<div class="scroll rules">
  <p class="lead xl">Tout le monde reçoit le même mot. Sauf un ou deux infiltrés, qui vont devoir faire comme si.</p>
  <h2 class="sect">Les trois rôles</h2>
  <div class="panel roles">${roles}</div>
  <h2 class="sect">Une partie</h2>
  <div class="panel"><ol class="steps">${steps}</ol></div>
  <h2 class="sect">Qui gagne ?</h2>
  <div class="panel prose">
    <p><b>Les Civils</b>, quand tous les Undercover et tous les Mr. White sont éliminés.</p>
    <p><b>Les infiltrés</b>, s’il ne reste plus qu’un seul Civil en jeu.</p>
    <p><b>Mr. White, seul</b>, s’il devine le mot des Civils au moment où il est éliminé. L’appli tolère les fautes de frappe, et la table peut toujours contester son verdict.</p>
  </div>
  <h2 class="sect">Les points</h2>
  <div class="panel points">
    <div><b>+${E.POINTS.civil}</b><span>par Civil vainqueur</span></div>
    <div><b>+${E.POINTS.white}</b><span>pour Mr. White vainqueur</span></div>
    <div><b>+${E.POINTS.under}</b><span>par Undercover vainqueur</span></div>
    <p class="hint">Tout le camp gagnant marque, même les joueurs éliminés. Les rôles rares et difficiles rapportent plus.</p>
  </div>
  <h2 class="sect">Égalités et imprévus</h2>
  <div class="panel prose">
    <p><b>Égalité au vote :</b> les ex æquo redonnent un indice et on revote entre eux. Encore égalité : tirage au sort.</p>
    <p><b>Un joueur doit partir :</b> menu de la partie, « Un joueur quitte la table ». Son rôle est révélé et la partie continue.</p>
    <p><b>Quelqu’un a vu la carte d’un autre :</b> pendant la distribution, le menu propose de redistribuer avec un nouveau mot.</p>
    <p><b>Appli fermée par erreur :</b> la partie est sauvegardée à chaque étape, tu la reprends depuis l’accueil.</p>
  </div>
  <h2 class="sect">Les modes</h2>
  <div class="panel prose">${Object.values(E.MODES).map((m) => `<p><b>${m.name}.</b> ${m.hint}</p>`).join('')}</div>
  <h2 class="sect">Trois conseils</h2>
  <div class="panel prose">
    <p><b>Civil :</b> un indice trop évident offre le mot à Mr. White, un indice trop flou te rend suspect.</p>
    <p><b>Tu ne te reconnais pas dans les indices des autres ?</b> Tu es sans doute l’Undercover. Rapproche-toi de leur mot sans te trahir.</p>
    <p><b>Mr. White :</b> rebondis sur ce qui vient d’être dit, et garde en tête le mot que tu proposeras si tu tombes.</p>
  </div>
</div>`;
}

/* ---------- Réglages ---------- */

const switchRow = (act, title, hint, on, ic) => `<button class="rowbtn switchrow" data-act="${act}" role="switch" aria-checked="${on}"><span class="opt-ic">${icon(ic, 20)}</span><span class="grow"><b>${title}</b><span>${hint}</span></span><i class="switch${on ? ' on' : ''}"></i></button>`;

export function settings() {
  const s = DB.meta.settings;
  const themes = [['auto', 'Auto'], ['light', 'Jour'], ['dark', 'Nuit']].map(([id, name]) => `<button class="${s.theme === id ? 'on' : ''}" data-act="set-theme" data-id="${id}" aria-pressed="${s.theme === id}">${name}</button>`).join('');
  const usedN = DB.meta.used.length;
  return `${topBar('Réglages')}
<div class="scroll">
  ${shopActive() ? `<div class="panel list"><button class="rowbtn" data-act="go" data-to="shop"><span class="opt-ic gold">${icon('crown', 20)}</span><span class="grow"><b>Boutique</b><span>${isPremium(DB.meta.eco) ? 'Jeu illimité débloqué.' : `${plural(DB.meta.eco.credits, 'partie')} en réserve. Illimité, packs de thèmes.`}</span></span>${icon('next', 18)}</button></div>` : ''}
  <div class="panel"><h3>Apparence</h3><div class="seg">${themes}</div><p class="hint">Auto suit le thème clair ou sombre du téléphone.</p></div>
  <div class="panel list">
    ${switchRow('toggle-sound', 'Sons', 'Petits effets à la révélation et à la victoire.', s.sound, 'sound')}
    ${switchRow('toggle-haptics', 'Vibrations', 'Un retour discret sur les actions importantes.', s.haptics, 'vibrate')}
    ${switchRow('toggle-motion', 'Animations', 'À couper pour une interface plus calme.', s.motion, 'sparkle')}
  </div>
  <h2 class="sect">Mots</h2>
  <div class="panel list">
    <button class="rowbtn" data-act="go" data-to="custom"><span class="opt-ic">${icon('words', 20)}</span><span class="grow"><b>Nos mots</b><span>${DB.meta.custom.length ? plural(DB.meta.custom.length, 'paire') + ' ajoutée' + (DB.meta.custom.length > 1 ? 's' : '') + ' par ton groupe' : 'Ajoute vos propres paires : prénoms, lieux, blagues du groupe.'}</span></span>${icon('next', 20)}</button>
    <button class="rowbtn" data-act="ask-reset-used"${usedN ? '' : ' disabled'}><span class="opt-ic">${icon('replay', 20)}</span><span class="grow"><b>Rejouer les mots déjà sortis</b><span>${usedN ? `${plural(usedN, 'paire')} déjà jouée${usedN > 1 ? 's' : ''} sur ${num(CATEGORIES.filter(catOpen).reduce((n, c) => n + c.pairs.length, 0) + DB.meta.custom.length)}.` : 'Aucune paire jouée pour l’instant.'}</span></span></button>
  </div>
  <h2 class="sect">Données</h2>
  <div class="panel list">
    <button class="rowbtn" data-act="export-data"><span class="opt-ic">${icon('download', 20)}</span><span class="grow"><b>Exporter une sauvegarde</b><span>Joueurs, scores, historique et mots perso dans un fichier.</span></span></button>
    <label class="rowbtn" for="import-file"><span class="opt-ic">${icon('upload', 20)}</span><span class="grow"><b>Importer une sauvegarde</b><span>Remplace les données de ce téléphone par celles du fichier.</span></span></label>
    <input class="hid" type="file" id="import-file" accept="application/json,.json,text/plain" data-file="import">
    <button class="rowbtn danger" data-act="ask-reset-scores"${DB.history.length ? '' : ' disabled'}><span class="opt-ic">${icon('trash', 20)}</span><span class="grow"><b>Effacer les scores et l’historique</b><span>Les profils des joueurs sont conservés.</span></span></button>
    <button class="rowbtn danger" data-act="ask-reset-all"><span class="opt-ic">${icon('trash', 20)}</span><span class="grow"><b>Tout effacer</b><span>Joueurs, scores, historique, mots perso et réglages.</span></span></button>
  </div>
  <p class="foot">Double Jeu ${APP_VERSION}. Le jeu fonctionne hors ligne${isNative ? ' : joueurs, scores et photos restent sur ce téléphone' : ' ; dans un navigateur, les données restent dans celui-ci'}.${shopActive() ? ' Les publicités et les achats passent par Google.' : ''}</p>
</div>`;
}

export function custom() {
  const list = DB.meta.custom;
  return `${topBar('Nos mots', { back: true })}
<div class="scroll">
  <p class="lead">Deux mots proches, que tout le groupe connaît. Ils sortent quand le thème « Nos mots » est coché.</p>
  <form class="panel pairform" data-form="pair" novalidate>
    <input class="field" id="pair-a" data-in="pair-a" value="${esc(S.pairDraft.a)}" maxlength="40" placeholder="Premier mot" autocomplete="off" enterkeyhint="next" aria-label="Premier mot">
    <input class="field" id="pair-b" data-in="pair-b" value="${esc(S.pairDraft.b)}" maxlength="40" placeholder="Second mot" autocomplete="off" enterkeyhint="done" aria-label="Second mot">
    ${S.pairDraft.error ? `<p class="err" role="alert">${esc(S.pairDraft.error)}</p>` : ''}
    <button class="btn ink block" type="submit">Ajouter la paire</button>
  </form>
  ${list.length ? `<div class="panel list">${list.map((p, i) => `<div class="row"><span class="grow pairtxt"><b>${esc(p[0])}</b><i>ou</i><b>${esc(p[1])}</b></span><button class="ibtn onpaper" data-act="pair-delete" data-i="${i}" aria-label="Supprimer la paire ${esc(p[0])} / ${esc(p[1])}">${icon('trash', 20)}</button></div>`).join('')}</div>` : `<div class="empty small"><h2>Aucune paire perso</h2><p>Exemples : « Le prof de maths / Le prof de physique », « Le kebab du coin / Le resto U ».</p></div>`}
</div>`;
}

export { WIN_LABEL, esc };

/* ---------- Boutique ---------- */

export const shop = () => shopScreen(topBar);
