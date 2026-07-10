import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ToolStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';

@ApiTags('moderation')
@Controller('moderation')
export class ModerationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('queue')
  queue() {
    return this.prisma.tool.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } });
  }

  @Post('tools/:id/status')
  setStatus(@Param('id') id: string, @Body() body: { status: ToolStatus; actorId?: string }) {
    return this.prisma.$transaction([
      this.prisma.tool.update({ where: { id }, data: { status: body.status } }),
      this.prisma.auditLog.create({ data: { actorId: body.actorId, action: `tool.${body.status.toLowerCase()}`, entity: 'Tool', entityId: id } })
    ]);
  }
}
