// Avatars : vingt-cinq personnages aux silhouettes bien différentes, peints dans la couleur du joueur.
// Chaque personnage est un petit dessin vectoriel (repère 64 × 64) fait de trois couches :
//   1. un liseré clair autour de la silhouette, façon autocollant, pour se détacher de tous les fonds ;
//   2. les formes, cernées d'un trait encre ;
//   3. le visage et les détails.
// Les dessins sont déclarés une seule fois dans la page (avatarSprite) et chaque avatar y renvoie.

export const COLORS = [
  { id: 'tomate', name: 'Rouge', hex: '#F4452F' },
  { id: 'mandarine', name: 'Orange', hex: '#FF9020' },
  { id: 'soleil', name: 'Jaune', hex: '#FFCB1F' },
  { id: 'anis', name: 'Vert clair', hex: '#9BD32F' },
  { id: 'menthe', name: 'Vert', hex: '#17BD7A' },
  { id: 'lagon', name: 'Turquoise', hex: '#12A9BE' },
  { id: 'ciel', name: 'Bleu ciel', hex: '#4DBBFF' },
  { id: 'lilas', name: 'Violet', hex: '#A98BFF' },
  { id: 'rose', name: 'Rose', hex: '#FF86BC' },
  { id: 'framboise', name: 'Framboise', hex: '#D42A6B' },
  { id: 'sable', name: 'Caramel', hex: '#C9935A' },
  { id: 'ardoise', name: 'Gris perle', hex: '#B4BCD4' },
];

const INK = '#15163B';
const PAPER = '#FFFDF8';
const SUN = '#FFD23F';
const TOMATO = '#FF5A3C';
const ORANGE = '#FF8A1F';
const C = 'var(--c)';

/* ---------- Petits outils de dessin ---------- */

// Une forme de la silhouette : remplie, cernée d'encre, et doublée d'un liseré clair.
const sil = (tag, attrs, fill = C, w = 2.4) => ({ tag, attrs, fill, w, outer: true });
// Un détail posé par-dessus : rempli, avec ou sans trait.
const part = (tag, attrs, fill, w = 0, extra = '') => ({ tag, attrs, fill, w, extra });
// Un trait seul (bouche, moustaches…).
const stroke = (d, w = 2, extra = '') => ({ tag: 'path', attrs: `d="${d}"`, fill: 'none', w, extra });
const P = (d) => `d="${d}"`;
const circ = (cx, cy, r) => `cx="${cx}" cy="${cy}" r="${r}"`;
const ell = (cx, cy, rx, ry, rot) => `cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}`;

const dot = (cx, cy, r = 2.7) => part('circle', circ(cx, cy, r), INK);
const eyes = (y, dx = 8, r = 2.7) => [dot(32 - dx, y, r), dot(32 + dx, y, r)];
const smile = (y, half = 6.5, depth = 4.5, w = 2.2) => stroke(`M${32 - half} ${y}q${half} ${depth} ${half * 2} 0`, w);
const cheeks = (y, dx, r = 3) => [part('circle', circ(32 - dx, y, r), '#fff', 0, ' opacity=".42"'), part('circle', circ(32 + dx, y, r), '#fff', 0, ' opacity=".42"')];
const light = (tag, attrs, o = 0.5) => part(tag, attrs, '#fff', 0, ` opacity="${o}"`);
const muzzle = (y) => [part('path', P(`M${29.6} ${y}h4.8l-2.4 2.9z`), INK, 1.2), stroke(`M32 ${y + 2.6}v2.2M32 ${y + 4.8}q-2.6 2.6-5.4.9M32 ${y + 4.8}q2.6 2.6 5.4.9`, 1.8)];

