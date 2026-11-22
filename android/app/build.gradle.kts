import java.util.Properties

plugins {
    id("com.android.application")
}

// Signature : un fichier de clés stable (variables d'environnement, voir README) pour que les mises à jour
// s'installent par-dessus l'ancienne version sans perdre les données. À défaut, la clé de débogage locale.
val keystorePath = providers.environmentVariable("DJ_KEYSTORE_FILE").orNull
val hasKeystore = keystorePath != null && file(keystorePath).isFile

// Publicités : identifiants AdMob lus dans android/monetization.properties (ou dans l'environnement).
// Tant qu'ils ne sont pas renseignés, l'application utilise les identifiants de démonstration de Google :
// les pubs affichées sont des pubs de test, qui ne rapportent rien et ne font courir aucun risque au compte.
val monetization = Properties().apply {
    val f = rootProject.file("monetization.properties")
    if (f.isFile) f.inputStream().use { load(it) }
}
val testAppId = "ca-app-pub-3940256099942544~3347511713"
val testRewardedId = "ca-app-pub-3940256099942544/5224354917"
fun setting(env: String, key: String, fallback: String): String =
    (providers.environmentVariable(env).orNull ?: monetization.getProperty(key) ?: "").trim().ifEmpty { fallback }
val admobAppId = setting("DJ_ADMOB_APP_ID", "admob.app.id", testAppId)
val admobRewardedId = setting("DJ_ADMOB_REWARDED_ID", "admob.rewarded.id", testRewardedId)
val admobTest = admobAppId == testAppId || admobRewardedId == testRewardedId

android {
    namespace = "io.github.adamlahlou05.doublejeu"
    compileSdk = 36

    defaultConfig {
        applicationId = "io.github.adamlahlou05.doublejeu"
        minSdk = 26
        targetSdk = 36
        versionCode = 30000
        versionName = "3.0.0"

        manifestPlaceholders["admobAppId"] = admobAppId
        buildConfigField("String", "ADMOB_REWARDED_ID", "\"$admobRewardedId\"")
        buildConfigField("boolean", "ADMOB_TEST", admobTest.toString())
    }

    buildFeatures {
        buildConfig = true
    }

    signingConfigs {
        if (hasKeystore) {
            create("release") {
                storeFile = file(keystorePath!!)
                storePassword = providers.environmentVariable("DJ_KEYSTORE_PASSWORD").orNull
                keyAlias = providers.environmentVariable("DJ_KEY_ALIAS").orNull
                keyPassword = providers.environmentVariable("DJ_KEY_PASSWORD").orNull
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName(if (hasKeystore) "release" else "debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    // Le jeu (dossier web/ à la racine du dépôt) est copié tel quel dans les ressources de l'application.
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/webAssets"))

    lint {
        // Portrait imposé : un téléphone qu'on se passe de main en main ne doit pas pivoter.
        // Versions : volontairement figées sur un ensemble testé ; à faire évoluer ensemble.
        disable += setOf("LockedOrientationActivity", "GradleDependency", "AndroidGradlePluginVersion")
    }
}

val copyWebAssets = tasks.register<Copy>("copyWebAssets") {
    from(rootProject.file("../web"))
    into(layout.buildDirectory.dir("generated/webAssets/www"))
}
tasks.named("preBuild") { dependsOn(copyWebAssets) }

dependencies {
    implementation("androidx.activity:activity:1.10.1")
    implementation("androidx.core:core:1.16.0")
    implementation("androidx.webkit:webkit:1.14.0")
    // Les bibliothèques Google ci-dessous tirent une vieille version de fragment, incompatible avec les
    // « ActivityResult » utilisés pour l'autorisation de l'appareil photo : on impose une version récente.
    implementation("androidx.fragment:fragment:1.8.6")

    // Publicités avec récompense, consentement (RGPD) et paiements Google Play.
    implementation("com.google.android.gms:play-services-ads:25.5.0")
    implementation("com.google.android.ump:user-messaging-platform:4.0.0")
    implementation("com.android.billingclient:billing:9.1.0")

    testImplementation("junit:junit:4.13.2")
}
