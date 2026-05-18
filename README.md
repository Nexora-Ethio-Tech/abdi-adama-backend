# Abdi Adama School Management System - Backend API

**Production Ready** | **TypeScript** | **Express.js** | **PostgreSQL** | **Real-Time SSE**

Complete, production-grade REST API backend for the Abdi Adama School Management System. Designed with a robust multi-tenant architecture, double-tier security, real-time event broadcasting, and automatic data cleanups.

---

## 🎯 System Overview

### The School & Branches
The system serves **ONE School** operating across **4 physical branches** with strict data isolation. 

Legacy branch name references have been updated to represent their actual physical sites:
* **Mogoro Hete Haroreti** (Legacy: *Main Branch* | Code: `MB`)
* **180 Village** (Legacy: *Bole Branch* | Code: `BL`)
* **Awash Melkasa** (Legacy: *Megenagna Branch* | Code: `MG`)
* **Adama Kebele 10** (Legacy: *Adama Branch* | Code: `AD`)

### System Roles (11 Total)
The API implements complete workflows for **11 distinct user roles**, each mapped to specific permissions and business processes:

1. **Super Admin** - Global control, system-wide configuration, branch creation, and global reporting.
2. **School Admin** - Branch-level account creation, class schedules, and parent-student linkages.
3. **Vice Principal** - Academic monitoring, teacher evaluations, and chronic absence alerts.
4. **Teacher** - Class attendance marking, assignment deadline posts, and grade submissions.
5. **Finance Clerk** - Student billing, transaction logging, and fee reduction requests.
6. **Auditor** - Read-only financial audits, transaction logs, and fee reduction approvals.
7. **Clinic Admin** - Student medical files, visit records, pharmacy stocks, and parent chats.
8. **Driver** - Bus manifests, transport logistics notices, and real-time SSE broadcasts.
9. **Librarian** - Library catalog tracking, book lending transactions, overdue tracking, and fine management.
10. **Parent** - Multi-child dashboards, teacher communication books, and integrated school feeds.
11. **Student** - Section-free schedules, personal grades transcripts, and upcoming assignment deadlines.

---

## 🚀 Quick Start

### Prerequisites
* **Node.js**: `18.x` or `20.x` LTS
* **PostgreSQL**: `14.x` or higher
* **Process Manager**: `PM2` (for production)
* **TypeScript Compiler**: `5.x`

### Local Installation

1. **Clone & Install Dependencies**
   ```bash
   git clone <repository-url>
   cd abdi-adama-backend
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env and supply your local database credentials
   ```

3. **Initialize Database Schema**
   Ensure your PostgreSQL instance is running, then execute the full database schema:
   ```bash
   psql -U postgres -d abdiadam_school_db -f schema.sql
   ```

4. **Seed System-Wide Admin Accounts**
   Create initial admin accounts for testing and bootstrap operations:
   ```bash
   npm run seed:superadmin
   ```
   This seeds the following root accounts:
   * **Super Admin**: `abdiadamaschooloffice@gmail.com`
   * **School Admin**: `65plante@gmail.com`
   * **Vice Principal**: `valerioero@gmail.com`
   * **Auditor**: `hailegit35@gmail.com`
   * *Seeded admin passwords default to: `SuperAdmin@2026`, `SchoolAdmin@2026`, `VicePrincipal@2026`, and `Auditor@2026`.*

5. **Start Development Environment**
   ```bash
   npm run dev
   ```
   The backend API will boot and listen at `http://localhost:5000`.

---

## 🔑 Authentication & Password Policy

The backend implements a secure, **two-tier authentication strategy** to match the varying needs of administrative and operational users.

### 1. Two-Tier Password System
* **Admin Roles** (*Super Admin, School Admin, Vice Principal, Auditor*):
  * **Policy**: Complex Passwords enforced via strict Joi validations.
  * **Rules**: Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special symbol.
  * **Example**: `AbdiAdama@Server@`
