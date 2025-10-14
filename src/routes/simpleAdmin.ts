import { Router } from 'express';
import { getUserStats, getAllUsers, createTeacher } from '../controllers/simpleAdminController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Simple admin routes (without express-validator)
router.get('/stats', getUserStats);
router.get('/users', getAllUsers);
router.post('/users', createTeacher);

export default router;
