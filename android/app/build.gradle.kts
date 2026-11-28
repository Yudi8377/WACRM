plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val wacrmBaseUrl: String = (project.findProperty("WACRM_BASE_URL") as String?)
    ?: System.getenv("WACRM_BASE_URL")
    ?: "https://wacrm-commercial.dwahyudi8377.workers.dev"

val manualSign: Boolean =
    ((project.findProperty("ANDROID_MANUAL_SIGN") as String?) ?: System.getenv("ANDROID_MANUAL_SIGN"))
        ?.equals("true", ignoreCase = true) == true

val releaseKeystorePath: String? = (project.findProperty("ANDROID_KEYSTORE_PATH") as String?)
    ?: System.getenv("ANDROID_KEYSTORE_PATH")
val releaseKeystorePassword: String? = (project.findProperty("ANDROID_KEYSTORE_PASSWORD") as String?)
    ?: System.getenv("ANDROID_KEYSTORE_PASSWORD")
val releaseKeyAlias: String? = (project.findProperty("ANDROID_KEY_ALIAS") as String?)
    ?: System.getenv("ANDROID_KEY_ALIAS")
val releaseKeyPassword: String? = (project.findProperty("ANDROID_KEY_PASSWORD") as String?)
    ?: System.getenv("ANDROID_KEY_PASSWORD")

android {
    namespace = "com.wacrm.android"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.wacrm.android"
        minSdk = 24
        targetSdk = 34
        versionCode = 12
        versionName = "5.3.4"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "WACRM_BASE_URL", "\"$wacrmBaseUrl\"")
    }

    signingConfigs {
        if (
            !releaseKeystorePath.isNullOrBlank() &&
            !releaseKeystorePassword.isNullOrBlank() &&
            !releaseKeyAlias.isNullOrBlank() &&
            !releaseKeyPassword.isNullOrBlank() &&
            file(releaseKeystorePath).exists()
        ) {
            create("release") {
                storeFile = file(releaseKeystorePath)
                storePassword = releaseKeystorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
                enableV1Signing = true
                enableV2Signing = true
                enableV3Signing = true
            }
        }
    }

    buildTypes {
        release {
            // Keep release APK non-debuggable and preserve all WebView @JavascriptInterface,
            // FileProvider & BiometricPrompt reflection cleanly across Android 7.0–15 devices.
            isDebuggable = false
            isMinifyEnabled = false
            isShrinkResources = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            if (!manualSign) {
                signingConfigs.findByName("release")?.let {
                    signingConfig = it
                }
            }
        }
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
    }

    packaging {
        resources {
            excludes += listOf(
                "META-INF/LICENSE*",
                "META-INF/NOTICE*",
                "META-INF/*.kotlin_module"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("com.google.android.material:material:1.12.0")

    testImplementation("junit:junit:4.13.2")
}
