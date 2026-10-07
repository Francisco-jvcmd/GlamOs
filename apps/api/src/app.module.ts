import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { SyncModule } from './sync/sync.module';
import { SalesModule } from './sales/sales.module';
import { InventoryModule } from './inventory/inventory.module';
import { FinanceModule } from './finance/finance.module';
import { ClientsModule } from './clients/clients.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { AppController } from './app.controller';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    TenantsModule,
    SyncModule,
    SalesModule,
    InventoryModule,
    FinanceModule,
    ClientsModule,
  ],
  controllers: [AppController],
  providers: [
    // Global guards — every route requires auth unless @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