function star(cx, cy, R, r) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`;
  }
  return `${d}Z`;
}
const mane = () => Array.from({ length: 10 }, (_, k) => {
  const a = (k * Math.PI) / 5;
  return sil('circle', circ((32 + 18.5 * Math.cos(a)).toFixed(1), (35 + 18.5 * Math.sin(a)).toFixed(1), 7.6));
});

/* ---------- Les personnages ---------- */

export const FACES = [
  {
    id: 'agent', name: 'Agent secret',
    parts: [
      sil('circle', circ(32, 39, 19.5)),
      sil('path', P('M19.5 19C19.5 9 24 4.5 32 4.5S44.5 9 44.5 19z'), INK),
      sil('ellipse', ell(32, 19.6, 24, 4.6), INK),
      part('path', P('M20.2 11.2q11.8-2.6 23.6 0l.6 4.2q-12.4-2.4-24.8 0z'), TOMATO),
      part('path', P('M13.5 31.5h37v3.6h-37z'), INK),
      part('path', P('M16 33h13.4v4.6a6.7 6.7 0 0 1-13.4 0zM34.6 33H48v4.6a6.7 6.7 0 0 1-13.4 0z'), INK),
      stroke('M19.4 39l3.2-3.2M38 39l3.2-3.2', 1.6, ' stroke="#fff" opacity=".75"'),
      stroke('M26.5 49.5q6 3.6 11-.8', 2.2),
    ],
  },
  {
    id: 'chat', name: 'Chat',
    parts: [
      sil('path', P('M12 30L10.5 8.5 25 17q7-1.8 14 0L53.5 8.5 52 30q2 4 2 8c0 12-10 20-22 20S10 50 10 38q0-4 2-8z')),
      light('path', P('M15.2 15.5l.8 8 6-4zM48.8 15.5l-.8 8-6-4z')),
      ...eyes(36, 8.5, 2.9),
      ...muzzle(42),
      stroke('M12.5 41.5l7.5 1.2M12.5 47l7.5-1M51.5 41.5L44 42.7M51.5 47L44 46', 1.4),
    ],
  },
  {
    id: 'renard', name: 'Renard',
    parts: [
      sil('path', P('M8 7.5L26 18q6-1.6 12 0L56 7.5 55 30q1 7-3.5 12.5L32 59 12.5 42.5Q8 37 9 30z')),
      part('path', P('M13 13.5l8.5 5.2-7.8 6.3zM51 13.5l-8.5 5.2 7.8 6.3z'), INK),
      part('path', P('M9.6 35.5C18 34.5 27 43 32 58.2L12.8 42.2q-3.2-3.2-3.2-6.7zM54.4 35.5C46 34.5 37 43 32 58.2l19.2-16q3.2-3.2 3.2-6.7z'), PAPER),
      stroke('M8 7.5L26 18q6-1.6 12 0L56 7.5 55 30q1 7-3.5 12.5L32 59 12.5 42.5Q8 37 9 30z', 2.4),
      part('circle', circ(32, 54.6, 3.2), INK),
      ...eyes(32.5, 9, 2.8),
    ],
  },
  {
    id: 'ours', name: 'Ours',
    parts: [
      sil('circle', circ(14.5, 17.5, 8.2)),
      sil('circle', circ(49.5, 17.5, 8.2)),
      light('circle', circ(14.5, 17.5, 3.6)),
      light('circle', circ(49.5, 17.5, 3.6)),
      sil('circle', circ(32, 36.5, 21.5)),
      part('ellipse', ell(32, 44.5, 9.5, 7.6), PAPER, 1.5),
      part('ellipse', ell(32, 41.4, 3.5, 2.5), INK),
      stroke('M32 43.8v2.4M32 46.2q-2.4 2.3-4.8.8M32 46.2q2.4 2.3 4.8.8', 1.7),
      ...eyes(32.5, 9, 2.8),
    ],
  },
  {
    id: 'lapin', name: 'Lapin',
    parts: [
      sil('ellipse', ell(21.5, 16, 6.4, 14, -9)),
      sil('ellipse', ell(42.5, 16, 6.4, 14, 9)),
      light('ellipse', ell(21.5, 16.5, 2.5, 9, -9)),
      light('ellipse', ell(42.5, 16.5, 2.5, 9, 9)),
      sil('ellipse', ell(32, 41.5, 20.5, 17.5)),
      ...eyes(38.5, 8.5, 2.8),
      part('path', P('M29.8 44h4.4L32 46.6z'), INK, 1.2),
      stroke('M32 46.6v2', 1.7),
      part('rect', 'x="29.4" y="48.6" width="5.2" height="5" rx="1.2"', PAPER, 1.3),
      stroke('M32 48.6v5', 1.1),
      ...cheeks(46, 13.5, 3.2),
    ],
  },
  {
    id: 'panda', name: 'Panda',
    parts: [
      sil('circle', circ(14.5, 16.5, 8), INK),
      sil('circle', circ(49.5, 16.5, 8), INK),
      sil('circle', circ(32, 36.5, 21.5)),
      part('ellipse', ell(22.8, 34, 5.8, 7.2, 22), INK),
      part('ellipse', ell(41.2, 34, 5.8, 7.2, -22), INK),
      part('circle', circ(23.4, 33.4, 2.3), PAPER),
      part('circle', circ(40.6, 33.4, 2.3), PAPER),
      part('ellipse', ell(32, 43.6, 3.2, 2.3), INK),
      stroke('M32 45.8v2M32 47.8q-2.2 2.1-4.4.7M32 47.8q2.2 2.1 4.4.7', 1.7),
    ],
  },
  {
    id: 'hibou', name: 'Hibou',
    parts: [
      sil('path', P('M11.5 10.5L22 18q10-3.6 20 0l10.5-7.5Q55 22 54 34c0 15-10 25-22 25S10 49 10 34q-1-12 1.5-23.5z')),
      part('circle', circ(22.4, 33, 9.4), PAPER, 1.6),
      part('circle', circ(41.6, 33, 9.4), PAPER, 1.6),
      dot(22.4, 33, 4.2), dot(41.6, 33, 4.2),
      part('circle', circ(23.9, 31.5, 1.4), '#fff'),
      part('circle', circ(43.1, 31.5, 1.4), '#fff'),
      part('path', P('M28.4 40.5h7.2L32 47.4z'), SUN, 1.5),
      stroke('M23.5 51l2.6 2 2.6-2M35.3 51l2.6 2 2.6-2', 1.5, ' opacity=".6"'),
    ],
  },
  {
    id: 'grenouille', name: 'Grenouille',
    parts: [
      sil('path', P('M8 38c0-8 3-13 4.5-14A8.5 8.5 0 1 1 27 15.5q5-1 10 0A8.5 8.5 0 1 1 51.5 24C53 25 56 30 56 38c0 12-11 19-24 19S8 50 8 38z')),
      part('circle', circ(19, 19, 5.6), PAPER, 1.5),
      part('circle', circ(45, 19, 5.6), PAPER, 1.5),
      dot(19, 19.4, 2.8), dot(45, 19.4, 2.8),
      dot(29.2, 33.5, 1.1), dot(34.8, 33.5, 1.1),
      stroke('M17.5 41.5Q32 53 46.5 41.5', 2.3),
      ...cheeks(44.5, 18.5, 3),
    ],
  },
  {
    id: 'pingouin', name: 'Pingouin',
    parts: [
      sil('path', P('M32 5c14 0 22 13 22 29S45 59 32 59 10 50 10 34 18 5 32 5z')),
      part('path', P('M32 22.5c4-6.5 15-4.5 15 8C47 46 40 55 32 55S17 46 17 30.5c0-12.5 11-14.5 15-8z'), PAPER),
      ...eyes(31, 7.2, 2.7),
      part('path', P('M27.4 36.6h9.2L32 43z'), ORANGE, 1.5),
      ...cheeks(40, 10.5, 2.6).map((p) => ({ ...p, fill: '#FF86BC', extra: ' opacity=".55"' })),
    ],
  },
  {
    id: 'lion', name: 'Lion',
    parts: [
      ...mane(),
      part('circle', circ(32, 35, 19.2), C),
      part('circle', circ(32, 35.5, 14.6), PAPER, 1.7),
      ...eyes(33, 6, 2.5),
      part('path', P('M29.3 37.6h5.4L32 40.6z'), INK, 1.2),
      stroke('M32 40.6v1.8M32 42.4q-2.3 2.3-4.8.8M32 42.4q2.3 2.3 4.8.8', 1.7),
    ],
  },
  {
    id: 'cochon', name: 'Cochon',
    parts: [
      sil('path', P('M10.5 23L12.5 6.5 27 15.5z')),
      sil('path', P('M53.5 23L51.5 6.5 37 15.5z')),
      sil('circle', circ(32, 37, 21)),
      part('ellipse', ell(32, 43.5, 10.2, 7.6), '#fff', 0, ' opacity=".5"'),
      stroke('M21.8 43.5a10.2 7.6 0 1 0 20.4 0a10.2 7.6 0 1 0-20.4 0', 1.6),
      part('ellipse', ell(28.4, 43.5, 1.7, 2.5), INK),
      part('ellipse', ell(35.6, 43.5, 1.7, 2.5), INK),
      ...eyes(31, 9, 2.7),
    ],
  },
  {
    id: 'souris', name: 'Souris',
    parts: [
      sil('circle', circ(13.5, 17.5, 11.5)),
      sil('circle', circ(50.5, 17.5, 11.5)),
      light('circle', circ(13.5, 17.5, 6.4)),
      light('circle', circ(50.5, 17.5, 6.4)),
      sil('circle', circ(32, 38.5, 19.5)),
      ...eyes(36, 7.5, 2.7),
      part('circle', circ(32, 43.6, 2.5), INK),
      stroke('M32 46v2.2', 1.6),
      part('rect', 'x="29.8" y="48.2" width="4.4" height="4.4" rx="1"', PAPER, 1.3),
      stroke('M14.5 43l8 1.4M14.5 48.6l8-1.2M49.5 43l-8 1.4M49.5 48.6l-8-1.2', 1.3),
    ],
  },
  {
    id: 'poussin', name: 'Poussin',
    parts: [
      sil('path', P('M26.5 18.5c-1-5-4-8.5-8-9 4.5-2.5 10-.5 12.5 4.5C31 9 33.5 5 38 3.5c-1.5 4.5-1 9-.5 15z')),
      sil('circle', circ(32, 37.5, 21)),
      ...eyes(34, 8.5, 2.9),
      part('path', P('M27.6 39.6h8.8L32 46z'), ORANGE, 1.5),
      ...cheeks(42, 14.5, 3.3),
    ],
  },
  {
    id: 'robot', name: 'Robot',
    parts: [
      stroke('M32 13.5V7', 2.4),
      sil('circle', circ(32, 5.4, 3.3), SUN, 1.7),
      sil('rect', 'x="3.8" y="30.5" width="7.4" height="11.5" rx="2.4"'),
      sil('rect', 'x="52.8" y="30.5" width="7.4" height="11.5" rx="2.4"'),
      sil('rect', 'x="10" y="13.5" width="44" height="43.5" rx="10.5"'),
      part('circle', circ(22.4, 31, 6.2), PAPER, 1.6),
      part('circle', circ(41.6, 31, 6.2), PAPER, 1.6),
      dot(22.4, 31, 2.7), dot(41.6, 31, 2.7),
      part('rect', 'x="20.5" y="43" width="23" height="7.4" rx="2.4"', PAPER, 1.6),
      stroke('M26.2 43v7.4M32 43v7.4M37.8 43v7.4', 1.4),
    ],
  },
  {
    id: 'fantome', name: 'Fantôme',
    parts: [
      sil('path', P('M11 34C11 18 20 7 32 7s21 11 21 27v21q-3.5 4-7-1-3.5 5-7 0-3.5 5-7 0-3.5 5-7 0-3.5 5-7 0-3.5 5-7 1z')),
      part('ellipse', ell(24.6, 29.5, 3.5, 4.8), INK),
      part('ellipse', ell(39.4, 29.5, 3.5, 4.8), INK),
      part('circle', circ(25.6, 27.6, 1.2), '#fff'),
      part('circle', circ(40.4, 27.6, 1.2), '#fff'),
      part('ellipse', ell(32, 41, 3.5, 4.3), INK),
      ...cheeks(37.5, 13.5, 2.8),
    ],
  },
  {
    id: 'alien', name: 'Extraterrestre',
    parts: [
      stroke('M23.5 12.5L18.5 5M40.5 12.5L45.5 5', 2.2),
      sil('circle', circ(17.8, 4.6, 2.9), C, 1.7),
      sil('circle', circ(46.2, 4.6, 2.9), C, 1.7),
      sil('path', P('M32 10c14 0 24 9 24 21 0 14-14 27-24 27S8 45 8 31c0-12 10-21 24-21z')),
      part('ellipse', ell(22, 32, 6, 8.2, -24), INK),
      part('ellipse', ell(42, 32, 6, 8.2, 24), INK),
      part('circle', circ(20.4, 28.4, 1.8), '#fff'),
      part('circle', circ(40.4, 28.4, 1.8), '#fff'),
      stroke('M28.4 48.5q3.6 2.6 7.2 0', 1.9),
    ],
  },
  {
    id: 'pieuvre', name: 'Pieuvre',
    parts: [
      sil('rect', 'x="10" y="39" width="9.6" height="20" rx="4.8"'),
      sil('rect', 'x="21.5" y="41" width="9.6" height="18" rx="4.8"'),
      sil('rect', 'x="32.9" y="41" width="9.6" height="18" rx="4.8"'),
      sil('rect', 'x="44.4" y="39" width="9.6" height="20" rx="4.8"'),
      sil('path', P('M10 47V33C10 17 19 6 32 6s22 11 22 27v14')),
      light('circle', circ(21.5, 15.5, 2.7), 0.4),
      light('circle', circ(40.5, 12.5, 2.1), 0.4),
      light('circle', circ(45.5, 21, 1.6), 0.4),
      ...eyes(29.5, 7.6, 2.8),
      smile(36, 6, 4.8),
      ...cheeks(36, 13.5, 2.9),
    ],
  },
  {
    id: 'monstre', name: 'Cyclope',
    parts: [
      sil('path', P('M15.5 21c-4.5-5-5.5-11-3.5-17 5.5 2 9.5 6 11 11.5z'), PAPER),
      sil('path', P('M48.5 21c4.5-5 5.5-11 3.5-17-5.5 2-9.5 6-11 11.5z'), PAPER),
      sil('path', P('M32 12c15 0 23 9 23 23S46 58 32 58 9 49 9 35s8-23 23-23z')),
      part('circle', circ(32, 30.5, 10.2), PAPER, 1.7),
      dot(32, 30.5, 4.7),
      part('circle', circ(33.8, 28.6, 1.6), '#fff'),
      stroke('M21.5 45.5Q32 53 42.5 45.5', 2.3),
      part('path', P('M25.2 47.5l2.1 4.2 2.2-3zM38.8 47.5l-2.1 4.2-2.2-3z'), PAPER, 1.2),
    ],
  },
  {
    id: 'dino', name: 'Dino',
    parts: [
      sil('path', P('M15.5 22L18.5 8.5 25 16 32 4l7 12 6.5-7.5L48.5 22z')),
      sil('path', P('M32 14.5c14 0 23 9.5 23 22.5S46 58 32 58 9 50 9 37s9-22.5 23-22.5z')),
      light('circle', circ(18.5, 28, 2.3), 0.38),
      light('circle', circ(45.5, 29, 1.9), 0.38),
      light('circle', circ(42, 23.5, 1.3), 0.38),
      ...eyes(33.5, 8.5, 2.8),
      dot(29.2, 41.5, 1.1), dot(34.8, 41.5, 1.1),
      stroke('M20.5 46.5Q32 54 43.5 46.5', 2.3),
      part('path', P('M40 48.6l-1.3 3.8-2.6-2.3z'), PAPER, 1.2),
    ],
  },
  {
    id: 'ninja', name: 'Ninja',
    parts: [
      sil('path', P('M52.5 27.5l8.5-4-1.5 7.5z'), C, 2),
      sil('path', P('M52.5 32l8 4.5-6 2.5z'), C, 2),
      sil('circle', circ(32, 36, 21.5)),
      part('rect', 'x="13.5" y="27" width="37" height="13.5" rx="6.75"', PAPER, 1.6),
      dot(24.5, 34.4, 2.7), dot(39.5, 34.4, 2.7),
      stroke('M19.5 29.4l8 2.4M44.5 29.4l-8 2.4', 2.1),
    ],
  },
  {
    id: 'pirate', name: 'Pirate',
    parts: [
      sil('path', P('M53 25.5l8.5-3-2.5 8z'), INK, 1.6),
      sil('circle', circ(32, 36, 21.5)),
      part('path', P('M10.7 29A21.5 21.5 0 0 1 53.3 29C39 24.5 25 24.5 10.7 29z'), INK),
      part('circle', circ(22, 19.5, 1.6), PAPER), part('circle', circ(32, 16, 1.6), PAPER), part('circle', circ(42, 19.5, 1.6), PAPER),
      stroke('M12 29.5l40 7.5', 1.6),
      part('ellipse', ell(40.5, 36, 5.5, 4.7), INK),
      dot(24.5, 35.5, 2.8),
      stroke('M25 46.5q7 4.8 13.5-1.2', 2.2),
    ],
  },
  {
    id: 'roi', name: 'Tête couronnée',
    parts: [
      sil('circle', circ(32, 39, 19.5)),
      sil('path', P('M15.5 22.5L14 6l9 7.5L32 3l9 10.5L50 6l-1.5 16.5z'), SUN, 2),
      part('circle', circ(32, 15.5, 2.1), TOMATO),
      part('circle', circ(22.5, 17.5, 1.6), '#2A3CE6'),
      part('circle', circ(41.5, 17.5, 1.6), '#2A3CE6'),
      ...eyes(37, 7.6, 2.7),
      smile(44.5, 6.8, 5.2),
      ...cheeks(43, 13.5, 2.9),
    ],
  },
  {
    id: 'cactus', name: 'Cactus',
    parts: [
      sil('path', P('M21.5 45.5h-6c-5 0-9-4-9-9V28a5 5 0 0 1 10 0v7.5h5z')),
      sil('path', P('M42.5 39.5h6c5 0 9-4 9-9V22a5 5 0 0 0-10 0v7.5h-5z')),
      sil('rect', 'x="20" y="8.5" width="24" height="50.5" rx="12"'),
      part('rect', 'x="18.6" y="36.7" width="3" height="7.6"', C),
      part('rect', 'x="42.4" y="30.7" width="3" height="7.6"', C),
      sil('circle', circ(32, 7.5, 4.2), TOMATO, 1.7),
      ...eyes(27.5, 5.2, 2.4),
      smile(33.5, 4.6, 3.6, 2),
      stroke('M25.5 45l-2 1.5M38.5 47l2 1.5M32 51.5v2.6M26 16.5l-1.5-1.5M38 16.5l1.5-1.5', 1.4, ' opacity=".5"'),
    ],
  },
  {
    id: 'champignon', name: 'Champignon',
    parts: [
      sil('path', P('M22.5 33c-1 6-2.5 16-1.5 21 1 4.5 21 4.5 22 0 1-5-.500-15-1.5-21z'), PAPER),
      sil('path', P('M5 33C5 17 17 6 32 6s27 11 27 27c0 4-4 5-27 5S5 37 5 33z')),
      part('circle', circ(20, 20.5, 4.6), PAPER, 0, ' opacity=".9"'),
      part('circle', circ(38, 15, 3.6), PAPER, 0, ' opacity=".9"'),
      part('circle', circ(47.5, 26.5, 3), PAPER, 0, ' opacity=".9"'),
      part('circle', circ(30, 29, 2.4), PAPER, 0, ' opacity=".9"'),
      dot(27.5, 45.5, 2.2), dot(36.5, 45.5, 2.2),
      smile(49.5, 3.6, 2.8, 1.8),
    ],
  },
  {
    id: 'etoile', name: 'Étoile',
    parts: [
      sil('path', P(star(32, 34.5, 28, 13.5)), C, 2.6),
      ...eyes(32, 5.6, 2.6),
      smile(37.5, 5.4, 4.4, 2.1),
      ...cheeks(37.5, 10.5, 2.5),
    ],
  },
];

/** Anciens déguisements (versions 2.0) : chaque profil existant retrouve le personnage le plus proche. */
const LEGACY = {
  sourire: 'poussin', lunettes: 'agent', moustache: 'ours', chapeau: 'champignon', loup: 'renard', monocle: 'hibou',
  beret: 'cactus', casquette: 'grenouille', couronne: 'roi', noeud: 'pingouin', casque: 'robot', rondes: 'panda',
  hautdeforme: 'lapin', bonnet: 'cochon', diable: 'monstre', ange: 'etoile', clown: 'pieuvre', barbe: 'lion',
  chignon: 'fantome', meche: 'dino', couettes: 'souris', cowboy: 'agent',
};

const FACE_BY_ID = Object.fromEntries(FACES.map((f) => [f.id, f]));
const COLOR_BY_ID = Object.fromEntries(COLORS.map((c) => [c.id, c.hex]));

export const colorHex = (id) => COLOR_BY_ID[id] || COLORS[0].hex;

/** Identifiant de personnage valide pour un profil, y compris ceux créés avec les anciens déguisements. */
export const faceId = (id) => (FACE_BY_ID[id] ? id : FACE_BY_ID[LEGACY[id]] ? LEGACY[id] : FACES[0].id);

const ROUND = ' stroke-linejoin="round" stroke-linecap="round"';

function drawing(face) {
  const halo = face.parts.filter((p) => p.outer).map((p) => `<${p.tag} ${p.attrs} fill="${PAPER}" stroke="${PAPER}" stroke-width="${p.w + 4.2}"${ROUND}/>`).join('');
  const main = face.parts.map((p) => {
    const custom = /stroke=/.test(p.extra || '');
    return `<${p.tag} ${p.attrs} fill="${p.fill}"${p.w ? `${custom ? '' : ` stroke="${INK}"`} stroke-width="${p.w}"${ROUND}` : ''}${p.extra || ''}/>`;
  }).join('');
  return halo + main;
}

/** Bloc à insérer une fois dans la page : les dessins de tous les personnages. */
export function avatarSprite() {
  return `<svg id="av-sprite" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden"><defs>${FACES.map((f) => `<symbol id="av-${f.id}" viewBox="0 0 64 64" overflow="visible">${drawing(f)}</symbol>`).join('')}</defs></svg>`;
}

