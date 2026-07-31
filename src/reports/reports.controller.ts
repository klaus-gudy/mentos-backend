import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { BuiltReportDto, ReportDefDto } from './dto/report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  @Permissions('report.read')
  @ApiOperation({ summary: 'List the report catalog', description: 'The 10 available reports and their metadata — no data, just what exists.' })
  @ApiResponse({ status: 200, type: [ReportDefDto] })
  list(): ReportDefDto[] {
    return this.reports.listDefs();
  }

  // `:code`, not `:id` — matches every other controller's param name, which
  // is what AuditInterceptor keys on to log this as a single-record view
  // ("viewed report rent_collection") rather than treating it like a list GET.
  @Get(':code')
  @Permissions('report.read')
  @ApiOperation({
    summary: 'Build one report from live data',
    description: 'Computed on every request from the current database state — nothing is cached or persisted.',
  })
  @ApiResponse({ status: 200, type: BuiltReportDto })
  @ApiResponse({ status: 400, description: 'Unknown report id — see GET /reports for valid ids' })
  build(@Param('code') code: string): Promise<BuiltReportDto> {
    return this.reports.build(code);
  }
}
