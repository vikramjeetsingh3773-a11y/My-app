# BattleMint - Complete APK Build Guide

## Step-by-Step APK Build Process

This guide provides detailed instructions to build and deploy the BattleMint Android APK from scratch.

---

## Prerequisites

### Required Tools
1. **Flutter SDK** (3.16 or higher)
2. **Android SDK** (API level 31 or higher)
3. **Java Development Kit (JDK)** 11 or higher
4. **Git** for version control
5. **Gradle** (comes with Android SDK)

### Installation Steps

#### 1. Install Flutter

**macOS/Linux:**
```bash
# Download Flutter
git clone https://github.com/flutter/flutter.git -b stable

# Add Flutter to PATH
export PATH="$PATH:`pwd`/flutter/bin"

# Verify installation
flutter --version
```

**Windows:**
- Download from https://flutter.dev/docs/get-started/install/windows
- Extract to desired location
- Add to PATH in Environment Variables

#### 2. Install Android SDK

**Using Android Studio (Recommended):**
```bash
# Download from https://developer.android.com/studio
# During setup, install:
# - Android SDK
# - Android SDK Platform-Tools
# - Android SDK Build-Tools (v34+)
# - Android API 34
```

**Using Command Line:**
```bash
# Create Android SDK directory
mkdir -p ~/Android/Sdk

# Download SDK tools
# Set ANDROID_SDK_ROOT
export ANDROID_SDK_ROOT=$HOME/Android/Sdk
export ANDROID_HOME=$HOME/Android/Sdk

# Add to PATH
export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools
export PATH=$PATH:$ANDROID_SDK_ROOT/tools/bin
```

#### 3. Accept Android Licenses

```bash
flutter doctor --android-licenses

# Type 'y' for each license prompt
```

#### 4. Verify Setup

```bash
flutter doctor

# Should show:
# - Flutter: OK
# - Android toolchain: OK
# - Android Studio: OK
```

---

## Project Configuration

### 1. Navigate to Mobile App

```bash
cd mobile_app
```

### 2. Update Flutter Dependencies

```bash
# Get latest dependencies
flutter pub get

# Upgrade to latest versions
flutter pub upgrade

# Check for issues
flutter pub outdated
```

### 3. Configure Android App Settings

Edit `android/app/build.gradle`:

```gradle
android {
    compileSdkVersion 34

    defaultConfig {
        applicationId "com.battlemint.app"
        minSdkVersion 23
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }

    signingConfigs {
        release {
            keyAlias 'battlemint'
            keyPassword 'your-key-password'
            storeFile file('release-key.jks')
            storePassword 'your-store-password'
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 4. Update AndroidManifest.xml

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:label="BattleMint"
        android:icon="@mipmap/ic_launcher"
        android:usesCleartextTraffic="false">
        
        <!-- Main Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Firebase Service -->
        <service android:name="com.google.firebase.messaging.FirebaseMessagingService">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>
    </application>

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
</manifest>
```

---

## Generate Signing Key

The signing key is required to sign the APK for release.

### Option 1: Generate New Key

```bash
# Create a new keystore
keytool -genkey -v -keystore ~/battlemint-release.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias battlemint \
  -storepass your_store_password \
  -keypass your_key_password \
  -dname "CN=BattleMint,O=BattleMint Inc,C=IN"

# Copy key to project
cp ~/battlemint-release.jks mobile_app/android/app/release-key.jks
```

### Option 2: Use Existing Key

```bash
# If you already have a key, copy it to the app directory
cp /path/to/your/key.jks mobile_app/android/app/release-key.jks
```

### Store Key Information

Create `android/key.properties`:

```properties
storePassword=your_store_password
keyPassword=your_key_password
keyAlias=battlemint
storeFile=release-key.jks
```

**⚠️ IMPORTANT:** Never commit this file to version control!

---

## Build APK

### Clean Previous Builds

```bash
# Remove old build artifacts
flutter clean

# Get fresh dependencies
flutter pub get
```

### Build Release APK

```bash
# Build APK
flutter build apk --release

# Output location:
# build/app/outputs/flutter-apk/app-release.apk

# Check file size
ls -lh build/app/outputs/flutter-apk/app-release.apk
```

### Build Split APKs (Optional)

Build separate APKs for different architectures:

