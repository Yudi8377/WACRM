-keep class com.wacrm.android.** { *; }
-keepclassmembers class com.wacrm.android.WacrmJsBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes *Annotation*,JavascriptInterface
-keep class androidx.core.content.FileProvider { *; }
-keep class androidx.biometric.** { *; }
