# Abdi Adama School Management System - API Reference

Quick reference guide for all new API endpoints.

---

## Module 1: Academic Structure

### Grades Management

#### Get All Grades
```http
GET /api/academic/grades
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "id": "uuid",
    "grade_level": "1",
    "branch_id": "uuid",
    "is_active": true,
    "created_at": "timestamp"
  }
]
```

#### Create Grade
```http
POST /api/academic/grades
Authorization: Bearer {token}
Content-Type: application/json

{
  "grade_level": "1",
  "branch_id": "uuid" // optional, defaults to user's branch
}

Response: 201 Created
```

#### Get Grades with Sections (for Dropdowns)
```http
GET /api/academic/grades/with-sections
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "grade_id": "uuid",
    "grade_level": "1",
    "sections": [
      {
        "id": "uuid",
        "section_name": "A",
        "capacity": 40,
        "current_count": 25,
        "available": 15
      }
    ]
  }
]
```

### Sections Management

#### Get Sections by Grade
```http
GET /api/academic/grades/{gradeId}/sections
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "id": "uuid",
    "section_name": "A",
    "capacity": 40,
    "current_count": 25,
    "room_teacher_id": "uuid",
    "room_teacher_name": "John Doe"
  }
]
```

#### Create Section
```http
POST /api/academic/sections
Authorization: Bearer {token}
Content-Type: application/json

{
  "grade_id": "uuid",
  "section_name": "A",
  "capacity": 40,
  "branch_id": "uuid" // optional
}

Response: 201 Created
```

#### Bulk Create Sections
```http
POST /api/academic/sections/bulk
Authorization: Bearer {token}
Content-Type: application/json

{
  "grade_id": "uuid",
  "section_count": 8,
  "capacity": 40,
  "branch_id": "uuid" // optional
}

Response: 201 Created
{ "message": "8 sections created successfully" }
```

#### Update Section
```http
PUT /api/academic/sections/{sectionId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "capacity": 45,
  "room_teacher_id": "uuid"
}

Response: 200 OK
```

#### Delete Section
```http
DELETE /api/academic/sections/{sectionId}
Authorization: Bearer {token}

Response: 200 OK
{ "message": "Section deleted successfully" }
```

---

## Module 2: Admissions Pipeline

### Registration Configuration

#### Get Registration Config
```http
GET /api/admissions/config
Authorization: Bearer {token}

Response: 200 OK
{
  "id": "uuid",
  "branch_id": "uuid",
  "is_open": true,
  "start_date": "2026-01-01",
  "end_date": "2026-03-31",
  "admission_fee": 5000
}
```

#### Toggle Registration
```http
POST /api/admissions/config/toggle
Authorization: Bearer {token}
Content-Type: application/json

{
  "is_open": true,
  "start_date": "2026-01-01",
  "end_date": "2026-03-31",
  "admission_fee": 5000
}

Response: 200 OK
```

### Applications

#### Submit Application (Public - No Auth)
```http
POST /api/admissions/apply
Content-Type: application/json

{
  "name": "Jane Doe",
  "dob": "2010-05-15",
  "parent_name": "John Doe",
  "phone": "912345678", // Will be formatted to +251912345678
  "email": "jane@example.com",
  "previous_school": "ABC School",
  "last_grade": "5",
  "grade_applying": "6",
  "transcript_url": "https://...",
  "transcript_size_kb": 1500,
  "branch_id": "uuid"
}

Response: 201 Created
```

#### Get All Applications
```http
GET /api/admissions/applications?status=pending
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "id": "uuid",
    "name": "Jane Doe",
    "status": "pending",
    "admission_fee": 5000,
    "created_at": "timestamp",
    "reviewed_by_name": null
  }
]
```

#### Review Application
```http
POST /api/admissions/applications/{applicationId}/review
Authorization: Bearer {token}
Content-Type: application/json

// Pass
{
  "action": "pass"
}

// Schedule Exam
{
  "action": "exam",
  "exam_details": {
    "exam_date": "2026-05-20",
    "exam_time": "10:00 AM",
    "location": "Main Hall",
    "subjects": "Math, English",
    "notes": "Bring ID card"
  }
}

// Decline
{
  "action": "decline"
}

Response: 200 OK
```

#### Mark Exam as Passed
```http
POST /api/admissions/applications/{applicationId}/exam-passed
Authorization: Bearer {token}

Response: 200 OK
```

#### Confirm Payment
```http
POST /api/admissions/applications/{applicationId}/confirm-payment
Authorization: Bearer {token}

Response: 200 OK
```

#### Finalize Enrollment
```http
POST /api/admissions/applications/{applicationId}/finalize
Authorization: Bearer {token}
Content-Type: application/json

{
  "section_id": "uuid"
}

Response: 200 OK
{
  "message": "Enrollment finalized successfully",
  "credentials": {
    "studentId": "uuid",
    "studentUsername": "STU/2026/001",
    "studentPassword": "123456",
    "parentPassword": "654321"
  }
}
```

