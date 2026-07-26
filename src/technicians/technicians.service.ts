import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateTechnicianDto, TechnicianResponseDto } from './dto/technician.dto';
import { Technician, TechnicianStatus } from './entities/technician.entity';

@Injectable()
export class TechniciansService {
  constructor(
    @InjectRepository(Technician)
    private readonly technicians: Repository<Technician>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTechnicianDto): Promise<TechnicianResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Technician);
      await manager.query('LOCK TABLE technicians IN SHARE ROW EXCLUSIVE MODE');

      const row = await repo
        .createQueryBuilder('technician')
        .select('COALESCE(MAX(CAST(SUBSTRING(technician.code FROM 6) AS INTEGER)), 0)', 'max')
        .getRawOne<{ max: string }>();
      const seq = parseInt(row?.max ?? '0', 10) + 1;

      const technician = new Technician();
      technician.code = `TECH-${String(seq).padStart(2, '0')}`;
      technician.name = dto.name;
      technician.phone = dto.phone;
      technician.email = dto.email;
      technician.skills = dto.skills;
      technician.status = TechnicianStatus.Active;
      technician.company = dto.company;
      technician.since = new Date().toISOString().slice(0, 10);

      const saved = await repo.save(technician);
      return TechnicianResponseDto.from(saved);
    });
  }

  async findAll(): Promise<TechnicianResponseDto[]> {
    const technicians = await this.technicians.find({ order: { createdAt: 'ASC' } });
    return TechnicianResponseDto.fromMany(technicians);
  }

  async findByCodeOrFail(code: string): Promise<Technician> {
    const technician = await this.technicians.findOne({ where: { code } });
    if (!technician) {
      throw new NotFoundException(`Technician "${code}" not found`);
    }
    return technician;
  }

  async findOne(code: string): Promise<TechnicianResponseDto> {
    return TechnicianResponseDto.from(await this.findByCodeOrFail(code));
  }
}
