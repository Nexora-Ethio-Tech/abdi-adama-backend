@echo off
echo ========================================
echo Abdi Adama Backend - Deployment Package
echo ========================================
echo.

REM Step 1: Clean previous build
echo [1/5] Cleaning previous build...
if exist dist rmdir /s /q dist
if exist deploy-package.zip del deploy-package.zip

REM Step 2: Build TypeScript
echo [2/5] Building TypeScript...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

REM Step 3: Create deployment directory
echo [3/5] Preparing deployment files...
if exist deploy-temp rmdir /s /q deploy-temp
mkdir deploy-temp

REM Copy necessary files
xcopy /E /I /Y dist deploy-temp\dist
xcopy /E /I /Y src deploy-temp\src
copy package.json deploy-temp\
copy package-lock.json deploy-temp\
copy .env.example deploy-temp\
copy schema.sql deploy-temp\
copy schema_additions.sql deploy-temp\
copy README.md deploy-temp\
copy tsconfig.json deploy-temp\

REM Step 4: Create .zip file
echo [4/5] Creating deployment package...
powershell Compress-Archive -Path deploy-temp\* -DestinationPath deploy-package.zip -Force

REM Step 5: Cleanup
echo [5/5] Cleaning up...
rmdir /s /q deploy-temp

echo.
echo ========================================
echo SUCCESS! Deployment package created:
echo deploy-package.zip
echo ========================================
echo.
echo Next steps:
echo 1. Upload deploy-package.zip to cPanel File Manager
echo 2. Extract the zip file
echo 3. Create .env file with production settings
echo 4. Run: npm install --production
echo 5. Run: npm start
echo.
pause
