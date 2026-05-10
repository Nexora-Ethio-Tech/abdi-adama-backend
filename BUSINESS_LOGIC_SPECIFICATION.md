# Business Logic Specification - 6 Roles
## Abdi Adama School Management System

---

## 1. SUPER ADMIN

### Overview
System-wide administrator with full access to all branches and system configuration.

### Completed Features ✅
- Create School Admins, Vice Principals, and Auditors
- View all users across all branches
- Update user status (Approve/Revoke/Pending)
- Delete users
- Authentication and authorization

### Remaining Features 🔨

#### Branch Management
- **Create Branch**
  - Input: name, location
  - Creates new school branch
  
- **Update Branch**
  - Modify branch details
  
- **Delete Branch**
  - Remove branch (with validation - no active users)
  
- **View All Branches**
  - List all branches with statistics

#### System Configuration
- **School Settings**
  - Update school name (Oromic, Amharic, English)
  - Update school motto (multilingual)
  
- **Financial Policies**
  - Set fee structures per grade level
  - Configure registration fees
  - Set bus fees
  - Configure penalty rates
  - Define academic year

#### Dashboard & Analytics
- **System Overview**
  - Total users by role
  - Total students per branch
  - Total revenue across branches
  - Active/inactive users count
  
- **Branch Comparison**
  - Student enrollment by branch
  - Revenue by branch
  - Staff count by branch

#### Audit & Reporting
- **View Audit Logs**
  - Filter by: category (Fees/Staff), direction (In/Out), date range
  - View all system changes with timestamps
  - Export audit logs
  
- **System Reports**
  - User activity reports
  - Financial summary reports
  - Branch performance reports

---

## 2. SCHOOL ADMIN

### Overview
Branch-level administrator managing academic operations, staff, and students for their assigned branch.

### Completed Features ✅
- Register users (Teachers, Students, Parents, Staff)
- View branch users
- Authentication and authorization

### Remaining Features 🔨

#### Academic Management
- **Class Management**
  - Create classes (name, grade level)
  - Assign room teacher to class
  - View class roster
  - Update class details
  - Delete class
  
- **Course Management**
  - Create courses (name, code, subject)
  - Assign teacher to course
  - Assign course to class
  - Update course progress
  - Delete course
  
- **Teacher Assignment**
  - Assign teachers to classes
  - Assign teachers to courses
  - Set teacher as department head
  - Assign room teacher to class

#### Student Management
- **Student Enrollment**
  - Process pending applications
  - Approve/decline applications
  - Schedule entrance exams
  - Confirm enrollment after payment
  - Assign student to class
  
- **Student Records**
  - Update student information
  - Manage emergency contacts
  - Set fee status (standard/reduced)
  - Approve fee reduction requests
  - Assign bus routes to students

#### Schedule Management
- **Create Schedules**
  - Assign teacher schedules (day, time, class, subject)
  - View branch schedule
  - Update schedules
  - Resolve schedule conflicts

#### Financial Configuration
- **Fee Structure**
  - Set monthly tuition per grade
  - Set registration fees
  - Set bus fees
  - Configure penalty rates for late payments

#### Dashboard & Reports
- **Branch Overview**
  - Total students by grade
  - Total teachers by subject
  - Class occupancy rates
  - Pending applications count
  
- **Branch Reports**
  - Student enrollment reports
  - Teacher assignment reports
  - Financial summary for branch
  - Attendance summary

---

## 3. VICE PRINCIPAL

### Overview
Academic oversight role focusing on monitoring teachers, student performance, and handling disciplinary matters.

### Completed Features ✅
- Authentication and authorization
- Basic user profile access

### Remaining Features 🔨

#### Teacher Oversight
- **View All Teachers**
  - List all teachers in branch
  - View teacher details (subjects, classes, schedule)
  - View teacher performance metrics
  
