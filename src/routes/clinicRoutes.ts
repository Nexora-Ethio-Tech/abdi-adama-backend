import { Router } from 'express';
import { 
  getStudents, 
  logVisit, 
  getVisitHistory, 
  getMedicines, 
  deductMedicine,
  getChatMessages,
  sendChatMessage,
  markMessagesRead
} from '../controllers/clinicController';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

// Student directory & visit management - ClinicAdmin only
router.get('/students',               authorizeRoles('ClinicAdmin'), getStudents);
router.post('/visits',                authorizeRoles('ClinicAdmin'), logVisit);
router.get('/visits/history',         authorizeRoles('ClinicAdmin'), getVisitHistory);

// Medicine inventory - ClinicAdmin only
router.get('/medicine',               authorizeRoles('ClinicAdmin'), getMedicines);
router.post('/medicine/deduct',       authorizeRoles('ClinicAdmin'), deductMedicine);

// Chat - ClinicAdmin and Parent
router.get('/chat',                   authorizeRoles('ClinicAdmin', 'Parent'), getChatMessages);
router.post('/chat',                  authorizeRoles('ClinicAdmin', 'Parent'), sendChatMessage);

// Mark messages as read (per-conversation) - ClinicAdmin only
// Called when ClinicAdmin opens a parent conversation to clear the unread badge
router.patch('/chat/read',            authorizeRoles('ClinicAdmin'), markMessagesRead);

export default router;
