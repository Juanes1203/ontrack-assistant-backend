import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-your-key-here'
});

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export class TranscriptionService {
  /**
   * Transcribe audio file using OpenAI Whisper API
   */
  static async transcribeAudio(filePath: string): Promise<TranscriptionResult> {
    try {
      console.log('Starting transcription for file:', filePath);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error('Audio file not found');
      }

      // Get file stats for duration estimation
      const stats = fs.statSync(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      
      console.log(`File size: ${fileSizeInMB.toFixed(2)} MB`);

      // Create a readable stream from the file
      const audioFile = fs.createReadStream(filePath);

      // Transcribe using OpenAI Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment']
      });

      console.log('Transcription completed successfully');

      return {
        text: transcription.text,
        language: transcription.language || 'es',
        duration: transcription.duration || 0,
        segments: transcription.segments?.map(segment => ({
          start: segment.start,
          end: segment.end,
          text: segment.text
        }))
      };

    } catch (error) {
      console.error('Error in transcription:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transcribe audio from buffer (for real-time processing)
   */
  static async transcribeBuffer(audioBuffer: Buffer, filename: string): Promise<TranscriptionResult> {
    try {
      console.log('Starting transcription for buffer, filename:', filename);
      
      // Create a temporary file
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, `temp_${Date.now()}_${filename}`);
      fs.writeFileSync(tempFilePath, audioBuffer);

      try {
        const result = await this.transcribeAudio(tempFilePath);
        return result;
      } finally {
        // Clean up temporary file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }

    } catch (error) {
      console.error('Error in buffer transcription:', error);
      throw new Error(`Buffer transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process transcript for better formatting
   */
  static processTranscript(transcript: string): string {
    // Basic cleaning and formatting
    let processed = transcript
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
      .trim();

    // Add speaker identification if not present
    // This is a simple heuristic - in a real implementation you'd use more sophisticated speaker diarization
    const lines = processed.split('\n');
    const processedLines = lines.map((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) return '';
      
      // If line doesn't start with a speaker identifier, add one
      if (!trimmedLine.match(/^(Profesor|Estudiante|Alumno|Teacher|Student):/i)) {
        // Simple heuristic: if it's a question or contains question marks, it might be a student
        if (trimmedLine.includes('?') || trimmedLine.toLowerCase().includes('puedo') || trimmedLine.toLowerCase().includes('cómo')) {
          return `Estudiante: ${trimmedLine}`;
        } else {
          return `Profesor: ${trimmedLine}`;
        }
      }
      return trimmedLine;
    });

    return processedLines.filter(line => line.length > 0).join('\n');
  }

  /**
   * Extract key moments from transcript
   */
  static extractKeyMoments(transcript: string, segments?: Array<{start: number, end: number, text: string}>): Array<{
    timestamp: string;
    description: string;
    importance: 'high' | 'medium' | 'low';
  }> {
    const keyMoments: Array<{
      timestamp: string;
      description: string;
      importance: 'high' | 'medium' | 'low';
    }> = [];

    if (!segments) {
      // If no segments, create basic key moments from text
      const lines = transcript.split('\n');
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes('importante') || 
            line.toLowerCase().includes('clave') ||
            line.toLowerCase().includes('atención')) {
          keyMoments.push({
            timestamp: `${index * 30}s`, // Rough estimate
            description: line.replace(/^(Profesor|Estudiante):\s*/i, ''),
            importance: 'high'
          });
        }
      });
      return keyMoments;
    }

    // Process segments for key moments
    segments.forEach(segment => {
      const text = segment.text.toLowerCase();
      let importance: 'high' | 'medium' | 'low' = 'low';

      // Determine importance based on keywords
      if (text.includes('importante') || text.includes('clave') || text.includes('atención') || text.includes('examen')) {
        importance = 'high';
      } else if (text.includes('pregunta') || text.includes('duda') || text.includes('explicar')) {
        importance = 'medium';
      }

      if (importance !== 'low' || text.length > 50) {
        keyMoments.push({
          timestamp: `${Math.floor(segment.start)}s`,
          description: segment.text.replace(/^(Profesor|Estudiante):\s*/i, ''),
          importance
        });
      }
    });

    return keyMoments;
  }
}
