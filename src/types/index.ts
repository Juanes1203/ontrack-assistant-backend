import { Request } from 'express';
import { User, School, Class, Student, Recording, AIAnalysis } from '@prisma/client';

// Extended types with relations
export interface UserWithSchool extends User {
  school: School;
}

export interface ClassWithDetails extends Class {
  teacher: User;
  school: School;
  classStudents: any[]; // Will be properly typed when we implement the full API
  recordings: Recording[];
}

export interface RecordingWithAnalysis extends Recording {
  class: Class;
  teacher: User;
  analyses: AIAnalysis[];
}

// Request types
export interface AuthenticatedRequest extends Request {
  user?: User;
  file?: Express.Multer.File;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'TEACHER' | 'ADMIN';
  schoolId?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  expiresIn: number;
}

// Class types
export interface CreateClassRequest {
  name: string;
  subject: string;
  location: string;
  schedule: string;
  maxStudents: number;
}

export interface UpdateClassRequest extends Partial<CreateClassRequest> {
  id: string;
}

export interface AddStudentsToClassRequest {
  studentIds: string[];
}

// Student types
export interface CreateStudentRequest {
  firstName: string;
  lastName: string;
  email?: string;
  avatarUrl?: string;
}

export interface UpdateStudentRequest extends Partial<CreateStudentRequest> {
  id: string;
}

// Analysis types
export interface AnalyzeRecordingRequest {
  transcript: string;
  classId: string;
}

export interface AnalyzeTranscriptRequest {
  transcript: string;
  classId: string;
}

// Recording types
export interface CreateRecordingRequest {
  classId: string;
  transcript?: string;
  duration?: number;
  metadata?: string;
}

export interface UpdateRecordingRequest {
  transcript?: string;
  duration?: number;
  metadata?: string;
}

// Error types
export interface ApiError extends Error {
  statusCode: number;
  isOperational?: boolean;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Re-export Prisma types
export { User, School, Class, Student, Recording, AIAnalysis, UserRole, EnrollmentStatus, AnalysisStatus } from '@prisma/client';
