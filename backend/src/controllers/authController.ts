import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const register = async (req: Request, res: Response) => {
  const { name, email, password, role, branch_id } = req.body;

  // Provisioned roles (Student, Teacher) cannot self-register
  const provisionedRoles = ['student', 'teacher'];
  if (provisionedRoles.includes(role)) {
    return res.status(403).json({ error: 'Students and Teachers must be provisioned by an administrator.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Default status is 'Pending'
    // Special case for Super Admin email
    const status = email === 'abdiadamaschooloffice@gmail.com' ? 'Approved' : 'Pending';

    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, branch_id, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, status',
      [name, email, hashedPassword, role, branch_id, status]
    );

    res.status(201).json({
      message: 'Registration successful. Your account is pending approval.',
      user: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { identifier, password } = req.body; // identifier can be email, username, or digital_id

  try {
    // Auto-initialize primary Super Admin if it doesn't exist
    if (identifier === 'abdiadamaschooloffice@gmail.com' && password === 'ChangeMe123!') {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [identifier]);
      if (existing.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
          'INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5)',
          ['System Admin', identifier, hashedPassword, 'super-admin', 'Approved']
        );
      }
    }

    // Initialize School Admin with correct credentials if doesn't exist
    if (identifier === '65plante@gmail.com' && password === 'Abdiplanet11') {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [identifier]);
      if (existing.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
          'INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5)',
          ['School Admin', identifier, hashedPassword, 'school-admin', 'Approved']
        );
      }
    }

    // Search by email, username (unique ID), OR digital_id
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1 OR digital_id = $1',
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Since Students and Parents can share the same ID (digital_id/username),
    // we must check which user actually matches the provided password.
    let user = null;
    for (const potentialUser of result.rows) {
      const isMatch = await bcrypt.compare(password, potentialUser.password_hash);
      if (isMatch) {
        user = potentialUser;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check status
    if (user.status === 'Pending') {
      return res.status(403).json({ error: 'Your account is pending approval.' });
    }
    if (user.status === 'Revoked') {
      return res.status(403).json({ error: 'Your account has been revoked.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, branch_id: user.branch_id, status: user.status, is_branch_auditor: user.is_branch_auditor },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Determine dashboard redirect — must match App.tsx getDashboardRoute()
    let dashboard = '/dashboard/school-admin';
    if (user.role === 'super-admin') dashboard = '/dashboard/super-admin';
    else if (user.role === 'school-admin') dashboard = '/dashboard/school-admin';
    else if (user.role === 'teacher') dashboard = '/dashboard/teacher';
    else if (user.role === 'student') dashboard = '/dashboard/student';
    else if (user.role === 'parent') dashboard = '/dashboard/parent';
    else if (user.role === 'finance-clerk') dashboard = '/dashboard/finance';
    else if (user.role === 'vice-principal') dashboard = '/dashboard/vice-principal';
    else if (user.role === 'driver') dashboard = '/dashboard/driver';
    else if (user.role === 'auditor') dashboard = '/auditor-dashboard';
    else if (user.role === 'librarian') dashboard = '/dashboard/librarian';
    else if (user.role === 'clinic-admin') dashboard = '/dashboard/clinic-admin';

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id,
        is_branch_auditor: user.is_branch_auditor,
        status: user.status,
        digital_id: user.digital_id
      },
      redirect: dashboard
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
};
export const switchRole = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { newRole } = req.body;

  const staffRoles = ['teacher', 'student', 'parent', 'finance-clerk', 'driver', 'auditor', 'librarian', 'clinic-admin', 'vice-principal'];

  try {
    // Fetch user from DB to get fresh data
    const result = await pool.query(
      'SELECT id, name, email, role, branch_id, status, is_branch_auditor, digital_id FROM users WHERE id = $1',
      [user.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    const dbUser = result.rows[0];

    // Security Rules:
    // 1. Cannot switch TO super-admin or school-admin unless you already HAVE that role in DB
    if ((newRole === 'super-admin' || newRole === 'school-admin') && dbUser.role !== newRole) {
      return res.status(403).json({ error: 'Unauthorized to switch to administrative roles' });
    }

    // 2. Otherwise, if it's a valid portal role, allow the switch (for demo/staff flexibility)
    if (!staffRoles.includes(newRole) && newRole !== 'super-admin' && newRole !== 'school-admin') {
      return res.status(400).json({ error: 'Invalid target role' });
    }

    const token = jwt.sign(
      { id: dbUser.id, email: dbUser.email, role: newRole, branch_id: dbUser.branch_id, status: dbUser.status, is_branch_auditor: dbUser.is_branch_auditor },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Determine redirect
    let dashboard = '/dashboard/school-admin';
    if (newRole === 'super-admin') dashboard = '/dashboard/super-admin';
    else if (newRole === 'school-admin') dashboard = '/dashboard/school-admin';
    else if (newRole === 'teacher') dashboard = '/dashboard/teacher';
    else if (newRole === 'student') dashboard = '/dashboard/student';
    else if (newRole === 'parent') dashboard = '/dashboard/parent';
    else if (newRole === 'finance-clerk') dashboard = '/dashboard/finance';
    else if (newRole === 'vice-principal') dashboard = '/dashboard/vice-principal';
    else if (newRole === 'driver') dashboard = '/dashboard/driver';
    else if (newRole === 'auditor') dashboard = '/auditor-dashboard';
    else if (newRole === 'librarian') dashboard = '/dashboard/librarian';
    else if (newRole === 'clinic-admin') dashboard = '/dashboard/clinic-admin';

    res.json({
      token,
      user: {
        ...dbUser,
        role: newRole
      },
      redirect: dashboard
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during role switch' });
  }
};

export const verify = async (req: Request, res: Response) => {
  // If the request made it here, authenticateToken middleware passed
  const user = (req as any).user;

  try {
    // Fetch latest user info from DB to ensure they aren't revoked/deleted since token issuance
    const result = await pool.query(
      'SELECT id, name, email, role, branch_id, status, digital_id FROM users WHERE id = $1',
      [user.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    const dbUser = result.rows[0];

    if (dbUser.status === 'Pending' || dbUser.status === 'Revoked') {
      return res.status(403).json({ error: `Account is ${dbUser.status}` });
    }

    res.json({ user: dbUser });
  } catch (err) {
    console.error('Error in verify endpoint:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateStatus = async (req: Request, res: Response) => {
  const { userId, status } = req.body;
  const adminRole = (req as any).user.role;

  try {
    // Fetch user to be updated
    const userResult = await pool.query('SELECT role, email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUserRole = userResult.rows[0].role;
    const targetUserEmail = userResult.rows[0].email;

    // Prevent anyone from modifying the root Super Admin
    if (targetUserEmail === 'abdiadamaschooloffice@gmail.com' && status !== 'Approved') {
      return res.status(403).json({ error: 'Cannot revoke root Super Admin' });
    }

    // Authorization logic
    if (adminRole === 'super-admin') {
      // Super Admin can approve/revoke School Admins
      if (targetUserRole !== 'school-admin') {
        return res.status(403).json({ error: 'Super Admin can only manage School Admins' });
      }
    } else if (adminRole === 'school-admin') {
      // School Admin can approve/revoke sub-roles
      const subRoles = ['vice-principal', 'teacher', 'finance-clerk', 'student', 'driver', 'parent', 'librarian', 'clinic-admin', 'auditor'];
      if (!subRoles.includes(targetUserRole)) {
        return res.status(403).json({ error: 'School Admin can only manage staff, students, and parents' });
      }
    } else {
      return res.status(403).json({ error: 'Unauthorized to update user status' });
    }

    await pool.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', [status, userId]);

    res.json({ message: `User status updated to ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during status update' });
  }
};

export const getPendingUsers = async (req: Request, res: Response) => {
  const adminRole = (req as any).user.role;

  try {
    let query = 'SELECT id, name, email, role, status, created_at FROM users WHERE status = \'Pending\'';
    let params: any[] = [];

    if (adminRole === 'super-admin') {
      query += ' AND role = \'school-admin\'';
    } else if (adminRole === 'school-admin') {
      query += ' AND role != \'super-admin\' AND role != \'school-admin\'';
      // Optionally filter by branch_id if School Admin is branch-specific
      if ((req as any).user.branch_id) {
        query += ' AND branch_id = $1';
        params.push((req as any).user.branch_id);
      }
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching pending users' });
  }
};

export const provisionUser = async (req: Request, res: Response) => {
  const { name, email, role, branch_id, student_id } = req.body;
  const adminRole = (req as any).user.role;

  try {
    // Restrict Auditor creation to Super Admin only
    if (role === 'auditor' && adminRole !== 'super-admin') {
      return res.status(403).json({ error: 'Only Super Admin can create Auditor accounts' });
    }

    // Check if email is already taken
    if (email) {
      const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Role validation
    if (adminRole === 'school-admin' && (role === 'super-admin' || role === 'school-admin')) {
      return res.status(403).json({ error: 'School Admins cannot provision other admins' });
    }

    let username: string;
    let tempPassword: string;

    // Special handling for Parents - they use their child's student ID
    if (role === 'parent') {
      if (!student_id) {
        return res.status(400).json({ error: 'Student ID is required for parent registration' });
      }

      // Verify student exists
      const studentCheck = await pool.query('SELECT username FROM users WHERE username = $1 AND role = $2', [student_id, 'student']);
      if (studentCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Student with this ID does not exist' });
      }

      username = student_id; // Parent uses same ID as student
      tempPassword = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit password
    } else {
      // Generate Prefix based on role
      let prefix = 'STF'; // Default for staff
      switch (role) {
        case 'student':
          prefix = 'STU';
          break;
        case 'teacher':
          prefix = 'TEA';
          break;
        case 'driver':
          prefix = 'DRI';
          break;
        case 'finance-clerk':
          prefix = 'FIN';
          break;
        case 'librarian':
          prefix = 'LIB';
          break;
        case 'clinic-admin':
          prefix = 'CLI';
          break;
        case 'vice-principal':
          prefix = 'VIP';
          break;
        case 'auditor':
          prefix = 'AUD';
          break;
        case 'super-admin':
        case 'school-admin':
          prefix = 'ADM';
          break;
      }

      const year = new Date().getFullYear();

      // Determine next sequence number
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM users WHERE username LIKE $1`,
        [`${prefix}/${year}/%`]
      );
      const sequence = parseInt(countResult.rows[0].count) + 1;
      username = `${prefix}/${year}/${sequence.toString().padStart(3, '0')}`;

      // Generate 6-digit password
      tempPassword = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Fallback email if not provided
    const finalEmail = email || `${username.replace(/\//g, '').toLowerCase()}@abdi-adama.com`;

    // Save User
    const result = await pool.query(
      'INSERT INTO users (username, name, email, password_hash, role, branch_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, username, name, email, role, status',
      [username, name, finalEmail, hashedPassword, role, branch_id, 'Approved']
    );

    res.status(201).json({
      message: 'User provisioned successfully',
      credentials: {
        username,
        password: tempPassword
      },
      user: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error provisioning user' });
  }
};
