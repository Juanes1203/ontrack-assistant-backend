import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errorHandler';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

export const getDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const schoolId = req.user!.schoolId;

    // Build where clause based on user role
    const whereClause = userRole === 'ADMIN' 
      ? { schoolId }
      : { teacherId: userId };

    // Get basic counts
    const [totalClasses, totalStudents, totalRecordings, totalAnalyses] = await Promise.all([
      // Total classes
      prisma.class.count({
        where: whereClause
      }),
      
      // Total students (for teacher: students in their classes, for admin: all students in school)
      userRole === 'ADMIN' 
        ? prisma.student.count({ where: { schoolId } })
        : prisma.student.count({
            where: {
              classStudents: {
                some: {
                  class: {
                    teacherId: userId
                  }
                }
              }
            }
          }),
      
      // Total recordings
      prisma.recording.count({
        where: whereClause
      }),
      
      // Total completed analyses
      prisma.aIAnalysis.count({
        where: {
          status: 'COMPLETED',
          recording: whereClause
        }
      })
    ]);

    // Get recent analyses
    const recentAnalyses = await prisma.aIAnalysis.findMany({
      where: {
        status: 'COMPLETED',
        recording: whereClause
      },
      include: {
        recording: {
          include: {
            class: {
              select: { name: true, subject: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Get performance by subject
    const performanceBySubject = await prisma.aIAnalysis.findMany({
      where: {
        status: 'COMPLETED',
        recording: whereClause
      },
      include: {
        recording: {
          include: {
            class: {
              select: { subject: true }
            }
          }
        }
      }
    });

    // Calculate average scores by subject
    const subjectStats = performanceBySubject.reduce((acc: any, analysis: any) => {
      const subject = analysis.recording.class.subject;
      const score = (analysis.analysisData as any)?.evaluation?.overallScore || 0;
      
      if (!acc[subject]) {
        acc[subject] = { totalScore: 0, count: 0, recordings: 0 };
      }
      
      acc[subject].totalScore += score;
      acc[subject].count += 1;
      acc[subject].recordings += 1;
      
      return acc;
    }, {});

    // Convert to array format
    const subjectPerformance = Object.entries(subjectStats).map(([subject, stats]: [string, any]) => ({
      subject,
      averageScore: (stats.totalScore / stats.count).toFixed(1),
      recordings: stats.recordings
    }));

    // Get monthly trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await prisma.recording.groupBy({
      by: ['createdAt'],
      where: {
        ...whereClause,
        createdAt: {
          gte: sixMonthsAgo
        }
      },
      _count: {
        id: true
      }
    });

    // Calculate overall performance metrics
    const overallScore = performanceBySubject.length > 0
      ? (performanceBySubject.reduce((sum: number, analysis: any) => 
          sum + ((analysis.analysisData as any)?.evaluation?.overallScore || 0), 0) / performanceBySubject.length
        ).toFixed(1)
      : 0;

    const participationRate = performanceBySubject.length > 0
      ? (performanceBySubject.reduce((sum: number, analysis: any) => 
          sum + ((analysis.analysisData as any)?.studentParticipation?.participationRate || 0), 0) / performanceBySubject.length
        ).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalClasses,
          totalStudents,
          totalRecordings,
          totalAnalyses
        },
        performance: {
          overallScore: parseFloat(overallScore.toString()),
          participationRate: parseFloat(participationRate.toString())
        },
        recentAnalyses: recentAnalyses.map(analysis => ({
          id: analysis.id,
          className: analysis.recording.class.name,
          subject: analysis.recording.class.subject,
          score: (analysis.analysisData as any)?.evaluation?.overallScore || 0,
          status: analysis.status,
          createdAt: analysis.createdAt
        })),
        subjectPerformance,
        monthlyTrends: monthlyTrends.map(trend => ({
          month: trend.createdAt.toISOString().substring(0, 7),
          classes: trend._count.id,
          analyses: 0 // This would need a separate query for analyses
        }))
      }
    });

  } catch (error) {
    next(error);
  }
};
