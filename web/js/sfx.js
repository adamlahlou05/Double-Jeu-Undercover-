// Sons synthétisés (aucun fichier audio) et vibrations. Tout est coupable depuis les réglages.

let ctx = null;
let soundOn = true;
let hapticsOn = true;

export function configureFeedback({ sound, haptics }) {
  soundOn = !!sound;
  hapticsOn = !!haptics;
}

function audio() {
  if (!soundOn) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch (e) {
    return null;
  }
}

function tone(freq, start, dur, type = 'sine', vol = 0.07, glideTo = 0) {
  const ac = audio();
  if (!ac) return;
  try {
    const t0 = ac.currentTime + start;
    const osc = ac.createOscillator(), gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  } catch (e) { /* le son n'est jamais bloquant */ }
}

export const sfx = {
  tap() { tone(520, 0, 0.05, 'triangle', 0.035); },
  flip() { tone(300, 0, 0.16, 'triangle', 0.05, 760); },
  hide() { tone(700, 0, 0.12, 'triangle', 0.04, 320); },
  cast() { tone(440, 0, 0.07, 'sine', 0.06); tone(660, 0.07, 0.1, 'sine', 0.06); },
  suspense() { for (let i = 0; i < 6; i++) tone(180 + i * 14, i * 0.22, 0.12, 'sine', 0.05); },
  good() { [523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.18, 'triangle', 0.07)); },
  bad() { tone(330, 0, 0.2, 'sawtooth', 0.035, 180); tone(196, 0.16, 0.3, 'sawtooth', 0.035, 110); },
  win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.22, 'triangle', 0.075)); },
  tick() { tone(880, 0, 0.04, 'square', 0.025); },
  alarm() { [880, 880, 880].forEach((f, i) => tone(f, i * 0.18, 0.12, 'square', 0.05)); },
};

/** Vibration courte (durée en ms, ou motif [vibre, pause, vibre…]). */
export function buzz(pattern = 18) {
  if (!hapticsOn) return;
  try {
    if (window.DJNative && window.DJNative.vibrate) {
      window.DJNative.vibrate(Array.isArray(pattern) ? pattern.join(',') : String(pattern));
    } else if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (e) { /* idem */ }
}
