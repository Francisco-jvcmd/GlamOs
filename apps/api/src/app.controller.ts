import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { DatabaseService } from './database/database.service';

@Controller()
export class AppController {
  constructor(private db: DatabaseService) {}

  @Public()
  @Get()
  getRoot() {
    return {
      app: 'GlamOS API',
      status: 'online',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health')
  async getHealth() {
    let dbStatus = 'ok';
    try {
      await this.db.query('SELECT 1');
    } catch (e: any) {
      dbStatus = 'error: ' + (e?.message || 'unknown');
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
