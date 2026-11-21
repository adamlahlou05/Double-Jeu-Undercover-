plugins {
    id("com.android.application")
}

// Signature : un fichier de clés stable (variables d'environnement, voir README) pour que les mises à jour
// s'installent par-dessus l'ancienne version sans perdre les données. À défaut, la clé de débogage locale.
val keystorePath = providers.environmentVariable("DJ_KEYSTORE_FILE").orNull
val hasKeystore = keystorePath != null && file(keystorePath).isFile

android {
    namespace = "io.github.adamlahlou05.doublejeu"
    compileSdk = 36

    defaultConfig {
        applicationId = "io.github.adamlahlou05.doublejeu"
        minSdk = 26
        targetSdk = 36
        versionCode = 20100
        versionName = "2.1.0"
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

    testImplementation("junit:junit:4.13.2")
}
