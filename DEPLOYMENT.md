# 🚀 Deployment Checklist - Abdi Adama Backend

## ✅ Pre-Deployment Checklist

### 1. Local Development Setup
- [ ] Install Node.js 18+ LTS
- [ ] Install PostgreSQL 14+
- [ ] Clone/download the project
- [ ] Run `npm install`
- [ ] Configure `.env` file with database credentials
- [ ] Execute `schema.sql` in PostgreSQL
- [ ] Run `npm run seed:superadmin`
- [ ] Test with `npm run dev`
- [ ] Verify all 4 accounts can login

### 2. Code Quality
- [ ] All TypeScript files compile without errors (`npm run build`)
- [ ] No TypeScript warnings
- [ ] All API endpoints tested
- [ ] Postman collection works
- [ ] Error handling tested

### 3. Security Review
- [ ] JWT secrets are strong (32+ characters)
- [ ] Database password is secure
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] Helmet.js security headers active
- [ ] No sensitive data in logs

---

## 🌐 Production Deployment

### Option 1: cPanel Deployment (Node.js App)

#### Step 1: Check cPanel Node.js Support
1. Login to cPanel
2. Look for "Setup Node.js App" or "Node.js Selector"
3. If available, proceed with cPanel deployment
4. If not available, use Option 2 (VPS)

#### Step 2: Upload Files
```bash
# Compress the project
tar -czf abdi-adama-backend.tar.gz abdi-adama-backend/

# Upload via cPanel File Manager or FTP
# Extract in public_html or apps directory
```

#### Step 3: Setup Node.js App in cPanel
1. Go to "Setup Node.js App"
2. Click "Create Application"
3. Configure:
   - **Node.js version**: 18.x or higher
   - **Application mode**: Production
   - **Application root**: `/home/username/abdi-adama-backend`
   - **Application URL**: `api.yourdomain.com` or subdirectory
   - **Application startup file**: `dist/server.js`
   - **Environment variables**: Add from `.env` file

#### Step 4: Install Dependencies
```bash
# In cPanel Terminal or SSH
cd ~/abdi-adama-backend
npm install
npm run build
```

#### Step 5: Start Application
- Click "Start" in Node.js App manager
- Or run: `npm start`

#### Step 6: Configure Domain
1. Go to cPanel "Domains" or "Subdomains"
2. Create subdomain: `api.yourdomain.com`
3. Point to Node.js app directory
4. Enable SSL (Let's Encrypt)

---

### Option 2: VPS Deployment (Recommended)

#### Step 1: Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL (if not already installed)
sudo apt install -y postgresql postgresql-contrib

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

#### Step 2: Upload Project
```bash
# On your local machine
scp -r abdi-adama-backend user@your-server-ip:/home/user/

# Or use Git
ssh user@your-server-ip
cd /home/user
git clone your-repo-url abdi-adama-backend
```

#### Step 3: Configure Environment
```bash
cd /home/user/abdi-adama-backend

# Create .env file
nano .env

# Paste production environment variables:
NODE_ENV=production
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=abdiadam_school_db
DB_USER=abdiadam_admin
DB_PASSWORD=your_secure_password
JWT_SECRET=your_super_secure_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_min_32_chars
FRONTEND_URL=https://yourdomain.com
```

#### Step 4: Install & Build
```bash
npm install
npm run build
```

#### Step 5: Setup Database
```bash
# Create database and user
sudo -u postgres psql

CREATE DATABASE abdiadam_school_db;
CREATE USER abdiadam_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE abdiadam_school_db TO abdiadam_admin;
\q

# Import schema
psql -U abdiadam_admin -d abdiadam_school_db -f schema.sql

# Seed initial accounts
npm run seed:superadmin
```

#### Step 6: Start with PM2
```bash
# Start application
pm2 start dist/server.js --name abdi-adama-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs

# Monitor
pm2 monit

# View logs
pm2 logs abdi-adama-api
```

#### Step 7: Configure Nginx
```bash
# Create Nginx configuration
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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/abdi-adama-api /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### Step 8: Setup SSL (Let's Encrypt)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

---

## 🔧 Post-Deployment

### 1. Verify Deployment
```bash
# Test health endpoint
curl https://api.yourdomain.com/health

# Test login
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "abdiadamaschooloffice@gmail.com",
    "password": "SuperAdmin@2026"
  }'
```

### 2. Update Frontend
Update frontend API base URL to:
```javascript
const API_BASE_URL = 'https://api.yourdomain.com/api';
```

### 3. Change Default Passwords
Login to each account and change passwords:
- Super Admin
- School Admin
- Vice Principal
- Auditor

### 4. Setup Monitoring
```bash
# PM2 monitoring
pm2 install pm2-logrotate

# Setup log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 5. Backup Strategy
```bash
# Database backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U abdiadam_admin abdiadam_school_db > backup_$DATE.sql
```

---

## 📊 Monitoring & Maintenance

### PM2 Commands
```bash
pm2 status                    # Check status
pm2 logs abdi-adama-api      # View logs
pm2 restart abdi-adama-api   # Restart app
pm2 stop abdi-adama-api      # Stop app
pm2 delete abdi-adama-api    # Remove from PM2
```

### Database Maintenance
```bash
# Backup database
pg_dump -U abdiadam_admin abdiadam_school_db > backup.sql

# Restore database
psql -U abdiadam_admin abdiadam_school_db < backup.sql
```

### Update Application
```bash
cd /home/user/abdi-adama-backend
git pull origin main          # If using Git
npm install                   # Install new dependencies
npm run build                 # Rebuild TypeScript
pm2 restart abdi-adama-api   # Restart application
```

---

## 🐛 Troubleshooting

### Issue: Port 5000 already in use
```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill process
sudo kill -9 <PID>

# Or change PORT in .env
```

### Issue: Database connection failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check connection
psql -U abdiadam_admin -d abdiadam_school_db -h localhost
```

### Issue: Nginx 502 Bad Gateway
```bash
# Check if Node.js app is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart services
pm2 restart abdi-adama-api
sudo systemctl restart nginx
```

### Issue: SSL certificate not working
```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

---

## 📝 Environment Variables Checklist

Production `.env` must have:
- [ ] `NODE_ENV=production`
- [ ] `PORT=5000` (or your preferred port)
- [ ] `DB_HOST` (production database host)
- [ ] `DB_PORT=5432`
- [ ] `DB_NAME=abdiadam_school_db`
- [ ] `DB_USER` (production database user)
- [ ] `DB_PASSWORD` (strong password)
- [ ] `JWT_SECRET` (32+ character random string)
- [ ] `JWT_REFRESH_SECRET` (32+ character random string)
- [ ] `FRONTEND_URL` (production frontend URL)

---

## ✅ Final Checklist

- [ ] Backend deployed and running
- [ ] Database schema imported
- [ ] Initial accounts seeded
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] CORS configured for frontend domain
- [ ] All 4 accounts tested
- [ ] API endpoints tested
- [ ] Frontend connected to backend
- [ ] Default passwords changed
- [ ] Monitoring setup
- [ ] Backup strategy in place
- [ ] Documentation updated

---

## 🎉 Deployment Complete!

Your Abdi Adama School Management System backend is now live at:
**https://api.yourdomain.com**

Test it:
```bash
curl https://api.yourdomain.com/health
```

Expected response:
```json
{
  "success": true,
  "message": "Abdi Adama School API is running",
  "timestamp": "2026-01-08T..."
}
```

---

## 📞 Support

For deployment issues, contact the development team.
