const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting I-Track Local APK Build...');

try {
  // Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  if (fs.existsSync('./dist')) {
    fs.rmSync('./dist', { recursive: true });
  }

  // Export the app
  console.log('📦 Exporting Expo app...');
  execSync('npx expo export --platform android --output-dir ./dist', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  // Create APK using Android build tools
  console.log('🔨 Building APK...');
  execSync('cd android && gradlew assembleRelease --no-daemon', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  // Copy APK to main folder
  const apkSource = './android/app/build/outputs/apk/release/app-release.apk';
  const apkDest = './I-Track-Latest.apk';
  
  if (fs.existsSync(apkSource)) {
    fs.copyFileSync(apkSource, apkDest);
    console.log('✅ APK built successfully!');
    console.log(`📱 Location: ${path.resolve(apkDest)}`);
  } else {
    console.log('❌ APK file not found at expected location');
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
