import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryProvider, CLOUDINARY } from './cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';


//  Global Uploads Module

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryProvider, CloudinaryService],
})
export class UploadsModule {}

// Re-export the token so other modules can inject it without importing the provider
export { CLOUDINARY };
