// Statistiques et classements, toujours recalculés à partir de l'historique des parties :
// une seule source de vérité, donc aucun compteur qui puisse se désynchroniser.

export function emptyStats() {
  return {
    games: 0, wins: 0, points: 0,
    roles: { civil: { g: 0, w: 0 }, under: { g: 0, w: 0 }, white: { g: 0, w: 0 } },
    streak: 0, bestStreak: 0,
    guessTries: 0, guessOk: 0,
    firstOut: 0, survived: 0,
    votes: 0, goodVotes: 0,
    last: 0, form: [],
  };
}

/** @returns {Object<string, ReturnType<typeof emptyStats>>} statistiques par identifiant de joueur */
export function computeStats(history, since = 0) {
  const out = {};
  const games = history.filter((h) => h && h.at >= since).sort((a, b) => a.at - b.at);
  for (const rec of games) {
    const firstOut = (rec.log || []).map((l) => l.out).find((i) => i >= 0);
    rec.players.forEach((p, idx) => {
      const s = out[p.id] || (out[p.id] = emptyStats());
      s.games++;
      s.points += p.pts || 0;
      const r = s.roles[p.role] || (s.roles[p.role] = { g: 0, w: 0 });
      r.g++;
      if (p.won) { s.wins++; r.w++; s.streak++; if (s.streak > s.bestStreak) s.bestStreak = s.streak; } else s.streak = 0;
      if (p.alive) s.survived++;
      if (firstOut === idx) s.firstOut++;
      s.last = rec.at;
      s.form.push(p.won ? 1 : 0);
      if (s.form.length > 6) s.form.shift();
      for (const l of rec.log || []) {
        if (l.out === idx && l.guess && p.role === 'white') { s.guessTries++; if (l.guess.ok) s.guessOk++; }
        // Flair : part des bulletins d'un Civil qui visaient bien un infiltré (vote secret uniquement).
        if (p.role === 'civil') {
          for (const v of l.votes || []) {
            if (!v.ballots || v.ballots[idx] === undefined) continue;
            const target = rec.players[v.ballots[idx]];
            if (!target) continue;
            s.votes++;
            if (target.role !== 'civil') s.goodVotes++;
          }
        }
      }
    });
  }
  return out;
}

export const winRate = (s) => (s && s.games ? s.wins / s.games : 0);
export const average = (s) => (s && s.games ? s.points / s.games : 0);

/** Classement : points, puis victoires, puis taux de victoire, puis nom. */
export function leaderboard(profiles, stats, sort = 'points') {
  const rows = profiles.map((p) => ({ profile: p, s: stats[p.id] || emptyStats() }));
  const key = {
    points: (r) => r.s.points,
    wins: (r) => r.s.wins,
    avg: (r) => average(r.s),
  }[sort] || ((r) => r.s.points);
  rows.sort((a, b) => key(b) - key(a) || b.s.points - a.s.points || b.s.wins - a.s.wins || winRate(b.s) - winRate(a.s)
    || a.profile.name.localeCompare(b.profile.name, 'fr'));
  let rank = 0, prev = null;
  rows.forEach((r, i) => {
    const v = key(r);
    if (prev === null || v !== prev) rank = i + 1;
    prev = v;
    r.rank = rank;
  });
  return rows;
}

/** Petites distinctions attribuées quand il y a assez de parties pour qu'elles aient un sens. */
export function awards(profiles, stats) {
  const rows = profiles.map((p) => ({ p, s: stats[p.id] })).filter((r) => r.s && r.s.games >= 3);
  const best = (score, min) => {
    let top = null;
    for (const r of rows) {
      const v = score(r.s);
      if (v === null || v < min) continue;
      if (!top || v > top.v) top = { p: r.p, v };
    }
    return top;
  };
  const list = [];
  const bluff = best((s) => { const g = s.roles.under.g + s.roles.white.g; return g >= 2 ? (s.roles.under.w + s.roles.white.w) / g : null; }, 0.34);
  if (bluff) list.push({ id: 'bluff', title: 'Maître du bluff', text: `${Math.round(bluff.v * 100)} % de victoires comme infiltré`, p: bluff.p });
  const flair = best((s) => (s.votes >= 5 ? s.goodVotes / s.votes : null), 0.34);
  if (flair) list.push({ id: 'flair', title: 'Fin limier', text: `${Math.round(flair.v * 100)} % de votes sur un infiltré`, p: flair.p });
  const surv = best((s) => (s.games >= 4 ? s.survived / s.games : null), 0.5);
  if (surv) list.push({ id: 'survie', title: 'Insubmersible', text: `En vie à la fin de ${Math.round(surv.v * 100)} % des parties`, p: surv.p });
  const devin = best((s) => (s.guessOk >= 1 ? s.guessOk : null), 1);
  if (devin) list.push({ id: 'devin', title: 'Devin', text: `${devin.v} mot${devin.v > 1 ? 's' : ''} deviné${devin.v > 1 ? 's' : ''} en Mr. White`, p: devin.p });
  const serie = best((s) => (s.bestStreak >= 3 ? s.bestStreak : null), 3);
  if (serie) list.push({ id: 'serie', title: 'Sur sa lancée', text: `${serie.v} victoires d’affilée`, p: serie.p });
  return list;
}
