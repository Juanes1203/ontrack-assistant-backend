import { Router } from 'express';
import {
  createRecording,
  getRecording,
  getClassRecordings,
  updateRecording,
  deleteRecording,
  downloadRecording,
  uploadMiddleware,
  processRecordingWithAnalysis,
  uploadAndTranscribeAudio,
  getRecordingTranscript,
  updateRecordingTranscript,
  getLiveRecordingStatus,
  finishLiveRecording
} from '../controllers/recordingController';
import { authenticate, authorizeResource } from '../middleware/auth';
import { validate, createRecordingSchema, updateRecordingSchema } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Process recording with AI analysis (no file upload)
router.post('/process', processRecordingWithAnalysis);

// Upload and transcribe audio file
router.post('/upload-transcribe', uploadMiddleware, uploadAndTranscribeAudio);

// Create recording (with file upload)
router.post('/', uploadMiddleware, validate(createRecordingSchema), createRecording);

// Get specific recording
router.get('/:id', getRecording);

// Get recordings for a class
router.get('/class/:classId', getClassRecordings);

// Update recording
router.put('/:id', validate(updateRecordingSchema), updateRecording);

// Delete recording
router.delete('/:id', deleteRecording);

// Download recording file
router.get('/:id/download', downloadRecording);

// Get formatted transcript for better display
router.get('/:id/transcript', getRecordingTranscript);

// Update transcript (for live updates during recording)
router.patch('/:id/transcript', updateRecordingTranscript);

// Get live recording status for sidebar
router.get('/class/:classId/live-status', getLiveRecordingStatus);

// Finish live recording and start analysis
router.post('/:id/finish', finishLiveRecording);

export default router;
