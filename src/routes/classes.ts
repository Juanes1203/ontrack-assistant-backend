import { Router } from 'express';
import {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  addStudentsToClass,
  removeStudentFromClass
} from '../controllers/classController';
import { authenticate, authorize, authorizeResource } from '../middleware/auth';
import { validate, validateQuery, createClassSchema, updateClassSchema, addStudentsToClassSchema, paginationSchema } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get classes with pagination and search
router.get('/', validateQuery(paginationSchema), getClasses);

// Get class by ID
router.get('/:id', authorizeResource('class'), getClassById);

// Create new class (only teachers and admins)
router.post('/', authorize('TEACHER', 'ADMIN'), validate(createClassSchema), createClass);

// Update class
router.put('/:id', authorizeResource('class'), validate(updateClassSchema), updateClass);

// Delete class
router.delete('/:id', authorizeResource('class'), deleteClass);

// Add students to class
router.post('/:id/students', authorizeResource('class'), validate(addStudentsToClassSchema), addStudentsToClass);

// Remove student from class
router.delete('/:id/students/:studentId', authorizeResource('class'), removeStudentFromClass);

export default router;
