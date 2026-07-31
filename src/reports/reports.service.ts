import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { dayLabel, daysUntil, monthLabel } from '../common/date.util';
import { moneyLabel, moneyShortLabel } from '../common/money.util';
import { statusLabel } from '../common/status-label';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Lease } from '../leases/entities/lease.entity';
import { MaintenanceRequest, MaintenanceStatus } from '../maintenance/entities/maintenance-request.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Property } from '../properties/entities/property.entity';
import { Tenant, TenantStatus } from '../tenants/entities/tenant.entity';
import { Unit, UnitStatus } from '../units/entities/unit.entity';
import { BuiltReportDto, ReportDef } from './dto/report.dto';

/** Ported verbatim from mentos-frontend/lib/reports.ts `reportDefs`. */
export const REPORT_DEFS: ReportDef[] = [
  { id: 'rent_collection', title: 'Rent collection report', desc: 'Every invoice this period and its payment status.', icon: 'receipt-text', cat: 'financial' },
  { id: 'outstanding_balances', title: 'Outstanding balances', desc: 'Tenants with unpaid or partially paid balances.', icon: 'circle-alert', cat: 'financial' },
  { id: 'income_vs_expenses', title: 'Income vs expenses', desc: 'Rent collected against maintenance spend.', icon: 'scale', cat: 'financial' },
  { id: 'revenue_by_property', title: 'Revenue by property', desc: 'Rent roll and share of total revenue per property.', icon: 'building-2', cat: 'financial' },
  { id: 'payment_trends', title: 'Payment trends', desc: 'Collections over the last 12 months.', icon: 'trending-up', cat: 'financial' },
  { id: 'occupancy_rates', title: 'Occupancy rates', desc: 'Occupied vs vacant units across the portfolio.', icon: 'layout-grid', cat: 'operational' },
  { id: 'vacancy_report', title: 'Vacancy report', desc: 'Every vacant unit currently available to lease.', icon: 'door-open', cat: 'operational' },
  { id: 'lease_expirations', title: 'Lease expiration schedule', desc: 'Leases ordered by days remaining.', icon: 'file-clock', cat: 'operational' },
  { id: 'tenant_directory', title: 'Tenant directory', desc: 'Full contact list of every tenant on record.', icon: 'users-round', cat: 'operational' },
  { id: 'maintenance_summary', title: 'Maintenance summary', desc: 'Requests and cost by category.', icon: 'wrench', cat: 'operational' },
];

const num = (v: number | string): number => parseFloat(v.toString());

/** "Property · unit", or just "Property", or "—" — the recurring cell format across half these reports. */
function propUnitCell(property: Property | null | undefined, unit: Unit | null | undefined): string {
  if (property && unit) return `${property.name} · ${unit.no}`;
  if (property) return property.name;
  return '—';
}

