import { IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShopDocumentDto {
  @ApiProperty({ example: 'FSSAI', description: 'Type of document (e.g. FSSAI, GST, AADHAAR)' })
  @IsString()
  documentType: string;

  @ApiProperty({ description: 'URL to the uploaded document' })
  @IsUrl()
  documentUrl: string;
}
