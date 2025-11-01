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
  const apkDest = './I-Track-v20.0.0-LIVE-GPS-TRACKING.apk';
  
  if (fs.existsSync(apkSource)) {
    fs.copyFileSync(apkSource, apkDest);
    console.log('✅ APK built successfully! 📱');
    console.log(`📱 Location: ${path.resolve(apkDest)}`);
    
    // Get file size
    const stats = fs.statSync(apkDest);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📦 Size: ${fileSizeInMB} MB`);
    
    console.log('');
    console.log('🎯 NEW in v20.0.0 - LIVE GPS TRACKING:');
    console.log('   ✅ REAL GPS TRACKING - No more mock data!');
    console.log('   ✅ Live route directions to Isuzu Pasig Dealership');
    console.log('   ✅ Real-time location updates every 10 seconds');
    console.log('   ✅ Google Maps API integration with satellite view');
    console.log('   ✅ Driver dashboard with live tracking maps');
    console.log('   ✅ All vehicles now deliver to Isuzu Pasig (14.5791, 121.0655)');
    console.log('   ✅ Enhanced dispatch allocation system');
    console.log('   ✅ Vehicle assignment and GPS coordinate tracking');
    console.log('');
    console.log('📍 Real Destinations:');
    console.log('   🏢 Isuzu Pasig Dealership, C5 Road, Pasig City');
    console.log('   📞 Contact: Isuzu Pasig Reception (+63 2 8234 5678)');
    console.log('');
    console.log('📱 Ready for REAL-WORLD deployment and GPS testing!');
  } else {
    console.log('❌ APK file not found at expected location');
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
