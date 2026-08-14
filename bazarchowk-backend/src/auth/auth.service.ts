import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(registerDto.password, salt);

    let customerRole = await this.prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
    if (!customerRole) {
      customerRole = await this.prisma.role.create({ data: { name: 'CUSTOMER' } });
    }

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phone: registerDto.phone,
        roleId: customerRole.id,
      },
    });

    await this.notificationsService.sendInAppNotification(user.id, 'Welcome to BazarChowk!', `Hi ${user.firstName}, welcome to BazarChowk!`, 'SYSTEM');
    if (user.email) {
      await this.emailService.sendWelcomeEmail(user.email, user.firstName || 'User').catch(e => console.error('Email error:', e));
    }

    const tokens = await this.generateTokens(user.id);
    return {
      ...tokens,
      id: user.id, // For backward compatibility with the admin panel expectation
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, roleId: user.roleId },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id);
  }

  async googleLogin(req: any) {
    if (!req.user) {
      throw new UnauthorizedException('No user from google');
    }
    
    const { email, firstName, lastName, avatarUrl, googleId } = req.user;
    
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email }
        ]
      }
    });

    if (!user) {
      const state = req.query?.state || '';
      let roleName = 'CUSTOMER';
      if (state.includes('partner')) roleName = 'SHOP_OWNER';
      else if (state.includes('rider')) roleName = 'RIDER';
      
      if (email === 'rehansuman41008@gmail.com' || email === 'rehansuma41008@gmail.com') {
        roleName = 'SUPER_ADMIN';
      }

      let role = await this.prisma.role.findUnique({ where: { name: roleName } });
      if (!role) {
        role = await this.prisma.role.create({ data: { name: roleName } });
      }

      user = await this.prisma.user.create({
        data: {
          email,
          googleId,
          firstName,
          lastName,
          avatarUrl,
          roleId: role.id,
        }
      });
      await this.notificationsService.sendInAppNotification(user.id, 'Welcome to BazarChowk!', `Hi ${user.firstName}, welcome to BazarChowk!`, 'SYSTEM');
      if (user.email) {
        await this.emailService.sendWelcomeEmail(user.email, user.firstName || 'User').catch(e => console.error('Email error:', e));
      }
    } else {
      // Force upgrade to SUPER_ADMIN if email matches, even if they already existed as a CUSTOMER
      if (email === 'rehansuman41008@gmail.com' || email === 'rehansuma41008@gmail.com') {
        let adminRole = await this.prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
        if (!adminRole) {
           adminRole = await this.prisma.role.create({ data: { name: 'SUPER_ADMIN' } });
        }
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { roleId: adminRole.id, googleId: googleId || user.googleId }
        });
      } else if (!user.googleId) {
        // Link Google ID if user already exists with this email but no googleId
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId }
        });
      }
    }

    return this.generateTokens(user.id);
  }

  async guestLogin(deviceId: string) {
    let customerRole = await this.prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
    if (!customerRole) {
      customerRole = await this.prisma.role.create({ data: { name: 'CUSTOMER' } });
    }

    // Creating a new temporary guest user
    const guestUser = await this.prisma.user.create({
      data: {
        isGuest: true,
        firstName: 'Guest',
        roleId: customerRole.id,
      },
    });

    return this.generateTokens(guestUser.id);
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session || session.userId !== userId || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return this.generateTokens(userId);
  }

  async logout(userId: string, refreshToken: string) {
    await this.prisma.session.delete({
      where: { refreshToken },
    });
    return { message: 'Logged out successfully' };
  }

  private async generateTokens(userId: string) {
    const accessToken = this.jwtService.sign({ sub: userId }, { expiresIn: '7d' });
    const refreshToken = this.jwtService.sign({ sub: userId }, { expiresIn: '7d' });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
