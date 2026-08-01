import { Global, Module } from '@nestjs/common';
import { BackgroundTaskTracker } from './background-task-tracker.service';

/** Global so AuditInterceptor and NotificationsService can both inject it without either importing the other's module. */
@Global()
@Module({
  providers: [BackgroundTaskTracker],
  exports: [BackgroundTaskTracker],
})
export class BackgroundTaskTrackerModule {}
