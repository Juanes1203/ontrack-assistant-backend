-- Migración para agregar soporte de pgvector
-- Ejecutar en tu base de datos PostgreSQL

-- 1. Habilitar la extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Agregar columna embedding a document_vectors (si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_vectors' 
        AND column_name = 'embedding'
    ) THEN
        ALTER TABLE document_vectors 
        ADD COLUMN embedding vector(1536);
    END IF;
END $$;

-- 3. Crear índice HNSW para búsqueda rápida (opcional pero recomendado)
-- HNSW es más rápido que IVFFlat para datasets medianos
CREATE INDEX IF NOT EXISTS document_vectors_embedding_idx 
ON document_vectors 
USING hnsw (embedding vector_cosine_ops);

-- Nota: Para datasets muy grandes (>1M vectores), considera IVFFlat:
-- CREATE INDEX document_vectors_embedding_idx 
-- ON document_vectors 
-- USING ivfflat (embedding vector_cosine_ops) 
-- WITH (lists = 100);

-- 4. Verificar la instalación
SELECT 
    extname as extension_name, 
    extversion as version 
FROM pg_extension 
WHERE extname = 'vector';

-- Si ves 'vector' en el resultado, ¡todo está listo! 🎉

