import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errorHandler';
import { AuthenticatedRequest, CreateClassRequest, UpdateClassRequest, AddStudentsToClassRequest } from '../types';

const prisma = new PrismaClient();

export const getClasses = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(req.user?.role === 'TEACHER' && { teacherId: req.user.id }),
      ...(req.user?.role === 'ADMIN' && { schoolId: req.user.schoolId }),
      ...(search && {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' as const } },
          { subject: { contains: search as string, mode: 'insensitive' as const } },
          { location: { contains: search as string, mode: 'insensitive' as const } }
        ]
      })
    };

    const [classes, total] = await Promise.all([
      prisma.class.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          teacher: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          school: {
            select: { id: true, name: true }
          },
          classStudents: {
            include: {
              student: {
                select: { id: true, firstName: true, lastName: true, avatarUrl: true }
              }
            }
          },
          _count: {
            select: { classStudents: true, recordings: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.class.count({ where })
    ]);

    res.json({
      success: true,
      data: classes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getClassById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const classRecord = await prisma.class.findUnique({
      where: { id },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        school: {
          select: { id: true, name: true }
        },
        classStudents: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true }
            }
          }
        },
        recordings: {
          include: {
            analyses: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!classRecord) {
      throw new AppError('Class not found', 404);
    }

    res.json({
      success: true,
      data: classRecord
    });
  } catch (error) {
    next(error);
  }
};

export const createClass = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const classData: CreateClassRequest = req.body;
    const teacherId = req.user!.id;

    const newClass = await prisma.class.create({
      data: {
        ...classData,
        teacherId,
        schoolId: req.user!.schoolId
      },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        school: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: newClass,
      message: 'Class created successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const updateClass = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updateData: UpdateClassRequest = req.body;

    // Check if class exists and user has access
    const existingClass = await prisma.class.findUnique({
      where: { id }
    });

    if (!existingClass) {
      throw new AppError('Class not found', 404);
    }

    if (existingClass.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: updateData,
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        school: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({
      success: true,
      data: updatedClass,
      message: 'Class updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteClass = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if class exists and user has access
    const existingClass = await prisma.class.findUnique({
      where: { id }
    });

    if (!existingClass) {
      throw new AppError('Class not found', 404);
    }

    if (existingClass.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    await prisma.class.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const addStudentsToClass = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { studentIds }: AddStudentsToClassRequest = req.body;

    // Check if class exists and user has access
    const existingClass = await prisma.class.findUnique({
      where: { id }
    });

    if (!existingClass) {
      throw new AppError('Class not found', 404);
    }

    if (existingClass.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    // Check if students exist and belong to the same school
    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId: req.user!.schoolId
      }
    });

    if (students.length !== studentIds.length) {
      throw new AppError('Some students not found or not in your school', 400);
    }

    // Add students to class (skip duplicates)
    await prisma.classStudent.createMany({
      data: studentIds.map(studentId => ({
        classId: id,
        studentId
      })),
      skipDuplicates: true
    });

    // Get updated class with students
    const updatedClass = await prisma.class.findUnique({
      where: { id },
      include: {
        classStudents: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedClass,
      message: 'Students added to class successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const removeStudentFromClass = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, studentId } = req.params;

    // Check if class exists and user has access
    const existingClass = await prisma.class.findUnique({
      where: { id }
    });

    if (!existingClass) {
      throw new AppError('Class not found', 404);
    }

    if (existingClass.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    // Remove student from class
    await prisma.classStudent.deleteMany({
      where: {
        classId: id,
        studentId
      }
    });

    res.json({
      success: true,
      message: 'Student removed from class successfully'
    });
  } catch (error) {
    next(error);
  }
};
