import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import multer from 'multer';
import path from 'path';
import s3Service from '../services/s3Service';

// Configuración de multer para subir archivos en memoria (para S3)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB por defecto
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.md', '.ppt', '.pptx', '.xls', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Tipos permitidos: PDF, DOC, DOCX, TXT, MD, PPT, PPTX, XLS, XLSX'));
    }
  }
});

// Middleware para subir archivos
export const uploadDocument = upload.single('file');

// Obtener todos los documentos del usuario
export const getDocuments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const documents = await prisma.document.findMany({
      where: {
        teacherId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Parsear chunks si existen
    const documentsWithParsedChunks = documents.map(doc => ({
      ...doc,
      chunks: doc.chunks ? JSON.parse(doc.chunks) : []
    }));

    res.json({
      success: true,
      data: documentsWithParsedChunks
    });
  } catch (error: any) {
    console.error('Error getting documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener documentos',
      error: error.message
    });
  }
};

// Subir un nuevo documento
export const uploadDocumentHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { title, description, category, tags } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo'
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'El título es requerido'
      });
    }

    // Obtener el schoolId del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Subir archivo a S3 (organizado por profesor)
    const uploadResult = await s3Service.uploadDocument(req.file, userId, category);

    // Crear el documento en la base de datos
    const document = await prisma.document.create({
      data: {
        title,
        description: description || '',
        filename: uploadResult.key.split('/').pop() || req.file.originalname,
        originalName: req.file.originalname,
        fileType: path.extname(req.file.originalname).toLowerCase().substring(1).toUpperCase(),
        fileSize: req.file.size,
        s3Key: uploadResult.key,
        s3Url: uploadResult.url,
        category: category || 'general',
        tags: tags ? JSON.stringify(tags.split(',').map((tag: string) => tag.trim())) : null,
        status: 'PROCESSING',
        teacherId: userId,
        schoolId: user.schoolId
      }
    });

    // Simular procesamiento del documento
    setTimeout(async () => {
      try {
        // Aquí iría la lógica real de procesamiento del documento
        // Por ahora simulamos el procesamiento
        const mockChunks = [
          'Fragmento 1 del documento',
          'Fragmento 2 del documento',
          'Fragmento 3 del documento'
        ];

        await prisma.document.update({
          where: { id: document.id },
          data: {
            status: 'READY',
            content: 'Contenido procesado del documento...',
            chunks: JSON.stringify(mockChunks)
          }
        });
      } catch (error) {
        console.error('Error processing document:', error);
        await prisma.document.update({
          where: { id: document.id },
          data: { status: 'ERROR' }
        });
      }
    }, 3000);

    res.json({
      success: true,
      data: document,
      message: 'Documento subido exitosamente'
    });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir documento',
      error: error.message
    });
  }
};

// Obtener un documento específico
export const getDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const document = await prisma.document.findFirst({
      where: {
        id,
        teacherId: userId
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Parsear chunks si existen
    const documentWithParsedChunks = {
      ...document,
      chunks: document.chunks ? JSON.parse(document.chunks) : []
    };

    res.json({
      success: true,
      data: documentWithParsedChunks
    });
  } catch (error: any) {
    console.error('Error getting document:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener documento',
      error: error.message
    });
  }
};

// Eliminar un documento
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const document = await prisma.document.findFirst({
      where: {
        id,
        teacherId: userId
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Eliminar archivo de S3 si existe
    if (document.s3Key) {
      try {
        await s3Service.deleteDocument(document.s3Key);
      } catch (error) {
        console.error('Error deleting file from S3:', error);
        // Continuar con la eliminación de la base de datos aunque falle S3
      }
    }

    // Eliminar de la base de datos
    await prisma.document.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Documento eliminado exitosamente'
    });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar documento',
      error: error.message
    });
  }
};

// Descargar un documento
export const downloadDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const document = await prisma.document.findFirst({
      where: {
        id,
        teacherId: userId
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    if (!document.s3Key) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado en S3'
      });
    }

    // Generar URL firmada para descarga
    const downloadUrl = await s3Service.getSignedUrl(document.s3Key, 3600); // 1 hora

    res.json({
      success: true,
      data: {
        downloadUrl,
        filename: document.originalName || document.filename,
        expiresIn: 3600
      },
      message: 'URL de descarga generada exitosamente'
    });
  } catch (error: any) {
    console.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      message: 'Error al descargar documento',
      error: error.message
    });
  }
};

// Buscar documentos por categoría
export const getDocumentsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const userId = (req as any).user.id;
    
    const documents = await prisma.document.findMany({
      where: {
        teacherId: userId,
        category: category
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Parsear chunks si existen
    const documentsWithParsedChunks = documents.map(doc => ({
      ...doc,
      chunks: doc.chunks ? JSON.parse(doc.chunks) : [],
      tags: doc.tags ? JSON.parse(doc.tags) : []
    }));

    res.json({
      success: true,
      data: documentsWithParsedChunks
    });
  } catch (error: any) {
    console.error('Error getting documents by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener documentos por categoría',
      error: error.message
    });
  }
};

