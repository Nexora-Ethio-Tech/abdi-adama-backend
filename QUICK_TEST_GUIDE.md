# Quick Testing Guide

## 🚀 How to Test the Backend

### Step 1: Import Postman Collection
1. Open Postman
2. Click **Import** button
3. Select `Abdi_Adama_API_Tests.postman_collection.json`
4. Collection will appear in left sidebar

### Step 2: Configure Base URL
1. Click on the collection name
2. Go to **Variables** tab
3. Set `baseUrl` to:
   - Local: `http://localhost:5001/api`
   - Production: `https://yourdomain.com/api`

### Step 3: Run Tests in Order

#### 3.1 Login First (CRITICAL)
Run these 4 requests in "1. Authentication" folder:
- ✅ Login Super Admin
- ✅ Login School Admin  
- ✅ Login Vice Principal
- ✅ Login Auditor

**Tokens will auto-save to variables!**

#### 3.2 Test Each Module
Now test any endpoint in any order:
- 2. Super Admin (8 endpoints)
- 3. School Admin (8 endpoints)
- 4. Finance Clerk (4 endpoints)
- 5. Teacher (4 endpoints)
- 6. Vice Principal (4 endpoints)
- 7. Auditor (5 endpoints)

---

## 📋 Quick Test Checklist

### Must Test (Critical):
- [ ] Login all 4 roles
- [ ] Super Admin: Create users
- [ ] School Admin: Register teacher/student
- [ ] School Admin: Create class
- [ ] Finance Clerk: View payments
- [ ] Teacher: View dashboard
- [ ] Vice Principal: View absence queue
- [ ] Auditor: View payments (read-only)

### Should Test (Important):
- [ ] Super Admin: Branch management
- [ ] School Admin: Academic year
- [ ] Finance Clerk: Record payment
- [ ] Teacher: Mark attendance
- [ ] Vice Principal: Review lesson plans
- [ ] Auditor: Approve fee reduction

### Nice to Test:
- [ ] Change password
- [ ] Invalid login
- [ ] Unauthorized access (no token)
- [ ] Forbidden access (wrong role)

---

## 🔑 Test Credentials

```
Super Admin:
  abdiadamaschooloffice@gmail.com / SuperAdmin@2026

School Admin:
  65plante@gmail.com / SchoolAdmin@2026

Vice Principal:
  valerioero@gmail.com / VicePrincipal@2026

Auditor:
  hailegit35@gmail.com / Auditor@2026
```

---

## ✅ Expected Results

### Successful Response:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Login again to get fresh token |
| 403 Forbidden | Using wrong role for endpoint |
| 500 Server Error | Check backend logs, verify DB connection |
| Timeout | Backend not running or DB unreachable |

---

## 📊 Test Coverage

**Total Endpoints:** 40+
**Roles Covered:** 6 (Super Admin, School Admin, Finance Clerk, Teacher, Vice Principal, Auditor)
**Features Tested:** Authentication, User Management, Class Management, Payments, Attendance, Lesson Plans, Reports

---

## 🎯 Success Criteria

✅ All logins work
✅ Each role can access their endpoints
✅ Cross-role access is blocked
✅ Data is properly isolated by branch
✅ Validation catches invalid inputs
✅ Error messages are clear

---

## 📞 Need Help?

1. Check `TESTING_CHECKLIST.md` for detailed step-by-step guide
2. Check `README.md` for API documentation
3. Check server logs for error details
4. Verify database connection

---

**Happy Testing! 🚀**