* **Operational Roles** (*Teacher, Student, Parent, Finance Clerk, Librarian, Clinic Admin, Driver*):
  * **Policy**: Lightweight, high-accessibility 4-Digit Numeric PINs.
  * **Rules**: Standard PIN code between `1000` and `9999`.
  * **Example**: `4859`

### 2. Payload Formats
The `/api/auth/login` endpoint handles both credentials transparently:

```json
/* Admin Login */
{
  "email": "admin@abdi-adama.com",
  "password": "ComplexAdminPassword!2026"
}

/* Operational Login */
{
  "email": "student@abdi-adama.com",
  "password": "5839"
}
```

### 3. PIN Lifecycle Management
* PINs are randomly generated automatically when the School Admin registers operational users.
* The newly generated PIN is returned **once** in the creation response under the `temporaryPassword` key.
* If a PIN is forgotten, a School Admin must trigger the reset endpoint (`POST /api/school-admin/users/:id/reset-pin`) to generate and return a new random 4-digit PIN.
* Users can change their own PINs or passwords at any time via `POST /api/auth/change-password`.

---

## 🆔 Digital ID System

To enforce consistency across branches, every registered identity receives a formatted Digital ID on creation.

### Format: `{ROLE_PREFIX}-{BRANCH_CODE}-{SEQUENCE}`

#### Branch Codes
* `MB` = Mogoro Hete Haroreti
* `BL` = 180 Village
* `MG` = Awash Melkasa
* `AD` = Adama Kebele 10

#### Role Prefixes
| Role | Prefix | Example ID |
|---|---|---|
| Super Admin | `SA` | `SA-0001` (Global, no branch code) |
| School Admin | `ADM` | `ADM-MB-0001` |
| Vice Principal | `VP` | `VP-AD-0001` |
| Teacher | `TCH` | `TCH-BL-0002` |
| Student | `STD` | `STD-MG-0012` |
| Parent | `PRT` | `PRT-MB-0043` |
| Finance Clerk | `FIN` | `FIN-AD-0005` |
| Auditor | `AUD` | `AUD-MB-0001` |
| Librarian | `LIB` | `LIB-BL-0001` |
| Clinic Admin | `CLN` | `CLN-AD-0002` |
| Driver | `DRV` | `DRV-MG-0003` |

*Sequence counts increment independently per role per branch, preventing cross-branch ID collisions.*

---

## 🔒 Security & Branch Isolation

Data isolation is built directly into the database queries rather than relying solely on the application layer.

```
                  ┌──────────────────────────────┐
                  │   Super Admin (Global R/W)   │
                  └──────────────┬───────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Mogoro Hete (MB)│     │ 180 Village (BL)│     │Awash Melk. (MG) │ ...
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ├─ School Admin (R/W)   ├─ School Admin (R/W)   ├─ School Admin (R/W)
         ├─ Teachers (R/W)       ├─ Teachers (R/W)       ├─ Teachers (R/W)
         ├─ Students/Parents(R)  ├─ Students/Parents(R)  ├─ Students/Parents(R)
         │                       │                       │
         ▼                       ▼                       ▼
   [DB Isolated]           [DB Isolated]           [DB Isolated]
```

### Multi-Tenant Isolation Rules
1. **Branch Scoping**: All branches are identified by a unique UUID. Every user (except Super Admins) is linked to a specific `branch_id` in `silo_users` / `silo_identities`.
2. **Database Queries**: Query builders systematically filter by the user's `branch_id`:
   ```sql
   SELECT * FROM silo_identities 
   WHERE branch_id = $1 AND role = 'Student';
   ```
3. **Cascade Deletes**: Removing a user triggers a safe cascading cleanup that purges records in dependency tables (e.g., student grades, class enrollments, and attendance histories).

---

## 📚 Complete API Endpoints Map

### 🔒 Authentication & Account (5 Endpoints)
* `POST /api/auth/login` - Authenticate using email + password/PIN.
* `POST /api/auth/logout` - Invalidate active session and JWT tokens.
* `POST /api/auth/refresh-token` - Retrieve new access JWT using refresh token.
* `POST /api/auth/change-password` - User self-service change password or 4-digit PIN.
* `GET /api/auth/me` - Resolve active JWT to return logged-in profile.

