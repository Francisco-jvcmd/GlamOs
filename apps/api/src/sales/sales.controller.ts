import { Controller, Get, Param, Body, Query, Post, ForbiddenException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Roles('OWNER_ADMIN')
  @Post(':id/void')
  async voidSale(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    if (!user.org) throw new ForbiddenException('No organization');
    return this.salesService.voidSale(user.org, user.sub, id, body.reason);
  }

  @Get()
  async getSales(
    @CurrentUser() user: any,
    @Query('employee_id') employeeId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!user.org) throw new ForbiddenException('No organization');
    return this.salesService.getSales(user.org, user.role, user.sub, {
      employee_id: employeeId,
      date_from: dateFrom,
      date_to: dateTo,
      page: parseInt(page || '1'),
      limit: parseInt(limit || '50'),
    });
  }
}
