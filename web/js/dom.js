// Petits outils d'interface : mise à jour du DOM par différence, formats français.

const keyOf = (n) => (n.nodeType === 1 ? n.getAttribute('data-key') : null);

function sameKind(a, b) {
  if (a.nodeType !== b.nodeType) return false;
  if (a.nodeType !== 1) return true;
  return a.nodeName === b.nodeName && keyOf(a) === keyOf(b);
}

function syncAttrs(from, to) {
  for (const a of Array.from(from.attributes)) if (!to.hasAttribute(a.name)) from.removeAttribute(a.name);
  for (const a of Array.from(to.attributes)) if (from.getAttribute(a.name) !== a.value) from.setAttribute(a.name, a.value);
}

/**
 * Transforme `from` pour qu'il ressemble à `to` en touchant le moins de nœuds possible :
 * les champs gardent leur saisie et leur focus, les transitions CSS jouent sur ce qui change vraiment.
 * Un attribut data-key distinct force le remplacement du nœud (et donc son animation d'entrée).
 */
export function morph(from, to) {
  syncAttrs(from, to);
  const tag = from.nodeName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    if (document.activeElement !== from && from.value !== (to.getAttribute('value') || '')) from.value = to.getAttribute('value') || '';
    return;
  }
  let f = from.firstChild;
  let t = to.firstChild;
  while (t) {
    const nextT = t.nextSibling;
    if (!f) {
      from.appendChild(t);
    } else if (sameKind(f, t)) {
      if (f.nodeType === 1) morph(f, t);
      else if (f.nodeValue !== t.nodeValue) f.nodeValue = t.nodeValue;
      f = f.nextSibling;
    } else {
      const k = keyOf(t);
      let match = null;
      if (k !== null) for (let x = f.nextSibling; x; x = x.nextSibling) if (x.nodeType === 1 && x.nodeName === t.nodeName && keyOf(x) === k) { match = x; break; }
      if (match) { from.insertBefore(match, f); morph(match, t); } else from.insertBefore(t, f);
    }
    t = nextT;
  }
  while (f) { const n = f.nextSibling; from.removeChild(f); f = n; }
}

/** Remplace le contenu d'un élément par un HTML, par différence (les attributs du conteneur sont conservés). */
export function morphHtml(el, html) {
  const shell = el.cloneNode(false);
  shell.innerHTML = html;
  morph(el, shell);
}

/* ---------- Formats ---------- */

/** Typographie française : espaces insécables avant ? ! ; : et à l'intérieur des guillemets. */
export function typo(html) {
  return html.replace(/ ([?!;])/g, '\u202f$1').replace(/ :/g, '\u00a0:').replace(/« /g, '«\u00a0').replace(/ »/g, '\u00a0»');
}

const NB = ' ';
export const num = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
export const plural = (n, one, many) => `${num(n)} ${n > 1 ? (many || one + 's') : one}`;
export const pct = (x) => `${Math.round(x * 100)}${NB}%`;

export function listNames(names) {
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + ' et ' + names[names.length - 1];
}

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function dayLabel(ts, now = Date.now()) {
  const d = new Date(ts), n = new Date(now);
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(n) - start(d)) / 86400000);
  if (diff === 0) return 'Aujourd’hui';
  if (diff === 1) return 'Hier';
  const base = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return (base.charAt(0).toUpperCase() + base.slice(1)) + (d.getFullYear() !== n.getFullYear() ? ` ${d.getFullYear()}` : '');
}

export function timeLabel(ts) {
  const d = new Date(ts);
  return `${d.getHours()}${NB}h${NB}${String(d.getMinutes()).padStart(2, '0')}`;
}

export function durationLabel(ms) {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return `${m}${NB}min`;
  return `${Math.floor(m / 60)}${NB}h${NB}${String(m % 60).padStart(2, '0')}`;
}

export function clockLabel(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
