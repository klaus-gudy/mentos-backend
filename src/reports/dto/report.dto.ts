import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Ported verbatim from mentos-frontend/lib/reports.ts `ReportDef`. */
export interface ReportDef {
  id: string;
  title: string;
  desc: string;
  icon: string;
  cat: 'financial' | 'operational';
}

export class ReportDefDto implements ReportDef {
  @ApiProperty({ example: 'rent_collection' })
  id: string;

  @ApiProperty({ example: 'Rent collection report' })
  title: string;

  @ApiProperty({ example: 'Every invoice this period and its payment status.' })
  desc: string;

  @ApiProperty({ example: 'receipt-text' })
  icon: string;

  @ApiProperty({ example: 'financial', enum: ['financial', 'operational'] })
  cat: 'financial' | 'operational';
}

export class ReportRowDto {
  @ApiProperty({ type: [String], example: ['Amina Hassan', 'P-01 · A-12', 'INV-1009', 'Jul 2026', 'TSh 520,000', 'TSh 0', 'Paid'] })
  cells: string[];
}

export class ReportKpiDto {
  @ApiProperty({ example: 'Collection rate' })
  label: string;

  @ApiProperty({ example: '82%' })
  value: string;
}

export class ReportBarDto {
  @ApiProperty({ example: 'Jul' })
  label: string;

  @ApiProperty({ example: 'TSh 4.2M' })
  valueFmt: string;

  @ApiProperty({ example: 76, description: 'Percent of the tallest bar, for rendering bar height' })
  pct: number;

  @ApiProperty({ example: 'var(--green-500)' })
  color: string;
}

/** Matches mentos-frontend's `BuiltReport` exactly — the shape `buildReport()` returns. */
export class BuiltReportDto {
  @ApiProperty({ type: [String], example: ['Tenant', 'Property · unit', 'Invoice', 'Period', 'Amount', 'Balance', 'Status'] })
  columns: string[];

  @ApiProperty({ type: [ReportRowDto] })
  rows: ReportRowDto[];

  @ApiProperty({ type: [ReportKpiDto] })
  kpis: ReportKpiDto[];

  @ApiPropertyOptional({ example: true })
  hasBars?: boolean;

  @ApiPropertyOptional({ type: [ReportBarDto] })
  bars?: ReportBarDto[];
}
