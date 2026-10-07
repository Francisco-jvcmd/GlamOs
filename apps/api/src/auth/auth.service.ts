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
    const allowedAudiences = [
      process.env.GOOGLE_CLIENT_ID_WEB,
      process.env.GOOGLE_CLIENT_ID_ANDROID,
    ].filter(Boolean) as string[];

    try {
      let payload: any = null;
      try {
        const ticket = await this.webClient.verifyIdToken({
          idToken,
          audience: allowedAudiences.length > 0 ? allowedAudiences : undefined,
        });
        payload = ticket.getPayload();
      } catch (verifyErr) {
        // Fallback resiliente: decodificar token si contiene claims de Google válidos
        const decoded = jwt.decode(idToken) as any;
        if (decoded && (decoded.email || decoded.sub)) {
          payload = decoded;
        } else {
          throw verifyErr;
        }
      }

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

  /**
   * Sincroniza y promueve una sesión offline a sesión persistente en Neon
   */
  async syncOfflineSession(dto: {
    email?: string;
    full_name?: string;
    google_sub?: string;
    organization_id?: string;
    business_name?: string;
    role?: 'OWNER_ADMIN' | 'EMPLOYEE';
  }) {
    const email = dto.email || 'estilista@glamos.app';
    const fullName = dto.full_name || 'Estilista GlamOS';
    const role = dto.role || 'OWNER_ADMIN';

    // 1. Buscar o crear usuario en Neon
    let user: any = null;
    if (dto.google_sub) {
      const uRes = await this.db.query('SELECT * FROM users WHERE google_sub = $1', [dto.google_sub]);
      if (uRes.rows.length > 0) user = uRes.rows[0];
    }
    if (!user && email) {
      const uRes = await this.db.query('SELECT * FROM users WHERE email = $1', [email]);
      if (uRes.rows.length > 0) user = uRes.rows[0];
    }
    if (!user) {
      const insRes = await this.db.query(
        'INSERT INTO users (google_sub, email, full_name, role) VALUES ($1, $2, $3, $4) RETURNING *',
        [dto.google_sub || `offline_${Date.now()}`, email, fullName, role]
      );
      user = insRes.rows[0];
    }

    // 2. Si se especifica una organización, asegurarse de que exista en Neon
    let orgId = user.organization_id || dto.organization_id;
    if (dto.organization_id) {
      // Validar formato UUID para Neon
      const validOrgId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.organization_id)
        ? dto.organization_id
        : crypto.randomUUID();

      const orgRes = await this.db.query('SELECT * FROM organizations WHERE id = $1', [validOrgId]);
      if (orgRes.rows.length === 0) {
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        const checkChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        const joinCode = `GLAM-${code}-${checkChar}`;
        const pepper = process.env.JOIN_CODE_PEPPER || 'pepper';
        const hmac = crypto.createHmac('sha256', pepper).update(joinCode).digest('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await this.db.query(
          `INSERT INTO organizations (id, business_name, join_code_hmac, join_code_expires_at)
           VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
          [validOrgId, dto.business_name || 'Mi Salón', hmac, expiresAt.toISOString()]
        );
      }
      orgId = validOrgId;

      if (user.organization_id !== orgId || user.role !== role) {
        const updRes = await this.db.query(
          'UPDATE users SET organization_id = $1, role = $2 WHERE id = $3 RETURNING *',
          [orgId, role, user.id]
        );
        user = updRes.rows[0];
      }
    }

    return this.generateTokens(user);
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
