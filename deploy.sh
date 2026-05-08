#!/bin/bash

# Abdi Adama Backend - Deployment Script for HahuCloud Server
# Run this script on the HahuCloud server after uploading files

echo "🚀 Starting Abdi Adama Backend Deployment..."

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 2. Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# 3. Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs

# 4. Seed database (only run once)
echo "🌱 Seeding database with initial accounts..."
npm run seed:superadmin

# 5. Start with PM2
echo "🎯 Starting application with PM2..."
pm2 start ecosystem.config.js

# 6. Save PM2 configuration
pm2 save

# 7. Setup PM2 startup
pm2 startup

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Run: pm2 logs abdi-adama-api (to view logs)"
echo "2. Run: pm2 status (to check status)"
echo "3. Test API: curl http://localhost:5000/health"
echo ""
echo "🎉 Backend is now running!"
