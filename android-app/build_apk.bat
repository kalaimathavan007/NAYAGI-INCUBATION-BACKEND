@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=C:\Program Files\Android\Android Studio\jbr\bin;%PATH%"
set "ANDROID_HOME=C:\Users\kalai\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=C:\Users\kalai\AppData\Local\Android\Sdk"

set "GRADLE_BAT=C:\Users\kalai\.gradle\wrapper\dists\gradle-8.14.3-all\10utluxaxniiv4wxiphsi49nj\gradle-8.14.3\bin\gradle.bat"

echo ===================================================
echo Building Nayagi Incubation Council Android Debug APK
echo ===================================================
echo Using JAVA_HOME: %JAVA_HOME%
echo Using ANDROID_HOME: %ANDROID_HOME%

cd /d "C:\Users\kalai\OneDrive\Desktop\NAYAGI INCUBATION BACKEND\android-app"
call %GRADLE_BAT% --no-daemon assembleDebug
