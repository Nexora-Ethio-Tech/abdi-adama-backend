# 📦 How to Upload Backend to HahuCloud Server

## Option 1: Using WinSCP (Recommended for Windows)

### Step 1: Download WinSCP
- Download from: https://winscp.net/eng/download.php
- Install it

### Step 2: Connect to Server
1. Open WinSCP
2. Enter connection details:
   - **File protocol:** SFTP
   - **Host name:** 91.204.209.22
   - **Port:** 22 (or the port they provide)
   - **User name:** (ask for this)
   - **Password:** (ask for this)
3. Click "Login"

### Step 3: Upload Files
1. Navigate to `/home/username/` on the server (right panel)
2. Navigate to `C:\Users\haile\Desktop\abdi-adama-backend` on your PC (left panel)
3. Select all files and folders
4. Click "Upload" button
5. Wait for upload to complete

### Step 4: Connect via SSH
1. In WinSCP, press Ctrl+P (or click "Open session in PuTTY")
2. This opens a terminal to the server
3. Run deployment commands

---

## Option 2: Using PowerShell SCP (if SSH is available)

```powershell
# Compress the project
Compress-Archive -Path "C:\Users\haile\Desktop\abdi-adama-backend" -DestinationPath "C:\Users\haile\Desktop\abdi-adama-backend.zip"

# Upload (replace 'username' with actual username)
scp C:\Users\haile\Desktop\abdi-adama-backend.zip username@91.204.209.22:/home/username/

# Then SSH into server
ssh username@91.204.209.22

# On server, extract and deploy
cd /home/username
unzip abdi-adama-backend.zip
cd abdi-adama-backend
chmod +x deploy.sh
./deploy.sh
```

---

## Option 3: Using Git (if Git is available on server)

### On your local machine:
```powershell
cd C:\Users\haile\Desktop\abdi-adama-backend
git init
git add .
git commit -m "Initial commit"
# Push to GitHub/GitLab
```

### On the server:
```bash
ssh username@91.204.209.22
cd /home/username
git clone your-repo-url abdi-adama-backend
cd abdi-adama-backend
chmod +x deploy.sh
./deploy.sh
```

---

## 🎯 What You Need to Ask For

Send this message:

> Hi,
> 
> I need to upload and deploy the Node.js backend to the HahuCloud server (91.204.209.22).
> 
> Could you please provide:
> 1. **SSH/SFTP username and password**
> 2. **SSH port** (usually 22)
> 3. **Home directory path** (e.g., /home/username)
> 4. **Is Node.js 18+ installed?** (if not, I'll need sudo access to install it)
> 5. **Is PM2 installed?** (if not, I'll need sudo access to install it)
> 
> Thanks!

---

## ⚡ Quick Deployment (Once You Have Access)

1. Upload files using WinSCP
2. SSH into server
3. Run these commands:

```bash
cd /home/username/abdi-adama-backend
npm install
npm run build
npm run seed:superadmin
pm2 start ecosystem.config.js
pm2 save
```

Done! ✅

---

## 📞 Need Help?

If you get stuck, share:
1. The error message
2. Which step you're on
3. Screenshot (if helpful)
