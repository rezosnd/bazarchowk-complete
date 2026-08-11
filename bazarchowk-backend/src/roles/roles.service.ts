import { Injectable, OnModuleInit, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultRoles();
  }

  // Auto-seed the roles defined in the Architecture
  private async seedDefaultRoles() {
    const defaultRoles = [
      'CUSTOMER',
      'SHOP_OWNER',
      'SHOP_STAFF',
      'DELIVERY_PARTNER',
      'FARMER',
      'RECRUITER',
      'SUPPORT_AGENT',
      'MARKET_ADMIN',
      'DISTRICT_ADMIN',
      'ADMIN',
      'SUPER_ADMIN'
    ];

    for (const roleName of defaultRoles) {
      await this.prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });
    }
  }

  async createRole(createRoleDto: CreateRoleDto) {
    const exists = await this.prisma.role.findUnique({ where: { name: createRoleDto.name } });
    if (exists) throw new ConflictException('Role already exists');

    return this.prisma.role.create({
      data: {
        name: createRoleDto.name,
        permissions: {
          connect: createRoleDto.permissionIds?.map(id => ({ id })) || []
        }
      }
    });
  }

  async findAll() {
    return this.prisma.role.findMany({ include: { permissions: true } });
  }

  async assignRole(userId: string, roleName: string) {
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: { roleId: role.id },
      include: { role: true }
    });
  }

  async getAllPermissions() {
    return this.prisma.permission.findMany();
  }

  async createPermission(action: string, description?: string) {
    return this.prisma.permission.upsert({
      where: { action },
      update: { description },
      create: { action, description }
    });
  }
}
