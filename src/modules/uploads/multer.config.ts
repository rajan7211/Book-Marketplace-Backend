import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { BadRequestException } from '@nestjs/common';

/**
 * Multer config for book cover uploads.
 * - Storage: CloudinaryStorage
 * - File filter: only jpg/jpeg/png/webp accepted
 * - Limits: 5MB max
 */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'book-marketplace/covers',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 1200, crop: 'limit' }],
  } as any,
});

export const multerConfig = {
  storage,
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    cb: (err: Error | null, accept: boolean) => void,
  ) => {
    // Only allow image MIME types
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      return cb(
        new BadRequestException(
          'Only JPG, JPEG, PNG, and WEBP image files are allowed',
        ),
        false,
      );
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};
