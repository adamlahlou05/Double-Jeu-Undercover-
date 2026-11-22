// Écrans de la boutique : réserve de parties, pub avec récompense, jeu illimité, packs de thèmes.

import { escapeHtml as esc } from './text.js';
import { icon } from './icons.js';
import { CATEGORIES } from './words/index.js';
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
    const cat = CATEGORIES.find((c) => c.id === k.cat);
    const own = ownsPack(eco, k.id);
    const pr = price(k.id);
    const right = own ? `<span class="owned">${icon('check', 16)}Débloqué</span>`
      : pr ? `<button class="btn ink sm" data-act="buy" data-id="${k.id}">${esc(pr)}</button>`
        : '<span class="owned off">Indisponible</span>';
    return `<div class="row pack" ${st(i + 1)}><span class="opt-ic">${icon(own ? 'words' : 'lock', 20)}</span><span class="grow"><b>${esc(k.name)}</b><span>${esc(k.pitch)} ${cat ? plural(cat.pairs.length, 'paire') + '.' : ''}</span></span>${right}</div>`;
  }).join('');
  return `${topBar('Boutique', { back: true })}
<div class="scroll">
  <div class="premium${premium ? ' on' : ''}" ${st(0)}>
    <div class="crown">${icon('crown', 30)}</div>
    <h2>Double Jeu illimité</h2>
    <ul>
      <li>${icon('check', 18)}Parties illimitées, sans aucune pub</li>
      <li>${icon('check', 18)}Tous les packs de thèmes, y compris les prochains</li>
      <li>${icon('check', 18)}Un seul paiement, pour toujours</li>
    </ul>
    ${premium ? `<p class="owned big">${icon('check', 18)}Débloqué. Merci !</p>`
      : pp ? `<button class="btn sun lg block" data-act="buy" data-id="${SHOP.PREMIUM}">Débloquer : ${esc(pp)}</button>`
        : '<p class="hint onbg">Prix indisponible pour l’instant : vérifie ta connexion, puis reviens ici.</p>'}
  </div>
  <h2 class="sect">Packs de thèmes</h2>
  <div class="panel list">${packs}</div>
  ${premium ? '' : `<h2 class="sect">Jouer gratuitement</h2>
  <div class="panel"><p class="hint">Il te reste <b>${plural(eco.credits, 'partie')}</b> en réserve. Une pub regardée jusqu’au bout en redonne ${SHOP.REWARD} (réserve de ${SHOP.MAX} au plus).</p>
    <button class="btn well block" data-act="reserve-open">${icon('play', 18)}Regarder une pub</button></div>`}
  <div class="panel list">
    <button class="rowbtn" data-act="shop-restore"><span class="opt-ic">${icon('replay', 20)}</span><span class="grow"><b>Restaurer mes achats</b><span>Après un changement de téléphone ou une réinstallation.</span></span></button>
    ${S.shop.privacy ? `<button class="rowbtn" data-act="shop-privacy"><span class="opt-ic">${icon('sliders', 20)}</span><span class="grow"><b>Confidentialité des publicités</b><span>Revoir ou modifier ton choix de consentement.</span></span></button>` : ''}
  </div>
  <p class="foot">Paiements gérés par Google Play. ${num(CATEGORIES.filter((c) => !c.pack).length)} thèmes restent offerts à tous.${S.shop.test ? ' Publicités en mode test.' : ''}</p>
</div>`;
}
