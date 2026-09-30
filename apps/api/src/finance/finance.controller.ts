import { Controller, Get, Post, Body, Query, ForbiddenException } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('finance')
@Roles('OWNER_ADMIN')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('analytics/revenue')
  async getRevenue(@CurrentUser() user: any, @Query('date_from') dateFrom?: string, @Query('date_to') dateTo?: string) {
    if (!user.org) throw new ForbiddenException('No organization');
    return this.financeService.getRevenue(user.org, dateFrom, dateTo);
  }

  @Get('analytics/corte-caja')
  async getCorteCaja(@CurrentUser() user: any, @Query('date') date: string) {
    if (!user.org) throw new ForbiddenException('No organization');
    return this.financeService.getCorteCaja(user.org, date);
  }

  @Get('expenses')
  async getExpenses(@CurrentUser() user: any) {
    if (!user.org) throw new ForbiddenException('No organization');
    return this.financeService.getExpenses(user.org);
  }

  @Post('expenses')
  async addExpense(@CurrentUser() user: any, @Body() body: any) {
    if (!user.org) throw new ForbiddenException('No organization');
    return this.financeService.addExpense(user.org, user.sub, body);
  }
}
