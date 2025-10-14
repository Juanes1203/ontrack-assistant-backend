import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const getUserStats = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const stats = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        id: true
      }
    });

    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count();

    const formattedStats = {
      totalUsers,
      activeUsers,
      teachers: stats.find(s => s.role === 'TEACHER')?._count.id || 0,
      admins: stats.find(s => s.role === 'ADMIN')?._count.id || 0,
      superAdmins: stats.find(s => s.role === 'SUPER_ADMIN')?._count.id || 0
    };

    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

export const getAllUsers = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

export const createTeacher = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { email, password, firstName, lastName, schoolId } = req.body;

    // Validar que el usuario autenticado sea SUPER_ADMIN
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Solo los super administradores pueden crear profesores'
      });
    }

    // Validar campos requeridos
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Email, contraseña, nombre y apellido son requeridos'
      });
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear el profesor
    const teacher = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'TEACHER',
        schoolId: schoolId || req.user.id, // Si no se proporciona schoolId, usar el del super admin
        isActive: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        schoolId: true,
        isActive: true,
        createdAt: true
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Profesor creado exitosamente',
      data: teacher
    });

  } catch (error) {
    console.error('Error creating teacher:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};
