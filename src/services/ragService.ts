import { PrismaClient } from '@prisma/client';
import { pipeline } from '@xenova/transformers';
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
  private embeddingPipeline: any = null;
  private initializationPromise: Promise<any> | null = null;
  private readonly MAX_RESULTS = 10;
  private readonly SIMILARITY_THRESHOLD = 0.7;

  constructor() {
    // No inicializar automáticamente - usar lazy loading
  }

  /**
   * Obtiene el pipeline de embeddings (lazy loading)
   */
  private async getEmbeddingPipeline() {
    if (this.embeddingPipeline) {
      return this.embeddingPipeline;
    }

    if (this.initializationPromise) {
      return await this.initializationPromise;
    }

    this.initializationPromise = this.initializeEmbeddings();
    return await this.initializationPromise;
  }

  /**
   * Inicializa el pipeline de embeddings locales
   */
  private async initializeEmbeddings() {
    try {
      console.log('🔄 Inicializando embeddings locales en RAGService (lazy loading)...');
      // Usar el mismo modelo ultra-ligero para consistencia
      this.embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('✅ Embeddings locales inicializados en RAGService');
      return this.embeddingPipeline;
    } catch (error) {
      console.error('❌ Error inicializando embeddings locales en RAGService:', error);
      this.initializationPromise = null; // Reset para permitir reintentos
      throw new Error('No se pudieron inicializar los embeddings locales');
    }
  }

  /**
   * Calcula la similitud coseno entre dos vectores
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Los vectores deben tener la misma dimensión');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Genera embedding para una consulta de búsqueda usando modelo local
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      // Usar lazy loading para obtener el pipeline
      const pipeline = await this.getEmbeddingPipeline();

      // Generar embedding usando el modelo local
      const result = await pipeline(query, {
        pooling: 'mean',
        normalize: true,
      });

      // Convertir a array de números
      return Array.from(result.data);
    } catch (error) {
      console.error('Error generando embedding de consulta local:', error);
      throw new Error('Error al generar embedding de consulta local');
    }
  }

  /**
   * Busca chunks relevantes basado en similitud semántica
   */
  async searchRelevantChunks(
    query: string, 
    teacherId?: string, 
    schoolId?: string,
    category?: string,
    limit: number = this.MAX_RESULTS
  ): Promise<SearchResult[]> {
    try {
      console.log(`🔍 Buscando chunks relevantes para: "${query}"`);

      // Generar embedding de la consulta
      const queryEmbedding = await this.generateQueryEmbedding(query);

      // Obtener todos los chunks vectorizados con filtros
      const whereClause: any = {
        document: {
          status: 'VECTORIZED'
        }
      };

      if (teacherId) {
        whereClause.document.teacherId = teacherId;
      }

      if (schoolId) {
        whereClause.document.schoolId = schoolId;
      }

      if (category) {
        whereClause.document.category = category;
      }

      const vectors = await prisma.documentVector.findMany({
        where: whereClause,
        include: {
          document: {
            select: {
              id: true,
              title: true,
              category: true,
              teacherId: true,
              schoolId: true
            }
          }
        }
      });

      console.log(`📊 Encontrados ${vectors.length} chunks para evaluar`);

      // Calcular similitudes
      const results: SearchResult[] = [];

      for (const vector of vectors) {
        try {
          const chunkVector = JSON.parse(vector.vector);
          const similarity = this.cosineSimilarity(queryEmbedding, chunkVector);

          if (similarity >= this.SIMILARITY_THRESHOLD) {
            const chunk: VectorizedChunk = {
              id: vector.id,
              text: vector.chunkText,
              index: vector.chunkIndex,
              vector: chunkVector,
              metadata: vector.metadata ? JSON.parse(vector.metadata) : undefined
            };

            results.push({
              chunk,
              document: vector.document,
              similarity,
              relevanceScore: similarity * 100 // Convertir a porcentaje
            });
          }
        } catch (error) {
          console.warn(`Error procesando vector ${vector.id}:`, error);
        }
      }

      // Ordenar por similitud descendente
      results.sort((a, b) => b.similarity - a.similarity);

      // Limitar resultados
      const limitedResults = results.slice(0, limit);

      console.log(`✅ Encontrados ${limitedResults.length} chunks relevantes`);
      return limitedResults;

    } catch (error) {
      console.error('Error en búsqueda de chunks relevantes:', error);
      throw error;
    }
  }

  /**
   * Genera contexto RAG para análisis de grabaciones
   */
  async generateRAGContext(
    transcript: string,
    teacherId?: string,
    schoolId?: string,
    category?: string
  ): Promise<RAGContext> {
    try {
      console.log(`🧠 Generando contexto RAG para análisis de grabación`);

      // Extraer palabras clave del transcript para mejorar la búsqueda
      const keywords = this.extractKeywords(transcript);
      const searchQuery = `${keywords.join(' ')} ${transcript.substring(0, 500)}`;

      // Buscar chunks relevantes
      const relevantChunks = await this.searchRelevantChunks(
        searchQuery,
        teacherId,
        schoolId,
        category,
        this.MAX_RESULTS
      );

      // Generar texto de contexto
      const contextText = this.buildContextText(relevantChunks);

      // Extraer títulos de documentos únicos
      const documentTitles = [...new Set(relevantChunks.map(r => r.document.title))];
      const totalDocuments = documentTitles.length;

      console.log(`📚 Contexto generado: ${relevantChunks.length} chunks de ${totalDocuments} documentos`);

      return {
        relevantChunks,
        contextText,
        documentTitles,
        totalDocuments
      };

    } catch (error) {
      console.error('Error generando contexto RAG:', error);
      throw error;
    }
  }

  /**
   * Extrae palabras clave del transcript
   */
  private extractKeywords(transcript: string): string[] {
    // Palabras comunes a excluir
    const stopWords = new Set([
      'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'un', 'una', 'uno', 'unas', 'unos', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella', 'aquellos', 'aquellas', 'yo', 'tú', 'él', 'ella', 'nosotros', 'nosotras', 'vosotros', 'vosotras', 'ellos', 'ellas', 'me', 'te', 'se', 'nos', 'os', 'le', 'les', 'lo', 'la', 'los', 'las', 'mi', 'tu', 'su', 'nuestro', 'nuestra', 'nuestros', 'nuestras', 'vuestro', 'vuestra', 'vuestros', 'vuestras', 'muy', 'más', 'menos', 'mucho', 'poco', 'todo', 'nada', 'algo', 'alguien', 'nadie', 'cada', 'cual', 'cuál', 'cuáles', 'cuando', 'cuándo', 'donde', 'dónde', 'como', 'cómo', 'porque', 'por qué', 'si', 'sí', 'no', 'también', 'tampoco', 'solo', 'sólo', 'ya', 'aún', 'todavía', 'siempre', 'nunca', 'jamás', 'aquí', 'allí', 'ahí', 'allá', 'acá', 'entonces', 'después', 'antes', 'ahora', 'hoy', 'ayer', 'mañana', 'bien', 'mal', 'bueno', 'malo', 'grande', 'pequeño', 'nuevo', 'viejo', 'joven', 'alto', 'bajo', 'largo', 'corto', 'ancho', 'estrecho', 'gordo', 'delgado', 'fuerte', 'débil', 'rápido', 'lento', 'fácil', 'difícil', 'importante', 'necesario', 'posible', 'imposible', 'verdadero', 'falso', 'cierto', 'seguro', 'libre', 'ocupado', 'abierto', 'cerrado', 'lleno', 'vacío', 'caliente', 'frío', 'seco', 'húmedo', 'limpio', 'sucio', 'bonito', 'feo', 'hermoso', 'horrible', 'interesante', 'aburrido', 'divertido', 'serio', 'triste', 'alegre', 'contento', 'feliz', 'enojado', 'furioso', 'tranquilo', 'nervioso', 'cansado', 'descansado', 'enfermo', 'sano', 'vivo', 'muerto', 'joven', 'viejo', 'nuevo', 'usado', 'moderno', 'antiguo', 'actual', 'pasado', 'futuro', 'presente', 'primero', 'último', 'siguiente', 'anterior', 'mismo', 'diferente', 'igual', 'parecido', 'similar', 'distinto', 'otro', 'mismo', 'propio', 'ajeno', 'público', 'privado', 'general', 'especial', 'particular', 'común', 'raro', 'normal', 'extraño', 'curioso', 'sorprendente', 'increíble', 'fantástico', 'terrible', 'horrible', 'maravilloso', 'perfecto', 'excelente', 'bueno', 'malo', 'regular', 'normal', 'típico', 'atípico', 'común', 'raro', 'frecuente', 'infrecuente', 'habitual', 'ocasional', 'siempre', 'nunca', 'a veces', 'a menudo', 'rara vez', 'casi nunca', 'casi siempre', 'muy', 'bastante', 'algo', 'poco', 'nada', 'todo', 'algunos', 'varios', 'muchos', 'pocos', 'todos', 'ninguno', 'cada', 'cualquier', 'alguno', 'ninguno', 'otro', 'mismo', 'diferente', 'igual', 'parecido', 'similar', 'distinto'
    ]);

    // Convertir a minúsculas y dividir en palabras
    const words = transcript.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remover puntuación
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    // Contar frecuencia de palabras
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    // Ordenar por frecuencia y tomar las más relevantes
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * Construye el texto de contexto a partir de los chunks relevantes
   */
  private buildContextText(relevantChunks: SearchResult[]): string {
    if (relevantChunks.length === 0) {
      return 'No se encontraron documentos relevantes en el centro de conocimiento.';
    }

    const contextSections = relevantChunks.map((result, index) => {
      const { chunk, document, similarity } = result;
      const relevance = Math.round(similarity * 100);
      
      return `[Documento ${index + 1}: ${document.title} (Relevancia: ${relevance}%)]
${chunk.text}

---`;
    });

    return `CONTEXTO DEL CENTRO DE CONOCIMIENTO:

Los siguientes fragmentos de documentos del centro de conocimiento son relevantes para el análisis de esta grabación de clase:

${contextSections.join('\n')}

Utiliza esta información como contexto adicional para enriquecer tu análisis de la grabación de clase.`;
  }

  /**
   * Busca documentos similares a una grabación
   */
  async findSimilarDocuments(
    transcript: string,
    teacherId?: string,
    schoolId?: string,
    limit: number = 5
  ): Promise<Array<{
    document: {
      id: string;
      title: string;
      category?: string;
      description?: string;
    };
    similarity: number;
    relevantChunks: number;
  }>> {
    try {
      const relevantChunks = await this.searchRelevantChunks(
        transcript,
        teacherId,
        schoolId,
        undefined,
        limit * 3 // Obtener más chunks para agrupar por documento
      );

      // Agrupar por documento y calcular similitud promedio
      const documentMap = new Map<string, {
        document: any;
        similarities: number[];
        chunks: number;
      }>();

      relevantChunks.forEach(result => {
        const docId = result.document.id;
        if (!documentMap.has(docId)) {
          documentMap.set(docId, {
            document: result.document,
            similarities: [],
            chunks: 0
          });
        }

        const docData = documentMap.get(docId)!;
        docData.similarities.push(result.similarity);
        docData.chunks++;
      });

      // Calcular similitud promedio y ordenar
      const similarDocuments = Array.from(documentMap.values())
        .map(data => ({
          document: data.document,
          similarity: data.similarities.reduce((a, b) => a + b, 0) / data.similarities.length,
          relevantChunks: data.chunks
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return similarDocuments;

    } catch (error) {
      console.error('Error buscando documentos similares:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas del centro de conocimiento
   */
  async getKnowledgeCenterStats(teacherId?: string, schoolId?: string): Promise<{
    totalDocuments: number;
    vectorizedDocuments: number;
    totalChunks: number;
    categories: Array<{ category: string; count: number }>;
  }> {
    try {
      const whereClause: any = {};
      if (teacherId) whereClause.teacherId = teacherId;
      if (schoolId) whereClause.schoolId = schoolId;

      const [totalDocuments, vectorizedDocuments, totalChunks, categoryStats] = await Promise.all([
        prisma.document.count({ where: whereClause }),
        prisma.document.count({ 
          where: { ...whereClause, status: 'VECTORIZED' } 
        }),
        prisma.documentVector.count({
          where: {
            document: whereClause
          }
        }),
        prisma.document.groupBy({
          by: ['category'],
          where: whereClause,
          _count: { category: true }
        })
      ]);

      const categories = categoryStats.map(stat => ({
        category: stat.category || 'Sin categoría',
        count: stat._count.category
      }));

      return {
        totalDocuments,
        vectorizedDocuments,
        totalChunks,
        categories
      };

    } catch (error) {
      console.error('Error obteniendo estadísticas del centro de conocimiento:', error);
      throw error;
    }
  }
}

export default new RAGService();
