# Abdi Adama School Management System - Backend API (TypeScript)

Complete authentication and user management system for the Abdi Adama School Management System built with TypeScript, Express, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ LTS
- PostgreSQL 14+
- npm or yarn
- TypeScript 5.x

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Run database schema**
```bash
# Make sure your PostgreSQL database is running
# Execute schema.sql in your database
psql -U abdiadam_admin -d abdiadam_school_db -f schema.sql
```

4. **Seed initial admin accounts**
```bash
npm run seed:superadmin
```

This will create 4 accounts:
- **Super Admin**: abdiadamaschooloffice@gmail.com
- **School Admin**: 65plante@gmail.com
- **Vice Principal**: valerioero@gmail.com
- **Auditor**: hailegit35@gmail.com

Default password for all: Check console output after seeding

5. **Start the server**
```bash
# Development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Production mode
npm start
```

Server will run on `http://localhost:5000`

**Note:** TypeScript files are in `src/` and compiled JavaScript goes to `dist/`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": []
  }
}
```

---

## 🔐 Authentication Endpoints

### 1. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "abdiadamaschooloffice@gmail.com",
  "password": "SuperAdmin@2026"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "digitalId": "SA-001",
      "username": "superadmin",
      "name": "Super Administrator",
      "email": "abdiadamaschooloffice@gmail.com",
      "role": "super-admin",
      "branchId": null,
      "status": "Approved",
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

### 2. Get Current User
```http
GET /api/auth/me
Authorization: Bearer {accessToken}
```

### 3. Refresh Token
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

### 4. Change Password
```http
POST /api/auth/change-password
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "currentPassword": "oldPassword",
  "newPassword": "newPassword123!"
}
```

### 5. Logout
```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
```

---

## 👑 Super Admin Endpoints

**All endpoints require Super Admin role**

### 1. Create School Admin
```http
POST /api/super-admin/create-school-admin
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "branchId": "uuid-of-branch",
  "password": "Optional123!" // Optional, auto-generated if not provided
}
```

### 2. Create Vice Principal
```http
POST /api/super-admin/create-vice-principal
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "branchId": "uuid-of-branch"
}
```

### 3. Create Auditor
```http
POST /api/super-admin/create-auditor
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Mike Johnson",
  "email": "mike@example.com",
  "branchId": "uuid-of-branch"
}
```

### 4. Get All Users
```http
GET /api/super-admin/users?role=teacher&status=Approved&branchId=uuid
Authorization: Bearer {accessToken}
```

### 5. Get User by ID
```http
GET /api/super-admin/users/{userId}
Authorization: Bearer {accessToken}
```

### 6. Update User Status (Approve/Revoke)
```http
PATCH /api/super-admin/users/{userId}/status
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "Approved" // or "Revoked" or "Pending"
}
```

### 7. Delete User
```http
DELETE /api/super-admin/users/{userId}
Authorization: Bearer {accessToken}
```

---

## 🏫 School Admin Endpoints

**All endpoints require School Admin role**

### 1. Register User (Teacher, Student, Parent, Staff)
```http
POST /api/school-admin/register-user
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Teacher Name",
  "email": "teacher@example.com",
  "role": "teacher", // teacher, student, parent, finance-clerk, librarian, clinic-admin, driver
  "grade": "10" // Required for students only
}
```

**Note:** User will be created in the same branch as the School Admin

### 2. Get Branch Users
```http
GET /api/school-admin/users?role=teacher&status=Approved
Authorization: Bearer {accessToken}
```

### 3. Get User by ID
```http
GET /api/school-admin/users/{userId}
Authorization: Bearer {accessToken}
```

---

## 🔑 User Roles & Permissions

| Role | Created By | Can Create | Dashboard Access |
|------|-----------|------------|------------------|
| Super Admin | System (seeded) | School Admin, VP, Auditor | Full system |
| School Admin | Super Admin | Teachers, Students, Parents, Staff | Branch management |
| Vice Principal | Super Admin | None | Academic oversight |
| Auditor | Super Admin | None | Read-only finance |
| Teacher | School Admin | None | Teaching dashboard |
| Student | School Admin | None | Student portal |
| Parent | School Admin | None | Parent portal |
| Staff | School Admin | None | Role-specific |

---

## 🆔 Digital ID Format

Each user gets a unique Digital ID:

- **Super Admin**: `SA-001`, `SA-002`, ...
- **School Admin**: `ADM-{BRANCH}-0001`, e.g., `ADM-MB-0001`
- **Vice Principal**: `VP-{BRANCH}-0001`
- **Teacher**: `TCH-{BRANCH}-0001`
- **Student**: `STD-{BRANCH}-0001`
- **Auditor**: `AUD-{BRANCH}-0001`

**Branch Codes:**
- MB = Main Branch
- BL = Bole Branch
- MG = Megenagna Branch
- AD = Adama Branch

---

## 🔒 Security Features

- ✅ JWT-based authentication (15min access, 7day refresh)
- ✅ Bcrypt password hashing (12 rounds)
- ✅ Role-based access control (RBAC)
- ✅ Rate limiting (100 req/15min, 5 login attempts/15min)
- ✅ Helmet.js security headers
- ✅ CORS protection
- ✅ Input validation with Joi
- ✅ SQL injection protection (parameterized queries)

---

## 📁 Project Structure

```
abdi-adama-backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # PostgreSQL connection
│   │   └── constants.ts         # Role definitions, enums
│   ├── middleware/
│   │   ├── auth.ts              # JWT verification
│   │   ├── roleGuard.ts         # Role-based access
│   │   ├── errorHandler.ts      # Global error handler
│   │   └── validator.ts         # Request validation
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── superAdmin.controller.ts
│   │   └── schoolAdmin.controller.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── superAdmin.routes.ts
│   │   └── schoolAdmin.routes.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   └── user.service.ts
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces & types
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   ├── idGenerator.ts
│   │   └── logger.ts
│   ├── scripts/
│   │   └── seedSuperAdmin.ts
│   ├── app.ts
│   └── server.ts
├── dist/                        # Compiled JavaScript (generated)
├── .env
├── .env.example
├── package.json
├── tsconfig.json                # TypeScript configuration
├── schema.sql
└── README.md
```

---

## 🧪 Testing the API

### Using cURL

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"abdiadamaschooloffice@gmail.com","password":"SuperAdmin@2026"}'
```

