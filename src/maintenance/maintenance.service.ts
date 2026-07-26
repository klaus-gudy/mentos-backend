import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TechniciansService } from '../technicians/technicians.service';
import { TechnicianStatus } from '../technicians/entities/technician.entity';
import { UnitsService } from '../units/units.service';
import {
  AssignMaintenanceDto,
  CompleteMaintenanceDto,
  CreateMaintenanceRequestDto,
  MaintenanceRequestResponseDto,
} from './dto/maintenance-request.dto';
import { MaintenanceRequest, MaintenanceStatus } from './entities/maintenance-request.entity';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceRequest)
    private readonly requests: Repository<MaintenanceRequest>,
    private readonly units: UnitsService,
    private readonly technicians: TechniciansService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Logs a request against a unit. `tenantId` is whoever occupies the unit
   * *right now* (`unit.tenantId`) — null for a vacant unit, matching the
   * frontend's `submitMaintenance`.
   */
  async create(dto: CreateMaintenanceRequestDto): Promise<MaintenanceRequestResponseDto> {
    const unit = await this.units.findByCodeOrFail(dto.unitId);

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(MaintenanceRequest);
      await manager.query('LOCK TABLE maintenance_requests IN SHARE ROW EXCLUSIVE MODE');

      const row = await repo
        .createQueryBuilder('request')
        .select('COALESCE(MAX(CAST(SUBSTRING(request.code FROM 4) AS INTEGER)), 0)', 'max')
        .getRawOne<{ max: string }>();
      const seq = parseInt(row?.max ?? '0', 10) + 1;

      const request = new MaintenanceRequest();
      request.code = `MR-${String(seq).padStart(2, '0')}`;
      request.unitId = unit.id;
      request.propertyId = unit.propertyId;
      request.tenantId = unit.tenantId;
      request.category = dto.category;
      request.title = dto.title;
      request.description = dto.description;
      request.priority = dto.priority;
      request.status = MaintenanceStatus.Open;
      request.assigneeId = null;
      request.cost = 0;
      request.preferred = dto.preferred || 'Any time';

      const saved = await repo.save(request);
      saved.unit = unit;
      saved.property = unit.property;
      // unit.tenant is already loaded (UnitsService.findByCodeOrFail eager-loads
      // it) — reuse it rather than firing a redundant lookup.
      saved.tenant = unit.tenant;
      return MaintenanceRequestResponseDto.from(saved);
    });
  }

  async findAll(): Promise<MaintenanceRequestResponseDto[]> {
    const requests = await this.requests.find({
      relations: ['unit', 'property', 'tenant', 'assignee'],
      order: { createdAt: 'DESC' },
    });
    return MaintenanceRequestResponseDto.fromMany(requests);
  }

  async findByCodeOrFail(code: string): Promise<MaintenanceRequest> {
    const request = await this.requests.findOne({
      where: { code },
      relations: ['unit', 'property', 'tenant', 'assignee'],
    });
    if (!request) {
      throw new NotFoundException(`Maintenance request "${code}" not found`);
    }
    return request;
  }

  async findOne(code: string): Promise<MaintenanceRequestResponseDto> {
    return MaintenanceRequestResponseDto.from(await this.findByCodeOrFail(code));
  }

  /**
   * Assigns a technician — validated beyond the frontend mock's unguarded
   * write: the technician must be active and cover the request's category
   * (the same category-to-skill match the maintenance detail page filters
   * its dropdown by, client-side; here it's an enforced invariant).
   */
  async assign(code: string, dto: AssignMaintenanceDto): Promise<MaintenanceRequestResponseDto> {
    const request = await this.findByCodeOrFail(code);

    if (request.status !== MaintenanceStatus.Open) {
      throw new BadRequestException(
        `Cannot assign a request that is already "${request.status}"`,
      );
    }

    const technician = await this.technicians.findByCodeOrFail(dto.technicianId);
    if (technician.status !== TechnicianStatus.Active) {
      throw new BadRequestException(`${technician.name} is not active`);
    }
    if (!technician.skills.includes(request.category)) {
      throw new BadRequestException(
        `${technician.name} does not cover "${request.category}" (skills: ${technician.skills.join(', ')})`,
      );
    }

    await this.requests.update(request.id, {
      status: MaintenanceStatus.Assigned,
      assigneeId: technician.id,
    });
    return this.findOne(code);
  }

  /** open → assigned → **in_progress** → completed → closed. */
  async start(code: string): Promise<MaintenanceRequestResponseDto> {
    const request = await this.findByCodeOrFail(code);

    if (request.status !== MaintenanceStatus.Assigned) {
      throw new BadRequestException(
        `Cannot start a request that is "${request.status}" — it must be assigned first`,
      );
    }

    await this.requests.update(request.id, { status: MaintenanceStatus.InProgress });
    return this.findOne(code);
  }

  /** open → assigned → in_progress → **completed** → closed. Sets the final cost. */
  async complete(code: string, dto: CompleteMaintenanceDto): Promise<MaintenanceRequestResponseDto> {
    const request = await this.findByCodeOrFail(code);

    if (request.status !== MaintenanceStatus.InProgress) {
      throw new BadRequestException(
        `Cannot complete a request that is "${request.status}" — it must be in progress first`,
      );
    }

    await this.requests.update(request.id, {
      status: MaintenanceStatus.Completed,
      cost: dto.cost,
    });
    return this.findOne(code);
  }

  /** open → assigned → in_progress → completed → **closed**. */
  async close(code: string): Promise<MaintenanceRequestResponseDto> {
    const request = await this.findByCodeOrFail(code);

    if (request.status !== MaintenanceStatus.Completed) {
      throw new BadRequestException(
        `Cannot close a request that is "${request.status}" — it must be completed first`,
      );
    }

    await this.requests.update(request.id, { status: MaintenanceStatus.Closed });
    return this.findOne(code);
  }
}
