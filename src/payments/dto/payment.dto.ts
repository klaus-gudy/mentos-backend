import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { monthLabel } from '../../common/date.util';
import { Payment } from '../entities/payment.entity';

/** The frontend's fixed dropdown values (record-payment-dialog.tsx) — free text, not a DB enum. */
export const PAYMENT_METHODS = ['M-Pesa', 'Bank transfer', 'Cash', 'Cheque', 'Card'] as const;

/** Frontend-facing payment shape — mirrors mentos-frontend's `Payment` exactly. */
export class PaymentResponseDto {
  @ApiProperty({ example: 'RC-1015', description: 'Business code, used as id by frontend' })
  id: string;

  @ApiProperty({ example: 'INV-1010' })
  invoiceId: string;

  @ApiProperty({ example: 'T-02' })
  tenantId: string;

  @ApiProperty({ example: 420000 })
  amount: number;

  @ApiProperty({ example: 'M-Pesa' })
  method: string;

  @ApiProperty({ example: '2026-07-03', description: 'ISO date' })
  date: string;

  @ApiProperty({ example: 'Jul 2026', description: "The paid invoice's billing period" })
  period: string;

  static from(payment: Payment): PaymentResponseDto {
    return {
      id: payment.code,
      invoiceId: payment.invoice?.code ?? '',
      tenantId: payment.tenant?.code ?? '',
      amount: parseFloat(payment.amount.toString()),
      method: payment.method,
      date: payment.date,
      period: payment.invoice ? monthLabel(payment.invoice.issued) : '',
    };
  }

  static fromMany(payments: Payment[]): PaymentResponseDto[] {
    return payments.map((p) => PaymentResponseDto.from(p));
  }
}

/** Mirrors mentos-frontend's `NewPaymentInput`. `invoiceId` comes from the route param. */
export class RecordPaymentDto {
  @ApiProperty({ example: 420000, description: 'Capped at the invoice balance if it exceeds it' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: PAYMENT_METHODS, example: 'M-Pesa' })
  @IsString()
  @IsIn(PAYMENT_METHODS)
  method: string;

  @ApiPropertyOptional({ example: '2026-07-03', description: 'Defaults to today if omitted' })
  @IsDateString()
  @IsOptional()
  date?: string;
}
