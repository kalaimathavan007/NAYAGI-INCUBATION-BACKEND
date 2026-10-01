import os
import subprocess
import shutil

JAVAC = r"C:\Program Files\Android\Android Studio\jbr\bin\javac.exe"
ANDROID_JAR = r"C:\Users\kalai\AppData\Local\Android\Sdk\platforms\android-36\android.jar"
BUILD_TOOLS = r"C:\Users\kalai\AppData\Local\Android\Sdk\build-tools\35.0.0"

AAPT2 = os.path.join(BUILD_TOOLS, "aapt2.exe")
D8 = os.path.join(BUILD_TOOLS, "d8.bat")
ZIPALIGN = os.path.join(BUILD_TOOLS, "zipalign.exe")
APKSIGNER = os.path.join(BUILD_TOOLS, "apksigner.bat")

APP_DIR = r"C:\Users\kalai\OneDrive\Desktop\NAYAGI INCUBATION BACKEND\android-app"
BUILD_DIR = os.path.join(APP_DIR, "build_out")

# Safe directory creation
os.makedirs(BUILD_DIR, exist_ok=True)

print("===================================================")
print("🚀 DIRECT NATIVE ANDROID APK BUILDER")
print("===================================================")

# 1. Compile Java source file
src_java = os.path.join(APP_DIR, "app", "src", "main", "java", "com", "nayagi", "incubation", "MainActivity.java")
classes_dir = os.path.join(BUILD_DIR, "classes")
os.makedirs(classes_dir, exist_ok=True)

print("1. Compiling MainActivity.java with Java 17...")
cmd_javac = [
    JAVAC,
    "-source", "8",
    "-target", "8",
    "-cp", ANDROID_JAR,
    "-d", classes_dir,
    src_java
]
res = subprocess.run(cmd_javac)
if res.returncode != 0:
    print("❌ Java Compilation Failed")
    exit(1)

# 2. Convert class to dex using D8
print("2. Converting bytecode to Android DEX (classes.dex)...")
class_file = os.path.join(classes_dir, "com", "nayagi", "incubation", "MainActivity.class")
inner_class_1 = os.path.join(classes_dir, "com", "nayagi", "incubation", "MainActivity$1.class")
inner_class_2 = os.path.join(classes_dir, "com", "nayagi", "incubation", "MainActivity$2.class")

class_files = [class_file]
if os.path.exists(inner_class_1): class_files.append(inner_class_1)
if os.path.exists(inner_class_2): class_files.append(inner_class_2)

cmd_d8 = [
    D8,
    "--lib", ANDROID_JAR,
    "--output", BUILD_DIR
] + class_files

res = subprocess.run(cmd_d8, shell=True)
if res.returncode != 0:
    print("❌ D8 DEX Compilation Failed")
    exit(1)

# 3. Package Resources using AAPT2
print("3. Compiling Android Resources...")
manifest = os.path.join(APP_DIR, "app", "src", "main", "AndroidManifest.xml")
res_compiled = os.path.join(BUILD_DIR, "res.apk")

cmd_aapt_link = [
    AAPT2, "link",
    "-I", ANDROID_JAR,
    "-M", manifest,
    "-o", res_compiled,
    "--auto-add-overlay"
]
res = subprocess.run(cmd_aapt_link)
if res.returncode != 0:
    print("❌ AAPT2 Resource Link Failed")
    exit(1)

# 4. Merge classes.dex into APK using Python ZipFile
print("4. Merging classes.dex into APK...")
import zipfile

unaligned_apk = os.path.join(BUILD_DIR, "unaligned.apk")
shutil.copy(res_compiled, unaligned_apk)

with zipfile.ZipFile(unaligned_apk, 'a') as z:
    dex_file = os.path.join(BUILD_DIR, "classes.dex")
    z.write(dex_file, "classes.dex")

# 5. Zipalign APK
print("5. ZipAligning APK...")
aligned_apk = os.path.join(BUILD_DIR, "aligned.apk")
cmd_zipalign = [
    ZIPALIGN, "-f", "4",
    unaligned_apk,
    aligned_apk
]
subprocess.run(cmd_zipalign)

# 6. Generate Debug Key & Sign APK
print("6. Generating Key & Signing Debug APK...")
keystore = os.path.join(BUILD_DIR, "debug.keystore")
KEYTOOL = r"C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"

if not os.path.exists(keystore):
    cmd_keytool = [
        KEYTOOL, "-genkeypair",
        "-keystore", keystore,
        "-storepass", "android",
        "-alias", "androiddebugkey",
        "-keypass", "android",
        "-keyalg", "RSA",
        "-keysize", "2048",
        "-validity", "10000",
        "-dname", "CN=Android Debug,O=Android,C=US"
    ]
    subprocess.run(cmd_keytool)

output_apk = os.path.join(APP_DIR, "app-debug.apk")
cmd_apksigner = [
    APKSIGNER, "sign",
    "--ks", keystore,
    "--ks-pass", "pass:android",
    "--key-pass", "pass:android",
    "--ks-key-alias", "androiddebugkey",
    "--out", output_apk,
    aligned_apk
]
res = subprocess.run(cmd_apksigner, shell=True)

if os.path.exists(output_apk):
    print("\n===================================================")
    print("🎉 SUCCESS! ANDROID DEBUG APK CREATED DIRECTLY AT:")
    print(output_apk)
    print("===================================================")
else:
    print("❌ APKSigner failed.")
