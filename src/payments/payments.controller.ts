import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PaymentResponseDto, RecordPaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

/** Recording a payment needs an invoice in context — nested, like unit creation under a property. */
@ApiTags('payments')
@ApiBearerAuth()
@Controller('invoices/:invoiceCode/payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @Permissions('payment.create')
  @ApiOperation({
    summary: 'Record a payment against an invoice',
    description:
      'The amount is capped at the remaining balance. Flips the invoice to "partial" or "paid".',
  })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  @ApiResponse({ status: 400, description: 'Invoice already paid, voided, or amount invalid' })
  record(
    @Param('invoiceCode') invoiceCode: string,
    @Body() dto: RecordPaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.payments.record(invoiceCode, dto);
  }

  @Get()
  @Permissions('payment.read')
  @ApiOperation({ summary: 'List payments recorded against this invoice' })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  findByInvoice(@Param('invoiceCode') invoiceCode: string): Promise<PaymentResponseDto[]> {
    return this.payments.findByInvoiceCode(invoiceCode);
  }
}
