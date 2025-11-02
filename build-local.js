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
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
  const apkDest = `./I-Track-version46.2-${timestamp}.apk`;
  
  if (fs.existsSync(apkSource)) {
    fs.copyFileSync(apkSource, apkDest);
    console.log('✅ APK built successfully! 📱');
    console.log(`📱 Location: ${path.resolve(apkDest)}`);
    
    // Get file size
    const stats = fs.statSync(apkDest);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📦 Size: ${fileSizeInMB} MB`);
    
    console.log('');
    console.log('🎯 NEW in version 46.2 - ENHANCED AUTHENTICATION:');
    console.log('   ✅ Email-based login system with dual support');
    console.log('   ✅ Uniform loading.gif across all screens');
    console.log('   ✅ Enhanced UI with isuzupasig.png background');
    console.log('   ✅ Professional logoitrack.png branding');
    console.log('   ✅ Improved password security with bcrypt');
    console.log('   ✅ Modern card-based login design');
    console.log('   ✅ Consistent loading states and UX');
    console.log('   ✅ Updated user accounts with proper email addresses');
    console.log('');
    console.log('👤 Login Credentials:');
    console.log('   📧 Admin: admin@itrack.com / admin123');
    console.log('   🚗 Driver: driver@itrack.com / driver123');
    console.log('   👨‍� Agent: agent@itrack.com / agent123');
    console.log('   👔 Manager: manager@itrack.com / manager123');
    console.log('   � Dispatch: dispatch@itrack.com / dispatch123');
    console.log('');
    console.log('📱 Ready for deployment with enhanced authentication system!');
  } else {
    console.log('❌ APK file not found at expected location');
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
