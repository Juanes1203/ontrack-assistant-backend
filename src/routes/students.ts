import { Router } from 'express';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentsNotInClass
} from '../controllers/studentController';
import { authenticate, authorize, authorizeResource } from '../middleware/auth';
import { validate, validateQuery, createStudentSchema, updateStudentSchema, paginationSchema } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get students with pagination and search
router.get('/', validateQuery(paginationSchema), getStudents);

// Get students not enrolled in a specific class
router.get('/not-in-class/:classId', getStudentsNotInClass);

// Get student by ID
router.get('/:id', authorizeResource('student'), getStudentById);

// Create new student (only teachers and admins)
router.post('/', authorize('TEACHER', 'ADMIN'), validate(createStudentSchema), createStudent);

// Update student
router.put('/:id', authorizeResource('student'), validate(updateStudentSchema), updateStudent);

// Delete student
router.delete('/:id', authorizeResource('student'), deleteStudent);

export default router;
