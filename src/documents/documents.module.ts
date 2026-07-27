import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesModule } from '../invoices/invoices.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { PaymentsModule } from '../payments/payments.module';
import { PropertiesModule } from '../properties/properties.module';
import { TenantsModule } from '../tenants/tenants.module';
import { UnitsModule } from '../units/units.module';
import { Document } from './entities/document.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    PropertiesModule,
    UnitsModule,
    TenantsModule,
    InvoicesModule,
    PaymentsModule,
    MaintenanceModule,
    // No LeasesModule import: LeasesModule imports *this* module (for the
    // auto-generated agreement PDF), so the dependency only runs one way —
    // see DocumentsService.resolveOwnerEntityId's Lease case, which queries
    // the Lease repository directly instead of injecting LeasesService.
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
