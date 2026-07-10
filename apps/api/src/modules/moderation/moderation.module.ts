import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ModerationController } from './moderation.controller';

@Module({ controllers: [ModerationController], providers: [PrismaService] })
export class ModerationModule {}
