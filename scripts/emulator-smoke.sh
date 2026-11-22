#!/usr/bin/env bash
# Essai de l'APK sur un appareil ou un émulateur Android branché (adb) :
# installation, démarrage, affichage de l'accueil, navigation, redémarrage, absence de plantage.
# Usage : scripts/emulator-smoke.sh chemin/vers/double-jeu.apk
set -euo pipefail

APK="${1:?chemin du fichier APK manquant}"
PKG="io.github.adamlahlou05.doublejeu"
OUT="emulator-out"
mkdir -p "$OUT"

dump() { # texte visible à l'écran (arbre d'accessibilité, WebView comprise)
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true
  adb exec-out cat /sdcard/ui.xml 2>/dev/null || true
}
wait_for() { # attend qu'un texte apparaisse à l'écran
  local text="$1" tries="${2:-40}"
  for _ in $(seq "$tries"); do
    if dump | grep -q "$text"; then return 0; fi
    sleep 3
  done
  echo "ÉCHEC : « $text » n'apparaît pas à l'écran" >&2
  adb exec-out screencap -p > "$OUT/echec.png" || true
  dump > "$OUT/echec.xml" || true
  adb logcat -d > "$OUT/logcat.txt" || true
  return 1
}
tap_text() { # touche le centre de l'élément qui porte ce texte
  local text="$1" bounds
  bounds=$(dump | tr '>' '>\n' | grep "text=\"$text\"" | grep -o 'bounds="[^"]*"' | head -1 | grep -o '[0-9]\+' | tr '\n' ' ')
  [ -n "$bounds" ] || { echo "ÉCHEC : rien à toucher pour « $text »" >&2; return 1; }
  set -- $bounds
  adb shell input tap $(( ($1 + $3) / 2 )) $(( ($2 + $4) / 2 ))
}

adb logcat -c || true
adb install -r "$APK"
adb shell am start -W -n "$PKG/.MainActivity" >/dev/null

wait_for "Jouer"
adb exec-out screencap -p > "$OUT/1-accueil.png"

tap_text "Règles du jeu"
wait_for "Les trois rôles" 20
adb exec-out screencap -p > "$OUT/2-regles.png"

adb shell input keyevent KEYCODE_BACK
wait_for "Règles du jeu" 20

tap_text "Joueurs"
wait_for "Ajouter un joueur" 20
adb exec-out screencap -p > "$OUT/3-joueurs.png"

# Redémarrage complet : l'application doit revenir sans plantage.
adb shell am force-stop "$PKG"
adb shell am start -W -n "$PKG/.MainActivity" >/dev/null
wait_for "Jouer"

adb logcat -d > "$OUT/logcat.txt" || true
if grep -E "FATAL EXCEPTION|Force finishing activity $PKG" "$OUT/logcat.txt"; then
  echo "ÉCHEC : plantage détecté dans les journaux" >&2
  exit 1
fi
echo "Essai réussi : installation, accueil, règles, bouton retour, onglet Joueurs, redémarrage."