### 👑 Super Admin (19 Endpoints)
* `POST /api/super-admin/create-school-admin` - Deploy School Admin to a branch.
* `POST /api/super-admin/create-vice-principal` - Register a Vice Principal.
* `POST /api/super-admin/create-auditor` - Register a financial Auditor.
* `GET /api/super-admin/users` - Paginated global user list (with branch filters).
* `GET /api/super-admin/users/:id` - Detailed user metadata.
* `PATCH /api/super-admin/users/:id/status` - Modify state (`Approved`, `Revoked`, `Pending`).
* `DELETE /api/super-admin/users/:id` - Complete user deletion with cascade cleaning.
* `GET /api/super-admin/branches` - List all physical branch configurations.
* `POST /api/super-admin/branches` - Register a new physical school branch.
* `PATCH /api/super-admin/branches/:id` - Update branch metadata.
* `DELETE /api/super-admin/branches/:id` - Remove a branch.
* `GET /api/super-admin/reports/system` - Global system audit counts.
* `GET /api/super-admin/reports/branch/:branchId` - Isolated branch-level performance.
* `GET /api/super-admin/audit-logs` - System-wide immutable audit trail.
* `GET /api/super-admin/classes` - View all classes across branches.
* `POST /api/super-admin/classes` - Create a new course section globally.
* `PATCH /api/super-admin/classes/:id` - Edit class name/level.
* `DELETE /api/super-admin/classes/:id` - Purge class configuration.

### 🏫 School Admin (28 Endpoints)
* `POST /api/school-admin/register-user` - Register Teacher, Student, Parent, Clerk, Librarian, Clinic Admin, or Driver.
* `GET /api/school-admin/users` - View users within the admin's isolated branch.
* `GET /api/school-admin/users/:id` - Access specific branch user details.
* `PATCH /api/school-admin/users/:id` - Edit user names, emails, and attributes.
* `PATCH /api/school-admin/users/:id/status` - Grant/revoke branch user access.
* `DELETE /api/school-admin/users/:id` - Remove branch user.
* `POST /api/school-admin/users/:id/reset-pin` - Reset operational user to a new 4-digit PIN.
* `GET /api/school-admin/classes` - List classes assigned to this branch.
* `POST /api/school-admin/classes` - Configure new class inside the branch.
* `PATCH /api/school-admin/classes/:id` - Modify branch class details.
* `DELETE /api/school-admin/classes/:id` - Delete class (updates capacities).
* `POST /api/school-admin/classes/:id/assign-teacher` - Assign teacher to a class with a specific subject.
* `DELETE /api/school-admin/classes/:classId/teachers/:teacherId` - Unassign teacher.
* `POST /api/school-admin/students/assign-class` - Enroll student in a class.
* `DELETE /api/school-admin/students/:studentId/remove-class` - Unenroll student from class.
* `GET /api/school-admin/teachers` - Directory of branch teachers.
* `GET /api/school-admin/students` - Directory of branch students.
* `GET /api/school-admin/parents` - Directory of branch parents.
* `POST /api/school-admin/parents/:parentId/link-student/:studentId` - Create parent-child link.
* `DELETE /api/school-admin/parents/:parentId/unlink-student/:studentId` - Remove parent-child link.
* `GET /api/school-admin/reports/branch` - Academic and registration summaries for branch.
* `GET /api/school-admin/reports/class/:classId` - Class grading and enrollment reports.
* `GET /api/school-admin/reports/teacher/:teacherId` - Teacher feedback and attendance performance.
* `GET /api/school-admin/audit-logs` - View branch-only audit trails.

