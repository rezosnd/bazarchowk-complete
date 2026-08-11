import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCountryDto {
  @ApiProperty({ example: 'India' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'IN' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class BootstrapGeoDto {
  @ApiProperty({ example: 'India' })
  @IsString()
  countryName: string;

  @ApiProperty({ example: 'Bihar' })
  @IsString()
  stateName: string;

  @ApiProperty({ example: 'Vaishali' })
  @IsString()
  districtName: string;

  @ApiProperty({ example: 'Desari' })
  @IsString()
  cityName: string;

  @ApiProperty({ example: 'Desari Main' })
  @IsString()
  villageName: string;

  @ApiProperty({ example: '844504' })
  @IsString()
  pincode: string;
}

export class CreateStateDto {
  @ApiProperty({ example: 'country-uuid' })
  @IsString()
  @IsNotEmpty()
  countryId: string;

  @ApiProperty({ example: 'Jharkhand' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'JH' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class CreateDistrictDto {
  @ApiProperty({ example: 'state-uuid' })
  @IsString()
  @IsNotEmpty()
  stateId: string;

  @ApiProperty({ example: 'Dhanbad' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateCityDto {
  @ApiProperty({ example: 'district-uuid' })
  @IsString()
  @IsNotEmpty()
  districtId: string;

  @ApiProperty({ example: 'Dhanbad City' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '826001' })
  @IsString()
  @IsOptional()
  pincode?: string;
}

export class CreateVillageDto {
  @ApiProperty({ example: 'city-uuid' })
  @IsString()
  @IsNotEmpty()
  cityId: string;

  @ApiProperty({ example: 'Bhuli' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '828104' })
  @IsString()
  @IsNotEmpty()
  pincode: string;

  @ApiPropertyOptional({ example: 23.8143 })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 86.4190 })
  @IsNumber()
  @IsOptional()
  longitude?: number;
}

export class CreateMarketDto {
  @ApiProperty({ example: 'village-uuid' })
  @IsString()
  @IsNotEmpty()
  villageId: string;

  @ApiProperty({ example: 'Bhuli Main Market' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Largest local vegetable and grocery hub' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 23.8143 })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ example: 86.4190 })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @ApiPropertyOptional({ example: 5.0 })
  @IsNumber()
  @IsOptional()
  radiusKm?: number;
}
