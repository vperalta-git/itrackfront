# I-Track Backend Render Deployment Guide

## 🚀 Recommended Deployment Strategy

### Option A: Deploy from Current GitHub Repo (RECOMMENDED)

**Advantages:**

- ✅ Keep everything in one repository
- ✅ Easy version control and updates
- ✅ Deploy just the backend folder
- ✅ Maintain full project history

## 📋 Step-by-Step Deployment

### Step 1: Prepare Your Current Repository

Your current repository structure is perfect:

```
itrack-backend/
├── server.js          ✅ Contains all logic
├── package.json       ✅ Ready for deployment
├── package-lock.json  ✅ Dependency locks
├── .gitignore         ✅ Excludes node_modules
└── README.md          ✅ Documentation
```

### Step 2: Deploy to Render

1. **Go to Render.com** and sign in
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**: `vperalta-git/itrack-backend`
4. **Configure the service:**
   ```
   Name: itrack-backend
   Region: Oregon (US West)
   Branch: master
   Root Directory: /  (leave empty since server.js is in root)
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

### Step 3: Set Environment Variables

In Render dashboard, add these environment variables:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://itrack_user:itrack123@cluster0.py8s8pl.mongodb.net/itrackDB?retryWrites=true&w=majority&appName=Cluster0
PORT=10000
```

### Step 4: Update Mobile App

After deployment, update your mobile app's API configuration:

1. Get your Render URL (e.g., `https://itrack-backend-abc123.onrender.com`)
2. Update `constants/api.js`:
   ```javascript
   const PRODUCTION_SERVER_URL = "https://your-actual-render-url.onrender.com";
   ```

## 🌐 Testing Deployment

### Test these endpoints after deployment:

- `https://your-app.onrender.com/health`
- `https://your-app.onrender.com/api/config`
- `https://your-app.onrender.com/test`

## � Future Updates

To update your backend:

1. Make changes to `server.js`
2. Commit and push to GitHub
3. Render automatically redeploys

## 📱 Mobile App Configuration

Your mobile app will automatically:

- Use production server when deployed
- Fall back to local development server
- Handle network switching seamlessly

## 🛠️ Troubleshooting

### Common Issues:

1. **Port conflicts**: Render uses dynamic ports (set PORT=10000)
2. **MongoDB connection**: Ensure MONGODB_URI is set correctly
3. **CORS issues**: Already handled in server.js
4. **Environment variables**: Double-check in Render dashboard

### Logs:

Check Render dashboard → Your Service → Logs for any errors
