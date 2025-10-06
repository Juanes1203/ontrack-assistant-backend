import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentUploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface DocumentMetadata {
  key: string;
  size: number;
  lastModified: Date;
  contentType: string;
}

class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private documentsPrefix: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    this.bucketName = process.env.S3_BUCKET_NAME!;
    this.documentsPrefix = process.env.S3_DOCUMENTS_PREFIX || 'documents/';
  }

  /**
   * Sube un documento al bucket de S3
   */
  async uploadDocument(
    file: Express.Multer.File,
    teacherId: string,
    category?: string
  ): Promise<DocumentUploadResult> {
    try {
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      
      // Organizar por profesor y categoría: documents/teacherId/category/filename
      const categoryFolder = category || 'general';
      const key = `${this.documentsPrefix}${teacherId}/${categoryFolder}/${fileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      // Generar URL firmada para acceso temporal
      const url = await this.getSignedUrl(key, 3600); // 1 hora

      return {
        key,
        url,
        size: file.size,
        contentType: file.mimetype,
      };
    } catch (error) {
      console.error('Error uploading document to S3:', error);
      throw new Error('Failed to upload document to S3');
    }
  }

  /**
   * Obtiene una URL firmada para descargar un documento
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  /**
   * Elimina un documento del bucket de S3
   */
  async deleteDocument(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting document from S3:', error);
      throw new Error('Failed to delete document from S3');
    }
  }

  /**
   * Lista todos los documentos de un profesor específico
   */
  async listDocumentsByTeacher(teacherId: string, category?: string): Promise<DocumentMetadata[]> {
    try {
      const categoryFolder = category ? `/${category}` : '';
      const prefix = `${this.documentsPrefix}${teacherId}${categoryFolder}/`;
      
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const response = await this.s3Client.send(command);
      
      return (response.Contents || []).map(obj => ({
        key: obj.Key!,
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        contentType: obj.Key?.includes('.pdf') ? 'application/pdf' : 
                    obj.Key?.includes('.doc') ? 'application/msword' :
                    obj.Key?.includes('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                    'application/octet-stream',
      }));
    } catch (error) {
      console.error('Error listing documents from S3:', error);
      throw new Error('Failed to list documents from S3');
    }
  }

  /**
   * Obtiene metadatos de un documento específico
   */
  async getDocumentMetadata(key: string): Promise<DocumentMetadata | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response) return null;

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType || 'application/octet-stream',
      };
    } catch (error) {
      console.error('Error getting document metadata:', error);
      return null;
    }
  }

  /**
   * Verifica si un documento existe en S3
   */
  async documentExists(key: string): Promise<boolean> {
    try {
      const metadata = await this.getDocumentMetadata(key);
      return metadata !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtiene el buffer de un documento desde S3
   */
  async getDocumentBuffer(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Documento no encontrado en S3');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Error obteniendo documento desde S3:', error);
      throw new Error('Error al obtener documento desde S3');
    }
  }
}

export default new S3Service();
