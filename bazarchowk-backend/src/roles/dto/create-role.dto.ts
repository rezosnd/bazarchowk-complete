import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'MARKETING_MANAGER' })
  @IsString()
  name: string;

  @ApiProperty({ example: ['perm-uuid-1', 'perm-uuid-2'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionIds?: string[];
}