- **Weekly Lesson Plan Review**
  - View submitted lesson plans
  - Filter by: teacher, date, status (Pending/Approved/Revision Required)
  - Approve lesson plans
  - Request revisions with feedback
  - Provide dean rating (1-5 stars)
  - Add dean feedback/comments

#### Student Monitoring
- **Attendance Oversight**
  - View daily attendance summary
  - View attendance by class/grade
  - View monthly attendance rates
  - Identify students with low attendance
  
- **Absence Management**
  - View absence queue (pending escalations)
  - Review absence reasons
  - Excuse absences
  - Mark as notified (parent contacted)
  - Reject absence excuses
  
- **Academic Performance**
  - View student grades by class
  - View academic history
  - Identify at-risk students
  - View grade distribution reports

#### Communication Monitoring
- **Weekly Communication Logs**
  - View teacher ratings for students
  - Monitor teacher notes to parents
  - View rating trends (uniform, homework, conduct, etc.)

#### Dashboard & Reports
- **Academic Dashboard**
  - Pending lesson plans count
  - Pending absences count
  - Low attendance alerts
  - Teacher submission rates
  
- **Reports**
  - Teacher performance reports
  - Student attendance reports
  - Academic performance reports
  - Absence trend reports

---

## 4. AUDITOR

### Overview
Read-only financial oversight role for monitoring all financial transactions and generating audit reports.

### Completed Features ✅
- Authentication and authorization
- Basic user profile access

### Remaining Features 🔨

#### Financial Monitoring (READ ONLY)
- **View Transactions**
  - List all finance transactions
  - Filter by: student, date range, type, branch
  - View transaction details
  - Search transactions
  
- **View Payment History**
  - Student payment history
  - Payment status logs
  - Overdue payments list
  - Fee reduction approvals

#### Financial Reports
- **Income/Expense Reports**
  - View finance summaries
  - Filter by: category, direction (Income/Expense), date range
  - View approved vs pending summaries
  
- **Student Fee Reports**
  - Students by fee status (standard/reduced)
  - Students with pending payments
  - Students with penalty fees
  - Bus fee reports

#### Audit Trail
- **View Audit Logs**
  - All financial changes
  - Filter by: category, action, date, modified_by
  - View old vs new values
  - Track approver information
  
- **Payment Status Changes**
  - View payment status modification logs
  - Track who modified payment status
  - View approver names

#### Data Export
- **Export Financial Data**
  - Export transactions to Excel/CSV
  - Export summaries to PDF
  - Export audit logs
  - Generate custom date range reports

#### Dashboard
- **Financial Overview**
  - Total income (current month/year)
  - Total expenses (current month/year)
  - Pending payments count
  - Recent transactions
  
- **Alerts**
  - Large transactions (above threshold)
  - Unusual activity patterns
  - Pending approvals

---

## 5. FINANCE CLERK

### Overview
Manages all financial operations including fee collection, payment processing, and financial reporting for their branch.

### Completed Features ✅
- Authentication and authorization
- Basic user profile access

### Remaining Features 🔨

#### Fee Management
- **Student Fees**
  - View student fee details (monthly, bus, penalty)
  - Update student fee amounts
  - Set fee status (standard/reduced)
  - Process fee reduction requests
  - Approve/reject fee reduction requests
  
- **Fee Structure Configuration**
  - View financial policies per grade
  - Update fee structures (requires approval)

#### Payment Processing
- **Record Payments**
  - Record student payment
  - Input: student_id, amount, type, date
  - Generate receipt
  - Update student payment status
  
- **Payment History**
  - View all payments by student
  - View payment history by date range
  - Search payments
  - Filter by payment type
  
- **Overdue Payments**
  - List students with overdue payments
  - Calculate penalty fees
  - Send payment reminders
  - Track payment status

#### Financial Transactions
- **Create Transaction**
  - Record income/expense
  - Input: amount, type, description, date
  - Requires verification
  
