import { Client as MinioClient } from 'minio';
import dotenv from 'dotenv';

dotenv.config();

const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
const port = parseInt(process.env.MINIO_PORT || '9000', 10);
const useSSL = process.env.MINIO_USE_SSL === 'true';
const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';

export const MINIO_BUCKET = process.env.MINIO_BUCKET || 'dcn-files';

export const minioClient = new MinioClient({
  endPoint: endpoint,
  port: port,
  useSSL: useSSL,
  accessKey: accessKey,
  secretKey: secretKey,
});

let isBucketReady = false;

/**
 * Garante que o bucket configurado existe no MinIO ao inicializar
 */
export async function initMinio(): Promise<boolean> {
  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');
      console.log(`[MinIO] Bucket "${MINIO_BUCKET}" criado com sucesso.`);
    } else {
      console.log(`[MinIO] Conectado ao bucket "${MINIO_BUCKET}".`);
    }
    isBucketReady = true;
    return true;
  } catch (error: any) {
    console.warn(
      `[MinIO] Aviso: Não foi possível conectar ao MinIO em ${endpoint}:${port} (${error.message}). O sistema continuará em modo de fallback.`
    );
    isBucketReady = false;
    return false;
  }
}

/**
 * Envia um buffer de arquivo para o MinIO
 */
export async function uploadFileToMinio(
  objectKey: string,
  buffer: Buffer,
  size: number,
  mimeType: string
): Promise<{ success: boolean; objectKey: string; error?: string }> {
  try {
    if (!isBucketReady) {
      await initMinio();
    }

    await minioClient.putObject(MINIO_BUCKET, objectKey, buffer, size, {
      'Content-Type': mimeType,
    });

    return { success: true, objectKey };
  } catch (error: any) {
    console.error(`[MinIO] Erro ao enviar objeto ${objectKey}:`, error);
    throw error;
  }
}

/**
 * Obtém stream de leitura de um arquivo armazenado no MinIO
 */
export async function getFileStreamFromMinio(objectKey: string) {
  return await minioClient.getObject(MINIO_BUCKET, objectKey);
}

/**
 * Obtém metadados do arquivo (tamanho, tipo MIME)
 */
export async function getFileStatFromMinio(objectKey: string) {
  return await minioClient.statObject(MINIO_BUCKET, objectKey);
}

/**
 * Remove um arquivo do MinIO
 */
export async function deleteFileFromMinio(objectKey: string): Promise<boolean> {
  try {
    await minioClient.removeObject(MINIO_BUCKET, objectKey);
    return true;
  } catch (error: any) {
    console.error(`[MinIO] Erro ao remover objeto ${objectKey}:`, error);
    return false;
  }
}

/**
 * Gera URL pré-assinada direta do MinIO (opcional, se acesso direto for desejado)
 */
export async function getPresignedUrl(objectKey: string, expirySeconds = 86400): Promise<string> {
  return await minioClient.presignedGetObject(MINIO_BUCKET, objectKey, expirySeconds);
}
