import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
const pdf = require('pdf-parse');
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS || '8191');

// Configuración de chunking
const CHUNK_SIZE = 1000; // caracteres por chunk
const CHUNK_OVERLAP = 200; // overlap entre chunks

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
    console.log('🤖 VectorizationService inicializado con OpenAI');
    console.log(`📊 Modelo: ${EMBEDDING_MODEL} (1536 dimensiones)`);
  }

  /**
   * Genera embedding usando OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Truncar texto si excede el límite (8191 tokens ≈ 32,764 caracteres)
      const truncatedText = text.substring(0, MAX_TOKENS * 4);

      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: truncatedText,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ Error generando embedding con OpenAI:', error);
      throw new Error(`Error en OpenAI embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Divide texto en chunks con overlap
   */
  chunkText(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + chunkSize, text.length);
      const chunkText = text.substring(startIndex, endIndex);

      chunks.push({
        text: chunkText,
        index: chunkIndex,
        metadata: {
          startChar: startIndex,
          endChar: endIndex,
          length: chunkText.length,
        },
      });

      chunkIndex++;
      startIndex += chunkSize - overlap;
    }

    console.log(`📦 Texto dividido en ${chunks.length} chunks (${chunkSize} chars, overlap ${overlap})`);
    return chunks;
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
   * Procesa y vectoriza un documento completo
   */
  async processDocument(documentId: string, filePath: string, fileType: string): Promise<void> {
    try {
      console.log(`🚀 Procesando documento ${documentId} con vectorización OpenAI...`);

      // Actualizar estado a PROCESSING
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' },
      });

      // 1. Extraer texto del documento
      const extractedText = await this.extractTextFromDocument(filePath, fileType);
      console.log(`📄 Texto extraído: ${extractedText.length} caracteres`);

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No se pudo extraer texto del documento');
      }

      // 2. Dividir en chunks
      const chunks = this.chunkText(extractedText);

      // 3. Vectorizar cada chunk y guardar en BD
      console.log(`🤖 Vectorizando ${chunks.length} chunks con OpenAI...`);

      for (const chunk of chunks) {
        try {
          // Generar embedding
          const embedding = await this.generateEmbedding(chunk.text);

          // Guardar en la base de datos
          await prisma.$executeRaw`
            INSERT INTO document_vectors (
              id, 
              document_id, 
              chunk_index, 
              chunk_text, 
              embedding, 
              vector,
              metadata,
              created_at,
              updated_at
            ) VALUES (
              gen_random_uuid()::text,
              ${documentId}::text,
              ${chunk.index}::integer,
              ${chunk.text}::text,
              ${JSON.stringify(embedding)}::vector(1536),
              ${JSON.stringify(embedding)}::text,
              ${JSON.stringify(chunk.metadata)}::text,
              NOW(),
              NOW()
            )
          `;

          console.log(`✅ Chunk ${chunk.index + 1}/${chunks.length} vectorizado`);

          // Rate limiting: pequeña pausa entre requests a OpenAI
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`❌ Error vectorizando chunk ${chunk.index}:`, error);
          // Continuar con los demás chunks
        }
      }

      // 4. Actualizar documento como VECTORIZED
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'VECTORIZED',
          content: extractedText,
          chunks: JSON.stringify(chunks.map((c) => ({ text: c.text, index: c.index }))),
        },
      });

      console.log(`🎉 Documento ${documentId} procesado y vectorizado exitosamente`);
    } catch (error) {
      console.error(`❌ Error procesando documento ${documentId}:`, error);

      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'ERROR',
          content: `Error en procesamiento: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        },
      });

      throw error;
    }
  }

  /**
   * Re-vectoriza un documento existente
   */
  async revectorizeDocument(documentId: string): Promise<void> {
    console.log(`🔄 Re-vectorizando documento ${documentId}...`);

    // Eliminar vectores existentes
    await prisma.documentVector.deleteMany({
      where: { documentId },
    });

    // Obtener el documento
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || !document.content) {
      throw new Error('Documento no encontrado o sin contenido');
    }

    // Procesar chunks desde el contenido almacenado
    const chunks = this.chunkText(document.content);

    for (const chunk of chunks) {
      const embedding = await this.generateEmbedding(chunk.text);

      await prisma.$executeRaw`
        INSERT INTO document_vectors (
          id, document_id, chunk_index, chunk_text, embedding, vector, created_at, updated_at
        ) VALUES (
          gen_random_uuid()::text, ${documentId}, ${chunk.index}, ${chunk.text}, 
          ${JSON.stringify(embedding)}::vector(1536), ${JSON.stringify(embedding)}, NOW(), NOW()
        )
      `;

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'VECTORIZED' },
    });

    console.log(`✅ Documento ${documentId} re-vectorizado`);
  }
}

export default new VectorizationService();