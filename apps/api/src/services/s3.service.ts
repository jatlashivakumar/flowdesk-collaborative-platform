import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { randomUUID } from 'crypto';

const s3 = new S3Client({
  region: env.AWS_REGION ?? 'ap-south-1',
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? '',
  },
});

const BUCKET = env.AWS_S3_BUCKET ?? 'flowdesk-uploads';

export const s3Service = {
  async uploadFile(buffer: Buffer, mimeType: string, folder = 'attachments'): Promise<string> {
    const key = `${folder}/${randomUUID()}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );
    return `https://${BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
  },

  async deleteFile(url: string): Promise<void> {
    const key = url.split('.amazonaws.com/')[1];
    if (!key) return;
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  },

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({ Bucket: BUCKET, Key: key });
    return getSignedUrl(s3, command, { expiresIn });
  },
};
