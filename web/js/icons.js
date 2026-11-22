// Pictogrammes au trait (24 × 24), dessinés pour l'application.
import { logoArt } from './logo.js';
const P = {
  cards: '<rect x="3.5" y="7" width="10" height="13.5" rx="2.2" transform="rotate(-9 8.5 13.75)"/><rect x="10.5" y="4" width="10" height="13.5" rx="2.2" transform="rotate(9 15.5 10.75)"/>',
  users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 19.5c.6-3.4 3.1-5.5 6.5-5.5s5.9 2.1 6.5 5.5"/><circle cx="17.5" cy="9.5" r="2.5"/><path d="M18 14.2c2 .4 3.3 1.9 3.7 4.3"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5.5H4.5c0 2.9 1.4 4.4 3.7 4.7M16 5.5h3.5c0 2.9-1.4 4.4-3.7 4.7M12 13v4M8.5 20h7M9.5 17h5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17" r="2"/>',
  book: '<path d="M4 5.5c2.5-1 5.5-1 8 .5 2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5zM12 6v13"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  next: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
  eye: '<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  trash: '<path d="M5 7h14M9.5 7V5h5v2M7 7l.8 12h8.4L17 7M10 10.5v5M14 10.5v5"/>',
  crown: '<path d="M4 19h16M5 15.5 3.8 7.5l4.7 3.6L12 5l3.5 6.1 4.7-3.6L19 15.5z"/>',
  edit: '<path d="M5 19l1-4L16.5 4.5l3 3L9 18zM14.5 6.5l3 3"/>',
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  image: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M5 17l4.5-4 3.5 3 2.5-2 3.5 3"/>',
  timer: '<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V10M9.5 3.5h5M12 3.5v3"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  replay: '<path d="M5 12a7 7 0 0 1 12-4.9L19 9M19 5v4h-4M19 12a7 7 0 0 1-12 4.9L5 15M5 19v-4h4"/>',
  door: '<path d="M10 4h8v16h-8M14 12H4M7 8.5L3.5 12 7 15.5"/>',
  sound: '<path d="M5 9.5v5h3l4.5 3.5V6L8 9.5zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  vibrate: '<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M4 9v6M20 9v6"/>',
  sparkle: '<path d="M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8z"/>',
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14"/>',
  upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 19h14"/>',
  lock: '<rect x="6" y="11" width="12" height="9" rx="2"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
  hand: '<path d="M8 12V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8c0 3.5-2.2 6-5.5 6-2.5 0-3.8-1-5-3L4.7 13.8a1.4 1.4 0 0 1 2.3-1.5L8 13.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.2"/>',
  quest: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.7 2.2c-.9.5-1.3 1-1.3 1.9M12 16.6v.2"/>',
  words: '<path d="M4 6h16M4 11h10M4 16h13"/>',
  bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
  mask: '<path d="M3 9c3-2.2 6-2.3 9-.8 3-1.5 6-1.4 9 .8.3 3.2-1.4 5.8-4.2 5.8-2.3 0-3.4-1.6-4.8-1.6s-2.5 1.6-4.8 1.6C4.4 14.8 2.7 12.2 3 9z"/><path d="M7.2 10.8h2M14.8 10.8h2"/>',
  dots: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
  swap: '<path d="M7 4L3.5 7.5 7 11M3.5 7.5h13M17 13l3.5 3.5L17 20M20.5 16.5h-13"/>',
};

export function icon(name, size = 22, extra = '') {
  const body = P[name] || '';
  const fill = name === 'play' ? 'currentColor' : 'none';
  return `<svg class="ic ${extra}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

/** Emblèmes des rôles : la bulle (les Civils ont le mot), le loup (l'Undercover), le point d'interrogation (Mr. White). */
export function roleMark(role, size = 64) {
  const inner = {
    civil: '<circle cx="32" cy="32" r="30" fill="var(--blue)"/><path d="M17 20h30a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H33l-8 7v-7h-8a4 4 0 0 1-4-4V24a4 4 0 0 1 4-4z" fill="#fff"/><path d="M21 28h22M21 34h14" stroke="var(--blue)" stroke-width="3" stroke-linecap="round"/>',
    under: '<circle cx="32" cy="32" r="30" fill="var(--tomato)"/><path d="M11 27c7-5 14-5.5 21-2 7-3.5 14-3 21 2 .6 7-3.4 13-9.8 13-5.2 0-7.8-3.6-11.2-3.6S26 40 20.8 40C14.4 40 10.4 34 11 27z" fill="#15163B"/><ellipse cx="23" cy="31.5" rx="4.2" ry="3" fill="#fff"/><ellipse cx="41" cy="31.5" rx="4.2" ry="3" fill="#fff"/>',
    white: '<circle cx="32" cy="32" r="29" fill="#FFFDF8" stroke="#15163B" stroke-width="2"/><path d="M24.5 25.5a7.5 7.5 0 1 1 11 6.6c-2.5 1.4-3.5 3-3.5 6.2" fill="none" stroke="#15163B" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="46.5" r="3.2" fill="#15163B"/>',
  }[role] || '';
  return `<svg class="rolemark" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${inner}</svg>`;
}

/** Marque de l'application : deux mots qui se recoupent, et Mr. White dans l'intersection. */
export function brandMark(size = 64) {
  return `<svg class="brand" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><circle cx="23" cy="32" r="18" fill="#FFD23F"/><circle cx="41" cy="32" r="18" fill="#FF5A3C"/><path d="M32 16.4a18 18 0 0 1 0 31.2 18 18 0 0 1 0-31.2z" fill="#FFFDF8"/></svg>`;
}

/** Le logo : les deux cartes (accueil, boutique). */
export function logoMark(size = 64) {
  return `<svg class="logo" viewBox="17 17 74 74" width="${size}" height="${size}" aria-hidden="true">${logoArt()}</svg>`;
}
