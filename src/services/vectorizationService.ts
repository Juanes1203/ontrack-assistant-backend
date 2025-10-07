import { PrismaClient } from '@prisma/client';
const pdf = require('pdf-parse');
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export interface DocumentChunk {
  text: string;
  index: number;
  metadata?: {
    page?: number;
    section?: string;
    [key: string]: any;
  };
}

export interface VectorizedChunk extends DocumentChunk {
  vector: number[];
  id: string;
}

class VectorizationService {
  constructor() {
    console.log('📄 VectorizationService inicializado (SIN vectorización - solo extracción de texto)');
  }

  /**
   * Extrae texto de diferentes tipos de documentos
   */
  async extractTextFromDocument(filePath: string, fileType: string): Promise<string> {
    try {
      const buffer = fs.readFileSync(filePath);

      // Normalizar el tipo de archivo
      const normalizedType = fileType.toLowerCase();
      
      switch (normalizedType) {
        case 'application/pdf':
        case 'pdf':
          const pdfData = await pdf(buffer);
          return pdfData.text;

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
        case 'docx':
        case 'doc':
          const docxResult = await mammoth.extractRawText({ buffer });
          return docxResult.value;

        case 'text/plain':
        case 'txt':
          return buffer.toString('utf8');

        default:
          throw new Error(`Tipo de archivo no soportado para extracción de texto: ${fileType}`);
      }
    } finally {
      // Eliminar el archivo temporal después de la extracción
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  /**
   * Procesa un documento subido: SOLO extrae texto (SIN vectorización)
   */
  async processDocument(documentId: string, filePath: string, fileType: string): Promise<void> {
    try {
      console.log(`📄 Procesando documento ${documentId} (SIN vectorización)...`);

      // Actualizar estado a PROCESSING
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' }
      });

      // Solo extraer texto sin vectorizar
      const extractedText = await this.extractTextFromDocument(filePath, fileType);
      
      // Marcar documento como READY directamente
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'READY',
          content: extractedText,
          chunks: JSON.stringify([extractedText]), // Un solo chunk con todo el texto
        },
      });

      console.log(`✅ Documento ${documentId} procesado y marcado como READY (SIN vectorización)`);

    } catch (error) {
      console.error(`Error en el procesamiento del documento ${documentId}:`, error);
      await prisma.document.update({
        where: { id: documentId },
        data: { 
          status: 'ERROR',
          content: `Error en procesamiento: ${error instanceof Error ? error.message : 'Error desconocido'}`
        },
      });
      throw error;
    }
  }

  /**
   * Método dummy para compatibilidad - no hace nada
   */
  async vectorizeDocument(documentId: string, filePath: string, fileType: string): Promise<VectorizedChunk[]> {
    console.log(`⚠️ Vectorización desactivada para documento ${documentId}`);
    return [];
  }
}

export default new VectorizationService();