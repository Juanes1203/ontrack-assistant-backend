import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errorHandler';
import { AuthenticatedRequest, CreateClassRequest, UpdateClassRequest, AddStudentsToClassRequest, StartRecordingRequest } from '../types';
import { processRecordingAnalysis } from './analysisController';

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
    console.log('Received class creation request:', req.body);
    const classData: CreateClassRequest = req.body;
    const teacherId = req.user!.id;
    console.log('Processed class data:', classData);

    const newClass = await prisma.class.create({
      data: {
        name: classData.name,
        subject: classData.subject,
        schedule: classData.schedule,
        location: classData.location || 'Aula por asignar',
        maxStudents: classData.maxStudents || 30,
        description: classData.description || '',
        startTime: classData.startTime ? new Date(classData.startTime) : null,
        endTime: classData.endTime ? new Date(classData.endTime) : null,
        status: 'SCHEDULED',
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

    // Add students to class
    try {
      await prisma.classStudent.createMany({
        data: studentIds.map(studentId => ({
          classId: id,
          studentId
        }))
      });
    } catch (error: any) {
      // Ignore duplicate key errors
      if (!error.message.includes('UNIQUE constraint failed')) {
        throw error;
      }
    }

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

// New function to start a class recording
export const startClassRecording = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { title, description }: StartRecordingRequest = req.body;

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

    // Update class status to IN_PROGRESS
    await prisma.class.update({
      where: { id },
      data: { 
        status: 'IN_PROGRESS',
        startTime: new Date()
      }
    });

    // Create a new recording
    const recording = await prisma.recording.create({
      data: {
        classId: id,
        teacherId: req.user!.id,
        title: title || `${existingClass.name} - ${new Date().toLocaleString()}`,
        description: description || '',
        status: 'IN_PROGRESS'
      },
      include: {
        class: {
          select: { id: true, name: true, subject: true }
        }
      }
    });

    res.json({
      success: true,
      data: recording,
      message: 'Recording started successfully'
    });
  } catch (error) {
    next(error);
  }
};

// New function to stop a class recording
export const stopClassRecording = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, recordingId } = req.params;
    const { transcript, duration } = req.body;

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

    // Update recording
    const updatedRecording = await prisma.recording.update({
      where: { id: recordingId },
      data: {
        transcript: transcript || '',
        duration: duration || 0,
        status: 'COMPLETED'
      },
      include: {
        class: {
          select: { id: true, name: true, subject: true }
        }
      }
    });

    // Update class status to COMPLETED
    await prisma.class.update({
      where: { id },
      data: { 
        status: 'COMPLETED',
        endTime: new Date()
      }
    });

    // Create AI analysis entry
    const analysis = await prisma.aIAnalysis.create({
      data: {
        recordingId: recordingId,
        status: 'PENDING',
        analysisData: JSON.stringify({
          status: 'pending',
          message: 'Análisis en progreso...'
        })
      }
    });

    // Start AI analysis in background if transcript is provided
    if (transcript && transcript.trim().length > 0) {
      processRecordingAnalysis(recordingId, transcript).catch(error => {
        console.error('Error starting analysis:', error);
      });
    }

    res.json({
      success: true,
      data: {
        recording: updatedRecording,
        analysis: {
          id: analysis.id,
          status: analysis.status
        }
      },
      message: 'Recording stopped and analysis started'
    });
  } catch (error) {
    next(error);
  }
};

// New function to get class with recordings and analyses
export const getClassWithAnalyses = async (
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
            analyses: {
              orderBy: { createdAt: 'desc' }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!classRecord) {
      throw new AppError('Class not found', 404);
    }

    // Check access permissions
    if (classRecord.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: classRecord
    });
  } catch (error) {
    next(error);
  }
};
