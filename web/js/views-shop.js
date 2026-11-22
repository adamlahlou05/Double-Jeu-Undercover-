// Écrans de la boutique : réserve de parties, pub avec récompense, jeu illimité, packs de thèmes.

import { escapeHtml as esc } from './text.js';
import { icon } from './icons.js';
import { CATEGORIES, TOTAL_PAIRS, DISCOVERY_PAIRS } from './words/index.js';
import { num, plural } from './dom.js';
import { DB, S } from './state.js';
import { SHOP, PACKS, shopActive, isPremium, ownsPack } from './shop.js';

const price = (id) => S.shop.prices[id] || '';
const st = (i) => `style="--i:${i}"`;

/** Pastille de l'accueil : ce qu'il reste en réserve, ou « Illimité ». */
export function reserveChip() {
  if (!shopActive()) return '';
  const eco = DB.meta.eco;
  if (isPremium(eco)) return `<div class="hometop"><span class="reserve gold">${icon('crown', 18)}Illimité</span></div>`;
  return `<div class="hometop"><button class="reserve${eco.credits ? '' : ' empty'}" data-act="reserve-open" aria-label="${plural(eco.credits, 'partie')} en réserve. Ouvrir la réserve">${icon('cards', 18)}<b>${eco.credits}</b>${eco.credits > 1 ? 'parties' : 'partie'}<i>${icon('plus', 16)}</i></button></div>`;
}

/** Feuille « réserve » : ouverte depuis l'accueil, ou quand une partie ne peut pas démarrer faute de réserve. */
export function reserveSheet(m) {
  const eco = DB.meta.eco;
  const blocked = !!m.pending;
  const full = eco.credits >= SHOP.MAX;
  const p = price(SHOP.PREMIUM);
  const ad = m.busy
    ? `<button class="btn sun block" disabled><span class="dots wait" aria-hidden="true"><i></i><i></i><i></i></span>La pub arrive…</button>`
    : `<button class="btn sun block" data-act="ad-watch"${full ? ' disabled' : ''}>${icon('play', 18)}${full ? 'Réserve pleine' : `Regarder une pub : +${SHOP.REWARD} parties`}</button>`;
  return `<div class="sheet shopsheet" role="dialog" aria-label="Réserve de parties">
  <div class="stock${eco.credits ? '' : ' empty'}"><b>${eco.credits}</b><span>${eco.credits > 1 ? 'parties' : 'partie'} en réserve</span></div>
  <h2>${blocked ? 'Plus de partie en réserve' : 'Ta réserve de parties'}</h2>
  <p class="lead">Chaque partie en utilise une. Une pub regardée jusqu’au bout en redonne ${SHOP.REWARD}.</p>
  ${m.msg ? `<p class="err" role="alert">${esc(m.msg)}</p>` : ''}
  ${ad}
  <button class="btn ink block" data-act="${p ? 'buy' : 'shop-open'}" data-id="${SHOP.PREMIUM}"${m.busy ? ' disabled' : ''}>${icon('crown', 18)}Illimité, sans pub${p ? ` : ${esc(p)}` : ''}</button>
  <button class="link" data-act="close-modal">${blocked ? 'Pas maintenant' : 'Fermer'}</button>
</div>`;
}

