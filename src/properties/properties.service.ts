import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreatePropertyDto, PropertyResponseDto, UpdatePropertyDto } from './dto/property.dto';
import { Property, PropertyStatus, PropertyType } from './entities/property.entity';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private readonly properties: Repository<Property>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Allocates the next `P-n` code and inserts the property in one transaction,
   * so two concurrent creates cannot claim the same code.
   */
  async create(dto: CreatePropertyDto): Promise<PropertyResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Property);
      await manager.query('LOCK TABLE properties IN SHARE ROW EXCLUSIVE MODE');

      const row = await repo
        .createQueryBuilder('property')
        .select('COALESCE(MAX(CAST(SUBSTRING(property.code FROM 3) AS INTEGER)), 0)', 'max')
        .getRawOne<{ max: string }>();

      const property = new Property();
      property.code = `P-${parseInt(row?.max ?? '0', 10) + 1}`;
      property.name = dto.name;
      property.description = dto.description ?? null;
      property.address = dto.address;
      property.city = dto.city ?? null;
      property.zipCode = dto.zipCode ?? null;
      property.type = dto.type ?? PropertyType.Residential;
      property.status = PropertyStatus.Active;
      property.unitCount = 0;

      const saved = await repo.save(property);
      return PropertyResponseDto.from(saved);
    });
  }

  async findAll(): Promise<PropertyResponseDto[]> {
    const properties = await this.properties.find({
      where: { status: PropertyStatus.Active },
      order: { createdAt: 'ASC' },
      relations: ['units'],
    });
    return properties.map((p) => PropertyResponseDto.from(p));
  }

  async findByCodeOrFail(code: string): Promise<Property> {
    const property = await this.properties.findOne({
      where: { code },
      relations: ['units'],
    });
    if (!property) {
      throw new NotFoundException(`Property "${code}" not found`);
    }
    return property;
  }

  async findOne(code: string): Promise<PropertyResponseDto> {
    const property = await this.findByCodeOrFail(code);
    // Sort units by their code for a consistent order
    if (property.units) {
      property.units.sort((a, b) => a.code.localeCompare(b.code));
    }
    return PropertyResponseDto.from(property, true);
  }

  async update(code: string, dto: UpdatePropertyDto): Promise<PropertyResponseDto> {
    const property = await this.findByCodeOrFail(code);

    if (dto.name !== undefined) {
      property.name = dto.name;
    }
    if (dto.description !== undefined) {
      property.description = dto.description ?? null;
    }
    if (dto.address !== undefined) {
      property.address = dto.address;
    }
    if (dto.city !== undefined) {
      property.city = dto.city ?? null;
    }
    if (dto.zipCode !== undefined) {
      property.zipCode = dto.zipCode ?? null;
    }
    if (dto.type !== undefined) {
      property.type = dto.type;
    }
    if (dto.status !== undefined) {
      property.status = dto.status;
    }

    await this.properties.save(property);
    return this.findOne(code);
  }

  async archive(code: string): Promise<PropertyResponseDto> {
    const property = await this.findByCodeOrFail(code);
    property.status = PropertyStatus.Archived;
    await this.properties.save(property);
    return PropertyResponseDto.from(property);
  }

  /**
   * Called by UnitsService when a unit is created/deleted to keep unitCount
   * in sync. Denormalization for quick property list display.
   */
  async updateUnitCount(propertyId: string, count: number): Promise<void> {
    await this.properties.update(propertyId, { unitCount: count });
  }
}
