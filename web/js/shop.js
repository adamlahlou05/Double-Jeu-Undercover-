// Économie du jeu : parties en réserve, pubs avec récompense, achats.
// Ce module ne contient que des règles pures (testées sans téléphone). Les pubs et les paiements
// eux-mêmes passent par la coque Android (window.DJNative) ; dans un navigateur il n'y a ni l'un ni
// l'autre, et le jeu reste entièrement ouvert, sans les packs à débloquer.

export const SHOP = {
  START: 3,          // parties offertes à l'installation : la première se joue donc sans aucune pub
  REWARD: 2,         // parties gagnées par pub regardée jusqu'au bout
  MAX: 10,           // plafond de la réserve
  RESCUE_PER_DAY: 2, // parties offertes par 24 h quand aucune pub n'est disponible (hors ligne, panne)
  PREMIUM: 'premium',
};

/** Packs de thèmes vendus à l'unité. `cat` est l'identifiant du thème dans la bibliothèque de mots. */
export const PACKS = [
  { id: 'pack_soiree', cat: 'soiree', name: 'Pack Soirée', pitch: 'Apéro, bar, boîte et lendemains difficiles.' },
  { id: 'pack_politique', cat: 'politique', name: 'Pack Politique & société', pitch: 'Élus, institutions et débats de comptoir.' },
  { id: 'pack_foot', cat: 'foot', name: 'Pack Foot', pitch: 'Clubs, légendes et mauvaise foi.' },
];

export const PRODUCT_IDS = [SHOP.PREMIUM, ...PACKS.map((p) => p.id)];

const DAY = 24 * 60 * 60 * 1000;
const int = (v, d) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : d);

/** La boutique n'existe que dans l'application Android. */
export const shopActive = () => typeof window !== 'undefined' && !!(window.DJNative && window.DJNative.shopInfo);

/** État enregistré avec les réglages : réserve de parties, parties lancées, achats connus. */
export function cleanEco(e) {
  e = e && typeof e === 'object' ? e : {};
  return {
    credits: Math.max(0, Math.min(SHOP.MAX, int(e.credits, SHOP.START))),
    played: Math.max(0, int(e.played, 0)),
    rescues: (Array.isArray(e.rescues) ? e.rescues : []).filter((t) => Number(t) > 0).slice(-10).map(Number),
    owned: (Array.isArray(e.owned) ? e.owned : []).filter((id) => PRODUCT_IDS.includes(id)),
  };
}

export const isPremium = (eco) => eco.owned.includes(SHOP.PREMIUM);
/** Un pack est ouvert s'il a été acheté, ou si le jeu illimité l'a été. */
export const ownsPack = (eco, packId) => isPremium(eco) || eco.owned.includes(packId);
export const canStart = (eco) => isPremium(eco) || eco.credits > 0;

/** Une partie démarre : une partie de la réserve est consommée (rien en illimité). */
export function spend(eco) {
  const next = { ...eco, played: eco.played + 1 };
  if (!isPremium(eco)) next.credits = Math.max(0, eco.credits - 1);
  return next;
}

/** Une pub a été regardée jusqu'au bout. */
export const reward = (eco) => ({ ...eco, credits: Math.min(SHOP.MAX, eco.credits + SHOP.REWARD) });

/** Parties de secours encore disponibles (quand aucune pub ne peut être affichée). */
export function rescuesLeft(eco, now = Date.now()) {
  return Math.max(0, SHOP.RESCUE_PER_DAY - eco.rescues.filter((t) => now - t < DAY && t <= now).length);
}

export function useRescue(eco, now = Date.now()) {
  return { ...eco, rescues: eco.rescues.filter((t) => now - t < DAY && t <= now).concat(now) };
}

/** Achats confirmés par Google Play (ou retirés après un remboursement). */
export const withOwned = (eco, ids) => ({ ...eco, owned: (Array.isArray(ids) ? ids : []).filter((id) => PRODUCT_IDS.includes(id)) });
