import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { AuthService } from '../auth/auth.service';

@Module({
  providers: [TenantsService, AuthService],
  controllers: [TenantsController],
})
export class TenantsModule {}
