import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { PropertiesModule } from './properties/properties.module';
import { RolesModule } from './roles/roles.module';
import { UnitsModule } from './units/units.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    DatabaseModule,
    MailModule,
    HealthModule,
    // Domain modules land here per sprint:
    AuthModule,
    UsersModule,
    RolesModule,
    PropertiesModule,
    UnitsModule,
    // TenantsModule, LeasesModule (S4)
    // InvoicesModule, PaymentsModule (S5)
    // MaintenanceModule, TechniciansModule (S6)
    // DocumentsModule, NotificationsModule, TemplatesModule, AuditModule (S7)
    // ReportsModule (S8)
  ],
  providers: [
    // Order matters: authenticate first, then check permissions. Both are
    // global so every route added in a later sprint is protected by default —
    // opt out with @Public(), opt in to RBAC with @Permissions().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
