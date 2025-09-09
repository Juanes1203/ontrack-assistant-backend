import { Router } from 'express';
import { 
  register, 
  login, 
  getMe, 
  updateProfile, 
  changePassword 
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { 
  validate, 
  loginSchema, 
  registerSchema 
} from '../utils/validation';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

// Protected routes
router.use(authenticate); // All routes below require authentication

router.get('/me', getMe);
router.patch('/profile', updateProfile);
router.patch('/change-password', changePassword);

export default router;
