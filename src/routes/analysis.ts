
import { Router } from 'express';
import {
  analyzeTranscript,
  getAnalysis,
  getClassAnalyses,
  deleteAnalysis,
  debugAnalysisStatus,
  getUserAnalyses
} from '../controllers/analysisController';
import { authenticate, authorizeResource } from '../middleware/auth';
import { validate, analyzeRecordingSchema } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get user's analyses (secure)
router.get('/user', getUserAnalyses);

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
