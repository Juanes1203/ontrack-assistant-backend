import OpenAI from 'openai';
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
  private openai: OpenAI;
  private readonly CHUNK_SIZE = 1000; // Caracteres por chunk
  private readonly CHUNK_OVERLAP = 200; // Solapamiento entre chunks

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Extrae texto de diferentes tipos de documentos
   */
  async extractTextFromDocument(filePath: string, fileType: string): Promise<string> {
    try {
      const buffer = fs.readFileSync(filePath);
      
      switch (fileType.toLowerCase()) {
        case 'application/pdf':
          const pdfData = await pdf(buffer);
          return pdfData.text;
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          const docxResult = await mammoth.extractRawText({ buffer });
          return docxResult.value;
        
        case 'text/plain':
          return buffer.toString('utf-8');
        
        default:
          throw new Error(`Tipo de archivo no soportado: ${fileType}`);
      }
    } catch (error) {
      console.error('Error extrayendo texto del documento:', error);
      throw new Error('Error al extraer texto del documento');
    }
  }

  /**
   * Divide el texto en chunks para vectorización
   */
  chunkText(text: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < text.length) {
      const end = Math.min(start + this.CHUNK_SIZE, text.length);
      let chunkText = text.slice(start, end);

      // Intentar cortar en un punto lógico (párrafo, oración)
      if (end < text.length) {
        const lastParagraph = chunkText.lastIndexOf('\n\n');
        const lastSentence = chunkText.lastIndexOf('. ');
        
        if (lastParagraph > this.CHUNK_SIZE * 0.5) {
          chunkText = text.slice(start, start + lastParagraph);
        } else if (lastSentence > this.CHUNK_SIZE * 0.5) {
          chunkText = text.slice(start, start + lastSentence + 1);
        }
      }

      chunks.push({
        text: chunkText.trim(),
        index,
        metadata: {
          startChar: start,
          endChar: start + chunkText.length,
        }
      });

      start += chunkText.length - this.CHUNK_OVERLAP;
      index++;
    }

    return chunks;
  }

  /**
   * Genera embeddings para un chunk de texto
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generando embedding:', error);
      throw new Error('Error al generar embedding');
    }
  }

  /**
   * Vectoriza un documento completo
   */
  async vectorizeDocument(documentId: string, filePath: string, fileType: string): Promise<VectorizedChunk[]> {
    try {
      console.log(`🔄 Iniciando vectorización del documento ${documentId}`);

      // Extraer texto del documento
      const text = await this.extractTextFromDocument(filePath, fileType);
      console.log(`📄 Texto extraído: ${text.length} caracteres`);

      // Dividir en chunks
      const chunks = this.chunkText(text);
      console.log(`📦 Documento dividido en ${chunks.length} chunks`);

      // Generar embeddings para cada chunk
      const vectorizedChunks: VectorizedChunk[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🔢 Procesando chunk ${i + 1}/${chunks.length}`);
        
        const vector = await this.generateEmbedding(chunk.text);
        
        const vectorizedChunk: VectorizedChunk = {
          ...chunk,
          vector,
          id: `${documentId}_${i}`,
        };
        
        vectorizedChunks.push(vectorizedChunk);
      }

      console.log(`✅ Vectorización completada: ${vectorizedChunks.length} chunks vectorizados`);
      return vectorizedChunks;

    } catch (error) {
      console.error('Error en vectorización del documento:', error);
      throw error;
    }
  }

  /**
   * Guarda los chunks vectorizados en la base de datos
   */
  async saveVectorizedChunks(documentId: string, vectorizedChunks: VectorizedChunk[]): Promise<void> {
    try {
      console.log(`💾 Guardando ${vectorizedChunks.length} chunks vectorizados en la base de datos`);

      // Eliminar chunks existentes del documento
      await prisma.documentVector.deleteMany({
        where: { documentId }
      });

      // Guardar nuevos chunks
      const chunksToSave = vectorizedChunks.map(chunk => ({
        documentId,
        chunkIndex: chunk.index,
        chunkText: chunk.text,
        vector: JSON.stringify(chunk.vector),
        metadata: chunk.metadata ? JSON.stringify(chunk.metadata) : null,
      }));

      await prisma.documentVector.createMany({
        data: chunksToSave
      });

      // Actualizar estado del documento
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'VECTORIZED',
          content: vectorizedChunks.map(c => c.text).join('\n\n'),
          chunks: JSON.stringify(vectorizedChunks.map(c => ({
            index: c.index,
            text: c.text.substring(0, 200) + '...', // Solo preview
            metadata: c.metadata
          })))
        }
      });

      console.log(`✅ Chunks vectorizados guardados exitosamente`);
    } catch (error) {
      console.error('Error guardando chunks vectorizados:', error);
      throw error;
    }
  }

  /**
   * Procesa y vectoriza un documento completo
   */
  async processDocument(documentId: string, filePath: string, fileType: string): Promise<void> {
    try {
      console.log(`🚀 Iniciando procesamiento completo del documento ${documentId}`);

      // Actualizar estado a PROCESSING
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' }
      });

      // Vectorizar documento
      const vectorizedChunks = await this.vectorizeDocument(documentId, filePath, fileType);

      // Guardar en base de datos
      await this.saveVectorizedChunks(documentId, vectorizedChunks);

      console.log(`✅ Procesamiento del documento ${documentId} completado exitosamente`);

    } catch (error) {
      console.error('Error procesando documento:', error);
      
      // Actualizar estado a ERROR
      await prisma.document.update({
        where: { id: documentId },
        data: { 
          status: 'ERROR',
          content: `Error en procesamiento: ${error instanceof Error ? error.message : 'Error desconocido'}`
        }
      });
      
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Obtiene chunks vectorizados de un documento
   */
  async getDocumentVectors(documentId: string): Promise<VectorizedChunk[]> {
    try {
      const vectors = await prisma.documentVector.findMany({
        where: { documentId },
        orderBy: { chunkIndex: 'asc' }
      });

      return vectors.map(v => ({
        id: v.id,
        text: v.chunkText,
        index: v.chunkIndex,
        vector: JSON.parse(v.vector),
        metadata: v.metadata ? JSON.parse(v.metadata) : undefined
      }));
    } catch (error) {
      console.error('Error obteniendo vectores del documento:', error);
      throw error;
    }
  }

  /**
   * Elimina todos los vectores de un documento
   */
  async deleteDocumentVectors(documentId: string): Promise<void> {
    try {
      await prisma.documentVector.deleteMany({
        where: { documentId }
      });
      
      await prisma.document.update({
        where: { id: documentId },
        data: { 
          status: 'READY',
          content: null,
          chunks: null
        }
      });
    } catch (error) {
      console.error('Error eliminando vectores del documento:', error);
      throw error;
    }
  }
}

export default new VectorizationService();