/**
 * Rendu HTML d'un avatar. `who` porte color, face et éventuellement photo (data URL).
 * @param {string} cls classes de taille : s28, s36, s44, s56, s72, s96, s120
 */
export function avatar(who, cls = 's44') {
  const hex = colorHex(who && who.color);
  if (who && who.photo) return `<span class="av photo ${cls}" style="--c:${hex}"><img src="${who.photo}" alt="" draggable="false"></span>`;
  return `<span class="av ${cls}" style="--c:${hex}"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="#av-${faceId(who && who.face)}"/></svg></span>`;
}

/** Couleur et personnage pas encore pris, pour que deux nouveaux profils ne se ressemblent pas. */
export function suggestLook(profiles) {
  const usedC = new Set(profiles.map((p) => p.color)), usedF = new Set(profiles.map((p) => faceId(p.face)));
  // Les couleurs sont proposées en sautant dans la roue, pour que deux voisins de liste contrastent.
  const wheel = [0, 6, 2, 9, 4, 7, 1, 5, 8, 3, 10, 11].map((i) => COLORS[i]);
  const color = (wheel.find((c) => !usedC.has(c.id)) || wheel[profiles.length % wheel.length]).id;
  const face = (FACES.find((f) => !usedF.has(f.id)) || FACES[profiles.length % FACES.length]).id;
  return { color, face };
}
