import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { InvoiceResponseDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { InvoicesService } from './invoices.service';

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

  @Patch(':code')
  @Permissions('invoice.update')
  @ApiOperation({
    summary: 'Edit an invoice’s line items',
    description: 'Refused once any payment has been recorded against the invoice.',
  })
  @ApiResponse({ status: 200, type: InvoiceResponseDto })
  update(@Param('code') code: string, @Body() dto: UpdateInvoiceDto): Promise<InvoiceResponseDto> {
    return this.invoices.update(code, dto);
  }

  @Post(':code/void')
  @Permissions('invoice.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Void an invoice',
    description: 'Refused once any payment has been recorded against it.',
  })
  @ApiResponse({ status: 200, type: InvoiceResponseDto })
  void(@Param('code') code: string): Promise<InvoiceResponseDto> {
    return this.invoices.void(code);
  }
}