- **View Transactions**
  - List all transactions for branch
  - Filter by: type, date range, student
  - Search transactions

#### Financial Summaries
- **Create Summary**
  - Category-based summaries
  - Input: category, description, amount, direction (Income/Expense)
  - Submit for approval
  
- **View Summaries**
  - List all summaries
  - Filter by: category, direction, date, approval status
  - Track approval status

#### Enrollment & Registration
- **Enrollment Queue**
  - View pending enrollments
  - Confirm payment received
  - Mark enrollment as complete
  - Handle failed enrollments

#### Reports & Analytics
- **Financial Reports**
  - Daily collection report
  - Monthly revenue report
  - Outstanding payments report
  - Fee reduction report
  - Payment method breakdown
  
- **Student Financial Status**
  - Students with full payment
  - Students with partial payment
  - Students with no payment
  - Scholarship students

#### Dashboard
- **Finance Dashboard**
  - Today's collections
  - This month's revenue
  - Outstanding payments total
  - Pending approvals count
  - Recent transactions
  
- **Quick Actions**
  - Record payment
  - View overdue payments
  - Generate daily report

---

## 6. TEACHER

### Overview
Manages classroom activities including attendance, grading, lesson planning, and student communication.

### Completed Features ✅
- Authentication and authorization
- Basic user profile access

### Remaining Features 🔨

#### Class & Student Management
- **View Assigned Classes**
  - List all classes assigned to teacher
  - View class details (name, grade, student count)
  
- **View Student Roster**
  - List students in each class
  - View student details
  - View student contact information
  - View student health information (allergies, medications)

#### Attendance Management
- **Mark Attendance**
  - Daily attendance for assigned classes
  - Status options: Present, Absent, Late, Excused
  - Bulk attendance marking
  - Edit attendance (same day only)
  
- **View Attendance History**
  - Student attendance history
  - Class attendance summary
  - Monthly attendance rates
  - Identify students with low attendance
  
- **Report Absences**
  - Submit absence to absence queue
  - Input: student, date, reason
  - Escalate to Vice Principal

#### Grading System
- **Enter Grades**
  - Input grades for assigned courses
  - Grade types: Mid-Exam, Final-Exam, Quiz, Assignment, Homework, etc.
  - Input: student, course, type, score, total
  - Weight-based grading per grade level
  
- **Update Grades**
  - Edit grades (within allowed timeframe)
  - View grade history
  
- **View Grades**
  - View all grades for a course
  - View student grade summary
  - Calculate course averages
  - Grade distribution analysis

#### Lesson Planning
- **Create Weekly Plan**
  - Submit weekly lesson plan
  - Input: date, content, objectives, activities, methods, aids, evaluation
  - Status: Draft (can edit)
  
- **Submit for Approval**
  - Submit plan to Vice Principal
  - Status changes to: Pending
  
- **View Plan Status**
  - View submitted plans
  - View dean feedback
  - View dean rating
  - Handle revision requests
  
- **Revise Plans**
  - Edit plans marked "Revision Required"
  - Resubmit for approval

#### Student Communication
- **Weekly Communication Log**
  - Rate students weekly (8 categories):
    - Uniform (0-3 stars)
    - Materials (0-3 stars)
    - Homework (0-3 stars)
    - Participation (0-3 stars)
    - Conduct (0-3 stars)
    - Social Skills (0-3 stars)
    - Punctuality (0-3 stars)
    - Note Taking (0-3 stars)
  - Add teacher notes
  - Submit weekly report
  
- **View Communication History**
  - View past weekly reports
  - View rating trends

#### Schedule Management
- **View Teaching Schedule**
  - Daily schedule
  - Weekly schedule
  - View: day, time, class, subject
  
- **Schedule Conflicts**
  - Alert for scheduling conflicts
  - Request schedule changes

#### Exam Management (if is_examiner = true)
- **Create Exams**
  - Create exam for course
  - Input: title, category (Mid-term/Final/Quiz), duration
  - Add questions and options
  - Set correct answers
  
