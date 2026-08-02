import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryStorageService } from './cloudinary.service';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';

@ApiTags('Uploads')
@Controller('upload')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryStorageService) {}

  @Post()
  @ApiOperation({ summary: 'Public: Upload an image or document to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'Optional folder name (e.g., prescriptions, documents, stores)',
          example: 'prescriptions'
        }
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    
    try {
      const targetFolder = folder || 'general';
      const result = await this.cloudinaryService.uploadImage(file, targetFolder);
      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        folder: targetFolder
      };
    } catch (error) {
      throw new BadRequestException('Failed to upload file');
    }
  }
}
