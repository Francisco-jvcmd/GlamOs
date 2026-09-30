import { Controller, Post, Body } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Post('create')
  async create(@CurrentUser() user: any, @Body() body: { name: string }) {
    return this.tenantsService.createTenant(user.sub, body.name || 'New Salon');
  }

  @Post('join')
  async join(@CurrentUser() user: any, @Body() body: { join_code: string }) {
    return this.tenantsService.joinTenant(user.sub, body.join_code);
  }
}
