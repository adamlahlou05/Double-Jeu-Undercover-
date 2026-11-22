#!/usr/bin/env python3
"""Fabrique web/js/words/library.js à partir du classeur data/double-jeu-mots.xlsx (feuille « Mots »).

Usage : python3 scripts/import-words.py [classeur.xlsx]      (dépendance : openpyxl)

Colonnes lues : Pack, Thème, Niveau, Mot A, Explication A, Mot B, Explication B, Offert.
Les autres colonnes (ID, statuts) sont libres. Ensuite : npm run check:words, puis npm test.
"""
import json
import sys
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'data' / 'double-jeu-mots.xlsx'
TARGET = ROOT / 'web' / 'js' / 'words' / 'library.js'

# Packs vendus : nom dans le classeur → identifiant du produit (le même que dans shop.js et la Play Console).
PACKS = {
    'Pack Quotidien': 'pack_quotidien',
    'Pack Culture': 'pack_culture',
    'Pack Écrans & loisirs': 'pack_loisirs',
    'Pack Esprit': 'pack_esprit',
    'Pack Soirée': 'pack_soiree',
    'Pack Coquin': 'pack_coquin',
    'Pack Politique & société': 'pack_politique',
    'Pack Foot': 'pack_foot',
    'Pack Tech & Indus': 'pack_tech',
}

# Thèmes, dans l'ordre d'affichage : nom dans le classeur → (identifiant, nom affiché, description, thème « en plus »).
# L'identifiant ne doit jamais changer : il sert aux réglages enregistrés sur les téléphones.
# « en plus » : thème vendu seul, fermé dans la version navigateur (sans boutique).
THEMES = {
    'Objets': ('objets', 'Objets', 'Maison, sac, garage et grenier', False),
    'À table': ('nourriture', 'À table', 'Plats, desserts, boissons et gourmandises', False),
    'Animaux': ('animaux', 'Animaux', 'Du poisson rouge à l’ornithorynque', False),
    'Scènes du quotidien': ('situations', 'Scènes du quotidien', 'Petites galères et grands classiques', False),
    'Métiers': ('metiers', 'Métiers', 'Du boulanger au thanatopracteur', False),
    'Marques & Logos': ('marques', 'Marques & logos', 'Géants du quotidien, mode, tech, luxe et sport', False),
    'Tour du monde': ('geo', 'Tour du monde', 'Pays, villes, monuments et paysages', False),
    'Histoire & mythes': ('histoire', 'Histoire & mythes', 'Rois, batailles, dieux et légendes', False),
    'Culture générale': ('culture', 'Culture générale', 'Arts, livres, langue et traditions', False),
    'Sciences & nature': ('sciences', 'Sciences & nature', 'Espace, corps humain, météo, plantes', False),
    'Stars & personnages': ('celebrites', 'Stars & personnages', 'Sportifs, acteurs, héros de fiction', False),
    'Cinéma & séries': ('cinema', 'Cinéma & séries', 'Films cultes, héros et petit écran', False),
    'Musique': ('musique', 'Musique', 'Instruments, styles et artistes', False),
    'Sport': ('sport', 'Sport', 'Du baby-foot aux Jeux olympiques', False),
    'Loisirs & jeux': ('loisirs', 'Loisirs & jeux', 'Jeux de société, sorties et passions', False),
    'Tech & numérique': ('tech', 'Tech & numérique', 'Écrans, applis, jeux vidéo et objets connectés', False),
    'Expressions': ('expressions', 'Expressions', 'Ce qu’on dit sans y penser', False),
    'Idées & émotions': ('abstrait', 'Idées & émotions', 'Sentiments, valeurs et grandes notions', False),
    'Insolite & humour': ('humour', 'Insolite & humour', 'Le coin des mots qui font sourire', False),
    'École & boulot': ('ecole', 'École & boulot', 'De la récré à la machine à café', False),
    'Red Flags & Débats': ('redflags', 'Red flags & débats', 'Habitudes clivantes et débats de table', False),
    'Soirée': ('soiree', 'Soirée', 'Apéro, bar, boîte et lendemains difficiles', True),
    'Coquin': ('coquin', 'Coquin', 'Séduction, désir et jeux à deux (adultes)', True),
    'Politique & société': ('politique', 'Politique & société', 'Élus, institutions et débats de comptoir', True),
    'Foot': ('foot', 'Foot', 'Clubs, légendes et mauvaise foi', True),
    'Électricité & électronique': ('elec', 'Électricité & électronique', 'Du disjoncteur au microcontrôleur', True),
}
LEVELS = {'Facile': 1, 'Moyen': 2, 'Corsé': 3}