### 🎓 Vice Principal (10 Endpoints)
* `GET /api/vice-principal/classes` - List all branch classes and statistics.
* `GET /api/vice-principal/classes/:id` - Detailed class enrollment roster.
* `GET /api/vice-principal/teachers` - Branch-wide teacher performance logs.
* `GET /api/vice-principal/teachers/:id/performance` - Specific teacher mark submissions and timetables.
* `GET /api/vice-principal/attendance/absence-queue` - List of students with 3+ consecutive absences.
* `POST /api/vice-principal/attendance/absence-queue/:studentId/notify` - Dispatch absence notice.
* `GET /api/vice-principal/attendance/summary` - Branch-wide daily attendance ratios.
* `GET /api/vice-principal/reports/academic` - Core grade averages and fail logs.
* `GET /api/vice-principal/reports/attendance` - Monthly attendance charts.
* `GET /api/vice-principal/reports/teacher-performance` - Compiled teacher audit grades.

### 🍎 Teacher (13 Endpoints)
* `GET /api/teacher/my-classes` - List courses assigned to the logged-in teacher.
* `GET /api/teacher/classes/:id/students` - Roster of students in an assigned course.
* `POST /api/teacher/attendance/mark` - Submit daily attendance codes.
* `GET /api/teacher/attendance/history` - Historical class logs.
* `PATCH /api/teacher/attendance/:id` - Modify attendance (locked to same-day edits).
* `GET /api/teacher/students/:id` - Detailed view of student academic stats.
* `GET /api/teacher/students/:id/attendance` - Single student's attendance ratios.
* `POST /api/teacher/grades/submit` - Record student assessment marks.
* `GET /api/teacher/grades/class/:classId` - View grades assigned to a specific course.
* `PATCH /api/teacher/grades/:id` - Modify student marks (locked to current term).
* `GET /api/teacher/reports/my-classes` - Aggregated averages for teacher's courses.
* `GET /api/teacher/reports/student/:studentId` - Progress scorecard for a student.
* `GET /api/teacher/profile` - View teacher's academic assignment stats.

### 💰 Finance Clerk (7 Endpoints)
* `GET /api/finance/students` - Directory of students showing outstanding balances and statuses.
* `GET /api/finance/students/:id` - Invoice breakdown (tuition, bus fees, registrations).
* `PATCH /api/finance/students/:id/fees` - Adjust base student tuition fees.
* `POST /api/finance/transactions` - Log tuition/bus fee payments.
* `GET /api/finance/transactions` - List recent branch transactions.
* `GET /api/finance/reports/summary` - Income summaries, categorized by payment methods.
* `GET /api/finance/reports/outstanding` - Roster of delinquent students.

### 🔍 Auditor (6 Endpoints)
* `GET /api/auditor/transactions` - Immutable ledger of all transactions in the branch.
* `GET /api/auditor/reports/financial` - Multi-level audit logs showing income vs offsets.
* `GET /api/auditor/reports/branch/:branchId` - Cross-branch audit balance comparison.
* `GET /api/auditor/fee-reductions/pending` - Review fee-reduction requests filed by clerks.
* `POST /api/auditor/fee-reductions/:studentId/approve` - Authorize discount request.
* `POST /api/auditor/fee-reductions/:studentId/reject` - Deny discount request.

### 🏥 Clinic Admin (8 Endpoints) - *New Role*
* `GET /api/clinic/students` - Browse students showing blood groups and medical notes.
* `POST /api/clinic/visits` - Register a new clinic visit.
* `GET /api/clinic/visits/history` - Searchable logs of student clinic histories.
* `GET /api/clinic/medicine` - Read current clinic pharmacy inventory.
* `POST /api/clinic/medicine/deduct` - Deduct pharmacy items (e.g., when administering medicine).
* `GET /api/clinic/chat` - Retrieve WhatsApp-style inbox or active conversation messages.
* `POST /api/clinic/chat` - Direct chat message to a parent.
* `PATCH /api/clinic/chat/read` - Mark parent conversation as read (clears unread badge count).

### 🚌 Driver (4 Endpoints) - *New Role*
* `GET /api/driver/manifest` - Fetch bus manifest showing students, grades, and locations.
* `POST /api/driver/notice` - Post logistics updates with targeted stations.
* `GET /api/driver/notices` - View logistics notices (Drivers see theirs; Admins see all).
* `DELETE /api/driver/notice/:id` - Soft-delete an active logistics announcement.

