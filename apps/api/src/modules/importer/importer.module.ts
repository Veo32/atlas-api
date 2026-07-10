import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ImporterController } from './importer.controller';
import { ImporterService } from './importer.service';

@Module({
  controllers: [ImporterController],
  providers: [ImporterService, PrismaService]
})
export class ImporterModule {}