def main():
    wb = load_workbook(SOURCE, read_only=True, data_only=True)
    if 'Mots' not in wb.sheetnames:
        sys.exit(f'{SOURCE} : feuille « Mots » introuvable.')
    rows = wb['Mots'].iter_rows(values_only=True)
    head = [str(h or '').strip() for h in next(rows)]
    need = ['Pack', 'Thème', 'Niveau', 'Mot A', 'Explication A', 'Mot B', 'Explication B', 'Offert']
    missing = [c for c in need if c not in head]
    if missing:
        sys.exit(f'Colonnes manquantes dans « Mots » : {", ".join(missing)}')
    col = {c: head.index(c) for c in need}
    clean = lambda v: ' '.join(str(v).split()) if v is not None else ''
    themes = {name: [] for name in THEMES}
    pack_of = {}
    errors = []
    for n, r in enumerate(rows, start=2):
        if not r or not any(r):
            continue
        v = {c: clean(r[i]) if i < len(r) else '' for c, i in col.items()}
        where = f'ligne {n}'
        if v['Thème'] not in THEMES:
            errors.append(f'{where} : thème inconnu « {v["Thème"]} » (à déclarer dans scripts/import-words.py)'); continue
        if v['Pack'] not in PACKS:
            errors.append(f'{where} : pack inconnu « {v["Pack"]} »'); continue
        if pack_of.setdefault(v['Thème'], v['Pack']) != v['Pack']:
            errors.append(f'{where} : le thème « {v["Thème"]} » est rangé dans deux packs')
        if v['Niveau'] not in LEVELS:
            errors.append(f'{where} : niveau « {v["Niveau"]} » (attendu : Facile, Moyen ou Corsé)'); continue
        if not v['Mot A'] or not v['Mot B']:
            errors.append(f'{where} : mot manquant'); continue
        if bool(v['Explication A']) != bool(v['Explication B']):
            errors.append(f'{where} : une seule des deux explications est remplie ({v["Mot A"]} / {v["Mot B"]})')
        pair = [LEVELS[v['Niveau']], 1 if v['Offert'].lower() == 'oui' else 0, v['Mot A'], v['Mot B']]
        if v['Explication A'] and v['Explication B']:
            pair += [v['Explication A'], v['Explication B']]
        themes[v['Thème']].append(pair)
    if errors:
        sys.exit('\n'.join(errors[:40]) + (f'\n… et {len(errors) - 40} autres' if len(errors) > 40 else ''))

    out = ['// Fichier généré par scripts/import-words.py à partir de data/double-jeu-mots.xlsx.',
           '// Ne pas le modifier à la main : corriger le classeur, puis relancer le script.',
           '// Une paire : [niveau, offerte, mot A, mot B, explication A, explication B] (explications facultatives).',
           'export default [']
    total = explained = 0
    for name, (tid, label, hint, extra) in THEMES.items():
        pairs = sorted(themes[name], key=lambda p: p[0])
        if not pairs:
            continue
        total += len(pairs); explained += sum(len(p) > 4 for p in pairs)
        meta = json.dumps({'id': tid, 'name': label, 'hint': hint, 'pack': PACKS[pack_of[name]], 'extra': extra}, ensure_ascii=False)
        out.append(f'  {meta[:-1]}, "pairs": [')
        out += [f'    {json.dumps(p, ensure_ascii=False)},' for p in pairs]
        out.append('  ] },')
    out.append('];')
    TARGET.write_text('\n'.join(out) + '\n', encoding='utf-8')
    print(f'{TARGET.relative_to(ROOT)} : {total} paires, dont {explained} expliquées, dans {sum(1 for t in themes.values() if t)} thèmes.')


if __name__ == '__main__':
    main()
