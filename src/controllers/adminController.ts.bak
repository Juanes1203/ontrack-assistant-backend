import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

interface CreateUserRequest extends Request {
  body: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'TEACHER' | 'ADMIN';
    schoolId?: string;
  };
}

// Crear nuevo usuario
export const createUser = async (req: CreateUserRequest, res: Response) => {
  try {
    // Validar datos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    const { email, password, firstName, lastName, role, schoolId } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'El usuario ya existe con este email'
      });
    }

    // Encriptar contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear usuario
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        schoolId: schoolId || 'default-school',
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
        createdAt: true,
        updatedAt: true
      }
    });

    return res.status(201).json({
      success: true,
      data: newUser,
      message: 'Usuario creado exitosamente'
    });

  } catch (error: any) {
    console.error('Error creating user:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

// Obtener todos los usuarios
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        schoolId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        school: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({
      success: true,
      data: users,
      count: users.length
    });

  } catch (error: any) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

// Obtener estadísticas de usuarios
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: { isActive: true }
    });
    const teachers = await prisma.user.count({
      where: { role: 'TEACHER' }
    });
    const admins = await prisma.user.count({
      where: { role: 'ADMIN' }
    });

    return res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        teachers,
        admins
      }
    });

  } catch (error: any) {
    console.error('Error fetching user stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

// Actualizar usuario
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, isActive } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        role,
        isActive
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        schoolId: true,
        isActive: true,
        updatedAt: true
      }
    });

    return res.json({
      success: true,
      data: updatedUser,
      message: 'Usuario actualizado exitosamente'
    });

  } catch (error: any) {
    console.error('Error updating user:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

// Desactivar usuario
export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    });

    return res.json({
      success: true,
      data: updatedUser,
      message: 'Usuario desactivado exitosamente'
    });

  } catch (error: any) {
    console.error('Error deactivating user:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};
