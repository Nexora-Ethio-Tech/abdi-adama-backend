# 🚀 HahuCloud Server Deployment Guide

## Prerequisites
- SSH access to HahuCloud server (91.204.209.22)
- Node.js 18+ installed on server
- PM2 installed globally on server

---

## Step 1: Upload Files to Server

### Option A: Using SCP (from your local machine)
```bash
# Compress the project
tar -czf abdi-adama-backend.tar.gz abdi-adama-backend/

# Upload to server
scp abdi-adama-backend.tar.gz user@91.204.209.22:/home/user/

# SSH into server
ssh user@91.204.209.22

# Extract files
cd /home/user
tar -xzf abdi-adama-backend.tar.gz
cd abdi-adama-backend
```

### Option B: Using FTP/SFTP
1. Use FileZilla or WinSCP
2. Connect to: 91.204.209.22
3. Upload entire `abdi-adama-backend` folder
4. SSH into server and navigate to the folder

### Option C: Using Git (if available)
```bash
ssh user@91.204.209.22
cd /home/user
git clone your-repo-url abdi-adama-backend
cd abdi-adama-backend
```

---

## Step 2: Setup Environment

```bash
# Copy production environment file
cp .env.production .env

# Edit if needed
nano .env
```

---

## Step 3: Install Node.js (if not installed)

```bash
# Check if Node.js is installed
node --version

# If not installed, install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

---

## Step 4: Install PM2 (if not installed)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

---

## Step 5: Run Deployment Script

```bash
# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

**OR manually run these commands:**

```bash
# 1. Install dependencies
npm install

# 2. Build TypeScript
npm run build

# 3. Seed database
npm run seed:superadmin

# 4. Start with PM2
pm2 start ecosystem.config.js

# 5. Save PM2 config
pm2 save

# 6. Setup PM2 startup
pm2 startup
# Follow the command it outputs
```

---

## Step 6: Verify Deployment

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs abdi-adama-api

# Test health endpoint
curl http://localhost:5000/health

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"abdiadamaschooloffice@gmail.com","password":"SuperAdmin@2026"}'
```

---

## Step 7: Configure Nginx (Optional - for domain access)

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/abdi-adama-api

# Paste this configuration:
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/abdi-adama-api /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Step 8: Setup SSL (Optional)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 🎯 PM2 Management Commands

```bash
pm2 status                    # Check status
pm2 logs abdi-adama-api      # View logs
pm2 restart abdi-adama-api   # Restart
pm2 stop abdi-adama-api      # Stop
pm2 delete abdi-adama-api    # Remove
pm2 monit                     # Monitor in real-time
```

---

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Test database connection
psql -h 91.204.209.22 -U abdiadam -d abdiadam_school_db

# If it works, the backend should work too
```

### Port Already in Use
```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill process
sudo kill -9 <PID>
```

### Permission Issues
```bash
# Fix permissions
chmod -R 755 /home/user/abdi-adama-backend
chown -R $USER:$USER /home/user/abdi-adama-backend
```

---

## ✅ Deployment Checklist

- [ ] Files uploaded to server
- [ ] Node.js 18+ installed
- [ ] PM2 installed
- [ ] Dependencies installed (`npm install`)
- [ ] TypeScript compiled (`npm run build`)
- [ ] Database seeded (`npm run seed:superadmin`)
- [ ] Application started (`pm2 start`)
- [ ] Health check passes
- [ ] Login test passes
- [ ] Nginx configured (optional)
- [ ] SSL certificate installed (optional)

---

## 🎉 Success!

Your backend is now running on HahuCloud server!

**API URL:** http://91.204.209.22:5000 (or your domain)

**Test it:**
```bash
curl http://91.204.209.22:5000/health
```