### 📚 Librarian (6 Endpoints) - *New Role*
* `GET /api/library/stats` - Total books, active loans, and available shelf items.
* `GET /api/library/books` - Browse book catalog showing availability and barcodes.
* `POST /api/library/add-book` - Register a new book (auto-generates BK-XXXX codes).
* `GET /api/library/loans` - View outstanding/returned loans showing overdue days and fines.
* `POST /api/library/issue` - Log a new book loan (resolves UUID or physical Student School ID).
* `POST /api/library/return/:loanId` - Log book return (restores stock level and records fines).

### 👨‍👩‍👧 Parent (2 Endpoints) - *New Role*
* `GET /api/parent/dashboard` - Single-pane dashboard showing kids, grades, attendance, and unified feed.
* `GET /api/parent/child/:studentId/communication` - Access the current week's Academic Communication Book.

### 🎓 Student (6 Endpoints) - *New Role*
* `GET /api/student/profile` - Welcome profile payload.
* `GET /api/student/dashboard` - Display today's schedule, deadlines, rewarded teachers, and notifications.
* `GET /api/student/grades` - View marks breakdown (quizzes, assignments, exams, totals).
* `GET /api/student/history` - Grouped academic transcript showing term GPAs.
* `GET /api/student/current-courses` - Backward-compatible current semester course list.
* `GET /api/student/academic-history` - Legacy semester-average logs.

---

## 🛠️ Deep-Dive Specialized Business Logic

The backend executes several complex workflows that automate operational logic across these roles:

### 1. WhatsApp-Style Clinic Communication & Badges
* **Global Sorting**: `GET /api/clinic/chat` queries active parent threads and sorts them globally by **most recent message first** (`last_message_at DESC`).
* **Unread Counter**: The inbox computes an dynamic `unread_count` for each thread by summing unread parent messages:
  ```sql
  COUNT(*) FILTER (WHERE is_read = FALSE)
  ```
* **Auto-Recipient Resolution**: When a Clinic Admin sends a message with only a `child_id`, the system automatically resolves the parent:
  1. Searches for the last parent who messaged the clinic about that child.
  2. Falls back to the first parent linked in `silo_family_links`.
* **Badge Clearing**: Opening a conversation calls `PATCH /api/clinic/chat/read`, immediately setting `is_read = TRUE` for all messages from that sender.

### 2. Transport Logistics notices & SSE Live Broadcasts
* **Instant Pushes**: When a Driver publishes an update (`POST /api/driver/notice`), the system broadcasts the message in real-time via Server-Sent Events (SSE).
* **Assigned Scoping**: Announcements are only sent to clients who are:
  * Logged-in Students/Parents assigned to that driver's manifest.
  * Branch Admins, Vice Principals, or Super Admins in the same branch.
* **Auto-Expiry**: Notices automatically expire on the next Saturday:
  ```ts
  const expiresAt = getNextSaturday(new Date());
  expiresAt.setHours(23, 59, 59, 999);
  ```
* **Background Housekeeping**: Old logistics notices are cleaned up automatically. When APIs are hit, a database routine hard-deletes notices older than 3 days, and hard-deletes soft-deleted records older than 24 hours.

### 3. Library Barcodes & Real-Time Overdue Fines
* **Automatic Book Codes**: Registering a book generates an permanent short Book ID (`BK-XXXX`) using cryptographically safe random patterns.
* **Resilient Lookups**: Issuing books accepts either the student's internal UUID or their physical School ID (`STD-XX-XXXX`).
* **Dynamic Fine Calculations**: Rather than storing static overdue balances, the API computes active fines on the fly during loan checks and book returns:
  ```sql
  CASE 
    WHEN returned_at IS NOT NULL THEN 0
    WHEN due_date < CURRENT_DATE THEN (CURRENT_DATE - due_date) * 5 -- 5 ETB per day
    ELSE 0
  END AS fine_amount
  ```

