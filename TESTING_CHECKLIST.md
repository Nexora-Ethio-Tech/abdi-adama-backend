# Abdi Adama Backend API - Manual Testing Checklist

## Prerequisites
- Backend deployed and running on cPanel
- Database accessible
- Postman installed
- Import `Abdi_Adama_API_Tests.postman_collection.json`

## Test Environment Setup

### 1. Configure Postman Variables
- Open Postman Collection
- Go to Variables tab
- Set `baseUrl` to your deployed URL (e.g., `https://yourdomain.com/api` or `http://localhost:5001/api`)

### 2. Seeded Test Accounts
```
Super Admin:
  Email: abdiadamaschooloffice@gmail.com
  Password: SuperAdmin@2026

School Admin:
  Email: 65plante@gmail.com
  Password: SchoolAdmin@2026

Vice Principal:
  Email: valerioero@gmail.com
  Password: VicePrincipal@2026

Auditor:
  Email: hailegit35@gmail.com
  Password: Auditor@2026
```

---

## Testing Workflow

### Phase 1: Authentication (CRITICAL - Do First)

#### Test 1.1: Login Super Admin
- [ ] Run "Login Super Admin" request
- [ ] Verify status code: 200
- [ ] Verify response contains `accessToken`
- [ ] Verify `superAdminToken` variable is auto-set
- [ ] Verify user role is `super-admin`

#### Test 1.2: Login School Admin
- [ ] Run "Login School Admin" request
- [ ] Verify status code: 200
- [ ] Verify `schoolAdminToken` and `branchId` variables are auto-set
- [ ] Verify user has `branch_id`

#### Test 1.3: Login Vice Principal
- [ ] Run "Login Vice Principal" request
- [ ] Verify status code: 200
- [ ] Verify `vicePrincipalToken` variable is auto-set

#### Test 1.4: Login Auditor
- [ ] Run "Login Auditor" request
- [ ] Verify status code: 200
- [ ] Verify `auditorToken` variable is auto-set

#### Test 1.5: Get Current User
- [ ] Run "Get Current User" request
- [ ] Verify status code: 200
- [ ] Verify user details match logged-in user

#### Test 1.6: Invalid Login
- [ ] Manually create request with wrong credentials
- [ ] Verify status code: 401
- [ ] Verify error message

---

### Phase 2: Super Admin Module

#### Test 2.1: Dashboard
- [ ] Run "Get Dashboard" request
- [ ] Verify status code: 200
- [ ] Verify dashboard contains system statistics

#### Test 2.2: User Management
- [ ] Run "Get All Users" request
- [ ] Verify status code: 200
- [ ] Verify returns array of users
- [ ] Count total users

#### Test 2.3: Create School Admin
- [ ] Update email in request body (use unique email)
- [ ] Run "Create School Admin" request
- [ ] Verify status code: 201
- [ ] Verify user created with correct role
- [ ] Verify temporary password returned
- [ ] Save `userId` for later tests

#### Test 2.4: Create Vice Principal
- [ ] Update email in request body
- [ ] Run "Create Vice Principal" request
- [ ] Verify status code: 201

#### Test 2.5: Create Auditor
- [ ] Update email in request body
- [ ] Run "Create Auditor" request
- [ ] Verify status code: 201

#### Test 2.6: Branch Management
- [ ] Run "Get All Branches" request
- [ ] Verify status code: 200
- [ ] Verify branches list returned
- [ ] Run "Create Branch" request (update name/code to be unique)
- [ ] Verify status code: 201

#### Test 2.7: System Reports
- [ ] Run "Get System Report" request
- [ ] Verify status code: 200
- [ ] Verify contains: totalBranches, usersByRole, totalStudents

#### Test 2.8: Approve User
- [ ] Set `userId` variable to a pending user ID
- [ ] Run "Approve User" request
- [ ] Verify status code: 200
- [ ] Verify user status changed to "Approved"

---

### Phase 3: School Admin Module

#### Test 3.1: Dashboard
- [ ] Run "Get Dashboard" request
- [ ] Verify status code: 200
- [ ] Verify branch-specific statistics

