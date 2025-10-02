import express from 'express';
import { 
  getDocuments, 
  uploadDocumentHandler, 
  getDocument, 
  deleteDocument, 
  downloadDocument,
  uploadDocument,
  getDocumentsByCategory,
  searchDocumentsByTags,
  updateDocumentMetadata,
  getDocumentStats,
  getAllSchoolDocuments,
  getSchoolDocumentStats
} from '../controllers/documentController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/documents - Obtener todos los documentos del usuario
router.get('/', getDocuments);

// GET /api/documents/stats - Obtener estadísticas de documentos del profesor
router.get('/stats', getDocumentStats);

// GET /api/documents/school/all - Obtener todos los documentos de la escuela (solo ADMIN)
router.get('/school/all', getAllSchoolDocuments);

// GET /api/documents/school/stats - Obtener estadísticas de toda la escuela (solo ADMIN)
router.get('/school/stats', getSchoolDocumentStats);

// GET /api/documents/category/:category - Obtener documentos por categoría
router.get('/category/:category', getDocumentsByCategory);

// GET /api/documents/search/tags - Buscar documentos por tags
router.get('/search/tags', searchDocumentsByTags);

// POST /api/documents - Subir un nuevo documento
router.post('/', uploadDocument, uploadDocumentHandler);

// GET /api/documents/:id - Obtener un documento específico
router.get('/:id', getDocument);

// PUT /api/documents/:id - Actualizar metadatos de un documento
router.put('/:id', updateDocumentMetadata);

// DELETE /api/documents/:id - Eliminar un documento
router.delete('/:id', deleteDocument);

// GET /api/documents/:id/download - Descargar un documento
router.get('/:id/download', downloadDocument);

export default router;
