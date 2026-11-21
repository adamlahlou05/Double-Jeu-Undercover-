package io.github.adamlahlou05.doublejeu;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

/** La sauvegarde sur fichiers : écriture atomique, copie de secours, clés contrôlées. */
public class StorageTest {

    @Rule
    public TemporaryFolder folder = new TemporaryFolder();

    @Test
    public void writesThenReadsBack() throws Exception {
        Storage storage = new Storage(folder.getRoot());
        assertEquals("", storage.read("profiles", false));
        assertTrue(storage.write("profiles", "[{\"name\":\"Léa\"}]"));
        assertEquals("[{\"name\":\"Léa\"}]", storage.read("profiles", false));
        assertEquals("pas de copie de secours avant la deuxième écriture", "", storage.read("profiles", true));
        assertFalse("le fichier temporaire ne doit pas rester", new File(folder.getRoot(), "dj-profiles.tmp").exists());
    }

    @Test
    public void keepsPreviousVersionAsBackup() throws Exception {
        Storage storage = new Storage(folder.getRoot());
        storage.write("game", "v1");
        storage.write("game", "v2");
        storage.write("game", "v3");
        assertEquals("v3", storage.read("game", false));
        assertEquals("v2", storage.read("game", true));
    }

    @Test
    public void survivesACorruptedMainFile() throws Exception {
        Storage storage = new Storage(folder.getRoot());
        storage.write("history", "[1]");
        storage.write("history", "[1,2]");
        // Coupure simulée : le fichier principal est tronqué.
        Files.write(new File(folder.getRoot(), "dj-history.json").toPath(), "[1,".getBytes(StandardCharsets.UTF_8));
        assertEquals("[1,", storage.read("history", false));
        assertEquals("la copie de secours reste lisible", "[1]", storage.read("history", true));
        assertTrue(storage.write("history", "[1,2,3]"));
        assertEquals("[1,2,3]", storage.read("history", false));
    }

    @Test
    public void rejectsUnexpectedKeys() throws Exception {
        Storage storage = new Storage(folder.getRoot());
        assertFalse(storage.write("../evil", "x"));
        assertFalse(storage.write("", "x"));
        assertFalse(storage.write(null, "x"));
        assertFalse(storage.write("meta", null));
        assertFalse(storage.write("META", "x"));
        assertEquals("", storage.read("../evil", false));
        assertEquals("", storage.read(null, true));
        assertEquals(0, folder.getRoot().listFiles().length);
    }

    @Test
    public void storesLargeUnicodeContent() throws Exception {
        Storage storage = new Storage(folder.getRoot());
        StringBuilder big = new StringBuilder();
        for (int i = 0; i < 20000; i++) big.append("« Œuf au plat » — ").append(i).append('\n');
        assertTrue(storage.write("history", big.toString()));
        assertEquals(big.toString(), storage.read("history", false));
    }

    @Test
    public void failsCleanlyWhenTheFolderIsMissing() throws Exception {
        Storage storage = new Storage(new File(folder.getRoot(), "absent"));
        assertFalse(storage.write("meta", "{}"));
        assertEquals("", storage.read("meta", false));
    }
}