/**
 * Server-side port of mentos-frontend/lib/reports.ts `buildReport()` — same
 * 10 reports, same columns/kpis, but computed here from the database instead
 * of over datasets the frontend already fetched in full. No entity of its
 * own: a report is a read-only computed view, not a persisted record.
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(Property) private readonly properties: Repository<Property>,
    @InjectRepository(Lease) private readonly leases: Repository<Lease>,
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(MaintenanceRequest) private readonly maintenance: Repository<MaintenanceRequest>,
  ) {}

  listDefs(): ReportDef[] {
    return REPORT_DEFS;
  }

  async build(id: string): Promise<BuiltReportDto> {
    switch (id) {
      case 'rent_collection':
        return this.rentCollection();
      case 'outstanding_balances':
        return this.outstandingBalances();
      case 'income_vs_expenses':
        return this.incomeVsExpenses();
      case 'revenue_by_property':
        return this.revenueByProperty();
      case 'payment_trends':
        return this.paymentTrends();
      case 'occupancy_rates':
        return this.occupancyRates();
      case 'vacancy_report':
        return this.vacancyReport();
      case 'lease_expirations':
        return this.leaseExpirations();
      case 'tenant_directory':
        return this.tenantDirectory();
      case 'maintenance_summary':
        return this.maintenanceSummary();
      default:
        throw new BadRequestException(
          `Unknown report "${id}" — see GET /reports for the valid ids.`,
        );
    }
  }

  private async rentCollection(): Promise<BuiltReportDto> {
    const invoices = await this.invoices.find({ relations: ['tenant', 'lease', 'lease.unit', 'property'] });

    const rows = invoices.map((i) => ({
      cells: [
        i.tenant?.name ?? '—',
        propUnitCell(i.property, i.lease?.unit),
        i.code,
        monthLabel(i.issued),
        moneyLabel(i.amount),
        moneyLabel(i.balance),
        statusLabel(i.isOverdue ? 'overdue' : i.status),
      ],
    }));

    const expected = invoices.reduce((a, b) => a + num(b.amount), 0);
    const collected = expected - invoices.reduce((a, b) => a + num(b.balance), 0);

    return {
      columns: ['Tenant', 'Property · unit', 'Invoice', 'Period', 'Amount', 'Balance', 'Status'],
      rows,
      kpis: [
        { label: 'Expected', value: moneyLabel(expected) },
        { label: 'Collected', value: moneyLabel(collected) },
        { label: 'Collection rate', value: `${expected ? Math.round((collected / expected) * 100) : 0}%` },
        { label: 'Outstanding', value: moneyLabel(expected - collected) },
      ],
    };
  }

  private async outstandingBalances(): Promise<BuiltReportDto> {
    const all = await this.invoices.find({ relations: ['tenant', 'lease', 'lease.unit', 'property'] });
    const list = all.filter((i) => num(i.balance) > 0).sort((a, b) => num(b.balance) - num(a.balance));

    const rows = list.map((i) => ({
      cells: [
        i.tenant?.name ?? '—',
        propUnitCell(i.property, i.lease?.unit),
        i.code,
        dayLabel(i.due),
        moneyLabel(i.balance),
        statusLabel(i.isOverdue ? 'overdue' : i.status),
      ],
    }));

    return {
      columns: ['Tenant', 'Property · unit', 'Invoice', 'Due date', 'Balance', 'Status'],
      rows,
      kpis: [
        { label: 'Total outstanding', value: moneyLabel(list.reduce((a, b) => a + num(b.balance), 0)) },
        { label: 'Overdue invoices', value: String(list.filter((i) => i.isOverdue).length) },
        { label: 'Tenants affected', value: String(list.length) },
      ],
    };
  }

  private async incomeVsExpenses(): Promise<BuiltReportDto> {
    const [payments, requests] = await Promise.all([this.payments.find(), this.maintenance.find()]);

    const income = payments.reduce((a, b) => a + num(b.amount), 0);
    const expenses = requests.reduce((a, b) => a + num(b.cost), 0);
    const maxV = Math.max(income, expenses, 1);

    const byCategory = new Map<string, number>();
    for (const r of requests) {
      byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + num(r.cost));
    }

    return {
      hasBars: true,
      bars: [
        { label: 'Income (rent collected)', valueFmt: moneyLabel(income), pct: Math.round((income / maxV) * 100), color: 'var(--success-500)' },
        { label: 'Expenses (maintenance)', valueFmt: moneyLabel(expenses), pct: Math.round((expenses / maxV) * 100), color: 'var(--danger-500)' },
      ],
      columns: ['Expense category', 'Total cost'],
      rows: [...byCategory.entries()].map(([category, cost]) => ({ cells: [category, moneyLabel(cost)] })),
      kpis: [
        { label: 'Income', value: moneyLabel(income) },
        { label: 'Expenses', value: moneyLabel(expenses) },
        { label: 'Net income', value: moneyLabel(income - expenses) },
      ],
    };
  }

  private async revenueByProperty(): Promise<BuiltReportDto> {
    const [properties, units] = await Promise.all([this.properties.find(), this.units.find()]);

    const rollFor = (propertyId: string) =>
      units
        .filter((u) => u.propertyId === propertyId && u.status === UnitStatus.Occupied)
        .reduce((a, b) => a + num(b.rent), 0);
    const totalUnitsFor = (propertyId: string) => units.filter((u) => u.propertyId === propertyId).length;
    const occupiedUnitsFor = (propertyId: string) =>
      units.filter((u) => u.propertyId === propertyId && u.status === UnitStatus.Occupied).length;

    const total = units.filter((u) => u.status === UnitStatus.Occupied).reduce((a, b) => a + num(b.rent), 0);

    const rows = properties
      .map((p) => ({ property: p, roll: rollFor(p.id) }))
      .sort((a, b) => b.roll - a.roll)
      .map(({ property: p, roll }) => ({
        cells: [
          p.name,
          `${occupiedUnitsFor(p.id)}/${totalUnitsFor(p.id)}`,
          moneyLabel(roll),
          `${total ? Math.round((roll / total) * 100) : 0}%`,
        ],
      }));

    return {
      columns: ['Property', 'Occupied / total', 'Rent roll', 'Share of revenue'],
      rows,
      kpis: [
        { label: 'Total monthly revenue', value: moneyLabel(total) },
        { label: 'Properties', value: String(properties.length) },
      ],
    };
  }

  private async paymentTrends(): Promise<BuiltReportDto> {
    const payments = await this.payments.find({ relations: ['tenant'] });

    const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const buckets = Array.from({ length: 12 }, (_, i) => {
      const dt = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return { label: MONTHS_SHORT[dt.getMonth()], year: dt.getFullYear(), month: dt.getMonth(), total: 0 };
    });

    for (const p of payments) {
      const dt = new Date(`${p.date}T00:00:00Z`);
      const bucket = buckets.find((b) => b.year === dt.getUTCFullYear() && b.month === dt.getUTCMonth());
      if (bucket) bucket.total += num(p.amount);
    }

    const maxV = Math.max(1, ...buckets.map((b) => b.total));
    const bars = buckets.map((b, i) => ({
      label: b.label,
      valueFmt: moneyShortLabel(b.total),
      pct: Math.round((b.total / maxV) * 100),
      color: i === buckets.length - 1 ? 'var(--gold-500)' : 'var(--green-500)',
    }));

    const rows = [...payments]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, 8)
      .map((p) => ({ cells: [p.code, p.tenant?.name ?? '—', dayLabel(p.date), moneyLabel(p.amount), p.method] }));

    const avg = buckets.reduce((a, b) => a + b.total, 0) / buckets.length;
    const peak = buckets.reduce((best, b) => (b.total > best.total ? b : best), buckets[0]);

    return {
      hasBars: true,
      bars,
      columns: ['Receipt', 'Tenant', 'Date', 'Amount', 'Method'],
      rows,
      kpis: [
        { label: 'Average monthly', value: moneyLabel(avg) },
        { label: 'Peak month', value: peak.label },
      ],
    };
  }

  private async occupancyRates(): Promise<BuiltReportDto> {
    const [properties, units] = await Promise.all([this.properties.find(), this.units.find()]);

    const rows = properties.map((p) => {
      const us = units.filter((u) => u.propertyId === p.id);
      const occ = us.filter((u) => u.status === UnitStatus.Occupied).length;
      const pct = us.length ? Math.round((occ / us.length) * 100) : 0;
      return { cells: [p.name, `${occ}/${us.length}`, String(us.length - occ), `${pct}%`] };
    });

    const totalUnits = units.length;
    const totalOcc = units.filter((u) => u.status === UnitStatus.Occupied).length;

    return {
      columns: ['Property', 'Occupied / total', 'Vacant', 'Occupancy'],
      rows,
      kpis: [
        { label: 'Portfolio occupancy', value: `${totalUnits ? Math.round((totalOcc / totalUnits) * 100) : 0}%` },
        { label: 'Total vacant units', value: String(totalUnits - totalOcc) },
      ],
    };
  }

  private async vacancyReport(): Promise<BuiltReportDto> {
    const list = await this.units.find({ where: { status: UnitStatus.Vacant }, relations: ['property'] });

    const rows = list.map((u) => ({
      cells: [u.property?.name ?? '—', u.no, u.type, `${num(u.size)} m²`, moneyLabel(u.rent)],
    }));
    const lost = list.reduce((a, b) => a + num(b.rent), 0);

    return {
      columns: ['Property', 'Unit', 'Type', 'Size', 'Monthly rent'],
      rows,
      kpis: [
        { label: 'Vacant units', value: String(list.length) },
        { label: 'Potential rent lost / mo', value: moneyLabel(lost) },
      ],
    };
  }

  private async leaseExpirations(): Promise<BuiltReportDto> {
    const leases = await this.leases.find({ relations: ['tenant', 'unit', 'property'] });
    const list = leases
      .map((l) => ({ lease: l, daysToExpiry: daysUntil(l.end) }))
      .sort((a, b) => a.daysToExpiry - b.daysToExpiry);

    const rows = list.map(({ lease: l, daysToExpiry }) => ({
      cells: [
        l.code,
        l.tenant?.name ?? '—',
        propUnitCell(l.property, l.unit),
        dayLabel(l.end),
        `${daysToExpiry}d`,
        statusLabel(l.status),
      ],
    }));

    return {
      columns: ['Lease', 'Tenant', 'Property · unit', 'End date', 'Days left', 'Status'],
      rows,
      kpis: [
        { label: 'Expiring ≤30 days', value: String(list.filter((l) => l.daysToExpiry <= 30).length) },
        { label: 'Expiring ≤60 days', value: String(list.filter((l) => l.daysToExpiry <= 60).length) },
        { label: 'Expiring ≤90 days', value: String(list.filter((l) => l.daysToExpiry <= 90).length) },
      ],
    };
  }

  private async tenantDirectory(): Promise<BuiltReportDto> {
    const tenants = await this.tenants.find({ relations: ['unit', 'property'] });

    const rows = tenants.map((t) => ({
      cells: [
        t.name,
        t.phone,
        t.email,
        propUnitCell(t.property, t.unit),
        statusLabel(t.status),
        monthLabel(t.since),
      ],
    }));

    return {
      columns: ['Name', 'Phone', 'Email', 'Property · unit', 'Status', 'Since'],
      rows,
      kpis: [
        { label: 'Total tenants', value: String(tenants.length) },
        { label: 'Active', value: String(tenants.filter((t) => t.status === TenantStatus.Active).length) },
      ],
    };
  }

  private async maintenanceSummary(): Promise<BuiltReportDto> {
    const requests = await this.maintenance.find();

    const byCategory = new Map<string, { count: number; open: number; done: number; cost: number }>();
    for (const r of requests) {
      const bucket = byCategory.get(r.category) ?? { count: 0, open: 0, done: 0, cost: 0 };
      bucket.count += 1;
      if ([MaintenanceStatus.Open, MaintenanceStatus.Assigned, MaintenanceStatus.InProgress].includes(r.status)) {
        bucket.open += 1;
      }
      if ([MaintenanceStatus.Completed, MaintenanceStatus.Closed].includes(r.status)) {
        bucket.done += 1;
      }
      bucket.cost += num(r.cost);
      byCategory.set(r.category, bucket);
    }

    const rows = [...byCategory.entries()].map(([category, b]) => ({
      cells: [category, String(b.count), String(b.open), String(b.done), moneyLabel(b.cost)],
    }));

    const openNow = requests.filter((r) =>
      [MaintenanceStatus.Open, MaintenanceStatus.Assigned, MaintenanceStatus.InProgress].includes(r.status),
    ).length;

    return {
      columns: ['Category', 'Total requests', 'Open / in progress', 'Completed', 'Total cost'],
      rows,
      kpis: [
        { label: 'Total requests', value: String(requests.length) },
        { label: 'Open now', value: String(openNow) },
        { label: 'Total cost', value: moneyLabel(requests.reduce((a, b) => a + num(b.cost), 0)) },
      ],
    };
  }
}
