import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    DatabaseModule,
    HealthModule,
    // Domain modules land here per sprint:
    // AuthModule, UsersModule, RolesModule (S2)
    // PropertiesModule, UnitsModule (S3)
    // TenantsModule, LeasesModule (S4)
    // InvoicesModule, PaymentsModule (S5)
    // MaintenanceModule, TechniciansModule (S6)
    // DocumentsModule, NotificationsModule, TemplatesModule, AuditModule (S7)
    // ReportsModule (S8)
  ],
})
export class AppModule {}
