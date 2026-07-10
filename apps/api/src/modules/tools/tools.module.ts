import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';

@Module({
  controllers: [ToolsController],
  providers: [ToolsService, PrismaService],
  exports: [ToolsService]
})
export class ToolsModule {}
