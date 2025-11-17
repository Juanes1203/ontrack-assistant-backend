import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errorHandler';
import { AuthenticatedRequest, AnalyzeTranscriptRequest } from '../types';
import ragService from '../services/ragService';

const STRAICO_API_KEY = 'dR-V0csHwxpoaZsR608sLWMMoxzqeQonX4UWGCpUbkB8ljEBaZW';
const STRAICO_API_URL = 'https://api.straico.com/v1/prompt/completion';

// Straico API integration function with RAG
async function analyzeWithStraico(analysisId: string, transcript: string, teacherId?: string, schoolId?: string) {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 Starting Straico analysis with RAG for analysisId:', analysisId);
    console.log('📊 Transcript length:', transcript.length, 'characters');
    console.log('📝 Transcript preview:', transcript.substring(0, 100) + '...');
    
    // Generar contexto RAG del centro de conocimiento
    let ragContext = '';
    try {
      console.log('🧠 Generando contexto RAG del centro de conocimiento...');
      const context = await ragService.generateRAGContext(transcript, teacherId, schoolId);
      ragContext = context.contextText;
      console.log(`📚 Contexto RAG generado: ${context.relevantChunks.length} chunks de ${context.totalDocuments} documentos`);
    } catch (error) {
      console.warn('⚠️ Error generando contexto RAG, continuando sin contexto:', error);
      ragContext = 'No se pudo acceder al centro de conocimiento en este momento.';
    }
    
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

${ragContext}

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
      
      // Manejar errores temporales (502, 503, 504) con reintento
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        console.log('🔄 Error temporal de Straico API, intentando reintento...');
        
        // Reintentar una vez después de 3 segundos
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const retryResponse = await fetch(STRAICO_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${STRAICO_API_KEY}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!retryResponse.ok) {
          throw new Error(`Straico API error: ${retryResponse.status} ${retryResponse.statusText} - El servicio de análisis está temporalmente no disponible. Por favor intenta más tarde.`);
        }
        
        // Si el reintento funcionó, continuar con la respuesta
        const retryData: any = await retryResponse.json();
        console.log('✅ Reintento exitoso, procesando respuesta...');
        
        const firstModelKey = Object.keys(retryData.data.completions)[0];
        const completion = retryData.data.completions[firstModelKey].completion;
        
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
        return;
      }
      
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
    
    // Determinar mensaje de error más amigable
    let errorMessage = 'Error desconocido en el análisis de IA';
    if (error instanceof Error) {
      if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504')) {
        errorMessage = 'El servicio de análisis está temporalmente no disponible. Por favor intenta más tarde o revisa el análisis más adelante.';
      } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Error de conexión con el servicio de análisis. Por favor verifica tu conexión a internet.';
      } else {
        errorMessage = 'Error en el análisis de IA: ' + error.message;
      }
    }
    
    // Update analysis with error status
    await prisma.aIAnalysis.update({
      where: { id: analysisId },
      data: {
        status: 'FAILED',
        analysisData: JSON.stringify({
          error: errorMessage,
          timestamp: new Date().toISOString()
        })
      }
    });
    
    // No lanzar el error para que no falle todo el proceso
    // Solo loguear el error
    console.error('❌ Analysis failed but recording and transcription are saved:', errorMessage);
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
    
    // Find the analysis and recording details for this recording
    const analysis = await prisma.aIAnalysis.findFirst({
      where: { recordingId },
      include: {
        recording: {
          include: {
            teacher: true,
            class: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!analysis) {
      console.error('❌ No analysis found for recording:', recordingId);
      return;
    }

    console.log('✅ Found analysis record:', analysis.id, 'Status:', analysis.status);
    console.log('🚀 Starting Straico analysis with RAG...');

    // Start AI analysis with Straico API and RAG context
    await analyzeWithStraico(
      analysis.id, 
      transcript, 
      analysis.recording.teacherId,
      analysis.recording.class.schoolId
    );
    
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

    // Start AI analysis with Straico API and RAG context
    analyzeWithStraico(analysis.id, transcript, req.user!.id, classRecord.schoolId).catch(async (error: any) => {
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

export const getUserAnalyses = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      recording: {
        teacherId: req.user!.id
      }
    };

    const [analyses, total] = await Promise.all([
      prisma.aIAnalysis.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          recording: {
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
              transcript: true,
              classId: true,
              class: {
                select: {
                  id: true,
                  name: true,
                  subject: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.aIAnalysis.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        analyses: analyses.map(a => ({
          id: a.id,
          status: a.status,
          createdAt: a.createdAt,
          analysisData: a.analysisData ? JSON.parse(a.analysisData) : null,
          recording: a.recording
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
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

    // Parse analysisData for client convenience and compute fallback score if needed
    let parsedAnalysisData: any = null;
    try {
      parsedAnalysisData = analysis.analysisData ? JSON.parse(analysis.analysisData as unknown as string) : null;
    } catch (_) {
      parsedAnalysisData = null;
    }

    // Compute a fallback overallScore (/10) if not present but sub-scores exist
    if (parsedAnalysisData && (!parsedAnalysisData.evaluation || parsedAnalysisData.evaluation.overallScore == null)) {
      const scores: number[] = [];
      const ecdf = parsedAnalysisData.ecdfAnalysis;
      if (ecdf) {
        if (typeof ecdf.structure?.score === 'number') scores.push(ecdf.structure.score);
        if (typeof ecdf.content?.score === 'number') scores.push(ecdf.content.score);
        if (typeof ecdf.dynamics?.score === 'number') scores.push(ecdf.dynamics.score);
        if (typeof ecdf.formation?.score === 'number') scores.push(ecdf.formation.score);
      }
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        parsedAnalysisData.evaluation = parsedAnalysisData.evaluation || {};
        parsedAnalysisData.evaluation.overallScore = Number(avg.toFixed(1));
      }
    }

    res.json({
      success: true,
      data: {
        ...analysis,
        // Provide a parsed version for the frontend to use directly
        analysisData: analysis.analysisData,
        analysisDataParsed: parsedAnalysisData,
        // Provide a friendly status message for pending state
        friendlyStatusMessage: analysis.status === 'PENDING'
          ? 'Tu análisis se está generando. Esto puede tardar unos minutos.'
          : (analysis.status === 'FAILED'
              ? 'El análisis no se pudo completar. Intenta nuevamente más tarde.'
              : 'Análisis listo')
      }
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
