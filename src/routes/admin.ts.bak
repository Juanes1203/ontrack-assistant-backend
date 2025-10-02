import express from 'express';
import { body } from 'express-validator';
import { 
  createUser, 
  getAllUsers, 
  getUserStats, 
  updateUser, 
  deactivateUser 
} from '../controllers/adminController';
import { requireSuperAdmin } from '../middleware/superAdmin';

const router = express.Router();

// Validaciones para crear usuario
const createUserValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email válido requerido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('firstName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('El nombre debe tener al menos 2 caracteres'),
  body('lastName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('El apellido debe tener al menos 2 caracteres'),
  body('role')
    .isIn(['TEACHER', 'ADMIN'])
    .withMessage('El rol debe ser TEACHER o ADMIN')
];

// Todas las rutas requieren super admin
router.use(requireSuperAdmin);

// Rutas de administración
router.get('/users', getAllUsers);
router.get('/stats', getUserStats);
router.post('/users', createUserValidation, createUser);
router.put('/users/:id', updateUser);
router.patch('/users/:id/deactivate', deactivateUser);

export default router;
