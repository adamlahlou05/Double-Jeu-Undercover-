// Lecture des données enregistrées ou importées : rien d'autre que des données ne doit passer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanProfile, parseImport, PHOTO_RE } from '../../web/js/store.js';
import { avatar } from '../../web/js/avatars.js';

const jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';

test('profil : une photo est une image encodée, rien d’autre', () => {
  assert.equal(cleanProfile({ id: 'p1', name: 'Léa', photo: jpeg }).photo, jpeg);
  assert.ok(PHOTO_RE.test('data:image/png;base64,iVBORw0KGgo='));
  for (const bad of [
    'data:image/jpeg;base64,AAAA" onerror="alert(1)',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:text/html;base64,PGI+',
    'javascript:alert(1)',
    'https://exemple.fr/photo.jpg',
    'data:image/jpeg;base64,AAAA\n<script>',
    42,
  ]) assert.equal(cleanProfile({ id: 'p1', name: 'Léa', photo: bad }).photo, '', String(bad));
});

test('profil : un identifiant trafiqué écarte le profil', () => {
  assert.ok(cleanProfile({ id: 'pm3k9x2ab', name: 'Léa' }));
  assert.equal(cleanProfile({ id: 'x" onclick="alert(1)', name: 'Léa' }), null);
  assert.equal(cleanProfile({ id: '<b>', name: 'Léa' }), null);
  assert.equal(cleanProfile({ id: '', name: 'Léa' }), null);
  assert.equal(cleanProfile({ id: 'p1', name: '   ' }), null);
});

test('affichage : même une photo trafiquée déjà en mémoire ne sort pas de son attribut', () => {
  const html = avatar({ color: 'soleil', face: 'agent', photo: 'data:image/jpeg;base64,AAAA" onerror="alert(1)' }, 's44');
  assert.equal((html.match(/"/g) || []).length % 2, 0);
  assert.ok(!/onerror="/.test(html), html);
  assert.ok(!/\son\w+=/.test(html.replace(/src="[^"]*"/, '')), html);
});

test('import : les fiches trafiquées sont écartées, les autres gardées', () => {
  const file = JSON.stringify({
    app: 'double-jeu', format: 1,
    meta: {},
    profiles: [
      { id: 'pa1', name: 'Adam', color: 'soleil', face: 'agent', photo: jpeg },
      { id: 'pb" onpointerdown="x()', name: 'Piège', color: 'soleil', face: 'agent' },
      { id: 'pc1', name: 'Léa', color: 'menthe', face: 'renard', photo: 'data:image/jpeg;base64,AA" onload="x()' },
    ],
    history: [
      { id: 'h1', at: 1700000000000, winner: 'civil', players: [{ id: 'pa1', name: 'Adam' }] },
      { id: 'h2"><img src=x>', at: 1700000000000, winner: 'civil', players: [{ id: 'pa1', name: 'Adam' }] },
      { id: 'h3', at: 1700000000000, winner: 'civil', players: [{ id: 'x" onclick="y()', name: 'Piège' }] },
    ],
  });
  const data = parseImport(file);
  assert.deepEqual(data.profiles.map((p) => p.id), ['pa1', 'pc1']);
  assert.equal(data.profiles[0].photo, jpeg);
  assert.equal(data.profiles[1].photo, '');
  assert.deepEqual(data.history.map((h) => h.id), ['h1']);
  assert.throws(() => parseImport('{"app":"autre"}'), /Double Jeu/);
  assert.throws(() => parseImport('pas du json'), /lisible/);
});