```bash
# Build split APKs
flutter build apk --release --split-per-abi

# Outputs:
# app-armeabi-v7a-release.apk
# app-arm64-v8a-release.apk
# app-x86_64-release.apk
```

### Build App Bundle (For Play Store)

```bash
# Build App Bundle
flutter build appbundle --release

# Output location:
# build/app/outputs/bundle/release/app-release.aab

# Bundle size
ls -lh build/app/outputs/bundle/release/app-release.aab
```

---

## Verify APK

### Extract APK Information

```bash
# List APK contents
unzip -l build/app/outputs/flutter-apk/app-release.apk | head -20

# Get APK metadata
aapt dump badging build/app/outputs/flutter-apk/app-release.apk
```

### Check Signing

```bash
# Verify APK is signed
jarsigner -verify -verbose -certs build/app/outputs/flutter-apk/app-release.apk

# Check certificate
keytool -printcert -jarfile build/app/outputs/flutter-apk/app-release.apk
```

### Test APK Size

```bash
# APK size should be < 100 MB
du -h build/app/outputs/flutter-apk/app-release.apk
```

---

## Install & Test APK

### On Connected Device

```bash
# List connected devices
adb devices

# Install APK
adb install -r build/app/outputs/flutter-apk/app-release.apk

# Uninstall previous version if needed
adb uninstall com.battlemint.app

# View logs
adb logcat | grep flutter

# Check app is installed
adb shell pm list packages | grep battlemint
```

### On Android Emulator

```bash
# Start emulator
emulator -avd Pixel_4

# Wait for boot, then install
adb install build/app/outputs/flutter-apk/app-release.apk

# View app logs
adb logcat flutter:V *:S
```

### Manual Testing Checklist

- [ ] App launches successfully
- [ ] Login/signup works
- [ ] OTP verification successful
- [ ] Tournament list loads
- [ ] Join tournament deducts balance
- [ ] Wallet operations work
- [ ] Notifications display correctly
- [ ] Profile updates persist
- [ ] No crashes or errors in logs
- [ ] Permissions granted correctly

---

## Upload to Google Play Store

### 1. Create Developer Account

```
https://play.google.com/console
- Sign in with Google account
- Pay $25 one-time developer fee
- Complete merchant and business info
```

### 2. Create New App

```
1. Go to All apps > Create app
2. Enter app name: "BattleMint"
3. Select category: Games > Strategy
4. Select content rating: 12+
5. Create app
```

### 3. Complete Store Listing

```
Store presence > Main store listing
- App name: BattleMint
- Short description: Compete in esports tournaments
- Full description: [Full marketing text]
- Screenshots: 4-8 screenshots
- Feature graphic: 1024x500 PNG
- Logo: 512x512 PNG
- Video: Promotional video (optional)
- Email: support@battlemint.com
```

### 4. Add Content Rating

```
Content rating questionnaire
- Rate app content
- Get rating certificate
- Save to store
```

### 5. Set Pricing & Distribution

```
Pricing & distribution
- Select price: Free
- Target countries: All
- Content restrictions: None
```

### 6. Upload App Bundle

```
1. Go to Release > Production
2. Click "Create new release"
3. Upload app-release.aab
4. Add release notes
5. Review details
6. Submit for review
```

### 7. Add Release Notes

```
v1.0.0
- Initial release
- Free Fire tournament support
- Wallet system with UPI
- Live leaderboards
- Anti-cheat protection
```

---

## Monitor Rollout

### Phased Rollout

```
Step 1: 5% users (48 hours)
Step 2: 25% users (2 days)
Step 3: 50% users (1 day)
Step 4: 100% users (final release)
```

### Monitor Metrics

```
In Google Play Console > Release overview
- Installation rate
- Crash rate
- Rating & review feedback
- User count by device
- Daily active users
```

### Respond to Reviews

```
Play Console > All reviews
- Monitor for issues
- Respond to feedback
- Track common complaints
- Plan updates
```

---

## Troubleshooting

### Build Failures

**Error: "Gradle build failed"**
```bash
# Clean and rebuild
flutter clean
rm -rf android/build
flutter pub get
flutter build apk --release
```

**Error: "Signing key not found"**
```bash
# Verify key location
ls -la android/app/release-key.jks

# Check key.properties
cat android/key.properties
```

**Error: "minSdkVersion conflicts"**
```bash
# Update android/app/build.gradle
# Change minSdkVersion to 23+
# Change targetSdkVersion to 34
```

