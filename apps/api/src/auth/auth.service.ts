import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private webClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID_WEB);
  private androidClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID_ANDROID);

  constructor(private db: DatabaseService) {}

  async authenticateWithGoogle(idToken: string, platform: 'web' | 'android') {
    const client = platform === 'web' ? this.webClient : this.androidClient;
    const clientId = platform === 'web' ? process.env.GOOGLE_CLIENT_ID_WEB : process.env.GOOGLE_CLIENT_ID_ANDROID;
    
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      if (!payload) throw new UnauthorizedException('Invalid Google token');

      const user = await this.findOrCreateUser(payload.sub, payload.email, payload.name);
      return this.generateTokens(user);
    } catch (e) {
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  private async findOrCreateUser(googleSub: string, email?: string, name?: string) {
    const res = await this.db.query('SELECT * FROM users WHERE google_sub = $1', [googleSub]);
    if (res.rows.length > 0) {
      if (!res.rows[0].is_active) throw new UnauthorizedException('User is inactive');
      return res.rows[0];
    }
    const insertRes = await this.db.query(
      'INSERT INTO users (google_sub, email, full_name, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [googleSub, email, name, 'EMPLOYEE']
    );
    return insertRes.rows[0];
  }

  async refreshTokens(refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const res = await this.db.query('SELECT * FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    if (res.rows.length === 0) throw new UnauthorizedException('Invalid refresh token');
    
    const rt = res.rows[0];
    if (rt.revoked || new Date(rt.expires_at) < new Date()) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    const userRes = await this.db.query('SELECT * FROM users WHERE id = $1', [rt.user_id]);
    const user = userRes.rows[0];
    if (!user || !user.is_active) throw new UnauthorizedException('User inactive');

    await this.db.query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [rt.id]);

    return this.generateTokens(user);
  }

  private async generateTokens(user: any) {
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, org: user.organization_id },
      process.env.JWT_ACCESS_SECRET || 'secret',
      { expiresIn: '15m' }
    );

    const refreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt.toISOString()]
    );

    return { access_token: accessToken, refresh_token: refreshToken };
  }
}
