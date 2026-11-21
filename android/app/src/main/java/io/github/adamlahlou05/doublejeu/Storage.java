package io.github.adamlahlou05.doublejeu;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.regex.Pattern;

/**
 * Sauvegarde des données du jeu dans le stockage privé de l'application : un fichier par « tiroir »
 * (meta, profiles, history, game).
 *
 * Chaque écriture passe par un fichier temporaire puis un renommage atomique, et la version précédente
 * est gardée en copie de secours : une coupure au mauvais moment (batterie, appli tuée) ne peut pas
 * laisser un fichier à moitié écrit.
 */
final class Storage {

    private static final Pattern KEY = Pattern.compile("[a-z]{1,24}");

    private final File dir;
    private final Object lock = new Object();

    Storage(File dir) {
        this.dir = dir;
    }

    private File file(String key, String extension) {
        return new File(dir, "dj-" + key + extension);
    }

    /** Contenu du tiroir (ou de sa copie de secours), chaîne vide s'il n'existe pas ou n'est pas lisible. */
    String read(String key, boolean backup) {
        if (key == null || !KEY.matcher(key).matches()) return "";
        synchronized (lock) {
            File source = file(key, backup ? ".bak" : ".json");
            if (!source.isFile()) return "";
            try {
                return new String(Files.readAllBytes(source.toPath()), StandardCharsets.UTF_8);
            } catch (IOException | RuntimeException e) {
                return "";
            }
        }
    }

    /** Remplace le contenu du tiroir. Renvoie false si l'écriture a échoué (stockage plein, par exemple). */
    boolean write(String key, String content) {
        if (key == null || content == null || !KEY.matcher(key).matches()) return false;
        synchronized (lock) {
            File main = file(key, ".json");
            File temp = file(key, ".tmp");
            File backup = file(key, ".bak");
            try {
                try (FileOutputStream out = new FileOutputStream(temp)) {
                    out.write(content.getBytes(StandardCharsets.UTF_8));
                    out.getFD().sync();
                }
                if (main.isFile()) {
                    Files.copy(main.toPath(), backup.toPath(), StandardCopyOption.REPLACE_EXISTING);
                }
                Files.move(temp.toPath(), main.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
                return true;
            } catch (IOException | RuntimeException e) {
                //noinspection ResultOfMethodCallIgnored
                temp.delete();
                return false;
            }
        }
    }
}
