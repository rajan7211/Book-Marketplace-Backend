import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY } from './cloudinary.provider';

/**
 * Reusable Cloudinary operations.
 * Today: extract public IDs from URLs + delete images.
 * Tomorrow: add upload (if you ever need to upload outside Multer's pipeline).
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(@Inject(CLOUDINARY) private readonly cloudinarySdk: typeof cloudinary) {}

  /** True only if Cloudinary credentials are set (so the SDK is actually configured). */
  isConfigured(): boolean {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    return Boolean(cloudName && apiKey && apiSecret);
  }

  /**
   * Extract the Cloudinary public_id from a stored image URL
   */
  extractPublicId(url: string): string | null {
    if (!url) return null;
    // Pattern: .../upload/(v{number}/)?(publicId).(ext)
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i);
    return match ? match[1] : null;
  }

//  Delete a Cloudinary image by its URL or public_id. 
  async deleteImage(urlOrPublicId: string): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn(
        'Cloudinary not configured — skipping deleteImage()',
      );
      return;
    }
    const publicId = urlOrPublicId.includes('http')
      ? this.extractPublicId(urlOrPublicId)
      : urlOrPublicId;
    if (!publicId) {
      this.logger.warn(`Could not extract public_id from: ${urlOrPublicId}`);
      return;
    }
    try {
      await this.cloudinarySdk.uploader.destroy(publicId);
    } catch (err) {
      this.logger.error(`Failed to delete Cloudinary image: ${publicId}`, err as Error);
    }
  }
}
