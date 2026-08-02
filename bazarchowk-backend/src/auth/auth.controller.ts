import { Controller, Post, Body, UseGuards, Get, Req, Request, Res, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@Injectable()
export class GoogleAdminGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    return {
      state: 'admin',
    };
  }
}

@Injectable()
export class GoogleDynamicGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    return {
      state: req.query.redirectUri || 'bazarchowk://auth',
    };
  }
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('guest-login')
  @ApiOperation({ summary: 'Login as a guest user' })
  @ApiResponse({ status: 200, description: 'Guest session created' })
  guestLogin(@Body('deviceId') deviceId: string) {
    return this.authService.guestLogin(deviceId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@CurrentUser() user: any, @Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(user.id, refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  logout(@CurrentUser() user: any, @Body('refreshToken') refreshToken: string) {
    return this.authService.logout(user.id, refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: any) {
    return user;
  }

  @Get('google')
  @UseGuards(GoogleDynamicGuard)
  @ApiOperation({ summary: 'Trigger Google OAuth flow' })
  async googleAuth(@Req() req: any) {
    // Initiates the Google OAuth flow
  }

  @Get('google/admin')
  @UseGuards(GoogleAdminGuard)
  @ApiOperation({ summary: 'Trigger Google OAuth flow for Admin' })
  async googleAuthAdmin(@Req() req: any) {
    // Initiates the Google OAuth flow with state=admin
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback handler' })
  async googleAuthRedirect(@Req() req: any, @Res() res: any) {
    const tokens = await this.authService.googleLogin(req);
    
    // Redirect to Admin Panel if state indicates admin login
    if (req.query.state === 'admin') {
      const adminUrl = process.env.ADMIN_URL || 'http://localhost:3000';
      return res.redirect(`${adminUrl}/login?token=${tokens.accessToken}`);
    }
    
    const redirectUri = req.query.state || 'bazarchowk://auth';
    
    // Redirect to Expo app deep link
    return res.redirect(`${redirectUri}?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
  }
}