#### Bulk Send Exam Notification
```http
POST /api/admissions/bulk-notification
Authorization: Bearer {token}
Content-Type: application/json

{
  "application_ids": ["uuid1", "uuid2", "uuid3"],
  "message_type": "SMS", // or "EMAIL" or "BOTH"
  "subject": "Entrance Exam Schedule",
  "message": "Your exam is scheduled for May 20, 2026 at 10:00 AM in Main Hall."
}

Response: 200 OK
```

---

## Module 4: Teacher Assignments

### Teacher Management

#### Get All Teachers (with Assignments)
```http
GET /api/teachers
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "id": "uuid",
    "name": "John Teacher",
    "digital_id": "TEA/2026/001",
    "room_section_name": "A",
    "room_grade_level": "1",
    "exam_assignments": [
      {
        "id": "uuid",
        "exam_title": "Mid-Term Math",
        "exam_date": "2026-06-15",
        "assigned_class": "Grade 1-A"
      }
    ],
    "department_heads": [
      {
        "id": "uuid",
        "department_name": "Mathematics"
      }
    ]
  }
]
```

#### Create Teacher
```http
POST /api/teachers
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "John Teacher",
  "email": "john@example.com",
  "branch_id": "uuid",
  "subjects": ["Math", "Physics"],
  "department": "Mathematics",
  "experience": "5 years",
  "bio": "Experienced math teacher",
  "age": 35,
  "sex": "Male",
  "emergency_contact": "+251912345678",
  "background_details": "Master's in Mathematics"
}

Response: 201 Created
{
  "message": "Teacher created successfully",
  "credentials": {
    "teacherUsername": "TEA/2026/001",
    "tempPassword": "123456"
  }
}
```

#### Get Teacher Details
```http
GET /api/teachers/{teacherId}
Authorization: Bearer {token}

Response: 200 OK
{
  "id": "uuid",
  "name": "John Teacher",
  "exam_assignments": [...],
  "department_heads": [...],
  "schedule": [
    {
      "day": "Monday",
      "time_slot": "8:00-9:00",
      "class_name": "Grade 1-A",
      "subject": "Math"
    }
  ]
}
```

### Room Teacher Assignment

#### Assign Room Teacher
```http
POST /api/teachers/{teacherId}/assign-room
Authorization: Bearer {token}
Content-Type: application/json

{
  "section_id": "uuid"
}

Response: 200 OK
```

#### Remove Room Teacher
```http
DELETE /api/teachers/{teacherId}/remove-room
Authorization: Bearer {token}

Response: 200 OK
```

### Examiner Assignment

#### Assign Examiner
```http
POST /api/teachers/{teacherId}/assign-examiner
Authorization: Bearer {token}
Content-Type: application/json

{
  "exam_title": "Mid-Term Math",
  "exam_date": "2026-06-15",
  "assigned_class": "Grade 1-A",
  "exam_id": "uuid" // optional
}

Response: 200 OK
```

#### Remove Exam Assignment
```http
DELETE /api/teachers/exam-assignments/{assignmentId}
Authorization: Bearer {token}

Response: 200 OK
```

### Department Head Assignment

#### Assign Department Head
```http
POST /api/teachers/{teacherId}/assign-department-head
Authorization: Bearer {token}
Content-Type: application/json

{
  "department_name": "Mathematics"
}

Response: 200 OK
```

#### Remove Department Head
```http
DELETE /api/teachers/department-heads/{assignmentId}
Authorization: Bearer {token}

Response: 200 OK
```

### Schedule Management

#### Update Teacher Schedule
```http
PUT /api/teachers/{teacherId}/schedule
Authorization: Bearer {token}
Content-Type: application/json

{
  "schedule": [
    {
      "day": "Monday",
      "time_slot": "8:00-9:00",
      "class_name": "Grade 1-A",
      "subject": "Math"
    },
    {
      "day": "Monday",
      "time_slot": "9:00-10:00",
      "class_name": "Grade 2-B",
      "subject": "Physics"
    }
  ]
}

Response: 200 OK
Note: Old schedule data is purged before inserting new data
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Specific validation error message"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid credentials" 
}
```

### 403 Forbidden
```json
{
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Specific error message"
}
```

---

## Authentication

All protected endpoints require JWT authentication:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

To obtain a token, login via:
```http
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "email@example.com", // or username or digital_id
  "password": "password"
}

Response: 200 OK
{
  "token": "jwt_token_here",
  "user": { ... },
  "redirect": "/dashboard-url"
}
```

---

## Rate Limiting

Consider implementing rate limiting for:
- `/api/admissions/apply` - 10 requests per hour per IP
- `/api/admissions/bulk-notification` - 5 requests per hour per user

---

## Testing with cURL

### Example: Get Grades with Sections
```bash
curl -X GET https://abdi-adama.com/api/academic/grades/with-sections \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Example: Submit Application
```bash
curl -X POST https://abdi-adama.com/api/admissions/apply \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Student",
    "dob": "2010-01-01",
    "parent_name": "Test Parent",
    "phone": "912345678",
    "email": "test@example.com",
    "grade_applying": "6",
    "branch_id": "your-branch-uuid"
  }'
```

### Example: Create Teacher
```bash
curl -X POST https://abdi-adama.com/api/teachers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Teacher",
    "email": "john@example.com",
    "age": 35,
    "sex": "Male"
  }'
```

---

**Last Updated:** May 2, 2026  
**Version:** 1.0.0
