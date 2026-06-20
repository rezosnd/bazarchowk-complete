import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryStorageService } from './cloudinary.service';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';

@ApiTags('Uploads')
@Controller('upload')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryStorageService) {}

  @Post()
  @ApiOperation({ summary: 'Public: Upload an image to Cloudinary and get the secure URL' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    
    try {
      const result = await this.cloudinaryService.uploadImage(file, 'general');
      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
      };
    } catch (error) {
      throw new BadRequestException('Failed to upload image');
    }
  }
}
