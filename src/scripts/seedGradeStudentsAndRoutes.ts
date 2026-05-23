import dotenv from 'dotenv';
import { PoolClient } from 'pg';
import pool from '../config/database';
import { hashPassword, generate4DigitPIN } from '../utils/password';
import { UserRole, UserStatus } from '../types';

dotenv.config();

const BRANCH_NAME = 'Main Branch';
const BRANCH_LOCATION = 'Main Campus';
const STUDENT_ID_PREFIX = 'SDT';
const STUDENT_BRANCH_CODE = 'MD';
const STUDENT_PASSWORD_LENGTH = 4;

interface SeedUserConfig {
  email: string;
  name: string;
  role: UserRole;
  branchId: string;
  password: string;
  digitalId: string;
  username?: string;
}

const TEACHERS = [
  {
    email: 'haileero@gmail.com',
    name: 'Bekele Asaye',
    className: '7'
  },
  {
    email: 'tade9561@gmail.com',
    name: 'Solomon Barega',
    className: '10'
  }
];

const DRIVERS = [
  {
    email: 'hailewelde9@gmail.com',
    name: 'Breket Tesema',
    routeName: 'Route A'
  },
  {
    email: 'valeriohaile@gmail.com',
    name: 'Temsegen Kinde',
    routeName: 'Route B'
  }
];

const STUDENTS = [
  { email: 'student10-1@abdiadama.school', name: 'Student 10-A', grade: '10' },
  { email: 'student10-2@abdiadama.school', name: 'Student 10-B', grade: '10' },
  { email: 'student10-3@abdiadama.school', name: 'Student 10-C', grade: '10' },
  { email: 'student7-1@abdiadama.school', name: 'Student 7-A', grade: '7' },
  { email: 'student7-2@abdiadama.school', name: 'Student 7-B', grade: '7' },
  { email: 'student7-3@abdiadama.school', name: 'Student 7-C', grade: '7' }
];

const DEFAULT_PASSWORD = 'Welcome@2026';

const generateUsername = (email: string) => email.split('@')[0];

async function getOrCreateBranch(client: PoolClient) {
  const existing = await client.query('SELECT id FROM branches WHERE name = $1 LIMIT 1', [BRANCH_NAME]);
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const result = await client.query(
    'INSERT INTO branches (name, location) VALUES ($1, $2) RETURNING id',
    [BRANCH_NAME, BRANCH_LOCATION]
  );

  return result.rows[0].id;
}

async function getOrCreateUser(client: PoolClient, config: SeedUserConfig): Promise<{ id: string; existed: boolean }> {
  const existingUser = await client.query(
    'SELECT id, role, digital_id FROM users WHERE email = $1 LIMIT 1',
    [config.email]
  );

  if (existingUser.rows.length > 0) {
    const existingRole = existingUser.rows[0].role;
    if (existingRole !== config.role) {
      throw new Error(`User ${config.email} already exists with role ${existingRole}`);
    }

    const userId = existingUser.rows[0].id;
    const passwordHash = await hashPassword(config.password);
    await client.query(
      `UPDATE users SET digital_id = $1, password_hash = $2, updated_at = NOW() WHERE id = $3`,
      [config.digitalId, passwordHash, userId]
    );
    return { id: userId, existed: true };
  }

  const passwordHash = await hashPassword(config.password);
  const username = config.username || generateUsername(config.email);

  const result = await client.query(
    `INSERT INTO users (digital_id, username, name, email, password_hash, role, branch_id, status, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [config.digitalId, username, config.name, config.email, passwordHash, config.role, config.branchId, UserStatus.APPROVED, true]
  );

  return { id: result.rows[0].id, existed: false };
}

async function getExistingTeacher(client: PoolClient, email: string, name: string, branchId: string) {
  const result = await client.query(
    `SELECT u.id as user_id, t.id as teacher_id
     FROM users u
     JOIN teachers t ON u.id = t.user_id
     WHERE u.email = $1 AND u.role = $2 AND u.branch_id = $3
     LIMIT 1`,
    [email, UserRole.TEACHER, branchId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Teacher account not found: ${email}`);
  }

  return result.rows[0];
}