**Create School Admin:**
```bash
curl -X POST http://localhost:5000/api/super-admin/create-school-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"name":"New Admin","email":"admin@example.com","branchId":"BRANCH_UUID"}'
```

### Using Postman

1. Import the API endpoints
2. Set up environment variables:
   - `baseUrl`: `http://localhost:5000/api`
   - `accessToken`: (set after login)
3. Test each endpoint

---

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=abdiadam_school_db
DB_USER=abdiadam_admin
DB_PASSWORD=your_secure_password
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
FRONTEND_URL=https://yourdomain.com
```

### Using PM2 (Process Manager)

```bash
npm install -g pm2

# Start
pm2 start server.js --name abdi-adama-api

# Monitor
pm2 monit

# Logs
pm2 logs abdi-adama-api

# Restart
pm2 restart abdi-adama-api

# Stop
pm2 stop abdi-adama-api
```

---

## 📝 Notes

1. **First Login**: All seeded accounts should change their passwords immediately after first login
2. **Super Admin**: Cannot be deleted through the API
3. **Branch Isolation**: School Admins can only manage users in their assigned branch
4. **Status Workflow**: Users start as "Pending" → Super Admin approves → "Approved"
5. **Revoked Access**: Super Admin can revoke access anytime, preventing login

---

## 🐛 Troubleshooting

**Database Connection Error:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U abdiadam_admin -d abdiadam_school_db -h localhost
```

**Port Already in Use:**
```bash
# Change PORT in .env file
PORT=5001
```

**JWT Token Expired:**
- Use the refresh token endpoint to get a new access token
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days

---

## 📞 Support

For issues or questions, contact the development team.

---

## 📄 License

Proprietary - Abdi Adama School Management System
