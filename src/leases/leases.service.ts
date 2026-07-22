import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { addMonthsMinusDay, monthLabel } from '../common/date.util';
import { TenantStatus } from '../tenants/entities/tenant.entity';
import { TenantsService } from '../tenants/tenants.service';
import { UnitStatus } from '../units/entities/unit.entity';
import { UnitsService } from '../units/units.service';
import { InvoicesService } from '../invoices/invoices.service';
import { CreateLeaseDto, LeaseResponseDto, TerminateLeaseDto, UpdateLeaseDto } from './dto/lease.dto';
import { Lease, LeaseStatus } from './entities/lease.entity';

/** Invoices are due 4 days after issue — matches the frontend seed (01→05). */
const INVOICE_GRACE_DAYS = 4;

@Injectable()
export class LeasesService {
  constructor(
    @InjectRepository(Lease)
    private readonly leases: Repository<Lease>,
    private readonly tenants: TenantsService,
    private readonly units: UnitsService,
    private readonly invoices: InvoicesService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * The transactional core the user asked for: a lease is the sole source of
   * truth for occupancy. Creating one validates the unit is vacant and the
   * tenant isn't already leased elsewhere, then atomically inserts the lease,
   * generates its first invoice, occupies the unit, and activates the tenant —
   * matching the frontend's `createLease` side effects exactly.
   */
  async create(dto: CreateLeaseDto): Promise<LeaseResponseDto> {
    const tenant = await this.tenants.findByCodeOrFail(dto.tenantId);
    const unit = await this.units.findByCodeOrFail(dto.unitId);

    if (unit.status === UnitStatus.Occupied) {
      throw new ConflictException(`Unit "${dto.unitId}" is already occupied`);
    }
    if (tenant.status === TenantStatus.Blacklisted) {
      throw new BadRequestException(`${tenant.name} is blacklisted and cannot be leased a unit`);
    }

    const existingLease = await this.leases.findOne({
      where: [
        { tenantId: tenant.id, status: LeaseStatus.Active },
        { tenantId: tenant.id, status: LeaseStatus.Ending },
      ],
    });
    if (existingLease) {
      throw new ConflictException(
        `${tenant.name} already holds an active lease (${existingLease.code})`,
      );
    }

    const rent = dto.rent ?? parseFloat(unit.rent.toString());
    const deposit = dto.deposit ?? parseFloat(unit.deposit.toString());
    const end = addMonthsMinusDay(dto.start, dto.duration);

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Lease);
      await manager.query('LOCK TABLE leases IN SHARE ROW EXCLUSIVE MODE');

      const row = await repo
        .createQueryBuilder('lease')
        .select('COALESCE(MAX(CAST(SUBSTRING(lease.code FROM 3) AS INTEGER)), 0)', 'max')
        .getRawOne<{ max: string }>();
      const seq = parseInt(row?.max ?? '0', 10) + 1;

      const lease = new Lease();
      lease.code = `L-${String(seq).padStart(2, '0')}`;
      lease.tenantId = tenant.id;
      lease.unitId = unit.id;
      lease.propertyId = unit.propertyId;
      lease.start = dto.start;
      lease.end = end;
      lease.rent = rent;
      lease.deposit = deposit;
      lease.frequency = dto.frequency || 'Monthly';
      lease.status = LeaseStatus.Active;
      lease.billing = dto.billing ?? null;
      lease.grace = dto.grace ?? null;
      lease.penalty = dto.penalty ?? null;
      lease.renewal = dto.renewal ?? null;
      lease.notes = dto.notes ?? null;

      const saved = await repo.save(lease);

      const issued = new Date().toISOString().slice(0, 10);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + INVOICE_GRACE_DAYS);
      const due = dueDate.toISOString().slice(0, 10);
      const period = monthLabel(issued);

      await this.invoices.createForLease(
        manager,
        saved,
        [
          { label: `Rent · ${period}`, amount: rent },
          { label: 'Security deposit', amount: deposit },
        ],
        issued,
        due,
      );

      await this.units.occupy(manager, unit.id, tenant.id);
      await this.tenants.occupyForLease(manager, tenant.id, unit.id, unit.propertyId);

      saved.tenant = tenant;
      saved.unit = unit;
      saved.property = unit.property;
      return LeaseResponseDto.from(saved);
    });
  }

  async findAll(): Promise<LeaseResponseDto[]> {
    const leases = await this.leases.find({
      relations: ['tenant', 'unit', 'property'],
      order: { createdAt: 'ASC' },
    });
    return LeaseResponseDto.fromMany(leases);
  }

  async findByCodeOrFail(code: string): Promise<Lease> {
    const lease = await this.leases.findOne({
      where: { code },
      relations: ['tenant', 'unit', 'property'],
    });
    if (!lease) {
      throw new NotFoundException(`Lease "${code}" not found`);
    }
    return lease;
  }

  async findOne(code: string): Promise<LeaseResponseDto> {
    return LeaseResponseDto.from(await this.findByCodeOrFail(code));
  }

  /** Lease terms only — matches the `lease.update` permission ("Edit lease terms"). */
  async update(code: string, dto: UpdateLeaseDto): Promise<LeaseResponseDto> {
    const lease = await this.findByCodeOrFail(code);

    if (lease.status === LeaseStatus.Ended) {
      throw new BadRequestException('This lease has ended and can no longer be edited');
    }

    if (dto.rent !== undefined) lease.rent = dto.rent;
    if (dto.deposit !== undefined) lease.deposit = dto.deposit;
    if (dto.frequency !== undefined) lease.frequency = dto.frequency;
    if (dto.billing !== undefined) lease.billing = dto.billing;
    if (dto.grace !== undefined) lease.grace = dto.grace;
    if (dto.penalty !== undefined) lease.penalty = dto.penalty;
    if (dto.renewal !== undefined) lease.renewal = dto.renewal;
    if (dto.notes !== undefined) lease.notes = dto.notes;

    await this.leases.save(lease);
    return this.findOne(code);
  }

  /**
   * Ends a lease early, vacating its unit and reverting the tenant to
   * `vacated` — the other half of the occupancy invariant `create()` sets up.
   */
  async terminate(code: string, _dto: TerminateLeaseDto): Promise<LeaseResponseDto> {
    const lease = await this.findByCodeOrFail(code);

    if (lease.status === LeaseStatus.Ended) {
      throw new BadRequestException('This lease has already ended');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Lease).update(lease.id, { status: LeaseStatus.Ended });
      await this.units.vacate(manager, lease.unitId);
      await this.tenants.vacateForLease(manager, lease.tenantId);
    });

    return this.findOne(code);
  }
}
