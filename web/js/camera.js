// Appareil photo intégré, pour les photos de profil. La caméra est affichée dans une fenêtre de
// l'application (getUserMedia) : rien n'est enregistré ailleurs que dans le profil, rien ne quitte le téléphone.

let stream = null;
let ticket = 0;

const fail = (name) => Object.assign(new Error(name), { name });

export const cameraSupported = () => !!(typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
export const cameraStream = () => stream;

/** Coupe la caméra (le voyant s'éteint) et annule toute ouverture encore en attente. */
export function stopCamera() {
  ticket++;
  if (stream) {
    try { stream.getTracks().forEach((t) => t.stop()); } catch (e) { /* déjà arrêtée */ }
    stream = null;
  }
}

/**
 * Ouvre la caméra avant ('user') ou arrière ('environment'). Le micro n'est jamais demandé.
 * @returns {Promise<{mirror:boolean}>} mirror : vrai pour une caméra tournée vers l'utilisateur.
 */
export async function startCamera(facing) {
  stopCamera();
  const mine = ++ticket;
  if (!cameraSupported()) throw fail('NotSupportedError');
  const got = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: facing }, width: { ideal: 960 }, height: { ideal: 960 } },
  });
  if (mine !== ticket) {
    // La fenêtre a été fermée (ou la caméra changée) pendant la demande d'autorisation.
    got.getTracks().forEach((t) => t.stop());
    throw fail('Cancelled');
  }
  stream = got;
  let actual = '';
  try { actual = got.getVideoTracks()[0].getSettings().facingMode || ''; } catch (e) { /* non renseigné */ }
  return { mirror: actual ? actual === 'user' : facing === 'user' };
}

/** Nombre de caméras du téléphone (utile seulement une fois l'autorisation accordée). */
export async function countCameras() {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === 'videoinput').length;
  } catch (e) {
    return 1;
  }
}

/** Branche le flux sur la balise vidéo affichée (à refaire après chaque rendu, sans effet si c'est déjà fait). */
export function attachCamera(video) {
  if (!video || !stream || video.srcObject === stream) return;
  video.srcObject = stream;
  const playing = video.play();
  if (playing && playing.catch) playing.catch(() => { /* lecture relancée au prochain rendu */ });
}

/** Photo carrée, recadrée au centre et compressée. Renvoie '' si la caméra n'a pas encore d'image. */
export function snapshot(video, size, mirror) {
  const w = video ? video.videoWidth : 0, h = video ? video.videoHeight : 0;
  if (!w || !h) return '';
  const side = Math.min(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  // Le selfie est enregistré comme on s'est vu à l'écran, en miroir.
  if (mirror) { ctx.translate(size, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.86);
}

/** Message clair selon la raison de l'échec, et s'il s'agit d'un refus d'autorisation. */
export function cameraProblem(err) {
  const name = (err && err.name) || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return { denied: true, text: 'L’appareil photo n’est pas autorisé. Tu peux l’autoriser dans les réglages du téléphone, ou garder un personnage : il fait très bien l’affaire.' };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return { denied: false, text: 'Aucun appareil photo trouvé sur cet appareil. Choisis un personnage à la place.' };
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return { denied: false, text: 'L’appareil photo est occupé par une autre application. Ferme-la puis réessaie, ou garde un personnage.' };
  }
  return { denied: false, text: 'L’appareil photo ne peut pas s’ouvrir ici. Choisis un personnage à la place.' };
}
