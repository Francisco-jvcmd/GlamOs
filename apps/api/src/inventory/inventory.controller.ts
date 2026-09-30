import { Controller, Post, Get, Body, ForbiddenException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Post('adjust')
  async adjust(@CurrentUser() user: any, @Body() body: { product_id: string, delta: number, reason: string }) {
    if (!user.org) throw new ForbiddenException('No organization');
    return this.inventoryService.adjustStock(user.org, user.sub, body.product_id, body.delta, body.reason);
  }

  @Get('products')
  async getProducts(@CurrentUser() user: any) {
    if (!user.org) throw new ForbiddenException('No organization');
    return this.inventoryService.getProducts(user.org);
  }

  @Get('low-stock')
  async getLowStock(@CurrentUser() user: any) {
    if (!user.org) throw new ForbiddenException('No organization');
    return this.inventoryService.getLowStock(user.org);
  }
}
