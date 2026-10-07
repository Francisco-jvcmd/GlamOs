import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleAuth(@Body() body: { id_token: string, platform: 'web' | 'android' }) {
    if (!body.id_token || !body.platform) throw new UnauthorizedException('Missing parameters');
    return this.authService.authenticateWithGoogle(body.id_token, body.platform);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refresh_token: string }) {
    if (!body.refresh_token) throw new UnauthorizedException('Missing refresh_token');
    return this.authService.refreshTokens(body.refresh_token);
  }

  @Public()
  @Post('sync-session')
  @HttpCode(HttpStatus.OK)
  async syncSession(
    @Body()
    body: {
      email?: string;
      full_name?: string;
      google_sub?: string;
      organization_id?: string;
      business_name?: string;
      role?: 'OWNER_ADMIN' | 'EMPLOYEE';
    },
  ) {
    return this.authService.syncOfflineSession(body);
  }
}
