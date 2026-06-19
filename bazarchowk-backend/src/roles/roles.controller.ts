import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('RBAC - Roles & Permissions')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new custom role' })
  createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.createRole(createRoleDto);
  }

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all roles and their permissions' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Patch('assign/:userId')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Assign a role to a user' })
  assignRole(@Param('userId') userId: string, @Body('roleName') roleName: string) {
    return this.rolesService.assignRole(userId, roleName);
  }

  @Get('permissions')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all system permissions' })
  getAllPermissions() {
    return this.rolesService.getAllPermissions();
  }

  @Post('permissions')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Register a new permission block' })
  createPermission(@Body('action') action: string, @Body('description') description: string) {
    return this.rolesService.createPermission(action, description);
  }
}