// Buscar documentos por tags
export const searchDocumentsByTags = async (req: Request, res: Response) => {
  try {
    const { tags } = req.query;
    const userId = (req as any).user.id;
    
    if (!tags) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el parámetro tags'
      });
    }

    const tagArray = Array.isArray(tags) ? tags : [tags];
    
    const documents = await prisma.document.findMany({
      where: {
        teacherId: userId,
        OR: tagArray.map(tag => ({
          tags: {
            contains: tag as string
          }
        }))
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Parsear chunks y tags si existen
    const documentsWithParsedData = documents.map(doc => ({
      ...doc,
      chunks: doc.chunks ? JSON.parse(doc.chunks) : [],
      tags: doc.tags ? JSON.parse(doc.tags) : []
    }));

    res.json({
      success: true,
      data: documentsWithParsedData
    });
  } catch (error: any) {
    console.error('Error searching documents by tags:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar documentos por tags',
      error: error.message
    });
  }
};

// Actualizar metadatos de un documento
export const updateDocumentMetadata = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { title, description, category, tags } = req.body;

    const document = await prisma.document.findFirst({
      where: {
        id,
        teacherId: userId
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        title: title || document.title,
        description: description !== undefined ? description : document.description,
        category: category || document.category,
        tags: tags ? JSON.stringify(tags.split(',').map((tag: string) => tag.trim())) : document.tags
      }
    });

    res.json({
      success: true,
      data: {
        ...updatedDocument,
        tags: updatedDocument.tags ? JSON.parse(updatedDocument.tags) : []
      },
      message: 'Metadatos del documento actualizados exitosamente'
    });
  } catch (error: any) {
    console.error('Error updating document metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar metadatos del documento',
      error: error.message
    });
  }
};

// Obtener estadísticas de documentos
export const getDocumentStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const totalDocuments = await prisma.document.count({
      where: { teacherId: userId }
    });

    const documentsByStatus = await prisma.document.groupBy({
      by: ['status'],
      where: { teacherId: userId },
      _count: { status: true }
    });

    const documentsByCategory = await prisma.document.groupBy({
      by: ['category'],
      where: { teacherId: userId },
      _count: { category: true }
    });

    const totalSize = await prisma.document.aggregate({
      where: { teacherId: userId },
      _sum: { fileSize: true }
    });

    res.json({
      success: true,
      data: {
        totalDocuments,
        documentsByStatus: documentsByStatus.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        documentsByCategory: documentsByCategory.map(item => ({
          category: item.category,
          count: item._count.category
        })),
        totalSize: totalSize._sum.fileSize || 0
      }
    });
  } catch (error: any) {
    console.error('Error getting document stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de documentos',
      error: error.message
    });
  }
};

// Obtener todos los documentos de la escuela (solo para administradores)
export const getAllSchoolDocuments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    
    // Solo administradores pueden ver todos los documentos
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden ver todos los documentos'
      });
    }

    // Obtener el schoolId del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const documents = await prisma.document.findMany({
      where: {
        schoolId: user.schoolId
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Parsear chunks y tags si existen
    const documentsWithParsedData = documents.map(doc => ({
      ...doc,
      chunks: doc.chunks ? JSON.parse(doc.chunks) : [],
      tags: doc.tags ? JSON.parse(doc.tags) : []
    }));

    res.json({
      success: true,
      data: documentsWithParsedData
    });
  } catch (error: any) {
    console.error('Error getting all school documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener todos los documentos de la escuela',
      error: error.message
    });
  }
};

// Obtener estadísticas de toda la escuela (solo para administradores)
export const getSchoolDocumentStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    
    // Solo administradores pueden ver estadísticas de toda la escuela
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden ver estadísticas de toda la escuela'
      });
    }

    // Obtener el schoolId del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const totalDocuments = await prisma.document.count({
      where: { schoolId: user.schoolId }
    });

    const documentsByTeacher = await prisma.document.groupBy({
      by: ['teacherId'],
      where: { schoolId: user.schoolId },
      _count: { teacherId: true }
    });

    const documentsByCategory = await prisma.document.groupBy({
      by: ['category'],
      where: { schoolId: user.schoolId },
      _count: { category: true }
    });

    const documentsByStatus = await prisma.document.groupBy({
      by: ['status'],
      where: { schoolId: user.schoolId },
      _count: { status: true }
    });

    const totalSize = await prisma.document.aggregate({
      where: { schoolId: user.schoolId },
      _sum: { fileSize: true }
    });

    // Obtener información de los profesores
    const teachersWithCounts = await Promise.all(
      documentsByTeacher.map(async (item) => {
        const teacher = await prisma.user.findUnique({
          where: { id: item.teacherId },
          select: { firstName: true, lastName: true, email: true }
        });
        return {
          teacherId: item.teacherId,
          teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Desconocido',
          teacherEmail: teacher?.email || '',
          documentCount: item._count.teacherId
        };
      })
    );

    res.json({
      success: true,
      data: {
        totalDocuments,
        totalTeachers: documentsByTeacher.length,
        documentsByTeacher: teachersWithCounts,
        documentsByCategory: documentsByCategory.map(item => ({
          category: item.category,
          count: item._count.category
        })),
        documentsByStatus: documentsByStatus.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        totalSize: totalSize._sum.fileSize || 0
      }
    });
  } catch (error: any) {
    console.error('Error getting school document stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de la escuela',
      error: error.message
    });
  }
};
