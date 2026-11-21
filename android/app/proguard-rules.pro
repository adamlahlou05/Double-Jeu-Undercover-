# Les méthodes appelées depuis la page (window.DJNative) doivent garder leur nom.
-keepclassmembers class io.github.adamlahlou05.doublejeu.** {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
