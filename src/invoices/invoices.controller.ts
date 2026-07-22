import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { InvoiceResponseDto } from './dto/invoice.dto';
import { InvoicesService } from './invoices.service';

/**
 * Read-only for now — these rows exist because `createLease` (Sprint 4)
 * auto-generates a first invoice. Recording payments, voiding, and manual
 * invoice creation land with the full Invoices module in Sprint 5.
 */
@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @Permissions('invoice.read')
  @ApiOperation({ summary: 'List all invoices' })
  @ApiResponse({ status: 200, type: [InvoiceResponseDto] })
  findAll(): Promise<InvoiceResponseDto[]> {
    return this.invoices.findAll();
  }

  @Get(':code')
  @Permissions('invoice.read')
  @ApiOperation({ summary: 'Get one invoice' })
  @ApiResponse({ status: 200, type: InvoiceResponseDto })
  findOne(@Param('code') code: string): Promise<InvoiceResponseDto> {
    return this.invoices.findOne(code);
  }
}