### 4. Consolidated Parent Dashboard Feeds & Thursday Cleanup
* **Unified Notification Board**: The Parent Dashboard returns a single, chronological feed that merges:
  1. General school-wide announcements.
  2. Transport updates published by their child's specific bus driver.
  3. High-priority medical messages from the school clinic (limited to the last 5 days).
* **Weekly Academic Communication Book**: Parents access direct feedback from their children's teachers via a Weekly Communication Book log.
* **Thursday Cleanups**: Weekly logs are managed on a cyclical timeline. Older logs are automatically archived, and the API restricts queries to the active week ending date, keeping information fresh.

### 5. Section-Free Student timetables & Academic Transcripts
* **Schedule Resolution**: To ensure schedules function without a `section_id` database column, `getDashboard()` dynamically resolves the student's class assignments by joining active course rosters directly to schedules:
  ```sql
  SELECT c.name, sc.start_time, sc.end_time, sc.room
  FROM silo_schedule sc
  JOIN silo_courses c ON c.id = sc.course_id
  WHERE c.id IN (
    SELECT course_id FROM silo_enrollments 
    WHERE student_id = $1 AND academic_year = '2025/2026'
  ) AND sc.day_of_week = EXTRACT(DOW FROM CURRENT_DATE);
  ```
* **Transcript Calculations**: Student transcript history groups all completed courses by academic year and semester, computing the overall semester average on the fly on the backend.

---

## 🏛️ Database Schema

Here is a view of the database tables mapping the new modules:

```mermaid
erDiagram
    silo_identities ||--o{ silo_enrollments : has
    silo_identities ||--o{ silo_family_links : links
    silo_identities ||--o{ silo_clinic_visits : visits
    silo_identities ||--o{ silo_loans : borrows
    silo_identities ||--o{ silo_routes : drives
    
    silo_users ||--o{ silo_clinic_messages : sends
    silo_users ||--o{ silo_logistics_notices : posts
    
    silo_books ||--o{ silo_loans : recorded
    silo_courses ||--o{ silo_schedule : scheduled
    silo_courses ||--o{ silo_deadlines : has
    
    silo_identities {
        uuid id PK
        string school_id
        string full_name
        string role
        string branch_id
        string grade
        string blood_group
        string allergies
    }
    
    silo_books {
        uuid id PK
        string book_code
        string title
        string author
        string isbn
        string shelf_location
        int stock
        int total_copies
        string status
    }
    
    silo_loans {
        uuid id PK
        uuid book_id FK
        uuid student_id FK
        date loan_date
        date due_date
        timestamp returned_at
    }
    
    silo_clinic_messages {
        uuid id PK
        uuid sender_id FK
        uuid receiver_id FK
        uuid child_id FK
        string message
        boolean is_read
        timestamp created_at
    }
```

---

## 📁 Project Directory Structure

