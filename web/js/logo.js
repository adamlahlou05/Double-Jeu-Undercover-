// Logo de Double Jeu : deux cartes. Devant, la carte claire d'un joueur comme les autres ;
// derrière, la carte rouge de l'intrus au chapeau. Dessin vectoriel (repère 108 × 108, le centre
// utile tient dans un cercle de 72), utilisé dans l'application et pour fabriquer l'icône.

import { faceArt } from './avatars.js';

const INK = '#15163B';
const SUN = '#FFD23F';

/** L'intrus : chapeau, visage dans l'ombre, col relevé (repère 64 × 64). */
const SPY = `<path d="M13 64 22.500 47 32 58 41.500 47 51 64z" fill="${INK}"/>
<path d="M22.500 47 32 58M41.500 47 32 58" stroke="${SUN}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
<circle cx="32" cy="36" r="17.5" fill="${INK}"/>
<path d="M20.500 33.500l9.500 3.200q-4.700 4.300-9.500 1.300zM43.500 33.500 34 36.700q4.700 4.300 9.500 1.300z" fill="#fff"/>
<path d="M19 21C19 10 24 5 32 5s13 5 13 16z" fill="${INK}"/>
<path d="M19.600 14q12.400-2.800 24.800 0l.6 4.600q-13-2.600-26 0z" fill="${SUN}"/>
<ellipse cx="32" cy="21.500" rx="25.500" ry="5.200" fill="${INK}"/>`.replace(/(\d)\.(\d*?)0+(?=[^\d])/g, (m, a, b) => (b ? `${a}.${b}` : a));

/** Les deux cartes, sans fond. */
export function logoArt() {
  return `<g transform="rotate(12 64 50)">
<rect x="49" y="29.5" width="30" height="41" rx="6" fill="#FF5A3C" stroke="${INK}" stroke-width="2.4"/>
<g transform="translate(50.6 33) scale(.42)">${SPY}</g>
</g>
<g transform="rotate(-9 45 58)">
<rect x="30" y="37.5" width="30" height="41" rx="6" fill="#FFFDF8" stroke="${INK}" stroke-width="2.4"/>
<path d="M45 41.2v3.600M39.800 42.600l1.700 3.100M50.200 42.600l-1.700 3.100" stroke="#FFC21A" stroke-width="2.300" stroke-linecap="round" fill="none"/>
<g transform="translate(32.2 48.6) scale(.4)" style="--c:#4DBBFF">${faceArt('dino')}</g>
</g>`.replace(/(\d)\.(\d*?)0+(?=[^\d])/g, (m, a, b) => (b ? `${a}.${b}` : a));
}

/** Silhouette en une seule teinte, pour les icônes « à thème » d'Android. */
export function logoMono() {
  return `<g transform="rotate(12 64 50)"><rect x="49" y="29.5" width="30" height="41" rx="6" fill="none" stroke="#fff" stroke-width="3.2"/>
<path d="M56.500 47.500h15M58.500 47c0-5 2-8 5.500-8s5.500 3 5.500 8" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/></g>
<g transform="rotate(-9 45 58)"><mask id="lm"><rect x="0" y="0" width="108" height="108" fill="#fff"/><circle cx="40.200" cy="56" r="2.300" fill="#000"/><circle cx="49.800" cy="56" r="2.300" fill="#000"/><path d="M39.500 62q5.500 4.600 11 0" stroke="#000" stroke-width="2.600" stroke-linecap="round" fill="none"/></mask>
<rect x="28.200" y="35.700" width="33.600" height="44.600" rx="7.600" fill="#000"/>
<rect x="30" y="37.500" width="30" height="41" rx="6" fill="#fff" mask="url(#lm)"/></g>`.replace(/(\d)\.(\d*?)0+(?=[^\d])/g, (m, a, b) => (b ? `${a}.${b}` : a));
}
