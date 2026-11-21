// Avatars : une tête ronde à la couleur du joueur, et un déguisement — on joue aux agents doubles.
// Chaque déguisement est un petit dessin vectoriel posé sous (under) ou sur (over) la tête.

export const COLORS = [
  { id: 'tomate', hex: '#FF5A3C' },
  { id: 'soleil', hex: '#FFC21A' },
  { id: 'menthe', hex: '#1CC8A0' },
  { id: 'ciel', hex: '#38B6FF' },
  { id: 'rose', hex: '#FF7EB6' },
  { id: 'lilas', hex: '#A98BFF' },
  { id: 'mandarine', hex: '#FF8A1F' },
  { id: 'anis', hex: '#A5D63A' },
  { id: 'lagon', hex: '#12A5B5' },
  { id: 'framboise', hex: '#DC2F6A' },
  { id: 'sable', hex: '#E0B27A' },
  { id: 'ardoise', hex: '#7C89A8' },
];

const INK = '#15163B';
const EYES = `<circle cx="24.5" cy="34" r="2.6" fill="${INK}"/><circle cx="39.5" cy="34" r="2.6" fill="${INK}"/>`;
const SMILE = `<path d="M25 43q7 5.5 14 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
const line = (d, w = 2) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

export const FACES = [
  { id: 'sourire', name: 'Sourire' },
  {
    id: 'lunettes', name: 'Lunettes noires', eyes: false,
    over: `<rect x="13" y="28.5" width="38" height="4" rx="2" fill="${INK}"/><path d="M15 31h14v5a7 7 0 0 1-14 0zM35 31h14v5a7 7 0 0 1-14 0z" fill="${INK}"/><path d="M18.5 35l3-2.5M38.5 35l3-2.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".75"/>`,
  },
  {
    id: 'moustache', name: 'Moustache', mouth: false,
    over: `<path d="M32 42C29 39 24 39 20.5 42.5 23 46 28.5 46 32 43.5 35.5 46 41 46 43.5 42.5 40 39 35 39 32 42z" fill="${INK}"/>`,
  },
  {
    id: 'chapeau', name: 'Chapeau',
    over: `<path d="M19 17C19 7 24 4 32 4s13 3 13 13z" fill="${INK}"/><rect x="19" y="12.5" width="26" height="4" fill="#FF5A3C"/><ellipse cx="32" cy="17.5" rx="22" ry="4.2" fill="${INK}"/>`,
  },
  {
    id: 'loup', name: 'Loup', eyes: false,
    over: `<path d="M10 31C17 26.5 25 26.5 32 29.5 39 26.5 47 26.5 54 31 54.5 36 51 40 45.5 40 40.5 40 37 37 32 37S23.5 40 18.5 40C13 40 9.5 36 10 31z" fill="${INK}"/><ellipse cx="24.5" cy="33.5" rx="4" ry="2.8" fill="#fff"/><ellipse cx="39.5" cy="33.5" rx="4" ry="2.8" fill="#fff"/><circle cx="24.5" cy="33.5" r="1.7" fill="${INK}"/><circle cx="39.5" cy="33.5" r="1.7" fill="${INK}"/>`,
  },
  {
    id: 'monocle', name: 'Monocle',
    over: `<circle cx="39.5" cy="34" r="6.5" fill="rgba(255,255,255,.4)" stroke="${INK}" stroke-width="2"/>${line('M45 38.5l3 13', 1.4)}${line('M20 28.5q4.5-2.5 9 0', 2)}`,
  },
  {
    id: 'beret', name: 'Béret',
    over: `<path d="M12 19C14 10 24 6 34 7c9 1 16 5 17 11-9 3-28 4-39 1z" fill="#FF5A3C"/><path d="M33 7l2-4" stroke="#FF5A3C" stroke-width="2.4" stroke-linecap="round"/>`,
  },
  {
    id: 'casquette', name: 'Casquette',
    over: `<path d="M11 21a21 17 0 0 1 42 0z" fill="#2A3CE6"/><path d="M36 21h20c1.2 0 1.5 1.3.5 2-4.5 2.8-11 3.3-20.5 2z" fill="${INK}"/><circle cx="32" cy="5" r="2" fill="${INK}"/>`,
  },
  {
    id: 'couronne', name: 'Couronne',
    over: `<path d="M15 20l1-13 8 7 8-10 8 10 8-7 1 13z" fill="#FFD23F" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/><circle cx="32" cy="15" r="1.8" fill="#FF5A3C"/><circle cx="22.5" cy="16" r="1.4" fill="#2A3CE6"/><circle cx="41.5" cy="16" r="1.4" fill="#2A3CE6"/>`,
  },
  {
    id: 'noeud', name: 'Nœud papillon',
    over: `<path d="M32 58l-9.5-5.5v11zM32 58l9.5-5.5v11z" fill="#FF5A3C"/><circle cx="32" cy="58" r="2.8" fill="${INK}"/>`,
  },
  {
    id: 'casque', name: 'Casque audio',
    over: `<path d="M11 36a21 21 0 0 1 42 0" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/><rect x="5" y="31" width="8.5" height="13" rx="4.2" fill="#FF5A3C"/><rect x="50.5" y="31" width="8.5" height="13" rx="4.2" fill="#FF5A3C"/>`,
  },
  {
    id: 'pirate', name: 'Pirate', eyes: false,
    over: `<path d="M10.5 27a22 22 0 0 1 43 0c-14-4-29-4-43 0z" fill="#FF5A3C"/><path d="M53 25l7.5-2-2.5 7z" fill="#FF5A3C"/>${line('M12 27l40 8', 1.6)}<ellipse cx="39.5" cy="34.5" rx="5" ry="4.2" fill="${INK}"/><circle cx="24.5" cy="34" r="2.6" fill="${INK}"/>`,
  },
  {
    id: 'rondes', name: 'Lunettes rondes',
    over: `<circle cx="24.5" cy="34" r="6.2" fill="rgba(255,255,255,.35)" stroke="${INK}" stroke-width="1.8"/><circle cx="39.5" cy="34" r="6.2" fill="rgba(255,255,255,.35)" stroke="${INK}" stroke-width="1.8"/>${line('M30.7 33.5h2.6', 1.8)}`,
  },
  {
    id: 'hautdeforme', name: 'Haut-de-forme',
    over: `<rect x="20" y="0.5" width="24" height="15" rx="2" fill="${INK}"/><rect x="20" y="10" width="24" height="3.5" fill="#FFD23F"/><rect x="12" y="14" width="40" height="4.5" rx="2.2" fill="${INK}"/>`,
  },
  {
    id: 'bonnet', name: 'Bonnet',
    over: `<path d="M12 23a20 17 0 0 1 40 0z" fill="#FF5A3C"/><rect x="10" y="18.5" width="44" height="7.5" rx="3.7" fill="#FFFDF8" stroke="${INK}" stroke-width="1.2"/><circle cx="32" cy="5.5" r="4.5" fill="#FFFDF8" stroke="${INK}" stroke-width="1.2"/>`,
  },
  {
    id: 'chat', name: 'Chat',
    under: `<path d="M12 27L11 6l15 9zM52 27l1-21-15 9z" fill="var(--c)"/><path d="M15 17l1-5 4 3zM49 17l-1-5-4 3z" fill="#fff" opacity=".55"/>`,
    over: `<path d="M30 38.5h4l-2 2.5z" fill="${INK}"/>${line('M13 37.5l8.5 1.5M13 43l8.5-1M51 37.5L42.5 39M51 43l-8.5-1', 1.3)}`,
  },
  {
    id: 'diable', name: 'Diablotin',
    under: `<path d="M17 22C11 18 10 12 12 6c5 2 9 6 10 12zM47 22c6-4 7-10 5-16-5 2-9 6-10 12z" fill="#FF5A3C"/>`,
    over: line('M20 28.5l8 2.5M44 28.5L36 31', 2.2),
  },
  {
    id: 'ange', name: 'Auréole',
    over: `<ellipse cx="32" cy="7.5" rx="13" ry="3.8" fill="none" stroke="${INK}" stroke-width="5"/><ellipse cx="32" cy="7.5" rx="13" ry="3.8" fill="none" stroke="#FFD23F" stroke-width="3"/>`,
  },
  {
    id: 'clown', name: 'Clown',
    under: `<circle cx="11" cy="27" r="7.5" fill="#FF8A1F"/><circle cx="53" cy="27" r="7.5" fill="#FF8A1F"/>`,
    over: `<circle cx="32" cy="38.5" r="4.2" fill="#FF5A3C"/><circle cx="19.5" cy="41" r="3" fill="#fff" opacity=".5"/><circle cx="44.5" cy="41" r="3" fill="#fff" opacity=".5"/>`,
  },
  {
    id: 'ninja', name: 'Ninja', eyes: false, mouth: false,
    over: `<circle cx="32" cy="36" r="22" fill="${INK}"/><rect x="15" y="28.5" width="34" height="11" rx="5.5" fill="var(--c)"/><circle cx="24.5" cy="34" r="2.6" fill="${INK}"/><circle cx="39.5" cy="34" r="2.6" fill="${INK}"/><path d="M53 30l8-3-2.5 6zM53 33l7 3.5-5 2.5z" fill="${INK}"/>`,
  },
  {
    id: 'barbe', name: 'Barbe', mouth: false,
    over: `<path d="M11.5 38c6 3 13 4 20.5 4s14.5-1 20.5-4c0 10.5-8.5 19.5-20.5 19.5S11.5 48.5 11.5 38z" fill="#5A3A2A"/><path d="M26.5 46q5.5 4 11 0" fill="none" stroke="#FFFDF8" stroke-width="2.2" stroke-linecap="round"/>`,
  },
  {
    id: 'alien', name: 'Extraterrestre', eyes: false,
    under: `<path d="M24 17L20 6M40 17l4-11" fill="none" stroke="var(--c)" stroke-width="2.8" stroke-linecap="round"/><circle cx="19.5" cy="5" r="3.4" fill="#FFD23F"/><circle cx="44.5" cy="5" r="3.4" fill="#FFD23F"/>`,
    over: `<ellipse cx="23.5" cy="33.5" rx="4.8" ry="6.5" fill="${INK}" transform="rotate(-18 23.5 33.5)"/><ellipse cx="40.5" cy="33.5" rx="4.8" ry="6.5" fill="${INK}" transform="rotate(18 40.5 33.5)"/><circle cx="22.5" cy="31" r="1.4" fill="#fff"/><circle cx="39.5" cy="31" r="1.4" fill="#fff"/>`,
  },
  {
    id: 'chignon', name: 'Chignon',
    under: `<circle cx="32" cy="9.5" r="7.5" fill="#5A3A2A"/>`,
    over: `<path d="M10.5 31a22 22 0 0 1 43 0C48.5 24 40.5 21 32 21s-16.5 3-21.5 10z" fill="#5A3A2A"/>`,
  },
  {
    id: 'meche', name: 'Mèche',
    over: `<path d="M10.3 32a22 22 0 0 1 43.4 0c-3-4-7-6.5-12-7.5-8 6-19 7.5-31.4 7.5z" fill="${INK}"/>`,
  },
  {
    id: 'couettes', name: 'Couettes',
    under: `<circle cx="8.5" cy="33" r="6.5" fill="#FF8A1F"/><circle cx="55.5" cy="33" r="6.5" fill="#FF8A1F"/>`,
    over: `<path d="M10.5 31a22 22 0 0 1 43 0C47.5 25 40 22.5 32 22.5S16.5 25 10.5 31z" fill="#FF8A1F"/>`,
  },
  {
    id: 'cowboy', name: 'Cow-boy',
    over: `<path d="M3.5 19c9 5.5 48 5.5 57 0-3-3-9-4-13-4h-31c-4 0-10 1-13 4z" fill="#8A5A2B"/><path d="M19 16C19 7 22 3 26 3c3 0 4 2 6 2s3-2 6-2c4 0 7 4 7 13z" fill="#A46B33"/><path d="M19 13.5h26V16H19z" fill="${INK}" opacity=".55"/>`,
  },
];

