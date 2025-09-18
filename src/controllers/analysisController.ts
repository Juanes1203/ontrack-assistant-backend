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
    console.log('🚀 Starting Straico analysis for analysisId:', analysisId);
    console.log('📊 Transcript length:', transcript.length, 'characters');
    console.log('📝 Transcript preview:', transcript.substring(0, 100) + '...');
    
    const systemPrompt = `Eres un analista educativo experto en la Evaluación de Carácter Diagnóstico Formativa (ECDF) para docentes. Analiza la siguiente transcripción de clase y proporciona un análisis detallado basado en los criterios de evaluación ECDF y los 6 elementos clave de análisis pedagógico. Enfócate en identificar aspectos clave de la práctica docente según los criterios establecidos. IMPORTANTE: Proporciona TODO el análisis en español.

La transcripción incluye intervenciones de profesores y estudiantes, identificados por sus roles. Analiza la interacción entre ellos y cómo contribuye al aprendizaje.

CRITERIOS ECDF:
- ESTRUCTURA: Organización, secuencia lógica, objetivos claros
- CONTENIDO: Precisión, profundidad, relevancia, actualización
- DINÁMICA: Interacción, participación, metodología, recursos
- FORMACIÓN: Desarrollo de competencias, evaluación, retroalimentación

6 ELEMENTOS CLAVE:
1. RESUMEN: Síntesis general de la clase
2. CONCEPTOS: Ideas principales y conceptos clave
3. EJEMPLOS: Casos prácticos y ejemplos utilizados
4. PREGUNTAS: Interrogantes planteadas y su calidad
5. CONEXIONES: Relaciones entre conceptos y temas
6. EVALUACIÓN: Puntuación general y recomendaciones

IMPORTANTE: Responde SOLO con el JSON del análisis, sin ningún texto adicional antes o después.`;

    const userPrompt = `Por favor, analiza esta transcripción de clase y proporciona un análisis estructurado en el siguiente formato JSON, basado en los criterios de la Evaluación de Carácter Diagnóstico Formativa (ECDF) y los 6 elementos clave:

{
  "summary": {
    "title": "string",
    "content": "string",
    "duration": "string",
    "participants": "number"
  },
  "ecdfAnalysis": {
    "structure": {
      "organization": "string",
      "logicalSequence": "string",
      "clearObjectives": "string",
      "score": "number (1-10)"
    },
    "content": {
      "accuracy": "string",
      "depth": "string",
      "relevance": "string",
      "upToDate": "string",
      "score": "number (1-10)"
    },
    "dynamics": {
      "interaction": "string",
      "participation": "string",
      "methodology": "string",
      "resources": "string",
      "score": "number (1-10)"
    },
    "formation": {
      "competenceDevelopment": "string",
      "evaluation": "string",
      "feedback": "string",
      "score": "number (1-10)"
    }
  },
  "concepts": [
    {
      "name": "string",
      "description": "string",
      "importance": "string",
      "examples": ["string"]
    }
  ],
  "examples": [
    {
      "type": "string",
      "description": "string",
      "effectiveness": "string",
      "context": "string"
    }
  ],
  "questions": [
    {
      "question": "string",
      "type": "string",
      "quality": "string",
      "purpose": "string"
    }
  ],
  "connections": [
    {
      "from": "string",
      "to": "string",
      "type": "string",
      "strength": "string",
      "explanation": "string"
    }
  ],
  "moments": [
    {
      "timestamp": "string",
      "type": "string",
      "description": "string",
      "significance": "string"
    }
  ],
  "evaluation": {
    "overallScore": "number",
    "strengths": ["string"],
    "areasForImprovement": ["string"],
    "recommendations": ["string"]
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
    
    console.log('📡 Sending request to Straico API...');
    const response = await fetch(STRAICO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STRAICO_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 Straico API response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Straico API error:', response.status, response.statusText, errorData);
      throw new Error(`Straico API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data: any = await response.json();
    console.log('✅ Straico API response received, processing...');
    
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
        analysisData: JSON.stringify(analysisData),
        status: 'COMPLETED'
      }
    });

    console.log('✅ Analysis completed and saved to database for analysisId:', analysisId);
    
  } catch (error) {
    console.error('Error in Straico analysis:', error);
    
    // Update analysis with error status
    await prisma.aIAnalysis.update({
      where: { id: analysisId },
      data: {
        status: 'FAILED',
        analysisData: JSON.stringify({
          error: 'Error en el análisis de IA: ' + (error instanceof Error ? error.message : 'Unknown error')
        })
      }
    });
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

const prisma = new PrismaClient();

// Function to process analysis automatically when recording is stopped
export const processRecordingAnalysis = async (recordingId: string, transcript: string) => {
  try {
    console.log('🔄 Processing analysis for recording:', recordingId);
    console.log('📝 Transcript length:', transcript.length, 'characters');
    
    // Find the analysis for this recording
    const analysis = await prisma.aIAnalysis.findFirst({
      where: { recordingId },
      orderBy: { createdAt: 'desc' }
    });

    if (!analysis) {
      console.error('❌ No analysis found for recording:', recordingId);
      return;
    }

    console.log('✅ Found analysis record:', analysis.id, 'Status:', analysis.status);
    console.log('🚀 Starting Straico analysis...');

    // Start AI analysis with Straico API
    await analyzeWithStraico(analysis.id, transcript);
    
    console.log('✅ Analysis processing completed for recording:', recordingId);
  } catch (error) {
    console.error('❌ Error processing recording analysis:', error);
  }
};

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
        analysisData: JSON.stringify({
          status: 'pending',
          message: 'Análisis en progreso...'
        }),
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
          analysisData: JSON.stringify({
            error: 'Error en el análisis de IA: ' + error.message
          })
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

// Debug endpoint to check analysis status
export const debugAnalysisStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { classId } = req.params;
    
    // Get all analyses for the class
    const analyses = await prisma.aIAnalysis.findMany({
      where: {
        recording: {
          classId: classId
        }
      },
      include: {
        recording: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            transcript: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        classId,
        totalAnalyses: analyses.length,
        analyses: analyses.map(a => ({
          id: a.id,
          status: a.status,
          createdAt: a.createdAt,
          analysisData: a.analysisData ? JSON.parse(a.analysisData) : null,
          recording: a.recording
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Nuevo endpoint para ver todos los análisis sin autenticación (solo para debug)
export const getAllAnalyses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const analyses = await prisma.aIAnalysis.findMany({
      include: {
        recording: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            transcript: true,
            classId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        totalAnalyses: analyses.length,
        analyses: analyses.map(a => ({
          id: a.id,
          status: a.status,
          createdAt: a.createdAt,
          analysisData: a.analysisData ? JSON.parse(a.analysisData) : null,
          recording: a.recording
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};
