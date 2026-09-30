import { Controller, Get, Post, Body, ForbiddenException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get('birthdays')
  async getBirthdays(@CurrentUser() user: any) {
    if (!user.org) throw new ForbiddenException('No organization');
    return this.clientsService.getBirthdays(user.org, user.role);
  }

  @Post()
  async createClient(@CurrentUser() user: any, @Body() body: any) {
    if (!user.org) throw new ForbiddenException('No organization');
    return this.clientsService.createClient(user.org, body);
  }
}