- **Manage Exam Access**
  - Assign exam to students
  - Set exam visibility
  - Lock/unlock exam
  
- **View Submissions**
  - View student submissions
  - View answers
  - View violation logs (fullscreen exit, tab switching)
  - Auto-grading for multiple choice

#### Dashboard
- **Teacher Dashboard**
  - Today's schedule
  - Assigned classes count
  - Pending lesson plans
  - Recent grades entered
  - Attendance summary
  
- **Quick Actions**
  - Mark attendance
  - Enter grades
  - Submit lesson plan
  - View schedule

#### Reports
- **Class Performance**
  - Grade distribution by class
  - Average scores by course
  - Student performance trends
  
- **Attendance Reports**
  - Class attendance summary
  - Individual student attendance
  - Low attendance alerts

---

## SUMMARY TABLE

| Role | Complexity | Main Responsibilities | Key Tables |
|------|-----------|----------------------|------------|
| **Super Admin** | ⭐⭐⭐ | System config, branch management, audit oversight | users, branches, school_config, audit_log |
| **School Admin** | ⭐⭐⭐⭐ | Academic setup, user management, class assignments | users, students, teachers, classes, courses, schedules |
| **Vice Principal** | ⭐⭐⭐ | Teacher oversight, lesson plan approval, absence management | teachers, weekly_plans, absence_queue, student_attendance |
| **Auditor** | ⭐⭐ | Financial monitoring (read-only), audit reports | finance_transactions, audit_log, payment_status_logs |
| **Finance Clerk** | ⭐⭐⭐⭐⭐ | Payment processing, fee management, financial reporting | finance_transactions, finance_summaries, students (fees), financial_policies |
| **Teacher** | ⭐⭐⭐⭐ | Attendance, grading, lesson planning, student communication | student_attendance, grades, weekly_plans, communication_logs, exams |

---

## ESTIMATED DEVELOPMENT TIME

| Role | Backend Endpoints | Frontend Integration | Total Time |
|------|------------------|---------------------|------------|
| Super Admin | 3-4 days | 3-4 days | 6-8 days |
| School Admin | 5-6 days | 5-6 days | 10-12 days |
| Vice Principal | 3-4 days | 3-4 days | 6-8 days |
| Auditor | 2-3 days | 2-3 days | 4-6 days |
| Finance Clerk | 5-7 days | 5-6 days | 10-13 days |
| Teacher | 5-6 days | 5-6 days | 10-12 days |
| **TOTAL** | **23-30 days** | **23-29 days** | **46-59 days** |

**Note:** This assumes full-time work (8 hours/day). Adjust based on actual working hours.

---

## CURRENT STATUS

### Completed (Foundation - ~40%)
- ✅ Authentication system (login, JWT, refresh tokens)
- ✅ User management (create, read, update, delete)
- ✅ Role-based access control
- ✅ Database schema (all tables created)
- ✅ Production deployment
- ✅ Super Admin: Create privileged users
- ✅ School Admin: Register basic users

### Remaining (~60%)
- 🔨 Role-specific business logic (all 6 roles)
- 🔨 Frontend integration (all 6 roles)
- 🔨 Advanced features (reporting, analytics, dashboards)
- 🔨 File uploads (receipts, documents)
- 🔨 Notifications system
- 🔨 Data export functionality

---

## TECHNICAL STACK

**Backend:**
- TypeScript
- Node.js + Express
- PostgreSQL
- JWT Authentication
- Bcrypt password hashing

**Frontend:**
- React/Next.js (assumed)
- REST API integration
- Role-based routing

**Deployment:**
- cPanel hosting
- Production database: PostgreSQL on HahuCloud
- Domain: abdiadamaschool.com

---

**Document Version:** 1.0  
**Date:** May 9, 2026  
**Prepared By:** Backend Developer
