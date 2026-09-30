import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuthService } from '../auth/auth.service';
import * as crypto from 'crypto';

@Injectable()
export class TenantsService {
  constructor(private db: DatabaseService, private authService: AuthService) {}

  async createTenant(userId: string, businessName: string) {
    const userRes = await this.db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];
    if (user.organization_id) {
      throw new BadRequestException('User already belongs to an organization');
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const checkChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const joinCode = `GLAM-${code}-${checkChar}`;

    const pepper = process.env.JOIN_CODE_PEPPER || 'pepper';
    const hmac = crypto.createHmac('sha256', pepper).update(joinCode).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const res = await this.db.query(
      `INSERT INTO organizations (business_name, join_code_hmac, join_code_expires_at)
       VALUES ($1, $2, $3) RETURNING id`,
      [businessName, hmac, expiresAt.toISOString()]
    );
    const orgId = res.rows[0].id;

    await this.db.query(
      "UPDATE users SET organization_id = $1, role = 'OWNER_ADMIN' WHERE id = $2",
      [orgId, userId]
    );

    return { organization_id: orgId, join_code: joinCode };
  }

  async joinTenant(userId: string, joinCode: string) {
    const userRes = await this.db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];
    if (user.organization_id) {
      throw new BadRequestException('User already belongs to an organization');
    }

    const pepper = process.env.JOIN_CODE_PEPPER || 'pepper';
    const hmac = crypto.createHmac('sha256', pepper).update(joinCode).digest('hex');

    const orgRes = await this.db.query(
      'SELECT * FROM organizations WHERE join_code_hmac = $1',
      [hmac],
    );
    if (orgRes.rows.length === 0) {
      throw new BadRequestException('Invalid join code');
    }
    const org = orgRes.rows[0];

    // Check expiration
    if (org.join_code_expires_at && new Date(org.join_code_expires_at) < new Date()) {
      throw new BadRequestException('Join code has expired');
    }

    await this.db.query(
      "UPDATE users SET organization_id = $1, role = 'EMPLOYEE' WHERE id = $2",
      [org.id, userId]
    );

    const updatedUserRes = await this.db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const tokens = await (this.authService as any).generateTokens(updatedUserRes.rows[0]);
    return tokens;
  }
}