### Runtime Issues

**Error: "App crashes on startup"**
```bash
# Check logs
adb logcat | grep -i error

# Verify API configuration
# Check env variables in mobile_app/lib/services/api_service.dart
```

**Error: "Firebase not initialized"**
```bash
# Add google-services.json
# Place in android/app/
# Sync Gradle files
```

### Size Issues

**APK too large (> 150MB)**
```bash
# Enable code shrinking
# In build.gradle: minifyEnabled true

# Remove unused resources
# Run: flutter build apk --release --analyze-size

# Remove unused plugins
# In pubspec.yaml, remove unnecessary dependencies
```

---

## Version Updates

### Update to New Version

```bash
# Update version in pubspec.yaml
version: 1.0.1+2

# Where:
# 1.0.1 = semantic version (shown in store)
# 2 = build number (used by Google Play)

# Rebuild
flutter clean
flutter build apk --release

# Tag release
git tag -a v1.0.1 -m "Release version 1.0.1"
git push origin v1.0.1
```

### Beta Testing

```bash
# Upload to internal testing
Play Console > Release > Internal testing

# Add testers
- Add tester email addresses
- Share test link
- Collect feedback

# Test before production release
```

---

## Post-Launch

### Monitor Performance

```bash
# Weekly checks
- Crash rates
- User feedback
- Performance metrics
- Security issues

# Monthly updates
- Bug fixes
- Feature improvements
- Performance optimization
```

### Update Checklist

- [ ] Update version number
- [ ] Update changelog
- [ ] Test on multiple devices
- [ ] Submit for review
- [ ] Monitor rollout
- [ ] Gather user feedback
- [ ] Plan next iteration

---

## APK Distribution Alternatives

### Direct Distribution

```bash
# Host on your server
- Upload app-release.apk to your site
- Provide download link
- Enable installation from unknown sources

# Via Email
- Send APK to beta testers
- They install from files

# Via USB
- Transfer APK to device
- Install via file manager
```

### Beta Testing

```bash
# Use Firebase App Distribution
firebase appdistribution:distribute build/app/outputs/flutter-apk/app-release.apk \
  --release-notes "v1.0.0" \
  --testers-file testers.txt
```

---

## Security Best Practices

### Key Security
```bash
# Never commit keys to Git
echo "android/app/release-key.jks" >> .gitignore
echo "android/key.properties" >> .gitignore

# Use environment variables in CI/CD
export KEY_PASSWORD=your_password
export STORE_PASSWORD=your_password
```

### Code Obfuscation
```bash
# Enable ProGuard
# In build.gradle:
minifyEnabled true
shrinkResources true
proguardFiles getDefaultProguardFile('proguard-android-optimize.txt')
```

### SSL Pinning
```dart
// In api_service.dart
class APIService {
  Future<void> initialize() async {
    _dio = Dio();
    
    // Add SSL pinning
    (_dio.httpClientAdapter as DefaultHttpClientAdapter).onHttpClientCreate = 
      (HttpClient client) {
        client.badCertificateCallback = (cert, host, port) => false;
        return client;
      };
  }
}
```

---

## Summary Checklist

- [ ] Flutter SDK installed and verified
- [ ] Android SDK configured correctly
- [ ] Project dependencies updated
- [ ] Signing key generated
- [ ] ProGuard rules configured
- [ ] AndroidManifest.xml updated
- [ ] App tested on emulator
- [ ] APK built successfully
- [ ] APK installed and tested
- [ ] Google Play account created
- [ ] Store listing completed
- [ ] App bundle uploaded
- [ ] Content rating submitted
- [ ] Release submitted for review
- [ ] Rollout monitoring enabled

---

## Next Steps

1. **Wait for Review** (Usually 24-48 hours)
2. **Monitor Installation** (Check metrics daily)
3. **Gather Feedback** (Read reviews and ratings)
4. **Plan Updates** (Feature requests and bug fixes)
5. **Iterate** (Regular updates every 2-4 weeks)

---

## Support Resources

- [Flutter Build APK Guide](https://flutter.dev/docs/deployment/android)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Android Signing Documentation](https://developer.android.com/studio/publish/app-signing)
- [Flutter Release Checklist](https://flutter.dev/docs/testing/code-debugging)

---

*Last Updated: January 2024*
*Version: 1.0.0*
