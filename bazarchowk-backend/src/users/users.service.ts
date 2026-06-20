import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        isActive: true,
        isGuest: true,
        languagePref: true,
        kycStatus: true,
        referralCode: true,
        role: {
          include: {
            permissions: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        languagePref: true,
        kycStatus: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async deleteAccount(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        email: `deleted_${userId}@bazarchowk.local`,
        phone: `deleted_${userId}`
      }
    });
  }

  async updateKycStatus(userId: string, status: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: status }
    });
  }
}
