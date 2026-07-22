import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { UnitsService } from '../units/units.service';
import { BlacklistTenantDto, CreateTenantDto, TenantResponseDto, UpdateTenantDto } from './dto/tenant.dto';
import { Tenant, TenantStatus } from './entities/tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,
    private readonly units: UnitsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Onboards a prospective tenant — no unit assigned yet. Matches the
   * frontend's `onboardTenant`: `idType` is hardcoded to "NIDA", `kin` is the
   * next-of-kin fields pre-joined as "Name · Relation", and the tenant stays
   * `prospective` with no unit until a lease occupies one (Sprint 4).
   */
  async create(dto: CreateTenantDto): Promise<TenantResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Tenant);
      await manager.query('LOCK TABLE tenants IN SHARE ROW EXCLUSIVE MODE');

      const row = await repo
        .createQueryBuilder('tenant')
        .select('COALESCE(MAX(CAST(SUBSTRING(tenant.code FROM 3) AS INTEGER)), 0)', 'max')
        .getRawOne<{ max: string }>();
      const seq = parseInt(row?.max ?? '0', 10) + 1;

      const tenant = new Tenant();
      tenant.code = `T-${String(seq).padStart(2, '0')}`;
      tenant.name = dto.fullName;
      tenant.phone = dto.phone;
      tenant.email = dto.email;
      tenant.status = TenantStatus.Prospective;
      tenant.since = new Date().toISOString().slice(0, 10);
      tenant.unitId = null;
      tenant.propertyId = null;
      tenant.org = '';
      tenant.occupation = dto.occupation;
      tenant.employer = '';
      tenant.idType = 'NIDA';
      tenant.idNumber = dto.idNumber;
      tenant.kin = dto.emName
        ? [dto.emName, dto.emRelation, dto.emContact].filter(Boolean).join(' · ')
        : '—';
      tenant.comms = 'SMS';

      const saved = await repo.save(tenant);
      return TenantResponseDto.from(saved);
    });
  }

  async findAll(): Promise<TenantResponseDto[]> {
    const tenants = await this.tenants.find({
      relations: ['unit', 'property'],
      order: { createdAt: 'ASC' },
    });
    return TenantResponseDto.fromMany(tenants);
  }

  async findByCodeOrFail(code: string): Promise<Tenant> {
    const tenant = await this.tenants.findOne({
      where: { code },
      relations: ['unit', 'property'],
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant "${code}" not found`);
    }
    return tenant;
  }

  async findOne(code: string): Promise<TenantResponseDto> {
    return TenantResponseDto.from(await this.findByCodeOrFail(code));
  }

  /**
   * Contact & identity fields only — matches the frontend's `updateTenant`.
   * Name, status and unit assignment change through other flows.
   */
  async update(code: string, dto: UpdateTenantDto): Promise<TenantResponseDto> {
    const tenant = await this.findByCodeOrFail(code);

    if (dto.phone !== undefined) tenant.phone = dto.phone;
    if (dto.email !== undefined) tenant.email = dto.email;
    if (dto.occupation !== undefined) tenant.occupation = dto.occupation;
    if (dto.employer !== undefined) tenant.employer = dto.employer;
    if (dto.org !== undefined) tenant.org = dto.org;
    if (dto.idType !== undefined) tenant.idType = dto.idType;
    if (dto.idNumber !== undefined) tenant.idNumber = dto.idNumber;
    if (dto.kin !== undefined) tenant.kin = dto.kin;
    if (dto.comms !== undefined) tenant.comms = dto.comms;

    await this.tenants.save(tenant);
    return this.findOne(code);
  }

  /**
   * Blacklists a tenant and vacates their unit, if any — uses the
   * `tenant.blacklist` permission ("Blacklist / mark vacated" in the catalog).
   * Wrapped in a transaction so the unit vacate and tenant update commit
   * together (see UnitsService.vacate()'s EntityManager parameter).
   */
  async blacklist(code: string, _dto: BlacklistTenantDto): Promise<TenantResponseDto> {
    const tenant = await this.findByCodeOrFail(code);

    if (tenant.status === TenantStatus.Blacklisted) {
      throw new BadRequestException(`${tenant.name} is already blacklisted`);
    }

    await this.dataSource.transaction(async (manager) => {
      if (tenant.unitId) {
        await this.units.vacate(manager, tenant.unitId);
      }

      // `.update()`, not `.save()` on the loaded entity: `tenant.unit`/`tenant.property`
      // are still populated relation objects, and TypeORM re-derives the FK columns
      // from them on save — silently overwriting a `null` set directly on unitId/propertyId.
      await manager.getRepository(Tenant).update(tenant.id, {
        status: TenantStatus.Blacklisted,
        unitId: null,
        propertyId: null,
      });
    });

    return this.findOne(code);
  }

  /**
   * Marks a tenant as occupying a unit — called by LeasesService.create(),
   * within its transaction. Tenant is the single writer for its own occupancy
   * fields, mirroring UnitsService.occupy()/vacate().
   */
  async occupyForLease(
    manager: EntityManager,
    tenantId: string,
    unitId: string,
    propertyId: string,
  ): Promise<void> {
    await manager
      .getRepository(Tenant)
      .update(tenantId, { status: TenantStatus.Active, unitId, propertyId });
  }

  /** Clears occupancy on lease termination — called by LeasesService.terminate(). */
  async vacateForLease(manager: EntityManager, tenantId: string): Promise<void> {
    await manager
      .getRepository(Tenant)
      .update(tenantId, { status: TenantStatus.Vacated, unitId: null, propertyId: null });
  }
}
