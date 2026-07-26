import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PaymentResponseDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

/** Flat payment reads, mirroring the frontend's flat `api.payments()`. */
@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsFlatController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @Permissions('payment.read')
  @ApiOperation({ summary: 'List every payment across all invoices' })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  findAll(): Promise<PaymentResponseDto[]> {
    return this.payments.findAll();
  }

  @Get(':code')
  @Permissions('payment.read')
  @ApiOperation({ summary: 'Get one payment by code' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  findOne(@Param('code') code: string): Promise<PaymentResponseDto> {
    return this.payments.findOne(code);
  }
}
