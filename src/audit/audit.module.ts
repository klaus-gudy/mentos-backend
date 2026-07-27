import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

/**
 * Global: AuditInterceptor and PermissionsGuard are both registered as
 * app-wide providers in AppModule and need AuditService available wherever
 * Nest resolves them, without every module that has a permission-gated route
 * (which is nearly all of them) having to import this one explicitly.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
