import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import vectorizationService from './vectorizationService';

const prisma = new PrismaClient();

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const SIMILARITY_THRESHOLD = 0.7; // 70% de similitud mínima

export interface SearchResult {
  chunkId: string;
  chunkText: string;
  chunkIndex: number;
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
    console.log('🔍 RAGService inicializado con OpenAI + pgvector');
    console.log(`📊 Modelo: ${EMBEDDING_MODEL}, Threshold: ${SIMILARITY_THRESHOLD}`);
  }

  /**
   * Genera embedding para una consulta
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    return await vectorizationService.generateEmbedding(query);
  }

  /**
   * Búsqueda semántica usando pgvector y similitud coseno
   */
  async searchRelevantChunks(
    query: string,
    teacherId: string,
    schoolId: string,
    limit: number = 10
  ): Promise<SearchResult[]> {
    console.log(`🔍 Búsqueda semántica para: "${query.substring(0, 50)}..."`);

    try {
      // 1. Generar embedding de la consulta
      const queryEmbedding = await this.generateQueryEmbedding(query);
      console.log(`🤖 Embedding generado (${queryEmbedding.length} dimensiones)`);

      // 2. Búsqueda en PostgreSQL usando similitud coseno (<=> operador)
      // Similitud coseno: 1 - distance, donde 0 = idéntico, 2 = opuesto
      const results: any[] = await prisma.$queryRaw`
        SELECT 
          dv.id as chunk_id,
          dv.chunk_text,
          dv.chunk_index,
          d.id as document_id,
          d.title as document_title,
          d.category as document_category,
          d.teacher_id,
          d.school_id,
          1 - (dv.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
        FROM document_vectors dv
        JOIN documents d ON d.id = dv.document_id
        WHERE d.teacher_id = ${teacherId}
          AND d.school_id = ${schoolId}
          AND d.status = 'VECTORIZED'
          AND dv.embedding IS NOT NULL
          AND 1 - (dv.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > ${SIMILARITY_THRESHOLD}
        ORDER BY similarity DESC
        LIMIT ${limit}
      `;

      console.log(`✅ Encontrados ${results.length} chunks relevantes`);

      // 3. Formatear resultados
      const searchResults: SearchResult[] = results.map((row) => ({
        chunkId: row.chunk_id,
        chunkText: row.chunk_text,
        chunkIndex: row.chunk_index,
        document: {
          id: row.document_id,
          title: row.document_title,
          category: row.document_category,
          teacherId: row.teacher_id,
          schoolId: row.school_id,
        },
        similarity: parseFloat(row.similarity),
        relevanceScore: parseFloat(row.similarity),
      }));

      // Logging de resultados
      searchResults.forEach((result, index) => {
        console.log(
          `  ${index + 1}. "${result.document.title}" - Similitud: ${(result.similarity * 100).toFixed(1)}%`
        );
      });

      return searchResults;
    } catch (error) {
      console.error('❌ Error en búsqueda semántica:', error);
      
      // Fallback: búsqueda por texto si falla la semántica
      console.warn('⚠️ Intentando búsqueda por texto como fallback...');
      return await this.fallbackTextSearch(query, teacherId, schoolId, limit);
    }
  }

  /**
   * Búsqueda por texto simple (fallback)
   */
  private async fallbackTextSearch(
    query: string,
    teacherId: string,
    schoolId: string,
    limit: number
  ): Promise<SearchResult[]> {
    const documents = await prisma.document.findMany({
      where: {
        teacherId,
        schoolId,
        status: 'VECTORIZED',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        vectors: {
          take: 3, // Primeros 3 chunks de cada documento
        },
      },
      take: limit,
    });

    const results: SearchResult[] = [];

    for (const doc of documents) {
      for (const vector of doc.vectors) {
        results.push({
          chunkId: vector.id,
          chunkText: vector.chunkText,
          chunkIndex: vector.chunkIndex,
          document: {
            id: doc.id,
            title: doc.title,
            category: doc.category,
            teacherId: doc.teacherId,
            schoolId: doc.schoolId,
          },
          similarity: 0.5, // Similitud arbitraria para fallback
          relevanceScore: 0.5,
        });
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Genera un contexto RAG rico para análisis con Straico
   */
  async generateRAGContext(
    query: string,
    teacherId?: string,
    schoolId?: string,
    limit: number = 10
  ): Promise<RAGContext> {
    if (!teacherId || !schoolId) {
      console.warn('⚠️ No se proporcionó teacherId o schoolId para RAG.');
      return {
        relevantChunks: [],
        contextText: 'No se encontraron documentos relevantes en el centro de conocimiento.',
        documentTitles: [],
        totalDocuments: 0,
      };
    }

    // 1. Buscar chunks relevantes
    const relevantChunks = await this.searchRelevantChunks(query, teacherId, schoolId, limit);

    if (relevantChunks.length === 0) {
      console.log('ℹ️ No se encontraron documentos relevantes');
      return {
        relevantChunks: [],
        contextText: 'No se encontraron documentos relevantes para este tema en el centro de conocimiento.',
        documentTitles: [],
        totalDocuments: 0,
      };
    }

    // 2. Construir contexto formateado para Straico
    const contextText = this.buildContextText(relevantChunks);

    // 3. Extraer títulos únicos de documentos
    const documentTitles = Array.from(
      new Set(relevantChunks.map((r) => r.document.title))
    );

    // 4. Contar documentos vectorizados del profesor
    const totalDocuments = await prisma.document.count({
      where: {
        teacherId,
        schoolId,
        status: 'VECTORIZED',
      },
    });

    console.log(`📚 Contexto RAG generado: ${relevantChunks.length} chunks de ${documentTitles.length} documentos`);

    return {
      relevantChunks,
      contextText,
      documentTitles,
      totalDocuments,
    };
  }

  /**
   * Construye el texto del contexto de forma estructurada
   */
  private buildContextText(chunks: SearchResult[]): string {
    if (chunks.length === 0) {
      return 'No se encontraron documentos relevantes en el centro de conocimiento.';
    }

    let contextText = `📚 CONTEXTO DEL CENTRO DE CONOCIMIENTO (${chunks.length} fragmentos encontrados):\n\n`;

    // Agrupar por documento
    const chunksByDocument = chunks.reduce((acc, chunk) => {
      const docId = chunk.document.id;
      if (!acc[docId]) {
        acc[docId] = {
          document: chunk.document,
          chunks: [],
        };
      }
      acc[docId].chunks.push(chunk);
      return acc;
    }, {} as Record<string, { document: SearchResult['document']; chunks: SearchResult[] }>);

    // Formatear cada documento
    Object.values(chunksByDocument).forEach(({ document, chunks: docChunks }) => {
      const avgSimilarity = docChunks.reduce((sum, c) => sum + c.similarity, 0) / docChunks.length;
      
      contextText += `═══════════════════════════════════════════════════\n`;
      contextText += `📄 Documento: "${document.title}"\n`;
      contextText += `🏷️  Categoría: ${document.category || 'Sin categoría'}\n`;
      contextText += `📊 Relevancia: ${(avgSimilarity * 100).toFixed(1)}%\n`;
      contextText += `═══════════════════════════════════════════════════\n\n`;

      docChunks.forEach((chunk, idx) => {
        contextText += `--- Fragmento ${idx + 1} (Similitud: ${(chunk.similarity * 100).toFixed(1)}%) ---\n`;
        contextText += `${chunk.chunkText.trim()}\n\n`;
      });

      contextText += `\n`;
    });

    contextText += `\n💡 INSTRUCCIONES PARA EL ANÁLISIS:\n`;
    contextText += `- Usa estos fragmentos como REFERENCIA para evaluar la precisión del profesor\n`;
    contextText += `- Identifica si la explicación es CONSISTENTE con estos materiales\n`;
    contextText += `- Señala si el profesor menciona conceptos que FALTAN en sus documentos\n`;
    contextText += `- Recomienda usar ejemplos específicos de estos documentos cuando sea relevante\n\n`;

    return contextText;
  }

  /**
   * Búsqueda multi-query (para preguntas complejas)
   */
  async searchMultiQuery(
    queries: string[],
    teacherId: string,
    schoolId: string,
    limit: number = 10
  ): Promise<SearchResult[]> {
    console.log(`🔍 Búsqueda multi-query: ${queries.length} consultas`);

    const allResults: SearchResult[] = [];
    const seenChunkIds = new Set<string>();

    for (const query of queries) {
      const results = await this.searchRelevantChunks(query, teacherId, schoolId, limit);

      for (const result of results) {
        if (!seenChunkIds.has(result.chunkId)) {
          allResults.push(result);
          seenChunkIds.add(result.chunkId);
        }
      }
    }

    // Ordenar por relevancia y limitar
    allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return allResults.slice(0, limit);
  }
}

export default new RAGService();