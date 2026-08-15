import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { CreateShopDto } from './create-shop.dto';

export class UpdateShopDto extends PartialType(CreateShopDto) {
  @IsOptional()
  @IsBoolean()
  hasProducts?: boolean;

  @IsOptional()
  @IsBoolean()
  hasServices?: boolean;

  @IsOptional()
  @IsString()
  upiId?: string;
}
