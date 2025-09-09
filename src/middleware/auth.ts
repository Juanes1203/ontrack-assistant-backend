import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../utils/errorHandler';

const prisma = new PrismaClient();

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access token required', 401);
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { school: true }
    });

    if (!user) {
      throw new AppError('User not found', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

export const authorizeResource = (resource: 'class' | 'student' | 'recording') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError('Authentication required', 401));
      }

      const resourceId = req.params.id || req.params.classId || req.params.studentId;
      
      if (!resourceId) {
        return next(new AppError('Resource ID required', 400));
      }

      let hasAccess = false;

      switch (resource) {
        case 'class':
          const classRecord = await prisma.class.findUnique({
            where: { id: resourceId },
            select: { teacherId: true, schoolId: true }
          });
          
          if (!classRecord) {
            return next(new AppError('Class not found', 404));
          }

          hasAccess = 
            classRecord.teacherId === req.user.id || 
            req.user.role === 'ADMIN' ||
            classRecord.schoolId === req.user.schoolId;
          break;

        case 'student':
          const student = await prisma.student.findUnique({
            where: { id: resourceId },
            select: { schoolId: true }
          });
          
          if (!student) {
            return next(new AppError('Student not found', 404));
          }

          hasAccess = 
            req.user.role === 'ADMIN' ||
            student.schoolId === req.user.schoolId;
          break;

        case 'recording':
          const recording = await prisma.recording.findUnique({
            where: { id: resourceId },
            select: { teacherId: true, class: { select: { schoolId: true } } }
          });
          
          if (!recording) {
            return next(new AppError('Recording not found', 404));
          }

          hasAccess = 
            recording.teacherId === req.user.id || 
            req.user.role === 'ADMIN' ||
            recording.class.schoolId === req.user.schoolId;
          break;
      }

      if (!hasAccess) {
        return next(new AppError('Access denied to this resource', 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
