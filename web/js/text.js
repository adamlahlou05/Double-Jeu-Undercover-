// Outils de texte partagés : normalisation, comparaison tolérante, hachage court.

/** Normalise un mot ou une expression pour la comparaison (accents, casse, articles, pluriel). */
export function norm(input) {
  let t = String(input == null ? '' : input).toLowerCase();
  t = t.replace(/\([^)]*\)/g, ' ');
  t = t.replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[’‘`´]/g, "'");
  t = t.normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  t = t.replace(/^(l'|le |la |les |un |une |des |du |de la |d')/, '');
  t = t.replace(/[^a-z0-9]/g, '');
  if (t.length > 3 && /[sx]$/.test(t)) t = t.slice(0, -1);
  return t;
}

/** Distance de Levenshtein. */
export function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1), cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1));
    }
    const tmp = prev; prev = cur; cur = tmp;
  }
  return prev[n];
}

/**
 * La proposition de Mr. White correspond-elle au mot des Civils ?
 * Tolère accents, articles, pluriel et petites fautes de frappe, mais jamais le mot de l'Undercover.
 */
export function guessMatches(guess, civilWord, underWord) {
  const g = norm(guess), c = norm(civilWord), u = underWord ? norm(underWord) : '';
  if (!g) return false;
  if (g === c) return true;
  if (u && g === u) return false;
  const tol = c.length >= 16 ? 3 : c.length >= 9 ? 2 : c.length >= 5 ? 1 : 0;
  const dc = lev(g, c);
  if (dc > tol) return false;
  if (u && lev(g, u) <= dc) return false;
  return true;
}

/** Hachage FNV-1a 32 bits, rendu en base 36. */
export function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Identifiant stable d'une paire, indépendant de l'ordre des deux mots. */
export function pairKey(a, b) {
  const x = norm(a), y = norm(b);
  return hash(x < y ? x + '|' + y : y + '|' + x);
}

export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