async function getExistingDriver(client: PoolClient, email: string, branchId: string) {
  const result = await client.query(
    `SELECT u.id as user_id
     FROM users u
     WHERE u.email = $1 AND u.role = $2 AND u.branch_id = $3
     LIMIT 1`,
    [email, UserRole.DRIVER, branchId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Driver account not found: ${email}`);
  }

  return result.rows[0].user_id;
}

async function getOrCreateRoute(client: PoolClient, driverUserId: string, routeName: string, branchId: string) {
  const existingRoute = await client.query(
    'SELECT id FROM routes WHERE driver_id = $1 AND name = $2 LIMIT 1',
    [driverUserId, routeName]
  );

  if (existingRoute.rows.length > 0) {
    return existingRoute.rows[0].id;
  }

  const result = await client.query(
    'INSERT INTO routes (name, driver_id, branch_id) VALUES ($1, $2, $3) RETURNING id',
    [routeName, driverUserId, branchId]
  );

  return result.rows[0].id;
}

async function generateStudentDigitalId(client: PoolClient, branchId: string) {
  const result = await client.query(
    `SELECT digital_id FROM users
     WHERE role = $1 AND branch_id = $2 AND digital_id LIKE $3
     ORDER BY CAST(split_part(digital_id, '-', 3) AS INTEGER) DESC
     LIMIT 1`,
    [UserRole.STUDENT, branchId, `${STUDENT_ID_PREFIX}-${STUDENT_BRANCH_CODE}-%`]
  );

  let sequence = 1;
  if (result.rows.length > 0 && result.rows[0].digital_id) {
    const lastId = result.rows[0].digital_id;
    const parts = lastId.split('-');
    const lastSequence = parseInt(parts[parts.length - 1], 10);
    sequence = Number.isNaN(lastSequence) ? 1 : lastSequence + 1;
  }

  return `${STUDENT_ID_PREFIX}-${STUDENT_BRANCH_CODE}-${String(sequence).padStart(4, '0')}`;
}

async function getOrCreateStudent(client: PoolClient, email: string, name: string, grade: string, branchId: string, password: string, digitalId: string) {
  const { id: userId, existed } = await getOrCreateUser(client, {
    email,
    name,
    role: UserRole.STUDENT,
    branchId,
    password,
    digitalId,
    username: generateUsername(email)
  });

  const passwordHash = await hashPassword(password);
  if (existed) {
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
  }

  const existingStudent = await client.query('SELECT id, grade FROM students WHERE user_id = $1 LIMIT 1', [userId]);
  if (existingStudent.rows.length > 0) {
    await client.query(
      'UPDATE students SET grade = $1, branch_id = $2, updated_at = NOW() WHERE user_id = $3',
      [grade, branchId, userId]
    );
    return { studentId: existingStudent.rows[0].id, password };
  }

  const result = await client.query(
    'INSERT INTO students (user_id, branch_id, grade, status) VALUES ($1, $2, $3, $4) RETURNING id',
    [userId, branchId, grade, 'Active']
  );

  return { studentId: result.rows[0].id, password };
}

async function getOrCreateClass(client: PoolClient, className: string, branchId: string, teacherId?: string) {
  const existing = await client.query('SELECT id FROM classes WHERE name = $1 AND branch_id = $2 LIMIT 1', [className, branchId]);
  if (existing.rows.length > 0) {
    if (teacherId) {
      await client.query('UPDATE classes SET teacher_id = $1 WHERE id = $2', [teacherId, existing.rows[0].id]);
    }
    return existing.rows[0].id;
  }

  const result = await client.query(
    'INSERT INTO classes (name, teacher_id, branch_id, student_count) VALUES ($1, $2, $3, $4) RETURNING id',
    [className, teacherId || null, branchId, 0]
  );

  return result.rows[0].id;
}

async function assignStudentToClass(client: PoolClient, studentUserId: string, className: string, branchId: string) {
  await client.query(
    'UPDATE students SET grade = $1, updated_at = NOW() WHERE user_id = $2 AND branch_id = $3',
    [className, studentUserId, branchId]
  );
}

async function assignStudentToRoute(client: PoolClient, studentId: string, routeId: string) {
  await client.query(
    `INSERT INTO student_routes (student_id, route_id)
     VALUES ($1, $2)
     ON CONFLICT (student_id, route_id) DO NOTHING`,
    [studentId, routeId]
  );
}

async function refreshClassCount(client: PoolClient, classId: string, className: string, branchId: string) {
  await client.query(
    'UPDATE classes SET student_count = (SELECT COUNT(*) FROM students WHERE grade = $1 AND branch_id = $2) WHERE id = $3',
    [className, branchId, classId]
  );
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const branchId = await getOrCreateBranch(client);
    console.log(`Using branch ID: ${branchId}`);

    const teacherRecords = [] as Array<{ className: string; teacherId: string; userId: string }>;
    for (const teacher of TEACHERS) {
      const teacherData = await getExistingTeacher(client, teacher.email, teacher.name, branchId);
      teacherRecords.push({ className: teacher.className, teacherId: teacherData.teacher_id, userId: teacherData.user_id });
      console.log(`Using existing teacher: ${teacher.name} (${teacher.email}) for class ${teacher.className}`);
    }

    const classIds: Record<string, string> = {};
    for (const record of teacherRecords) {
      classIds[record.className] = await getOrCreateClass(client, record.className, branchId, record.teacherId);
      console.log(`Assigned teacher ${record.userId} to class ${record.className} (ID: ${classIds[record.className]})`);
    }

    const routes: Record<string, string> = {};
    for (const driver of DRIVERS) {
      const userId = await getExistingDriver(client, driver.email, branchId);
      routes[driver.routeName] = await getOrCreateRoute(client, userId, driver.routeName, branchId);
      console.log(`Route ensured for driver ${driver.name} (${driver.email}): ${driver.routeName}`);
    }

    const studentAssignments = [] as Array<{ email: string; studentId: string; className: string; password: string }>;
    const usedPins = new Set<string>();

    const generateUniquePin = () => {
      let pin = generate4DigitPIN();
      while (usedPins.has(pin)) {
        pin = generate4DigitPIN();
      }
      usedPins.add(pin);
      return pin;
    };

    for (const student of STUDENTS) {
      const password = generateUniquePin();
      const digitalId = await generateStudentDigitalId(client, branchId);
      const { studentId } = await getOrCreateStudent(client, student.email, student.name, student.grade, branchId, password, digitalId);
      await assignStudentToClass(client, studentId, student.grade, branchId);
      studentAssignments.push({ email: student.email, studentId, className: student.grade, password });
      console.log(`Student ready: ${student.name} (${student.email}) assigned to class ${student.grade}`);
    }

    const routeAStudentIds = studentAssignments.slice(0, 4).map(s => s.studentId);
    const routeBStudentIds = studentAssignments.slice(4).map(s => s.studentId);

    for (const studentId of routeAStudentIds) {
      await assignStudentToRoute(client, studentId, routes['Route A']);
    }
    for (const studentId of routeBStudentIds) {
      await assignStudentToRoute(client, studentId, routes['Route B']);
    }

    await refreshClassCount(client, classIds['10'], '10', branchId);
    await refreshClassCount(client, classIds['7'], '7', branchId);

    await client.query('COMMIT');

    console.log('');
    console.log('✅ Seed completed successfully.');
    console.log('Students assigned:');
    studentAssignments.forEach((assignment, index) => {
      const routeName = index < 4 ? 'Route A' : 'Route B';
      console.log(`  - ${assignment.email} (${assignment.className}) -> ${routeName}`);
    });
    console.log('');
    console.log('Student login credentials:');
    studentAssignments.forEach((assignment) => {
      console.log(`  - ${assignment.email}: ${assignment.password}`);
    });
    console.log('');
    console.log('Teacher credentials are unchanged and continue using the existing system passwords.');
    console.log('Driver accounts were preserved; only routes were ensured for the existing drivers.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
