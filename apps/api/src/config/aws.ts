import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost, PresignedPost } from '@aws-sdk/s3-presigned-post';

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.warn('Warning: AWS credentials are not set');
}

export const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

export const S3_BUCKET = process.env.S3_BUCKET_NAME || 'beatbound-videos';
export const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;

// Generate presigned POST URL for direct browser upload
export async function generatePresignedUploadUrl(
    key: string,
    contentType: string,
    maxSizeBytes: number = 524288000 // 500MB
): Promise<PresignedPost> {
    const { url, fields } = await createPresignedPost(s3Client, {
        Bucket: S3_BUCKET,
        Key: key,
        Conditions: [
            ['content-length-range', 0, maxSizeBytes],
            ['starts-with', '$Content-Type', contentType.split('/')[0] + '/'],
        ],
        Fields: {
            'Content-Type': contentType,
        },
        Expires: 900, // 15 minutes
    });

    return { url, fields };
}

// Generate presigned GET URL for viewing
export async function generatePresignedViewUrl(
    key: string,
    expiresIn: number = 3600
): Promise<string> {
    // If CloudFront is configured, return CloudFront URL
    if (CLOUDFRONT_DOMAIN) {
        return `https://${CLOUDFRONT_DOMAIN}/${key}`;
    }

    // Otherwise, generate S3 presigned URL
    const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
}

// Delete object from S3
export async function deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
    });

    await s3Client.send(command);
}

// Generate S3 key for submissions
export function generateSubmissionKey(
    challengeId: string,
    userId: string,
    fileName: string
): string {
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `submissions/${challengeId}/${userId}/${timestamp}-${sanitizedName}`;
}

// Generate S3 key for thumbnails
export function generateThumbnailKey(submissionId: string): string {
    return `thumbnails/${submissionId}.jpg`;
}

// Generate S3 key for processed videos
export function generateProcessedVideoKey(
    submissionId: string,
    resolution: string
): string {
    return `videos/${submissionId}/${resolution}.mp4`;
}
