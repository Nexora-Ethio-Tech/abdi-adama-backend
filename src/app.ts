import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';
import authRoutes from './routes/auth.routes';
import superAdminRoutes from './routes/superAdmin.routes';
import schoolAdminRoutes from './routes/schoolAdmin.routes';
import financeClerkRoutes from './routes/financeClerk.routes';
import teacherRoutes from './routes/teacher.routes';
import vicePrincipalRoutes from './routes/vicePrincipal.routes';

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: {
      code: 'LOGIN_RATE_LIMIT',
      message: 'Too many login attempts, please try again after 15 minutes'
    }
  }
});

app.use('/api/', limiter);
app.use('/api/auth/login', loginLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Abdi Adama School API is running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/school-admin', schoolAdminRoutes);
app.use('/api/finance-clerk', financeClerkRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/vice-principal', vicePrincipalRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

app.use(errorHandler);

export default app;