#### Test 3.2: Register Teacher
- [ ] Update email in request body
- [ ] Run "Register Teacher" request
- [ ] Verify status code: 201
- [ ] Verify teacher created in same branch
- [ ] Verify digital ID format: `TCH-{BRANCH}-####`
- [ ] Save teacher ID

#### Test 3.3: Register Student
- [ ] Update email in request body
- [ ] Run "Register Student" request
- [ ] Verify status code: 201
- [ ] Verify student has grade field
- [ ] Verify digital ID format: `STD-{BRANCH}-####`
- [ ] Save `studentId` variable

#### Test 3.4: Register Finance Clerk
- [ ] Update email in request body
- [ ] Run "Register Finance Clerk" request
- [ ] Verify status code: 201
- [ ] Verify role is `finance-clerk`
- [ ] Save credentials for Phase 4

#### Test 3.5: Register Other Roles
- [ ] Test registering: Driver, Librarian, Clinic Admin
- [ ] Verify all succeed with status 201

#### Test 3.6: Class Management
- [ ] Run "Create Class" request
- [ ] Verify status code: 201
- [ ] Save `classId` variable
- [ ] Run "Get All Classes" request
- [ ] Verify new class appears in list

#### Test 3.7: Academic Year
- [ ] Run "Create Academic Year" request
- [ ] Verify status code: 201
- [ ] Verify year created for branch

#### Test 3.8: Get Branch Users
- [ ] Run "Get Branch Users" request
- [ ] Verify status code: 200
- [ ] Verify only users from same branch returned

---

### Phase 4: Finance Clerk Module

**Note:** Login with Finance Clerk credentials first

#### Test 4.1: Dashboard
- [ ] Run "Get Dashboard" request
- [ ] Verify status code: 200
- [ ] Verify financial statistics displayed

#### Test 4.2: View Payments
- [ ] Run "Get All Payments" request
- [ ] Verify status code: 200
- [ ] Verify returns payment array

#### Test 4.3: Record Payment
- [ ] Set `studentId` variable to valid student
- [ ] Run "Record Payment" request
- [ ] Verify status code: 201
- [ ] Verify payment recorded

#### Test 4.4: Overdue Payments
- [ ] Run "Get Overdue Payments" request
- [ ] Verify status code: 200
- [ ] Verify returns overdue list

---

### Phase 5: Teacher Module

**Note:** Login with Teacher credentials first

#### Test 5.1: Dashboard
- [ ] Run "Get Dashboard" request
- [ ] Verify status code: 200
- [ ] Verify teacher-specific data

#### Test 5.2: View Schedule
- [ ] Run "Get Schedule" request
- [ ] Verify status code: 200
- [ ] Verify schedule returned

#### Test 5.3: Mark Attendance
- [ ] Set `classId` and `studentId` variables
- [ ] Run "Mark Attendance" request
- [ ] Verify status code: 201
- [ ] Verify attendance recorded

#### Test 5.4: Submit Lesson Plan
- [ ] Run "Submit Lesson Plan" request
- [ ] Verify status code: 201
- [ ] Verify lesson plan created with "Draft" status

---

### Phase 6: Vice Principal Module

#### Test 6.1: Dashboard
- [ ] Run "Get Dashboard" request
- [ ] Verify status code: 200
- [ ] Verify oversight statistics

#### Test 6.2: Absence Queue
- [ ] Run "Get Absence Queue" request
- [ ] Verify status code: 200
- [ ] Verify returns absence records

#### Test 6.3: Pending Lesson Plans
- [ ] Run "Get Pending Lesson Plans" request
- [ ] Verify status code: 200
- [ ] Verify returns lesson plans awaiting review

#### Test 6.4: Teacher Monitoring
- [ ] Run "Get Teacher Monitoring" request
- [ ] Verify status code: 200
- [ ] Verify returns teacher performance data

---

### Phase 7: Auditor Module

#### Test 7.1: Dashboard
- [ ] Run "Get Dashboard" request
- [ ] Verify status code: 200
- [ ] Verify financial overview

