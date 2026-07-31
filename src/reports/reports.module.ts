import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Lease } from '../leases/entities/lease.entity';
import { MaintenanceRequest } from '../maintenance/entities/maintenance-request.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Property } from '../properties/entities/property.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Unit } from '../units/entities/unit.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

/**
 * Read-only across seven entities — injects their repositories directly
 * rather than importing PropertiesModule/UnitsModule/etc. and going through
 * each one's service layer, since reports have no business logic to reuse
 * from those services, only aggregation queries of their own.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Tenant, Property, Lease, Unit, Payment, MaintenanceRequest])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
