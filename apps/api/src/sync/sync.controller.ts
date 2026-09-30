import { Controller, Post, Body, ForbiddenException } from '@nestjs/common';
import { SyncService } from './sync.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('sync')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('pull')
  async pull(@CurrentUser() user: any, @Body() body: { collection: string, checkpoint: any, limit: number }) {
    if (!user.org) throw new ForbiddenException('No organization');
    return this.syncService.pull(user.org, user.role, body.collection, body.checkpoint, body.limit);
  }

  @Post('push')
  async push(@CurrentUser() user: any, @Body() body: { collection: string, writes: any[] }) {
    if (!user.org) throw new ForbiddenException('No organization');
    return this.syncService.push(user.org, body.collection, body.writes);
  }
}