#### Test 7.2: View Payments (Read-Only)
- [ ] Run "Get All Payments" request
- [ ] Verify status code: 200
- [ ] Verify can view all payments

#### Test 7.3: Fee Reduction Requests
- [ ] Run "Get Fee Reduction Requests" request
- [ ] Verify status code: 200
- [ ] Verify returns fee reduction list

#### Test 7.4: Approve Fee Reduction
- [ ] Set `studentId` to student with pending fee reduction
- [ ] Run "Approve Fee Reduction" request
- [ ] Verify status code: 200
- [ ] Verify status changed to "Approved"

#### Test 7.5: Financial Report
- [ ] Run "Get Financial Report" request
- [ ] Verify status code: 200
- [ ] Verify report contains income, expenses, revenue targets

---

### Phase 8: Authorization & Security Tests

#### Test 8.1: Unauthorized Access
- [ ] Remove Authorization header
- [ ] Try any protected endpoint
- [ ] Verify status code: 401

#### Test 8.2: Role-Based Access Control
- [ ] Use School Admin token
- [ ] Try accessing Super Admin endpoint
- [ ] Verify status code: 403

#### Test 8.3: Cross-Branch Access
- [ ] Login as School Admin from Branch A
- [ ] Try accessing users from Branch B
- [ ] Verify returns empty or error

#### Test 8.4: Invalid Token
- [ ] Set Authorization header to invalid token
- [ ] Try any endpoint
- [ ] Verify status code: 401

---

### Phase 9: Validation Tests

#### Test 9.1: Invalid Email Format
- [ ] Try registering user with email: "notanemail"
- [ ] Verify status code: 400
- [ ] Verify validation error message

#### Test 9.2: Invalid Role
- [ ] Try School Admin registering "super-admin" role
- [ ] Verify status code: 400
- [ ] Verify error message

#### Test 9.3: Missing Required Fields
- [ ] Try creating user without name
- [ ] Verify status code: 400
- [ ] Verify validation error

#### Test 9.4: Duplicate Email
- [ ] Try registering user with existing email
- [ ] Verify status code: 400 or 409
- [ ] Verify error message

---

## Test Results Summary

### Total Tests: 60+

| Module | Tests | Passed | Failed | Notes |
|--------|-------|--------|--------|-------|
| Authentication | 6 | | | |
| Super Admin | 8 | | | |
| School Admin | 8 | | | |
| Finance Clerk | 4 | | | |
| Teacher | 4 | | | |
| Vice Principal | 4 | | | |
| Auditor | 5 | | | |
| Authorization | 4 | | | |
| Validation | 4 | | | |

---

## Common Issues & Solutions

### Issue 1: Connection Timeout
**Symptom:** Requests timeout after 10 seconds
**Solution:** Check database connection, verify backend is running

### Issue 2: 401 Unauthorized
**Symptom:** All requests return 401
**Solution:** Re-login to get fresh token, check token expiry (15 min)

### Issue 3: 403 Forbidden
**Symptom:** Request denied despite valid token
**Solution:** Verify user role has permission for endpoint

### Issue 4: 500 Internal Server Error
**Symptom:** Server error on valid request
**Solution:** Check server logs, verify database schema, check required fields

---

## Performance Benchmarks

- [ ] Login response time < 1 second
- [ ] Dashboard load time < 2 seconds
- [ ] List endpoints < 1 second
- [ ] Create operations < 1 second
- [ ] Complex queries < 3 seconds

---

## Final Checklist

- [ ] All authentication endpoints working
- [ ] All 6 role modules functional
- [ ] Authorization properly enforced
- [ ] Validation working correctly
- [ ] No security vulnerabilities found
- [ ] Performance acceptable
- [ ] Error messages clear and helpful
- [ ] All CRUD operations working
- [ ] Cross-branch isolation working
- [ ] Digital ID generation correct

---

## Sign-off

**Tester Name:** ___________________
**Date:** ___________________
**Backend Version:** 1.0.0
**Test Environment:** ___________________
**Overall Status:** ☐ PASS  ☐ FAIL  ☐ PARTIAL

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________
