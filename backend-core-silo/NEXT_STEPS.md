# Your Next Steps - Action Plan

Follow these steps in order to make the new features work:

---

## Step 1: Database Migration (CRITICAL - Do This First!)

### Option A: If you have direct database access

1. **Backup your current database** (IMPORTANT!):
```bash
# Windows Command Prompt
pg_dump -U your_postgres_username -d abdiadam_school_db > backup_before_migration.sql

# If prompted, enter your PostgreSQL password
```

2. **Run the schema enhancements**:
```bash
psql -U your_postgres_username -d abdiadam_school_db -f database/schema_enhancements.sql
```

3. **Verify the migration worked**:
```bash
psql -U your_postgres_username -d abdiadam_school_db
```

Then run:
```sql
-- Check new tables exist
\dt academic_*
\dt registration_config
\dt teacher_exam_assignments
\dt credential_logs

-- Should see grades 1-12
SELECT * FROM academic_grades ORDER BY grade_level;

-- Exit
\q
```

### Option B: If using cPanel/Remote database

1. Login to your hosting cPanel
2. Go to **phpPgAdmin** or **Database Management**
3. Select your database `abdiadam_school_db`
4. Click **SQL** tab
5. Copy content from `database/schema_enhancements.sql`
6. Paste and click **Execute**

---

## Step 2: Restart Your Backend Server

### If running locally:
```bash
cd backend
npm run dev
```

### If deployed on server:
```bash
# SSH into your server
ssh your_username@your_server

# Navigate to project
cd /path/to/Abdi-Adama

# Restart the backend
pm2 restart backend
# OR
npm run start
```

---

## Step 3: Test the Backend APIs

### Test 1: Check if new routes are working

Open your browser or use Postman:

**Test Health Check:**
```
GET http://localhost:5000/
```
Should return: `{"status":"ok","message":"Abdi Adama School API is running!"}`

**Test New Academic Route (requires login):**
```
GET http://localhost:5000/api/academic/grades
Authorization: Bearer YOUR_TOKEN
```

### Test 2: Quick API Test with Browser Console

1. Login to your admin dashboard
2. Open Browser Console (F12)
3. Paste this code:

```javascript
// Test fetching grades
fetch('/api/academic/grades', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(data => console.log('Grades:', data))
.catch(err => console.error('Error:', err));
```

If you see an array of grades, it's working! ✅

---

## Step 4: Frontend Integration (What You Need to Build)

The backend is complete. Now you need to create frontend pages/components:

### Pages to Create:

#### 1. **Academic Management Page** (for School Admin)
Location: `frontend/src/pages/AcademicManagement.tsx`

Features needed:
- List all grades
- Create new grade
- Bulk create sections for each grade
- View sections with capacity

**Quick Start Template:**
```typescript
// frontend/src/pages/AcademicManagement.tsx
import { useState, useEffect } from 'react';

export const AcademicManagement = () => {
  const [grades, setGrades] = useState([]);
  
  useEffect(() => {
    fetchGrades();
  }, []);
  
  const fetchGrades = async () => {
    const response = await fetch('/api/academic/grades', {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    });
    const data = await response.json();
    setGrades(data);
  };
  
  return (
    <div>
      <h1>Academic Management</h1>
      {/* Add your UI here */}
    </div>
  );
};
```

#### 2. **Admissions Dashboard** (for School Admin)
Location: `frontend/src/pages/AdmissionsDashboard.tsx`

Features needed:
- Toggle registration open/close
- View pending applications (oldest first)
- Review buttons: Pass / Take Exam / Decline
- Bulk notification for exam candidates
- Payment confirmation (Finance role)
- Final enrollment with section assignment

#### 3. **Enhanced Student Registration Form**
Location: Update existing `frontend/src/pages/Registration.tsx`

Changes needed:
- Replace hardcoded grade/section with dynamic dropdown
- Use `/api/academic/grades/with-sections` endpoint
- Add +251 prefix to phone input
- Show available capacity for each section

**Example:**
```typescript
const [gradesWithSections, setGradesWithSections] = useState([]);

useEffect(() => {
  fetch('/api/academic/grades/with-sections', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(r => r.json())
  .then(setGradesWithSections);
}, []);

// In your form:
<select name="section">
  {gradesWithSections.map(grade => (
    <optgroup label={`Grade ${grade.grade_level}`}>
      {grade.sections?.map(section => (
        <option value={section.id}>
          Section {section.section_name} 
          ({section.available}/{section.capacity} available)
        </option>
      ))}
    </optgroup>
  ))}
</select>
```

#### 4. **Enhanced Teachers Page**
Location: Update existing `frontend/src/pages/Teachers.tsx`

Add buttons for:
- Assign as Room Teacher (with section dropdown)
- Assign Exam Duty
- Assign as Department Head
- View/Edit Schedule

Show in teacher info column:
- Room teacher assignment
- Exam assignments
- Department head status

#### 5. **Public Application Form**
Location: `frontend/src/pages/PublicApplication.tsx`

