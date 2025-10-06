import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errorHandler';
import { AuthenticatedRequest } from '../types';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import s3Service from '../services/s3Service';
import vectorizationService from '../services/vectorizationService';
import ragService from '../services/ragService';

const prisma = new PrismaClient();

// Configure multer for document uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Tipo de archivo no soportado. Solo se permiten PDF, DOC, DOCX y TXT.', 400));
    }
  }
});

export const uploadMiddleware = upload.single('document');

// Upload and process document
export const uploadDocument = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      throw new AppError('No se proporcionó ningún archivo', 400);
    }

    const { title, description, category, tags } = req.body;
    const teacherId = req.user!.id;
    const schoolId = req.user!.schoolId;

    console.log(`📄 Procesando documento: ${req.file.originalname}`);

    // Upload to S3
    const uploadResult = await s3Service.uploadDocument(
      req.file,
      teacherId,
      category
    );

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        title: title || req.file.originalname,
        description: description || null,
        filename: uploadResult.key.split('/').pop() || req.file.originalname,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        s3Key: uploadResult.key,
        s3Url: uploadResult.url,
        category: category || 'general',
        tags: tags ? JSON.stringify(tags.split(',').map((tag: string) => tag.trim())) : null,
        status: 'PROCESSING',
        teacherId,
        schoolId
      }
    });

    console.log(`✅ Documento creado en BD: ${document.id}`);

    // Process document asynchronously (vectorization)
    // Save file temporarily for processing
    const tempFilePath = path.join(__dirname, '../../temp', `${document.id}_${req.file.originalname}`);
    fs.writeFileSync(tempFilePath, req.file.buffer);
    
    vectorizationService.processDocument(
      document.id,
      tempFilePath,
      req.file.mimetype
    ).catch(async (error) => {
      console.error('Error procesando documento:', error);
        await prisma.document.update({
          where: { id: document.id },
          data: {
          status: 'ERROR',
          content: `Error en procesamiento: ${error.message}`
          }
        });
        });

    res.json({
      success: true,
      data: {
        documentId: document.id,
        title: document.title,
        status: document.status,
        message: 'Documento subido exitosamente. Se está procesando para vectorización...'
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get user's documents
export const getUserDocuments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10, category, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      teacherId: req.user!.id
    };

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          vectors: {
            select: {
              id: true,
              chunkIndex: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.document.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        documents: documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          description: doc.description,
          filename: doc.filename,
          originalName: doc.originalName,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          s3Url: doc.s3Url,
          category: doc.category,
          tags: doc.tags ? JSON.parse(doc.tags) : [],
          status: doc.status,
          vectorCount: doc.vectors.length,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
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

// Get document by ID
export const getDocument = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        vectors: {
          select: {
            id: true,
            chunkIndex: true,
            chunkText: true,
            metadata: true
          },
          orderBy: { chunkIndex: 'asc' }
        }
      }
    });

    if (!document) {
      throw new AppError('Documento no encontrado', 404);
    }

    // Check access permissions
    if (document.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Acceso denegado', 403);
    }

    res.json({
      success: true,
      data: {
        ...document,
        tags: document.tags ? JSON.parse(document.tags) : [],
        vectors: document.vectors.map(v => ({
          ...v,
          metadata: v.metadata ? JSON.parse(v.metadata) : null
        }))
      }
    });

  } catch (error) {
    next(error);
  }
};

// Update document
export const updateDocument = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { title, description, category, tags } = req.body;

    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      throw new AppError('Documento no encontrado', 404);
    }

    // Check access permissions
    if (document.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Acceso denegado', 403);
    }

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        title: title || document.title,
        description: description !== undefined ? description : document.description,
        category: category || document.category,
        tags: tags ? JSON.stringify(tags) : document.tags
      }
    });

    res.json({
      success: true,
      data: updatedDocument,
      message: 'Documento actualizado exitosamente'
    });

  } catch (error) {
    next(error);
  }
};

// Delete document
export const deleteDocument = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      throw new AppError('Documento no encontrado', 404);
    }

    // Check access permissions
    if (document.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Acceso denegado', 403);
    }

    // Delete from S3
    await s3Service.deleteDocument(document.s3Key);

    // Delete vectors and document from database
    await prisma.documentVector.deleteMany({
      where: { documentId: id }
    });

    await prisma.document.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Documento eliminado exitosamente'
    });

  } catch (error) {
    next(error);
  }
};

// Re-process document (re-vectorize)
export const reprocessDocument = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      throw new AppError('Documento no encontrado', 404);
    }

    // Check access permissions
    if (document.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Acceso denegado', 403);
    }

    // Get file from S3
    const fileBuffer = await s3Service.getDocumentBuffer(document.s3Key);
    
    // Save file temporarily for processing
    const tempFilePath = path.join(__dirname, '../../temp', `${document.id}_${document.originalName}`);
    fs.writeFileSync(tempFilePath, fileBuffer);
    
    // Re-process document
    await vectorizationService.processDocument(
      document.id,
      tempFilePath,
      document.fileType
    );

    res.json({
      success: true,
      message: 'Documento enviado para re-procesamiento'
    });

  } catch (error) {
    next(error);
  }
};

// Search documents using RAG
export const searchDocuments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { query, category, limit = 10 } = req.query;

    if (!query) {
      throw new AppError('Query de búsqueda requerida', 400);
    }

    const searchResults = await ragService.searchRelevantChunks(
      query as string,
      req.user!.id,
      req.user!.schoolId,
      category as string,
      Number(limit)
    );

    res.json({
      success: true,
      data: {
        query,
        results: searchResults.map(result => ({
          document: result.document,
          chunk: {
            text: result.chunk.text,
            index: result.chunk.index,
            metadata: result.chunk.metadata
          },
          similarity: result.similarity,
          relevanceScore: result.relevanceScore
        })),
        totalResults: searchResults.length
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get similar documents to a recording
export const getSimilarDocuments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { transcript } = req.body;
    const { limit = 5 } = req.query;

    if (!transcript) {
      throw new AppError('Transcript requerido', 400);
    }

    const similarDocuments = await ragService.findSimilarDocuments(
      transcript,
      req.user!.id,
      req.user!.schoolId,
      Number(limit)
    );

    res.json({
      success: true,
      data: {
        similarDocuments,
        totalResults: similarDocuments.length
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get knowledge center statistics
export const getKnowledgeCenterStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = await ragService.getKnowledgeCenterStats(
      req.user!.id,
      req.user!.schoolId
    );

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    next(error);
  }
};

// Get document download URL
export const getDocumentDownloadUrl = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      throw new AppError('Documento no encontrado', 404);
    }

    // Check access permissions
    if (document.teacherId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Acceso denegado', 403);
    }

    // Generate signed URL
    const downloadUrl = await s3Service.getSignedUrl(document.s3Key, 3600); // 1 hour

    res.json({
      success: true,
      data: {
        downloadUrl,
        expiresIn: 3600
      }
    });

  } catch (error) {
    next(error);
  }
};