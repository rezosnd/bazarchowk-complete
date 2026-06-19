import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'Home' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: '123 Main St' })
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Apt 4B' })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiPropertyOptional({ example: 'Near the park' })
  @IsString()
  @IsOptional()
  landmark?: string;

  @ApiProperty({ example: 'Kolkata' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'West Bengal' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '700001' })
  @IsString()
  @IsNotEmpty()
  pincode: string;

  @ApiProperty({ example: 22.5726 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 88.3639 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