Features:
- No authentication required
- File upload (transcript, max 2MB)
- Phone with +251 prefix
- Submit to `/api/admissions/apply`

---

## Step 5: Update Sidebar/Navigation

Add new menu items in `frontend/src/components/Sidebar.tsx`:

```typescript
// For School Admin role
{
  name: 'Academic Structure',
  path: '/academic-management',
  icon: <GraduationCap />,
  roles: ['school-admin', 'super-admin']
},
{
  name: 'Admissions',
  path: '/admissions-dashboard',
  icon: <Users />,
  roles: ['school-admin', 'super-admin']
},
```

---

## Step 6: Test End-to-End Flow

### Test Academic Structure:
1. ✅ Login as School Admin
2. ✅ Create Grade 1
3. ✅ Bulk create 8 sections (A-H) for Grade 1
4. ✅ Go to Registration page
5. ✅ Verify Grade 1 sections appear in dropdown
6. ✅ Register a test student in Grade 1-A
7. ✅ Verify student count increments

### Test Admissions:
1. ✅ Open public application form (no login)
2. ✅ Submit application
3. ✅ Login as School Admin
4. ✅ See application in "Pending" list
5. ✅ Review → Pass
6. ✅ Login as Finance Officer
7. ✅ Confirm payment
8. ✅ Login as School Admin
9. ✅ Finalize enrollment (assign section)
10. ✅ Verify student account created (check credentials log)

### Test Teachers:
1. ✅ Create new teacher
2. ✅ Note the TEA/2026/XXX ID and password
3. ✅ Assign as Room Teacher to Grade 1-A
4. ✅ Assign Exam Duty
5. ✅ Login as that teacher
6. ✅ Verify assignments appear in teacher dashboard

---

## Step 7: Production Deployment (If Ready)

### Build Frontend:
```bash
cd frontend
npm run build
```

### Deploy:
```bash
# From project root
./deploy.sh
```

Or manually:
1. Commit changes to Git
2. Push to repository
3. SSH to server and pull changes
4. Run database migration on production
5. Restart backend service

---

## Quick Troubleshooting

### ❌ "Route not found" error
**Fix:** Backend not restarted. Run `npm run dev` in backend folder.

### ❌ "Registration is currently closed"
**Fix:** Toggle registration config to `is_open: true` via API or directly in database:
```sql
UPDATE registration_config SET is_open = true WHERE branch_id = 'your_branch_id';
```

### ❌ "Cannot read property 'sections' of undefined"
**Fix:** Run database migration. The `academic_grades` table doesn't exist yet.

### ❌ "Unauthorized" on API calls
**Fix:** Make sure you're including the JWT token:
```javascript
headers: {
  'Authorization': 'Bearer ' + localStorage.getItem('token')
}
```

### ❌ Teacher assignments not showing
**Fix:** Check `is_active = TRUE` in database:
```sql
SELECT * FROM teacher_exam_assignments WHERE teacher_id = 'your_teacher_id';
-- If is_active = false, update it
UPDATE teacher_exam_assignments SET is_active = true WHERE id = 'assignment_id';
```

---

## Priority Order (What to Do First)

### HIGH PRIORITY (Do These Now):
1. ✅ **Run database migration** (Step 1)
2. ✅ **Restart backend** (Step 2)
3. ✅ **Test APIs work** (Step 3)

### MEDIUM PRIORITY (Do These Next):
4. ⚠️ **Create Academic Management page** (Step 4.1)
5. ⚠️ **Update Student Registration form** (Step 4.3)
6. ⚠️ **Test academic structure flow** (Step 6.1)

### LOW PRIORITY (Do These When Ready):
7. 📋 **Create Admissions Dashboard** (Step 4.2)
8. 📋 **Enhance Teachers page** (Step 4.4)
9. 📋 **Full end-to-end testing** (Step 6)

---

## Need Help?

### Check These Files:
- **API Endpoints:** `API_REFERENCE.md`
- **Detailed Guide:** `IMPLEMENTATION_GUIDE.md`
- **Database Schema:** `database/schema_enhancements.sql`

### Common Commands:
```bash
# Check if backend is running
curl http://localhost:5000/

# Check database connection
psql -U username -d abdiadam_school_db -c "SELECT NOW();"

# View backend logs
cd backend
npm run dev
# Watch console output for errors

# Check Git status
git status
git log --oneline -5
```

---

## Summary: Your Immediate Action Items

```
☐ Step 1: Backup database
☐ Step 2: Run schema_enhancements.sql
☐ Step 3: Restart backend server
☐ Step 4: Test API in browser console
☐ Step 5: Create Academic Management page
☐ Step 6: Update Student Registration form
☐ Step 7: Test grade/section creation
☐ Step 8: Celebrate! 🎉
```

**Start with Step 1 - everything else depends on the database being updated!**

---

**Questions?** Review the detailed documentation:
- `IMPLEMENTATION_GUIDE.md` - Full implementation details
- `API_REFERENCE.md` - All API endpoints with examples

Good luck! 🚀
