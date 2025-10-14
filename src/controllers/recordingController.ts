import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errorHandler';
import { AuthenticatedRequest, CreateRecordingRequest, UpdateRecordingRequest } from '../types';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { TranscriptionService } from '../services/transcriptionService';

const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    const uploadDir = 'uploads/recordings';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `recording-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only audio files are allowed.', 400));
    }
  }
});

export const uploadMiddleware = upload.single('recording');

// New endpoint to process complete recording with AI analysis
export const processRecordingWithAnalysis = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { classId, transcript, duration, metadata, title, description, isLive = false } = req.body;

    // Verify that the class belongs to the teacher
    const classRecord = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: req.user!.id
      },
      include: {
        teacher: true,
        school: true
      }
    });

    if (!classRecord) {
      throw new AppError('Class not found or access denied', 404);
    }

    // Create the recording
    const recording = await prisma.recording.create({
      data: {
        classId,
        teacherId: req.user!.id,
        transcript: transcript || '',
        duration: duration || 0,
        title: title || `${classRecord.name} - ${new Date().toLocaleString()}`,
        description: description || '',
        status: isLive ? 'IN_PROGRESS' : 'COMPLETED',
        recordingUrl: null // Will be updated if file is uploaded
      }
    });

    // Create AI analysis only if not live recording
    let analysis = null;
    if (!isLive) {
      analysis = await prisma.aIAnalysis.create({
        data: {
          recordingId: recording.id,
          status: 'PENDING',
          analysisData: JSON.stringify({})
        }
      });
    }

    res.status(201).json({
      success: true,
      data: {
        recording: {
          id: recording.id,
          classId: recording.classId,
          teacherId: recording.teacherId,
          title: recording.title,
          description: recording.description,
          transcript: recording.transcript,
          duration: recording.duration,
          status: recording.status,
          createdAt: recording.createdAt,
          className: classRecord.name
        },
        analysis: analysis ? {
          id: analysis.id,
          status: analysis.status
        } : null,
        isLive
      },
      message: isLive ? 'Live recording started' : 'Recording created and analysis started'
    });

  } catch (error) {
    next(error);
  }
};

export const createRecording = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { classId, transcript, duration, metadata }: CreateRecordingRequest = req.body;

    // Verify that the class belongs to the teacher
    const classExists = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: req.user!.id
      }
    });

    if (!classExists) {
      throw new AppError('Class not found or access denied', 404);
    }

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

    // Get file path if uploaded
    const recordingUrl = req.file ? `/uploads/recordings/${req.file.filename}` : null;

    const recording = await prisma.recording.create({
      data: {
        classId,
        teacherId: req.user!.id,
        transcript: transcript || '',
        duration: duration || 0,
        recordingUrl
      },
      include: {
        class: true,
        teacher: true
      }
    });

    res.status(201).json({
      success: true,
      data: recording,
      message: 'Recording created successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getRecording = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const recording = await prisma.recording.findUnique({
      where: { id },
      include: {
        class: true,
        teacher: true,
        analyses: true
      }
    });

    if (!recording) {
      throw new AppError('Recording not found', 404);
    }

    // Check access permissions
    if (recording.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    res.json({
      success: true,
      data: recording
    });
  } catch (error) {
    next(error);
  }
};

export const getClassRecordings = async (
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

    const [recordings, total] = await Promise.all([
      prisma.recording.findMany({
        where: { classId },
        include: {
          class: true,
          teacher: true,
          analyses: {
            select: {
              id: true,
              status: true,
              createdAt: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.recording.count({
        where: { classId }
      })
    ]);

    res.json({
      success: true,
      data: recordings,
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

export const updateRecording = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updateData: UpdateRecordingRequest = req.body;

    const recording = await prisma.recording.findUnique({
      where: { id }
    });

    if (!recording) {
      throw new AppError('Recording not found', 404);
    }

    // Check access permissions
    if (recording.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const updatedRecording = await prisma.recording.update({
      where: { id },
      data: updateData,
      include: {
        class: true,
        teacher: true
      }
    });

    res.json({
      success: true,
      data: updatedRecording,
      message: 'Recording updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRecording = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const recording = await prisma.recording.findUnique({
      where: { id }
    });

    if (!recording) {
      throw new AppError('Recording not found', 404);
    }

    // Check access permissions
    if (recording.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    // Delete associated file if exists
    if (recording.recordingUrl) {
      const filePath = path.join(process.cwd(), 'public', recording.recordingUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.recording.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Recording deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const downloadRecording = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const recording = await prisma.recording.findUnique({
      where: { id }
    });

    if (!recording) {
      throw new AppError('Recording not found', 404);
    }

    // Check access permissions
    if (recording.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    if (!recording.recordingUrl) {
      throw new AppError('No recording file available', 404);
    }

    const filePath = path.join(process.cwd(), 'public', recording.recordingUrl);
    
    if (!fs.existsSync(filePath)) {
      throw new AppError('Recording file not found', 404);
    }

    res.download(filePath);
  } catch (error) {
    next(error);
  }
};

// New endpoint to get transcript with better formatting
export const getRecordingTranscript = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const recording = await prisma.recording.findUnique({
      where: { id },
      select: {
        id: true,
        transcript: true,
        title: true,
        duration: true,
        status: true,
        createdAt: true,
        teacherId: true,
        class: {
          select: {
            name: true
          }
        }
      }
    });

    if (!recording) {
      throw new AppError('Recording not found', 404);
    }

    // Check access permissions
    if (recording.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    // Format transcript for better display
    const formattedTranscript = recording.transcript ? {
      raw: recording.transcript,
      formatted: formatTranscriptForDisplay(recording.transcript),
      wordCount: recording.transcript.split(' ').length,
      estimatedReadingTime: Math.ceil(recording.transcript.split(' ').length / 200) // 200 words per minute
    } : null;

    res.json({
      success: true,
      data: {
        recording: {
          id: recording.id,
          title: recording.title,
          duration: recording.duration,
          status: recording.status,
          createdAt: recording.createdAt,
          className: recording.class.name
        },
        transcript: formattedTranscript
      }
    });
  } catch (error) {
    next(error);
  }
};

// New endpoint to update transcript in real-time during recording
export const updateRecordingTranscript = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { transcript, confidence, isLive = false } = req.body;

    const recording = await prisma.recording.findUnique({
      where: { id }
    });

    if (!recording) {
      throw new AppError('Recording not found', 404);
    }

    // Check access permissions
    if (recording.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    // Update transcript
    const updatedRecording = await prisma.recording.update({
      where: { id },
      data: {
        transcript: transcript || recording.transcript,
        ...(isLive && { status: 'IN_PROGRESS' })
      },
      select: {
        id: true,
        transcript: true,
        status: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: {
        recording: updatedRecording,
        confidence: confidence || null,
        isLive
      },
      message: isLive ? 'Live transcript updated' : 'Transcript updated'
    });
  } catch (error) {
    next(error);
  }
};

// New endpoint to get live recording status for sidebar
export const getLiveRecordingStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { classId } = req.params;

    // Get active recordings for the class
    const activeRecordings = await prisma.recording.findMany({
      where: {
        classId,
        teacherId: req.user!.id,
        status: 'IN_PROGRESS'
      },
      select: {
        id: true,
        title: true,
        transcript: true,
        duration: true,
        createdAt: true,
        class: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        activeRecordings,
        hasActiveRecording: activeRecordings.length > 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// New endpoint to finish live recording and start analysis
export const finishLiveRecording = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { finalTranscript, duration } = req.body;

    const recording = await prisma.recording.findUnique({
      where: { id }
    });

    if (!recording) {
      throw new AppError('Recording not found', 404);
    }

    // Check access permissions
    if (recording.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    // Update recording with final transcript and mark as completed
    const updatedRecording = await prisma.recording.update({
      where: { id },
      data: {
        transcript: finalTranscript || recording.transcript,
        duration: duration || recording.duration,
        status: 'COMPLETED'
      },
      include: {
        class: {
          select: {
            name: true
          }
        }
      }
    });

    // Create AI analysis
    const analysis = await prisma.aIAnalysis.create({
      data: {
        recordingId: recording.id,
        status: 'PENDING',
        analysisData: JSON.stringify({
          status: 'pending',
          message: 'Análisis en progreso...'
        })
      }
    });

    // Start AI analysis in background
    try {
      const { processRecordingAnalysis } = await import('./analysisController');
      processRecordingAnalysis(recording.id, finalTranscript || recording.transcript).catch(error => {
        console.error('Error starting analysis:', error);
      });
    } catch (error) {
      console.error('Error importing analysis controller:', error);
    }

    res.json({
      success: true,
      data: {
        recording: {
          id: updatedRecording.id,
          title: updatedRecording.title,
          description: updatedRecording.description,
          transcript: updatedRecording.transcript,
          duration: updatedRecording.duration,
          status: updatedRecording.status,
          className: updatedRecording.class.name,
          createdAt: updatedRecording.createdAt
        },
        analysis: {
          id: analysis.id,
          status: analysis.status
        }
      },
      message: 'Live recording finished and analysis started'
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to format transcript for better display
function formatTranscriptForDisplay(transcript: string): string {
  if (!transcript) return '';
  
  return transcript
    .split('.')
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0)
    .map(sentence => sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.')
    .join(' ');
}

// New function to upload and transcribe audio
export const uploadAndTranscribeAudio = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { classId, title, description } = req.body;

    if (!req.file) {
      throw new AppError('No audio file provided', 400);
    }

    // Verify that the class belongs to the teacher
    const classRecord = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: req.user!.id
      }
    });

    if (!classRecord) {
      throw new AppError('Class not found or access denied', 404);
    }

    // Create recording entry
    const recording = await prisma.recording.create({
      data: {
        classId,
        teacherId: req.user!.id,
        title: title || `${classRecord.name} - ${new Date().toLocaleString()}`,
        description: description || '',
        recordingUrl: `/uploads/recordings/${req.file.filename}`,
        status: 'IN_PROGRESS'
      }
    });

    // Start transcription in background
    const filePath = path.join(process.cwd(), 'uploads', 'recordings', req.file.filename);
    
    TranscriptionService.transcribeAudio(filePath)
      .then(async (transcriptionResult) => {
        try {
          // Process the transcript
          const processedTranscript = TranscriptionService.processTranscript(transcriptionResult.text);
          
          // Update recording with transcript
          await prisma.recording.update({
            where: { id: recording.id },
            data: {
              transcript: processedTranscript,
              duration: Math.round(transcriptionResult.duration),
              status: 'COMPLETED'
            }
          });

          // Create AI analysis entry
          const analysis = await prisma.aIAnalysis.create({
            data: {
              recordingId: recording.id,
              status: 'PENDING',
              analysisData: JSON.stringify({
                status: 'pending',
                message: 'Análisis en progreso...'
              })
            }
          });

          // Start AI analysis
          const { processRecordingAnalysis } = await import('./analysisController');
          processRecordingAnalysis(recording.id, processedTranscript).catch(error => {
            console.error('Error starting analysis:', error);
          });

          console.log('Transcription and analysis completed for recording:', recording.id);
        } catch (error) {
          console.error('Error updating recording with transcript:', error);
          
          // Update recording status to failed
          await prisma.recording.update({
            where: { id: recording.id },
            data: { status: 'FAILED' }
          });
        }
      })
      .catch(async (error) => {
        console.error('Error in transcription:', error);
        
        // Update recording status to failed
        await prisma.recording.update({
          where: { id: recording.id },
          data: { status: 'FAILED' }
        });
      });

    res.status(201).json({
      success: true,
      data: {
        recording: {
          id: recording.id,
          classId: recording.classId,
          title: recording.title,
          status: recording.status,
          createdAt: recording.createdAt
        }
      },
      message: 'Audio uploaded and transcription started'
    });

  } catch (error) {
    next(error);
  }
};
