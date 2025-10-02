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
