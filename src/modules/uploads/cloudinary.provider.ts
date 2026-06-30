import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

/** Injection token used to grab the configured cloudinary SDK. */
export const CLOUDINARY = 'CLOUDINARY';

/**
 * Provider that configures the Cloudinary
 */
export const CloudinaryProvider = {
  provide: CLOUDINARY,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const cloudName = config.get<string>('cloudinary.cloudName');
    const apiKey = config.get<string>('cloudinary.apiKey');
    const apiSecret = config.get<string>('cloudinary.apiSecret');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    }
    return cloudinary;
  },
};