const FACE_BY_ID = Object.fromEntries(FACES.map((f) => [f.id, f]));
const COLOR_BY_ID = Object.fromEntries(COLORS.map((c) => [c.id, c.hex]));

export const colorHex = (id) => COLOR_BY_ID[id] || COLORS[0].hex;

function faceSvg(faceId) {
  const f = FACE_BY_ID[faceId] || FACES[0];
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${f.under || ''}<circle cx="32" cy="36" r="22" fill="var(--c)"/>${f.eyes === false ? '' : EYES}${f.mouth === false ? '' : SMILE}${f.over || ''}</svg>`;
}

/**
 * Rendu HTML d'un avatar. `who` porte color, face et éventuellement photo (data URL).
 * @param {string} cls classes de taille : s28, s36, s44, s56, s72, s96, s120
 */
export function avatar(who, cls = 's44') {
  const hex = colorHex(who && who.color);
  if (who && who.photo) return `<span class="av photo ${cls}" style="--c:${hex}"><img src="${who.photo}" alt="" draggable="false"></span>`;
  return `<span class="av ${cls}" style="--c:${hex}">${faceSvg(who && who.face)}</span>`;
}

/** Première couleur et premier déguisement pas encore pris, pour varier les nouveaux profils. */
export function suggestLook(profiles) {
  const usedC = new Set(profiles.map((p) => p.color)), usedF = new Set(profiles.map((p) => p.face));
  const color = (COLORS.find((c) => !usedC.has(c.id)) || COLORS[profiles.length % COLORS.length]).id;
  const face = (FACES.find((f) => !usedF.has(f.id)) || FACES[profiles.length % FACES.length]).id;
  return { color, face };
}
