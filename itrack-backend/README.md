# I-Track Backend - Render Deployment

Simple Node.js backend server for I-Track mobile application.

## 🚀 Deployment

This repository contains only the backend server files needed for Render deployment:

- `server.js` - Main server with all routes, models, and controllers
- `package.json` - Dependencies and scripts
- `package-lock.json` - Lock file for consistent installs

## 🌐 Environment Variables

Set these in your Render dashboard:

```
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

## 📡 API Endpoints

- POST `/login` - User authentication
- GET `/getUsers` - Get all users
- GET `/getAllocation` - Get driver allocations
- GET `/getStock` - Get inventory
- GET `/api/dispatch/assignments` - Get dispatch assignments
- GET `/api/config` - Get server configuration
- GET `/health` - Health check

## 🔧 Local Development

```bash
npm install
npm start
```

Server will run on http://localhost:5000
