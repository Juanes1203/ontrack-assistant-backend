
import { Router } from 'express';
import {
  analyzeTranscript,
  getAnalysis,
  getClassAnalyses,
  deleteAnalysis,
  debugAnalysisStatus,
  getAllAnalyses
} from '../controllers/analysisController';
import { authenticate, authorizeResource } from '../middleware/auth';
import { validate, analyzeRecordingSchema } from '../utils/validation';

const router = Router();

// Debug endpoints (sin autenticación)
router.get('/debug-all', getAllAnalyses);

// All other routes require authentication
router.use(authenticate);

// Analyze transcript
router.post('/transcript', validate(analyzeRecordingSchema), analyzeTranscript);

// Get specific analysis
router.get('/:id', getAnalysis);

// Get analyses for a class
router.get('/class/:classId', getClassAnalyses);

// Delete analysis
router.delete('/:id', deleteAnalysis);

// Debug endpoint to check analysis status
router.get('/debug/:classId', debugAnalysisStatus);

export default router;
