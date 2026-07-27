import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsModule } from '../documents/documents.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { TenantsModule } from '../tenants/tenants.module';
import { UnitsModule } from '../units/units.module';
import { Lease } from './entities/lease.entity';
import { LeasesController } from './leases.controller';
import { LeasesService } from './leases.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lease]),
    TenantsModule,
    UnitsModule,
    InvoicesModule,
    DocumentsModule,
  ],
  controllers: [LeasesController],
  providers: [LeasesService],
  exports: [LeasesService],
})
export class LeasesModule {}
