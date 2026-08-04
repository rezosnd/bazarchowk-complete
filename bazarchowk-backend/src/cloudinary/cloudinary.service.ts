import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryStorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.error('Cloudinary configuration is missing from environment variables');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  async uploadImage(file: Express.Multer.File, folder: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      if (!file) {
        return reject(new Error('No file provided'));
      }
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error || !result) {
            this.logger.error('Cloudinary upload failed:', error);
            return reject(new InternalServerErrorException('Image upload failed'));
          }
          resolve(result);
        }
      );
      
      const stream = new Readable();
      stream.push(file.buffer);
      stream.push(null);
      stream.pipe(uploadStream);
    });
  }

  async uploadFile(buffer: Buffer, folder: string, filename: string, resourceType: 'raw' | 'video' | 'auto' = 'raw'): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      if (!buffer) {
        return reject(new Error('No buffer provided'));
      }
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: resourceType, public_id: filename },
        (error, result) => {
          if (error || !result) {
            this.logger.error('Cloudinary raw upload failed:', error);
            return reject(new InternalServerErrorException('File upload failed'));
          }
          resolve(result);
        }
      );
      
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);
      stream.pipe(uploadStream);
    });
  }

  async listFiles(folder: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      cloudinary.api.resources(
        { type: 'upload', prefix: `${folder}/`, max_results: 100, resource_type: 'raw' },
        (error, result) => {
          if (error) {
            this.logger.error('Failed to list files from Cloudinary:', error);
            return reject(new InternalServerErrorException('Failed to list files'));
          }
          resolve(result.resources || []);
        }
      );
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      this.logger.error(`Failed to delete image ${publicId} from Cloudinary:`, error);
      throw new InternalServerErrorException('Image deletion failed');
    }
  }

  generateOptimizedUrl(publicId: string, options: any = {}): string {
    return cloudinary.url(publicId, {
      fetch_format: 'auto',
      quality: 'auto',
      ...options,
    });
  }

  async uploadProductImage(file: Express.Multer.File): Promise<UploadApiResponse> {
    return this.uploadImage(file, 'products');
  }

  async uploadStoreLogo(file: Express.Multer.File): Promise<UploadApiResponse> {
    return this.uploadImage(file, 'stores');
  }

  async uploadCategoryBanner(file: Express.Multer.File): Promise<UploadApiResponse> {
    return this.uploadImage(file, 'categories');
  }

  async uploadUserProfilePhoto(file: Express.Multer.File): Promise<UploadApiResponse> {
    return this.uploadImage(file, 'profiles');
  }

  async uploadSupportAttachment(file: Express.Multer.File): Promise<UploadApiResponse> {
    return this.uploadImage(file, 'support');
  }
}
