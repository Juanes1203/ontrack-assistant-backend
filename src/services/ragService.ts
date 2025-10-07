import { PrismaClient } from '@prisma/client';
import { VectorizedChunk } from './vectorizationService';

const prisma = new PrismaClient();

export interface SearchResult {
  chunk: VectorizedChunk;
  document: {
    id: string;
    title: string;
    category?: string | null;
    teacherId: string;
    schoolId: string;
  };
  similarity: number;
  relevanceScore: number;
}

export interface RAGContext {
  relevantChunks: SearchResult[];
  contextText: string;
  documentTitles: string[];
  totalDocuments: number;
}

class RAGService {
  constructor() {
    console.log('🔍 RAGService inicializado (SIN embeddings - solo búsqueda de texto)');
  }

  /**
   * Búsqueda simple por texto (sin embeddings)
   */
  async searchRelevantChunks(
    query: string,
    teacherId: string,
    schoolId: string,
    limit: number = 10
  ): Promise<SearchResult[]> {
    console.log(`🔍 Buscando documentos relevantes para: "${query.substring(0, 50)}..."`);
    
    try {
      // Buscar documentos que contengan el texto de la consulta
      const documents = await prisma.document.findMany({
        where: {
          teacherId: teacherId,
          schoolId: schoolId,
          status: 'READY', // Solo documentos procesados
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
            { originalName: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          vectors: true,
        },
      });

      const searchResults: SearchResult[] = [];

      for (const document of documents) {
        // Crear un chunk virtual del contenido completo
        const virtualChunk: VectorizedChunk = {
          id: `${document.id}_0`,
          text: document.content || '',
          index: 0,
          vector: [], // Vacío ya que no usamos embeddings
        };

        // Calcular similitud simple basada en palabras coincidentes
        const similarity = this.calculateTextSimilarity(query, document.content || '');
        
        if (similarity > 0.1) { // Umbral mínimo de similitud
          searchResults.push({
            chunk: virtualChunk,
            document: {
              id: document.id,
              title: document.title,
              category: document.category,
              teacherId: document.teacherId,
              schoolId: document.schoolId,
            },
            similarity: similarity,
            relevanceScore: similarity,
          });
        }
      }

      // Ordenar por relevancia y limitar resultados
      searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
      return searchResults.slice(0, limit);

    } catch (error) {
      console.error('Error en búsqueda de documentos:', error);
      return [];
    }
  }

  /**
   * Calcula similitud simple basada en palabras coincidentes
   */
  private calculateTextSimilarity(query: string, text: string): number {
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const textWords = text.toLowerCase().split(/\s+/);
    
    if (queryWords.length === 0 || textWords.length === 0) {
      return 0;
    }

    let matches = 0;
    for (const queryWord of queryWords) {
      if (textWords.some(textWord => textWord.includes(queryWord))) {
        matches++;
      }
    }

    return matches / queryWords.length;
  }

  /**
   * Genera un contexto RAG a partir de una consulta y documentos relevantes
   */
  async generateRAGContext(
    query: string,
    teacherId?: string,
    schoolId?: string,
    limit: number = 10
  ): Promise<RAGContext> {
    if (!teacherId || !schoolId) {
      console.warn('⚠️ No se proporcionó teacherId o schoolId para RAG. Se buscará en todos los documentos.');
    }

    const relevantChunks = await this.searchRelevantChunks(query, teacherId!, schoolId!, limit);

    const contextText = relevantChunks
      .map(
        (result) =>
          `Documento: "${result.document.title}" (Categoría: ${result.document.category || 'N/A'})\nContenido: ${result.chunk.text.substring(0, 500)}...`
      )
      .join('\n\n');

    const documentTitles = Array.from(new Set(relevantChunks.map((r) => r.document.title)));
    
    const totalDocuments = await prisma.document.count({
      where: {
        teacherId: teacherId,
        schoolId: schoolId,
        status: 'READY',
      },
    });

    return {
      relevantChunks,
      contextText: contextText || 'No se encontraron documentos relevantes en el centro de conocimiento.',
      documentTitles,
      totalDocuments,
    };
  }

  /**
   * Método dummy para compatibilidad - no hace nada
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    console.log(`⚠️ Embeddings desactivados para consulta: "${query.substring(0, 50)}..."`);
    return [];
  }
}

export default new RAGService();