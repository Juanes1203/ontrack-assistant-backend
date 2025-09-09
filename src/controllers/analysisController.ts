import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errorHandler';
import { AuthenticatedRequest, AnalyzeTranscriptRequest } from '../types';

const STRAICO_API_KEY = 'dR-V0csHwxpoaZsR608sLWMMoxzqeQonX4UWGCpUbkB8ljEBaZW';
const STRAICO_API_URL = 'https://api.straico.com/v1/prompt/completion';

// Straico API integration function
async function analyzeWithStraico(analysisId: string, transcript: string) {
  const prisma = new PrismaClient();
  
  try {
    console.log('Starting Straico analysis for analysisId:', analysisId);
    
    const systemPrompt = `Eres un analista educativo experto en la Evaluación de Carácter Diagnóstico Formativa (ECDF) para docentes. Analiza la siguiente transcripción de clase y proporciona un análisis detallado basado en los criterios de evaluación ECDF. Enfócate en identificar aspectos clave de la práctica docente según los criterios establecidos. IMPORTANTE: Proporciona TODO el análisis en español.

La transcripción incluye intervenciones de profesores y estudiantes, identificados por sus roles. Analiza la interacción entre ellos y cómo contribuye al aprendizaje.

IMPORTANTE: Responde SOLO con el JSON del análisis, sin ningún texto adicional antes o después.`;

    const userPrompt = `Por favor, analiza esta transcripción de clase y proporciona un análisis estructurado en el siguiente formato JSON, basado en los criterios de la Evaluación de Carácter Diagnóstico Formativa (ECDF):

{
  "summary": {
    "title": "string",
    "content": "string",
    "duration": "string",
    "participants": "number"
  },
  "keyConcepts": [
    {
      "concept": "string",
      "description": "string",
      "importance": "string",
      "examples": ["string"]
    }
  ],
  "studentParticipation": {
    "totalInterventions": "number",
    "activeStudents": "number",
    "participationRate": "number",
    "qualityScore": "number"
  },
  "keyMoments": [
    {
      "timestamp": "string",
      "description": "string",
      "importance": "string"
    }
  ],
  "suggestions": ["string"],
  "evaluation": {
    "overallScore": "number",
    "strengths": ["string"],
    "areasForImprovement": ["string"]
  }
}

IMPORTANTE: Responde SOLO con el JSON del análisis, sin ningún texto adicional antes o después.

Transcripción a analizar:
${transcript}`;

    const requestBody = {
      models: ["anthropic/claude-3.7-sonnet:thinking"],
      message: `${systemPrompt}\n\n${userPrompt}`,
      temperature: 0.7,
      max_tokens: 4000
    };

    console.log('Sending request to Straico API...');
    
    const response = await fetch(STRAICO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STRAICO_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Straico API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data: any = await response.json();
    console.log('Received response from Straico API');
    
    const firstModelKey = Object.keys(data.data.completions)[0];
    const completion = data.data.completions[firstModelKey].completion;
    
    if (!completion.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Straico API');
    }

    const analysisContent = completion.choices[0].message.content;
    console.log('Analysis content received, length:', analysisContent.length);
    
    // Clean and parse the response
    const cleanContent = analysisContent
      .replace(/```json\n?|\n?```/g, '')
      .replace(/^[\s\n]+|[\s\n]+$/g, '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/^[^{]*({[\s\S]*})[^}]*$/, '$1');
    
    const analysisData = JSON.parse(cleanContent);
    console.log('Successfully parsed analysis data');

    // Update the analysis in the database
    await prisma.aIAnalysis.update({
      where: { id: analysisId },
      data: {
        analysisData: analysisData,
        status: 'COMPLETED'
      }
    });

    console.log('Analysis completed and saved to database');
    
  } catch (error) {
    console.error('Error in Straico analysis:', error);
    
    // Update analysis with error status
    await prisma.aIAnalysis.update({
      where: { id: analysisId },
      data: {
        status: 'FAILED',
        analysisData: {
          error: 'Error en el análisis de IA: ' + (error instanceof Error ? error.message : 'Unknown error')
        }
      }
    });
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

const prisma = new PrismaClient();

export const analyzeTranscript = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { transcript, classId }: AnalyzeTranscriptRequest = req.body;

    // Validate class exists and user has access
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      include: { teacher: true }
    });

    if (!classRecord) {
      throw new AppError('Class not found', 404);
    }

    if (classRecord.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    // Create recording entry
    const recording = await prisma.recording.create({
      data: {
        classId,
        teacherId: req.user!.id,
        transcript,
        duration: 0, // Will be calculated later
        recordingUrl: null
      }
    });

    // Create AI analysis entry
    const analysis = await prisma.aIAnalysis.create({
      data: {
        recordingId: recording.id,
        analysisData: {
          status: 'pending',
          message: 'Análisis en progreso...'
        },
        status: 'PENDING'
      }
    });

    // Start AI analysis with Straico API
    analyzeWithStraico(analysis.id, transcript).catch(async (error: any) => {
      console.error('Error in AI analysis:', error);
      await prisma.aIAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: 'FAILED',
          analysisData: {
            error: 'Error en el análisis de IA: ' + error.message
          }
        }
      });
    });

    res.json({
      success: true,
      data: {
        recordingId: recording.id,
        analysisId: analysis.id,
        status: 'pending'
      },
      message: 'Análisis iniciado correctamente'
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalysis = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const analysis = await prisma.aIAnalysis.findUnique({
      where: { id },
      include: {
        recording: {
          include: {
            class: true,
            teacher: true
          }
        }
      }
    });

    if (!analysis) {
      throw new AppError('Analysis not found', 404);
    }

    // Check access permissions
    if (analysis.recording.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    next(error);
  }
};

export const getClassAnalyses = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { classId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Validate class access
    const classRecord = await prisma.class.findUnique({
      where: { id: classId }
    });

    if (!classRecord) {
      throw new AppError('Class not found', 404);
    }

    if (classRecord.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const [analyses, total] = await Promise.all([
      prisma.aIAnalysis.findMany({
        where: {
          recording: {
            classId
          }
        },
        include: {
          recording: {
            include: {
              class: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.aIAnalysis.count({
        where: {
          recording: {
            classId
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: analyses,
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

export const deleteAnalysis = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const analysis = await prisma.aIAnalysis.findUnique({
      where: { id },
      include: {
        recording: true
      }
    });

    if (!analysis) {
      throw new AppError('Analysis not found', 404);
    }

    // Check access permissions
    if (analysis.recording.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    await prisma.aIAnalysis.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Analysis deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
