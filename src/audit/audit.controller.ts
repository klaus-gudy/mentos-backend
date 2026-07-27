import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AuditSkip } from './decorators/audit-skip.decorator';
import { AuditService } from './audit.service';
import { AuditLogResponseDto, QueryAuditLogDto } from './dto/audit-log.dto';

@ApiTags('audit')
@ApiBearerAuth()
@AuditSkip()
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Permissions('audit.read')
  @ApiOperation({
    summary: 'List audit entries',
    description:
      'Every field is an optional filter, combined with AND — e.g. `?resource=unit&resourceId=U-104` ' +
      'for one unit\'s full history, or `?actorId=US-2` for one user\'s activity across every module.',
  })
  @ApiResponse({ status: 200, type: [AuditLogResponseDto] })
  findAll(@Query() query: QueryAuditLogDto): Promise<AuditLogResponseDto[]> {
    return this.audit.findAll(query);
  }

  @Get(':code')
  @Permissions('audit.read')
  @ApiOperation({ summary: 'Get one audit entry' })
  @ApiResponse({ status: 200, type: AuditLogResponseDto })
  findOne(@Param('code') code: string): Promise<AuditLogResponseDto> {
    return this.audit.findOne(code);
  }
}
