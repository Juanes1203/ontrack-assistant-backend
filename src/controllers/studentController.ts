import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errorHandler';
import { AuthenticatedRequest, CreateStudentRequest, UpdateStudentRequest } from '../types';

const prisma = new PrismaClient();

export const getStudents = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      schoolId: req.user!.schoolId,
      ...(search && {
        OR: [
          { firstName: { contains: search as string, mode: 'insensitive' as const } },
          { lastName: { contains: search as string, mode: 'insensitive' as const } },
          { email: { contains: search as string, mode: 'insensitive' as const } }
        ]
      })
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          classStudents: {
            include: {
              class: {
                select: { id: true, name: true, subject: true }
              }
            }
          },
          _count: {
            select: { classStudents: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.student.count({ where })
    ]);

    res.json({
      success: true,
      data: students,
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

export const getStudentById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        classStudents: {
          include: {
            class: {
              select: { id: true, name: true, subject: true, location: true, schedule: true }
            }
          }
        }
      }
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    // Check if student belongs to user's school
    if (student.schoolId !== req.user!.schoolId) {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
};

export const createStudent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const studentData: CreateStudentRequest = req.body;

    const newStudent = await prisma.student.create({
      data: {
        ...studentData,
        schoolId: req.user!.schoolId
      }
    });

    res.status(201).json({
      success: true,
      data: newStudent,
      message: 'Student created successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const updateStudent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updateData: UpdateStudentRequest = req.body;

    // Check if student exists and belongs to user's school
    const existingStudent = await prisma.student.findUnique({
      where: { id }
    });

    if (!existingStudent) {
      throw new AppError('Student not found', 404);
    }

    if (existingStudent.schoolId !== req.user!.schoolId) {
      throw new AppError('Access denied', 403);
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: updatedStudent,
      message: 'Student updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if student exists and belongs to user's school
    const existingStudent = await prisma.student.findUnique({
      where: { id }
    });

    if (!existingStudent) {
      throw new AppError('Student not found', 404);
    }

    if (existingStudent.schoolId !== req.user!.schoolId) {
      throw new AppError('Access denied', 403);
    }

    await prisma.student.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentsNotInClass = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { classId } = req.params;

    // Check if class exists and user has access
    const existingClass = await prisma.class.findUnique({
      where: { id: classId }
    });

    if (!existingClass) {
      throw new AppError('Class not found', 404);
    }

    if (existingClass.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    // Get students not enrolled in this class
    const students = await prisma.student.findMany({
      where: {
        schoolId: req.user!.schoolId,
        classStudents: {
          none: {
            classId
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true
      },
      orderBy: { firstName: 'asc' }
    });

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    next(error);
  }
};
