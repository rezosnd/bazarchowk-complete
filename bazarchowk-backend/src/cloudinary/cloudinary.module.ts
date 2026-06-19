import { Module } from '@nestjs/common';
import { CloudinaryStorageService } from './cloudinary.service';

@Module({
  providers: [CloudinaryStorageService],
  exports: [CloudinaryStorageService],
})
export class CloudinaryModule {}
