import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { ImporterModule } from './modules/importer/importer.module';
import { LeadsModule } from './modules/leads/leads.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ToolsModule } from './modules/tools/tools.module';
import { PrismaService } from './common/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ToolsModule,
    BillingModule,
    LeadsModule,
    AnalyticsModule,
    ImporterModule,
    ModerationModule,
    NotificationsModule
  ],
  providers: [PrismaService],
  exports: [PrismaService]
})
export class AppModule {}
