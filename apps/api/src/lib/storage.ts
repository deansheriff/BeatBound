import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.S3_ENDPOINT!,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
});

const BUCKET = process.env.S3_BUCKET!;
const CDN_URL = process.env.CDN_URL || process.env.S3_ENDPOINT;

export const storage = {
    // Generate a presigned URL for direct upload from client
    async getUploadUrl(key: string, contentType: string, expiresIn: number = 3600) {
        const command = new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            ContentType: contentType,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
        return {
            uploadUrl: signedUrl,
            key,
            publicUrl: `${CDN_URL}/${BUCKET}/${key}`,
        };
    },

    // Generate a presigned URL for downloading/viewing
    async getDownloadUrl(key: string, expiresIn: number = 3600) {
        const command = new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
        });

        return getSignedUrl(s3Client, command, { expiresIn });
    },

    // Get the public CDN URL for a file
    getPublicUrl(key: string) {
        return `${CDN_URL}/${BUCKET}/${key}`;
    },

    // Delete a file
    async deleteFile(key: string) {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: key,
        });

        return s3Client.send(command);
    },

    // Generate unique keys for different file types
    generateKey(type: 'beat' | 'video' | 'thumbnail' | 'avatar', userId: string, filename: string) {
        const timestamp = Date.now();
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

        switch (type) {
            case 'beat':
                return `beats/${userId}/${timestamp}-${sanitizedFilename}`;
            case 'video':
                return `videos/${userId}/${timestamp}-${sanitizedFilename}`;
            case 'thumbnail':
                return `thumbnails/${userId}/${timestamp}-${sanitizedFilename}`;
            case 'avatar':
                return `avatars/${userId}/${timestamp}-${sanitizedFilename}`;
            default:
                return `uploads/${userId}/${timestamp}-${sanitizedFilename}`;
        }
    },
};
