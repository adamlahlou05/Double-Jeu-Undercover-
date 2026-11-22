// Économie du jeu : parties en réserve, pubs avec récompense, thèmes à débloquer, achats.
//
// Ce qui est offert à tous : une « sélection découverte » de 150 paires faciles (300 mots), et des parties en
// réserve (3 au départ, 2 de plus par pub regardée jusqu'au bout).
// Ce qui se débloque : les thèmes (tous visibles, verrouillés), pour choisir ses sujets et les niveaux
// Moyen et Corsé. Trois façons : acheter le pack du thème, acheter « Double Jeu illimité » (tout, sans
// pub), ou regarder une pub pour essayer un thème pendant quelques heures.
// Ce module ne contient que des règles pures (testées sans téléphone). Les pubs et les paiements
// eux-mêmes passent par la coque Android (window.DJNative) ; dans un navigateur il n'y a ni l'un ni
// l'autre, et le jeu reste entièrement ouvert, sans les packs à débloquer.

export const SHOP = {
  START: 3,          // parties offertes à l'installation : la première se joue donc sans aucune pub
  REWARD: 2,         // parties gagnées par pub regardée jusqu'au bout
  MAX: 10,           // plafond de la réserve
  RESCUE_PER_DAY: 2, // parties offertes par 24 h quand aucune pub n'est disponible (hors ligne, panne)
  TRIAL_HOURS: 12,   // durée d'essai d'un thème débloqué par une pub
  PREMIUM: 'premium',
};

/** Packs vendus à l'unité. `cats` : thèmes de la bibliothèque que le pack débloque. */
export const PACKS = [
  { id: 'pack_quotidien', name: 'Pack Quotidien', pitch: 'Objets, cuisine, animaux, situations, métiers.', cats: ['objets', 'nourriture', 'animaux', 'situations', 'metiers'] },
  { id: 'pack_culture', name: 'Pack Culture', pitch: 'Géographie, histoire, culture, sciences, célébrités.', cats: ['geo', 'histoire', 'culture', 'sciences', 'celebrites'] },
  { id: 'pack_loisirs', name: 'Pack Écrans & loisirs', pitch: 'Cinéma, musique, sport, loisirs, tech.', cats: ['cinema', 'musique', 'sport', 'loisirs', 'tech'] },
  { id: 'pack_esprit', name: 'Pack Esprit', pitch: 'Expressions, idées, humour, école & boulot, électricité.', cats: ['expressions', 'abstrait', 'humour', 'ecole', 'elec'] },
  { id: 'pack_soiree', name: 'Pack Soirée', pitch: 'Apéro, bar, boîte et lendemains difficiles.', cats: ['soiree'] },
  { id: 'pack_coquin', name: 'Pack Coquin', pitch: 'Séduction, flirt et sous-entendus. Pour adultes.', cats: ['coquin'] },
  { id: 'pack_politique', name: 'Pack Politique & société', pitch: 'Élus, institutions et débats de comptoir.', cats: ['politique'] },
  { id: 'pack_foot', name: 'Pack Foot', pitch: 'Clubs, légendes et mauvaise foi.', cats: ['foot'] },
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
    // Thèmes à l'essai (débloqués par une pub) : identifiant du thème → heure de fin.
    trials: Object.fromEntries(Object.entries(e.trials && typeof e.trials === 'object' ? e.trials : {}).filter(([k, t]) => typeof k === 'string' && Number(t) > 0).slice(-40).map(([k, t]) => [k, Number(t)])),
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

/** Un thème est-il à l'essai en ce moment ? */
export const trialActive = (eco, catId, now = Date.now()) => Number(eco.trials[catId]) > now;
/** Fin de l'essai en cours pour ce thème (0 s'il n'y en a pas). */
export const trialEnd = (eco, catId, now = Date.now()) => (trialActive(eco, catId, now) ? Number(eco.trials[catId]) : 0);

/** Une pub a été regardée jusqu'au bout pour essayer un thème : il s'ouvre pour quelques heures. */
export function grantTrial(eco, catId, now = Date.now()) {
  const trials = Object.fromEntries(Object.entries(eco.trials).filter(([, t]) => t > now));
  trials[catId] = now + SHOP.TRIAL_HOURS * 60 * 60 * 1000;
  return { ...eco, trials };
}

/** Un thème (objet de la bibliothèque, avec son champ `pack`) est-il jouable ? Acheté, illimité, ou à l'essai. */
export const themeOpen = (eco, cat, now = Date.now()) => ownsPack(eco, cat.pack) || trialActive(eco, cat.id, now);
