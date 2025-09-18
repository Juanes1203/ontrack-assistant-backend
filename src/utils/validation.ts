import Joi from 'joi';

// Auth validation schemas
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  role: Joi.string().valid('TEACHER', 'ADMIN').default('TEACHER'),
  schoolId: Joi.string().optional(),
});

// Class validation schemas
export const createClassSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  subject: Joi.string().min(2).max(100).required(),
  schedule: Joi.string().min(2).max(100).required(),
  // Los siguientes campos se asignarán por defecto en el controlador
  location: Joi.string().min(2).max(100).optional(),
  maxStudents: Joi.number().integer().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  startTime: Joi.string().optional(),
  endTime: Joi.string().optional(),
});

export const updateClassSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  subject: Joi.string().min(2).max(100).optional(),
  location: Joi.string().min(2).max(100).optional(),
  schedule: Joi.string().min(2).max(100).optional(),
  maxStudents: Joi.number().integer().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  startTime: Joi.string().optional(),
  endTime: Joi.string().optional(),
});

export const addStudentsToClassSchema = Joi.object({
  studentIds: Joi.array().items(Joi.string()).min(1).required(),
});

// Student validation schemas
export const createStudentSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().optional(),
  avatarUrl: Joi.string().uri().optional(),
});

export const updateStudentSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  avatarUrl: Joi.string().uri().optional(),
});

// Analysis validation schemas
export const analyzeRecordingSchema = Joi.object({
  transcript: Joi.string().min(10).required(),
  classId: Joi.string().required(),
});

// Recording validation schemas
export const createRecordingSchema = Joi.object({
  classId: Joi.string().required(),
  transcript: Joi.string().optional(),
  duration: Joi.number().integer().min(0).optional(),
  metadata: Joi.string().optional(),
});

export const updateRecordingSchema = Joi.object({
  transcript: Joi.string().optional(),
  duration: Joi.number().integer().min(0).optional(),
  metadata: Joi.string().optional(),
});

// Query validation schemas
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().optional(),
});

// Validation middleware
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    console.log('Validation middleware - validating data:', req.body);
    const { error } = schema.validate(req.body);
    if (error) {
      console.log('Validation error:', error.details);
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }
    console.log('Validation passed');
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }
    next();
  };
};
