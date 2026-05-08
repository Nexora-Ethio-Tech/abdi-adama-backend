# 🔐 SSH Connection Guide - HahuCloud Server

## ✅ What You Have
- SSH Private Key: `hahucloud_key` (saved in project root)
- Server IP: 91.204.209.22

## ❓ What You Still Need
Ask them for:
1. **SSH Username** (e.g., root, ubuntu, admin, hahucloud)
2. **Passphrase** (password to unlock the SSH key)
3. **SSH Port** (usually 22)

---

## 🚀 Once You Have All Info

### Step 1: Set Key Permissions (Windows)

```powershell
# Navigate to project folder
cd C:\Users\haile\Desktop\abdi-adama-backend

# Set proper permissions (Windows)
icacls hahucloud_key /inheritance:r
icacls hahucloud_key /grant:r "%USERNAME%:R"
```

### Step 2: Connect via SSH

```powershell
# Replace 'username' with actual username they provide
ssh -i hahucloud_key username@91.204.209.22

# If they specify a different port (e.g., 2222):
ssh -i hahucloud_key -p 2222 username@91.204.209.22

# You'll be asked for the passphrase - enter it
```

### Step 3: Upload Backend Files

**Option A: Using SCP (Command Line)**
```powershell
# Compress project first
Compress-Archive -Path "C:\Users\haile\Desktop\abdi-adama-backend" -DestinationPath "C:\Users\haile\Desktop\backend.zip"

# Upload to server
scp -i hahucloud_key C:\Users\haile\Desktop\backend.zip username@91.204.209.22:/home/username/

# SSH into server
ssh -i hahucloud_key username@91.204.209.22

# On server, extract
cd /home/username
unzip backend.zip
cd abdi-adama-backend
```

**Option B: Using WinSCP (GUI - Easier)**
1. Download WinSCP: https://winscp.net/eng/download.php
2. Open WinSCP
3. Click "New Site"
4. Configure:
   - **File protocol:** SFTP
   - **Host name:** 91.204.209.22
   - **Port:** 22 (or what they specify)
   - **User name:** (what they provide)
5. Click "Advanced" → "SSH" → "Authentication"
6. Browse and select: `C:\Users\haile\Desktop\abdi-adama-backend\hahucloud_key`
7. Click "OK" then "Login"
8. Enter passphrase when prompted
9. Drag and drop `abdi-adama-backend` folder to server

---

## 📋 Deployment Commands (Run on Server)

Once connected via SSH:

```bash
# Navigate to project
cd ~/abdi-adama-backend

# Check if Node.js is installed
node --version

# If not installed, install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install dependencies
npm install

# Build TypeScript
npm run build

# Update .env for localhost connection
nano .env
# Change DB_HOST=91.204.209.22 to DB_HOST=localhost
# Save: Ctrl+X, Y, Enter

# Seed database
npm run seed:superadmin

# Install PM2 (if not installed)
sudo npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Setup PM2 startup
pm2 startup
# Follow the command it outputs

# Check status
pm2 status

# View logs
pm2 logs abdi-adama-api
```

---

## 🧪 Test Deployment

```bash
# On server, test health endpoint
curl http://localhost:5000/health

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"abdiadamaschooloffice@gmail.com","password":"SuperAdmin@2026"}'

# If you get a token back, SUCCESS! ✅
```

---

## 🌐 Access from Outside

If you want to access the API from your local machine or frontend:

**Option 1: Direct Access (if firewall allows)**
```
http://91.204.209.22:5000/api/auth/login
```

**Option 2: Setup Nginx (recommended)**
```bash
# Install Nginx
sudo apt install -y nginx

# Configure reverse proxy
sudo nano /etc/nginx/sites-available/abdi-adama-api

# Paste configuration (see DEPLOY_TO_HAHUCLOUD.md)

# Enable and restart
sudo ln -s /etc/nginx/sites-available/abdi-adama-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🐛 Troubleshooting

### "Permission denied (publickey)"
- Make sure you're using the correct username
- Make sure you entered the passphrase correctly
- Check key file permissions

### "Connection refused"
- Check if SSH port is correct (might not be 22)
- Check if server firewall allows SSH

### "Host key verification failed"
```powershell
# Remove old host key
ssh-keygen -R 91.204.209.22
# Try connecting again
```

---

## ✅ Quick Checklist

- [ ] Got SSH username from them
- [ ] Got passphrase from them
- [ ] Got SSH port from them
- [ ] Set key permissions
- [ ] Successfully connected via SSH
- [ ] Uploaded backend files
- [ ] Installed Node.js (if needed)
- [ ] Ran `npm install`
- [ ] Ran `npm run build`
- [ ] Updated .env (DB_HOST=localhost)
- [ ] Ran `npm run seed:superadmin`
- [ ] Started with PM2
- [ ] Tested health endpoint
- [ ] Tested login endpoint

---

## 🎉 Success!

Once all steps are complete, your backend is running on HahuCloud server!

**API accessible at:** http://91.204.209.22:5000
