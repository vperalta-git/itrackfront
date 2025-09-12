#!/bin/bash

# I-Track Backend Startup Script for Render.com
echo "🚀 Starting I-Track Backend API Server..."
echo "Environment: $NODE_ENV"
echo "Port: $PORT"
echo "MongoDB URI configured: $(echo $MONGODB_URI | head -c 50)..."

# Ensure we're in the right directory
cd /opt/render/project/src

# Start the Node.js server
exec node server.js