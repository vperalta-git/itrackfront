@echo off
echo 🚀 Building I-Track APK using EAS Build...
cd /d "C:\Users\Vionne\Desktop\Mobile App I-Track\itrack"

echo � Committing latest changes...
git add .
git commit -m "Build: APK generation with latest updates"

echo 📦 Starting EAS Build (Production Profile)...
npx eas build --platform android --profile production

echo ✅ Build started! 
echo 📥 Download link will be provided once build completes
echo 🌐 Check: https://expo.dev/accounts/vperalta/projects/itrack/builds
pause
