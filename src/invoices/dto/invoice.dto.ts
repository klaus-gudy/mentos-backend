import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray } from 'class-validator';
import { monthLabel } from '../../common/date.util';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';

/** Frontend-facing invoice shape — mirrors mentos-frontend's `Invoice` exactly. */
export class InvoiceResponseDto {
  @ApiProperty({ example: 'INV-1015', description: 'Business code, used as id by frontend' })
  id: string;

  @ApiProperty({ example: 'T-01' })
  tenantId: string;

  @ApiProperty({ example: 'L-01' })
  leaseId: string;

  @ApiProperty({ example: 'P-01' })
  propId: string;

  @ApiProperty({ example: 'Jul 2026', description: "Billing period label, derived from `issued`" })
  period: string;

  @ApiProperty({ example: '2026-07-01', description: 'ISO date' })
  issued: string;

  @ApiProperty({ example: '2026-07-05', description: 'ISO date' })
  due: string;

  @ApiProperty({ example: 1560000 })
  amount: number;

  @ApiProperty({ example: 1560000 })
  balance: number;

  @ApiProperty({
    enum: InvoiceStatus,
    example: InvoiceStatus.Due,
    description: '"overdue" is computed (due date passed, balance still owed) — never stored',
  })
  status: InvoiceStatus | 'overdue';

  @ApiProperty({
    type: 'array',
    example: [
      ['Rent · Jul 2026', 520000],
      ['Security deposit', 1040000],
    ],
    description: 'Tuples of [label, amount]',
  })
  items: [string, number][];

  static from(invoice: Invoice): InvoiceResponseDto {
    const isOverdue =
      invoice.status !== InvoiceStatus.Paid &&
      invoice.status !== InvoiceStatus.Void &&
      new Date(`${invoice.due}T00:00:00Z`) < new Date();

    return {
      id: invoice.code,
      tenantId: invoice.tenant?.code ?? '',
      leaseId: invoice.lease?.code ?? '',
      propId: invoice.property?.code ?? '',
      period: monthLabel(invoice.issued),
      issued: invoice.issued,
      due: invoice.due,
      amount: parseFloat(invoice.amount.toString()),
      balance: parseFloat(invoice.balance.toString()),
      status: isOverdue ? 'overdue' : invoice.status,
      items: invoice.items.map((item) => [item.label, item.amount]),
    };
  }

  static fromMany(invoices: Invoice[]): InvoiceResponseDto[] {
    return invoices.map((i) => InvoiceResponseDto.from(i));
  }
}

/**
 * The `invoice.update` permission ("Edit / void invoices") — only allowed
 * before any payment has been recorded (balance === amount), so editing can
 * never silently rewrite an amount a tenant has already partially paid against.
 *
 * `items` takes the same `[string, number][]` tuple shape the frontend sends
 * and receives everywhere else (InvoiceResponseDto.items) — validated
 * manually in InvoicesService.update() rather than via class-validator, which
 * has no clean way to validate a tuple array's per-position types.
 */
export class UpdateInvoiceDto {
  @ApiPropertyOptional({
    type: 'array',
    example: [
      ['Rent · Jul 2026', 520000],
      ['Water charge', 15000],
    ],
    description: 'Full replacement of the line items; the invoice amount and balance are recomputed',
  })
  @IsArray()
  @ArrayMinSize(1)
  items: [string, number][];
}
