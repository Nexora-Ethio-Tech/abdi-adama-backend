@echo off
echo Creating deployment package...

if exist deploy-package.zip del deploy-package.zip

powershell Compress-Archive -Path dist,package.json,package-lock.json,schema.sql,.env.server -DestinationPath deploy-package.zip -Force

echo Deployment package created: deploy-package.zip
echo.
echo Next steps:
echo 1. Upload deploy-package.zip to cPanel File Manager
echo 2. Extract in your Node.js app directory
echo 3. Rename .env.server to .env
echo 4. Update JWT secrets in .env
echo 5. Run: npm install --production
echo 6. Run: npm run seed:superadmin
echo 7. Start app from cPanel Node.js interface
echo.
echo IMPORTANT: Database will use localhost since app runs on same server
pause
