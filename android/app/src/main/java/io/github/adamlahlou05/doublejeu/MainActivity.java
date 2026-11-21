package io.github.adamlahlou05.doublejeu;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;

import androidx.activity.ComponentActivity;
import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.SystemBarStyle;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import java.io.File;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Coque Android de Double Jeu.
 *
 * Le jeu lui-même est une page embarquée dans l'APK (dossier assets/www), affichée dans une WebView
 * et servie localement : aucune connexion n'est utilisée, l'application n'a d'ailleurs pas la
 * permission d'accéder à Internet. Cette classe apporte ce qu'une page seule ne peut pas faire :
 * sauvegarde dans des fichiers, bouton retour, photo de profil, vibrations, écran maintenu allumé.
 */
public final class MainActivity extends ComponentActivity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/assets/www/index.html";
    private static final int COBALT = 0xFF2A3CE6;

    private FrameLayout root;
    private WebView web;
    private Storage storage;

    @Nullable private ValueCallback<Uri[]> fileCallback;
    @Nullable private Uri cameraUri;
    @Nullable private volatile String pendingExport;

    private ActivityResultLauncher<String> pickLauncher;
    private ActivityResultLauncher<Uri> cameraLauncher;
    private ActivityResultLauncher<String> exportLauncher;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        // Barres système transparentes, icônes claires : le fond de l'application se prolonge dessous.
        EdgeToEdge.enable(this, SystemBarStyle.dark(Color.TRANSPARENT), SystemBarStyle.dark(Color.TRANSPARENT));
        super.onCreate(savedInstanceState);

        storage = new Storage(getFilesDir());

        root = new FrameLayout(this);
        root.setBackgroundColor(COBALT);
        web = new WebView(this);
        web.setBackgroundColor(COBALT);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        // La page ne passe jamais sous la barre d'état, la barre de navigation, l'encoche ou le clavier.
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout()
                    | WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });

        registerLaunchers();
        configureWebView();

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                // La page décide : fermer une fenêtre, revenir d'un écran, ouvrir le menu de la partie…
                // Si elle n'a rien à faire (accueil), l'application passe en arrière-plan sans se fermer.
                web.evaluateJavascript(
                        "(function(){try{return !!(window.DJ&&window.DJ.back&&window.DJ.back());}catch(e){return false;}})()",
                        handled -> { if (!"true".equals(handled)) moveTaskToBack(true); });
            }
        });

        web.loadUrl(START_URL);
    }

    private void registerLaunchers() {
        pickLauncher = registerForActivityResult(new ActivityResultContracts.GetContent(),
                uri -> finishFileChooser(uri == null ? null : new Uri[] {uri}));
        cameraLauncher = registerForActivityResult(new ActivityResultContracts.TakePicture(),
                saved -> finishFileChooser(Boolean.TRUE.equals(saved) && cameraUri != null ? new Uri[] {cameraUri} : null));
        exportLauncher = registerForActivityResult(new ActivityResultContracts.CreateDocument("application/json"),
                this::writeExport);
    }

    private void configureWebView() {
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setTextZoom(100);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        final WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web.setWebViewClient(new WebViewClientCompat() {
            @Override
            public WebResourceResponse shouldInterceptRequest(@NonNull WebView view, @NonNull WebResourceRequest request) {
                return assets.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(@NonNull WebView view, @NonNull WebResourceRequest request) {
                // Seules les pages embarquées sont autorisées : toute autre navigation est ignorée.
                return !HOST.equals(request.getUrl().getHost());
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                finishFileChooser(null);
                fileCallback = callback;
                boolean image = false;
                String[] types = params.getAcceptTypes();
                if (types != null) {
                    for (String type : types) {
                        if (type != null && type.startsWith("image/")) image = true;
                    }
                }
                try {
                    if (image && params.isCaptureEnabled() && launchCamera()) return true;
                    pickLauncher.launch(image ? "image/*" : "*/*");
                } catch (RuntimeException e) {
                    finishFileChooser(null);
                }
                return true;
            }
        });

        web.addJavascriptInterface(new Bridge(), "DJNative");
    }

    /** Ouvre l'appareil photo du téléphone ; renvoie false s'il n'y en a pas. */
    private boolean launchCamera() {
        Intent probe = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (probe.resolveActivity(getPackageManager()) == null) return false;
        File dir = new File(getCacheDir(), "camera");
        if (!dir.isDirectory() && !dir.mkdirs()) return false;
        File photo = new File(dir, "photo.jpg");
        cameraUri = FileProvider.getUriForFile(this, getPackageName() + ".files", photo);
        cameraLauncher.launch(cameraUri);
        return true;
    }

    /** La WebView attend toujours une réponse, même en cas d'annulation, sinon elle n'ouvre plus de sélecteur. */
    private void finishFileChooser(@Nullable Uri[] result) {
        ValueCallback<Uri[]> callback = fileCallback;
        fileCallback = null;
        if (callback != null) callback.onReceiveValue(result);
    }

    private void writeExport(@Nullable Uri target) {
        String text = pendingExport;
        pendingExport = null;
        boolean ok = false;
        if (target != null && text != null) {
            try (OutputStream out = getContentResolver().openOutputStream(target)) {
                if (out != null) {
                    out.write(text.getBytes(StandardCharsets.UTF_8));
                    ok = true;
                }
            } catch (Exception e) {
                ok = false;
            }
        }
        web.evaluateJavascript("window.DJ&&window.DJ.exported&&window.DJ.exported(" + ok + ")", null);
    }

    private boolean isNightMode() {
        int mode = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return mode == Configuration.UI_MODE_NIGHT_YES;
    }

    @Override
    public void onConfigurationChanged(@NonNull Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        // Le téléphone vient de passer en thème clair ou sombre : la page s'aligne si elle est réglée sur « Auto ».
        web.evaluateJavascript("window.DJ&&window.DJ.themeChanged&&window.DJ.themeChanged()", null);
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        finishFileChooser(null);
        root.removeView(web);
        web.destroy();
        super.onDestroy();
    }

    /** Fonctions offertes à la page sous le nom window.DJNative. Elles sont appelées hors du fil d'interface. */
    private final class Bridge {

        @JavascriptInterface
        public String read(String key) {
            return storage.read(key, false);
        }

        @JavascriptInterface
        public String readBackup(String key) {
            return storage.read(key, true);
        }

        @JavascriptInterface
        public boolean write(String key, String json) {
            return storage.write(key, json);
        }

        @JavascriptInterface
        public boolean isNight() {
            return isNightMode();
        }

        @JavascriptInterface
        public void setBars(String color) {
            final int parsed;
            try {
                parsed = Color.parseColor(color);
            } catch (RuntimeException e) {
                return;
            }
            runOnUiThread(() -> {
                root.setBackgroundColor(parsed);
                web.setBackgroundColor(parsed);
            });
        }

        @JavascriptInterface
        public void keepAwake(boolean on) {
            runOnUiThread(() -> {
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        /** Durée en millisecondes, ou motif « vibre,pause,vibre… ». */
        @JavascriptInterface
        public void vibrate(String pattern) {
            try {
                Vibrator vibrator = getSystemService(Vibrator.class);
                if (vibrator == null || !vibrator.hasVibrator() || pattern == null) return;
                String[] parts = pattern.split(",");
                if (parts.length == 1) {
                    long ms = Math.max(1, Math.min(1000, Long.parseLong(parts[0].trim())));
                    vibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    long[] timings = new long[Math.min(parts.length, 12) + 1];
                    timings[0] = 0;
                    for (int i = 1; i < timings.length; i++) {
                        timings[i] = Math.max(1, Math.min(1000, Long.parseLong(parts[i - 1].trim())));
                    }
                    vibrator.vibrate(VibrationEffect.createWaveform(timings, -1));
                }
            } catch (RuntimeException e) {
                // Une vibration ratée ne doit jamais gêner la partie.
            }
        }

        @JavascriptInterface
        public void exportFile(String name, String text) {
            pendingExport = text;
            runOnUiThread(() -> {
                try {
                    exportLauncher.launch(name == null || name.isEmpty() ? "double-jeu.json" : name);
                } catch (RuntimeException e) {
                    writeExport(null);
                }
            });
        }
    }
}
