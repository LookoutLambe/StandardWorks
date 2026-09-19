# The page calls into these by name over the JavaScript interface.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.sefermormon.standardworks.ShellPort { *; }
