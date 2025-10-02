import { Router } from 'express';
import { getUserStats, getAllUsers } from '../controllers/simpleAdminController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Simple admin routes (without express-validator)
router.get('/stats', getUserStats);
router.get('/users', getAllUsers);

export default router;
