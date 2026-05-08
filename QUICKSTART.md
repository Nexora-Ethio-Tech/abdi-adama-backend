# Quick Start Guide - Abdi Adama Backend (TypeScript)

## 📦 Installation Steps

### 1. Install Dependencies
```bash
npm install
```

This will install:
- **Runtime**: express, pg, bcryptjs, jsonwebtoken, cors, helmet, joi, winston
- **TypeScript**: typescript, ts-node, ts-node-dev
- **Type Definitions**: @types/express, @types/node, @types/pg, @types/bcryptjs, @types/jsonwebtoken, @types/cors

### 2. Database Setup

Make sure PostgreSQL is running and execute the schema:
```bash
psql -U abdiadam_admin -d abdiadam_school_db -f schema.sql
```

### 3. Environment Configuration

The `.env` file is already configured with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=abdiadam_school_db
DB_USER=abdiadam_admin
DB_PASSWORD=A*nEGHCRXY,N7Pae
```

### 4. Seed Initial Accounts

Run the seeding script to create the 4 initial accounts:
```bash
npm run seed:superadmin
```

This creates:
- **Super Admin**: abdiadamaschooloffice@gmail.com (Password: SuperAdmin@2026)
- **School Admin**: 65plante@gmail.com (Password: SchoolAdmin@2026)
- **Vice Principal**: valerioero@gmail.com (Password: VicePrincipal@2026)
- **Auditor**: hailegit35@gmail.com (Password: Auditor@2026)

### 5. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:5000` with hot reload enabled.

---

## 🧪 Testing the API

### Test 1: Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Abdi Adama School API is running",
  "timestamp": "2026-01-08T..."
}
```

### Test 2: Login as Super Admin
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "abdiadamaschooloffice@gmail.com",
    "password": "SuperAdmin@2026"
  }'
```

Save the `accessToken` from the response.

### Test 3: Get Current User
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Test 4: Create School Admin (Super Admin only)

First, get a branch ID:
```bash
curl http://localhost:5000/api/super-admin/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Then create a new school admin:
```bash
curl -X POST http://localhost:5000/api/super-admin/create-school-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "New School Admin",
    "email": "newadmin@example.com",
    "branchId": "PASTE_BRANCH_UUID_HERE"
  }'
```

---

## 📂 TypeScript Project Structure

```
src/
├── types/index.ts          # All TypeScript interfaces and enums
├── config/
│   ├── database.ts         # Database connection with types
│   └── constants.ts        # Typed constants
├── middleware/
│   ├── auth.ts             # Typed authentication middleware
│   ├── roleGuard.ts        # Typed role guard
│   ├── errorHandler.ts     # Typed error handler
│   └── validator.ts        # Joi validation with types
├── services/
│   ├── auth.service.ts     # Authentication business logic
│   └── user.service.ts     # User management logic
├── controllers/
│   ├── auth.controller.ts
│   ├── superAdmin.controller.ts
│   └── schoolAdmin.controller.ts
├── routes/
│   ├── auth.routes.ts
│   ├── superAdmin.routes.ts
│   └── schoolAdmin.routes.ts
├── utils/
│   ├── jwt.ts              # JWT utilities with types
│   ├── password.ts         # Password utilities
│   ├── idGenerator.ts      # Digital ID generator
│   └── logger.ts           # Winston logger
├── scripts/
│   └── seedSuperAdmin.ts   # Database seeding script
├── app.ts                  # Express app configuration
└── server.ts               # Server entry point
```

---

## 🔧 TypeScript Commands

### Development
```bash
npm run dev              # Start with hot reload (ts-node-dev)
```

### Production Build
```bash
npm run build            # Compile TypeScript to JavaScript
npm start                # Run compiled JavaScript
```

### Seeding
```bash
npm run seed:superadmin  # Seed initial admin accounts
```

---

## 🎯 Key TypeScript Features

### 1. Type Safety
All functions, parameters, and return types are strictly typed:
```typescript
async login(email: string, password: string): Promise<{ 
  user: User; 
  accessToken: string; 
  refreshToken: string 
}>
```

### 2. Enums for Roles and Status
```typescript
enum UserRole {
  SUPER_ADMIN = 'super-admin',
  SCHOOL_ADMIN = 'school-admin',
  // ...
}

enum UserStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REVOKED = 'Revoked'
}
```

### 3. Interface Definitions
```typescript
interface User {
  id: string;
  digital_id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  // ...
}
```

### 4. Request Type Extensions
```typescript
interface AuthRequest extends Request {
  user?: User;
}
```

---

## 🚀 Production Deployment

### 1. Build the Project
```bash
npm run build
```

This creates the `dist/` folder with compiled JavaScript.

### 2. Set Environment to Production
```env
NODE_ENV=production
```

### 3. Start with PM2
```bash
pm2 start dist/server.js --name abdi-adama-api
```

---

## 📝 Development Tips

1. **Hot Reload**: Changes to `.ts` files automatically restart the server in dev mode
2. **Type Checking**: TypeScript catches errors before runtime
3. **IntelliSense**: Get autocomplete and type hints in your IDE
4. **Strict Mode**: All TypeScript strict checks are enabled for maximum safety

---

## 🐛 Common Issues

### Issue: "Cannot find module"
**Solution**: Run `npm install` to install all dependencies

### Issue: TypeScript compilation errors
**Solution**: Check `tsconfig.json` and ensure all types are properly defined

### Issue: Database connection failed
**Solution**: Verify PostgreSQL is running and credentials in `.env` are correct

---

## ✅ Next Steps

1. ✅ Install dependencies
2. ✅ Run database schema
3. ✅ Seed initial accounts
4. ✅ Start development server
5. ✅ Test API endpoints
6. 🔄 Integrate with frontend
7. 🔄 Deploy to production

---

## 📞 Support

For issues or questions, contact the development team.