```
abdi-adama-backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # PostgreSQL pool connection configurations
│   │   ├── db.ts                # PostgreSQL pool alias for legacy controllers
│   │   └── constants.ts         # Digital ID Prefixes and Role Enums
│   ├── middleware/
│   │   ├── authMiddleware.ts    # JWT token validation
│   │   ├── roleGuard.ts         # Role permission validation
│   │   └── errorHandler.ts      # Global middleware catches and logs errors
│   ├── controllers/
│   │   ├── auth.controller.ts            # Admin and Operational logins
│   │   ├── superAdmin.controller.ts      # Global configuration management
│   │   ├── schoolAdmin.controller.ts     # User generation, PIN resets, linkages
│   │   ├── vicePrincipal.controller.ts   # Absence monitoring queue
│   │   ├── teacher.controller.ts         # Marks submissions, attendance marking
│   │   ├── financeClerk.controller.ts    # Invoice transactions logs
│   │   ├── auditor.controller.ts         # Financial ledger logs
│   │   ├── clinicController.ts           # Visits logs, stock levels, WhatsApp chats
│   │   ├── driverController.ts           # Manifest logs, logistics updates
│   │   ├── libraryController.ts          # Book registers, book loaning tracks
│   │   ├── parentController.ts           # Dashboard feeds, communication logs
│   │   └── studentController.ts          # Timetables, transcripts histories
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── superAdmin.routes.ts
│   │   ├── schoolAdmin.routes.ts
│   │   ├── vicePrincipal.routes.ts
│   │   ├── teacher.routes.ts
│   │   ├── financeClerk.routes.ts
│   │   ├── auditor.routes.ts
│   │   ├── clinicRoutes.ts               # Chat endpoints and visitor logs
│   │   ├── driverRoutes.ts               # Timetable manifestations and notices
│   │   ├── libraryRoutes.ts              # Catalog additions and loan registers
│   │   ├── parentRoutes.ts               # Unified dashboard lists
│   │   └── studentRoutes.ts              # Schedule logs, transcript lookups
│   ├── shared/
│   │   ├── sseManager.ts        # SSE manager for client broadcasts
│   │   ├── cleanupUtils.ts      # Housekeeping tasks
│   │   └── responseUtils.ts     # API envelope utility methods
│   ├── types/
│   │   └── index.ts             # Global TypeScript type interfaces
│   ├── utils/
│   │   ├── jwt.ts               # Sign and verify access tokens
│   │   └── idGenerator.ts       # Sequential Digital ID generator
│   ├── app.ts                   # Express application initializations
│   └── server.ts                # Application main entry point
├── database/
│   ├── schema.sql               # Primary system schema structure
│   └── clinic_read_status.sql   # Clinic read-state migrations
├── package.json
└── tsconfig.json
```

---

## 🚀 Production Deployment Guide

### Environment Variables (.env)
```env
NODE_ENV=production
PORT=5001

DB_HOST=localhost
DB_PORT=5432
DB_NAME=abdiadam_school_db
DB_USER=abdiadam_super-admin
DB_PASSWORD=AbdiAdama@Server@
DB_SSL=false

JWT_SECRET=your_long_secure_jwt_key_min_32_characters
JWT_REFRESH_SECRET=your_long_secure_refresh_key_min_32_characters

FRONTEND_URL=https://app.abdi-adama.com
```

### Production PM2 Commands
Activate your server's Node virtual environment, then start the compiled backend with PM2:
```bash
# Activate virtual environment
source ~/nodevenv/abdi-adama-backend/20/bin/activate

# Build TypeScript code
npm run build

# Start server using PM2
pm2 start dist/server.js --name abdi-adama-api

# View runtime server logs
pm2 logs abdi-adama-api
```

---

## 🧪 API Testing Guide

### 1. Test Login (Operational User)
```bash
curl -X POST https://api.abdi-adama.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@abdi-adama.com","password":"1234"}'
```

### 2. Query Student Timetable (Enforced Role check)
```bash
curl -X GET https://api.abdi-adama.com/api/student/dashboard \
  -H "Authorization: Bearer YOUR_ACCESS_JWT_TOKEN"
```

### 3. Log a Medical Visit (Clinic Admin only)
```bash
curl -X POST https://api.abdi-adama.com/api/clinic/visits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CLINIC_ADMIN_JWT_TOKEN" \
  -d '{"student_id":"STD-MB-0012","reason":"Mild Fever","treatment":"Administered 2x Paracetamol"}'
```

---

## 📝 Important Notes & Troubleshooting

### Database Connection Failures
* Ensure PostgreSQL is active on `localhost:5432`.
* Check that your database name matches `abdiadam_school_db` and that credentials have appropriate R/W schema privileges.

### JWT Expired State
* Access Tokens are configured to expire after 15 minutes.
* Use `POST /api/auth/refresh-token` with the secure HTTP-Only Refresh token to retrieve new Access tokens without prompting users to re-login.

### SSE Connection Drops
* Event broadcasting relies on active SSE channels.
* Ensure your reverse proxy configuration (e.g., Nginx, Apache) does not buffer or drop connection channels, and has `Cache-Control: no-cache` headers enabled.

---

**Built with ❤️ for Abdi Adama School**
