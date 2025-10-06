import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  uploadDocument,
  uploadMiddleware,
  getUserDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  reprocessDocument,
  searchDocuments,
  getSimilarDocuments,
  getKnowledgeCenterStats,
  getDocumentDownloadUrl
} from '../controllers/documentController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Document management routes
router.post('/upload', uploadMiddleware, uploadDocument);
router.get('/', getUserDocuments);
router.get('/search', searchDocuments);
router.get('/similar', getSimilarDocuments);
router.get('/stats', getKnowledgeCenterStats);
router.get('/:id', getDocument);
router.get('/:id/download', getDocumentDownloadUrl);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);
router.post('/:id/reprocess', reprocessDocument);

export default router;