/** Écran Boutique. */
export function shop(topBar) {
  const eco = DB.meta.eco;
  if (!shopActive()) {
    return `${topBar('Boutique', { back: true })}<div class="scroll"><div class="empty">${icon('lock', 40)}<h2>Disponible dans l’application</h2><p>Les achats se font dans l’application Android, avec Google Play.</p></div></div>`;
  }
  const premium = isPremium(eco);
  const pp = price(SHOP.PREMIUM);
  const packs = PACKS.map((k, i) => {
    const pairs = CATEGORIES.filter((c) => k.cats.includes(c.id)).reduce((n, c) => n + c.pairs.length, 0);
    const own = ownsPack(eco, k.id);
    const pr = price(k.id);
    const right = own ? `<span class="owned">${icon('check', 16)}Débloqué</span>`
      : pr ? `<button class="btn ink sm" data-act="buy" data-id="${k.id}">${esc(pr)}</button>`
        : '<span class="owned off">Indisponible</span>';
    return `<div class="row pack" ${st(i + 1)}><span class="opt-ic">${icon(own ? 'words' : 'lock', 20)}</span><span class="grow"><b>${esc(k.name)}</b><span>${esc(k.pitch)} ${k.cats.length > 1 ? `${k.cats.length} thèmes, ` : ''}${num(pairs)} paires.</span></span>${right}</div>`;
  }).join('');
  return `${topBar('Boutique', { back: true })}
<div class="scroll">
  <div class="premium${premium ? ' on' : ''}" ${st(0)}>
    <div class="crown">${icon('crown', 30)}</div>
    <h2>Double Jeu illimité</h2>
    <ul>
      <li>${icon('check', 18)}Parties illimitées, sans aucune pub</li>
      <li>${icon('check', 18)}Les ${CATEGORIES.length} thèmes et leurs ${num(TOTAL_PAIRS)} paires, niveaux Moyen et Corsé compris</li>
      <li>${icon('check', 18)}Tous les packs à venir</li>
      <li>${icon('check', 18)}Un seul paiement, pour toujours</li>
    </ul>
    ${premium ? `<p class="owned big">${icon('check', 18)}Débloqué. Merci !</p>`
      : pp ? `<button class="btn sun lg block" data-act="buy" data-id="${SHOP.PREMIUM}">Débloquer : ${esc(pp)}</button>`
        : '<p class="hint onbg">Prix indisponible pour l’instant : vérifie ta connexion, puis reviens ici.</p>'}
  </div>
  <h2 class="sect">Packs de thèmes</h2>
  <div class="panel list">${packs}</div>
  ${premium ? '' : `<h2 class="sect">Jouer sans payer</h2>
  <div class="panel"><ul class="freelist">
      <li>${icon('check', 18)}<span><b>${num(DISCOVERY_PAIRS.length)} paires offertes</b> : la sélection découverte, des mots simples dans tous les domaines.</span></li>
      <li>${icon('check', 18)}<span><b>${plural(eco.credits, 'partie')} en réserve.</b> Une pub regardée jusqu’au bout en redonne ${SHOP.REWARD} (${SHOP.MAX} au plus).</span></li>
      <li>${icon('check', 18)}<span><b>Un thème à l’essai pendant ${SHOP.TRIAL_HOURS} h</b> contre une pub : touche un thème verrouillé dans la liste des thèmes, avant une partie.</span></li>
    </ul>
    <button class="btn well block" data-act="reserve-open">${icon('play', 18)}Regarder une pub : +${SHOP.REWARD} parties</button></div>`}
  <div class="panel list">
    <button class="rowbtn" data-act="shop-restore"><span class="opt-ic">${icon('replay', 20)}</span><span class="grow"><b>Restaurer mes achats</b><span>Après un changement de téléphone ou une réinstallation.</span></span></button>
    ${S.shop.privacy ? `<button class="rowbtn" data-act="shop-privacy"><span class="opt-ic">${icon('sliders', 20)}</span><span class="grow"><b>Confidentialité des publicités</b><span>Revoir ou modifier ton choix de consentement.</span></span></button>` : ''}
  </div>
  <p class="foot">Paiements gérés par Google Play.${S.shop.test ? ' Publicités en mode test.' : ''}</p>
</div>`;
}

/** Feuille d'un thème verrouillé : l'essayer avec une pub, acheter son pack, ou tout débloquer. */
export function unlockSheet(m) {
  const cat = CATEGORIES.find((c) => c.id === m.cat);
  if (!cat) return '';
  const pack = PACKS.find((k) => k.id === cat.pack);
  const pk = pack ? price(pack.id) : '';
  const pp = price(SHOP.PREMIUM);
  // Aucune publicité avant la fin de la première partie : l'essai par pub n'est proposé qu'ensuite.
  const early = DB.meta.eco.played < 1;
  const ad = early
    ? `<p class="hint early">L’essai gratuit avec une pub s’ouvre après ta première partie.</p>`
    : m.busy
      ? '<button class="btn sun block" disabled><span class="dots wait" aria-hidden="true"><i></i><i></i><i></i></span>La pub arrive…</button>'
      : `<button class="btn sun block" data-act="ad-watch">${icon('play', 18)}L’essayer ${SHOP.TRIAL_HOURS} h : regarder une pub</button>`;
  return `<div class="sheet shopsheet" role="dialog" aria-label="Thème verrouillé">
  <div class="stock lockbig">${icon('lock', 30)}<span>${num(cat.pairs.length)} paires</span></div>
  <h2>${esc(cat.name)}</h2>
  <p class="lead">${esc(cat.hint)}.</p>
  ${m.msg ? `<p class="err" role="alert">${esc(m.msg)}</p>` : ''}
  ${ad}
  ${pack ? `<button class="btn well block" data-act="${pk ? 'buy' : 'shop-open'}" data-id="${pack.id}"${m.busy ? ' disabled' : ''}>${esc(pack.name)}${pack.cats.length > 1 ? ` (${pack.cats.length} thèmes)` : ''}${pk ? ` : ${esc(pk)}` : ''}</button>` : ''}
  <button class="btn ink block" data-act="${pp ? 'buy' : 'shop-open'}" data-id="${SHOP.PREMIUM}"${m.busy ? ' disabled' : ''}>${icon('crown', 18)}Tout débloquer, sans pub${pp ? ` : ${esc(pp)}` : ''}</button>
  <button class="link" data-act="open-cats">Retour aux thèmes</button>
</div>`;
}
