import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { MAINTENANCE_CATEGORIES } from '../../common/maintenance-categories';
import { MaintenanceRequest, MaintenanceStatus, Priority } from '../entities/maintenance-request.entity';

/** Frontend-facing shape — mirrors mentos-frontend's `MaintenanceRequest` exactly. */
export class MaintenanceRequestResponseDto {
  @ApiProperty({ example: 'MR-08', description: 'Business code, used as id by frontend' })
  id: string;

  @ApiProperty({ example: 'U-101' })
  unitId: string;

  @ApiProperty({ example: 'P-01' })
  propId: string;

  @ApiProperty({ nullable: true, example: 'T-01', description: "Occupying tenant's code at submission time, or null" })
  tenantId: string | null;

  @ApiProperty({ enum: MAINTENANCE_CATEGORIES, example: 'Plumbing' })
  category: string;

  @ApiProperty({ example: 'Leaking kitchen sink' })
  title: string;

  @ApiProperty({ example: 'Water pools under the sink cabinet whenever the tap is used.' })
  description: string;

  @ApiProperty({ enum: Priority, example: Priority.High })
  priority: Priority;

  @ApiProperty({ enum: MaintenanceStatus, example: MaintenanceStatus.Open })
  status: MaintenanceStatus;

  @ApiProperty({ nullable: true, example: null, description: "Assigned technician's display name, or null" })
  assignee: string | null;

  @ApiProperty({ nullable: true, example: null, description: "Assigned technician's code, or null" })
  assigneeId: string | null;

  @ApiProperty({ example: 0 })
  cost: number;

  @ApiProperty({ example: '2026-06-30T00:00:00.000Z', description: 'ISO timestamp' })
  created: string;

  @ApiProperty({ example: 'Weekday mornings' })
  preferred: string;

  static from(request: MaintenanceRequest): MaintenanceRequestResponseDto {
    return {
      id: request.code,
      unitId: request.unit?.code ?? '',
      propId: request.property?.code ?? '',
      tenantId: request.tenant?.code ?? null,
      category: request.category,
      title: request.title,
      description: request.description,
      priority: request.priority,
      status: request.status,
      assignee: request.assignee?.name ?? null,
      assigneeId: request.assignee?.code ?? null,
      cost: parseFloat(request.cost.toString()),
      created: request.createdAt.toISOString(),
      preferred: request.preferred,
    };
  }

  static fromMany(requests: MaintenanceRequest[]): MaintenanceRequestResponseDto[] {
    return requests.map((r) => MaintenanceRequestResponseDto.from(r));
  }
}

/** Mirrors mentos-frontend's `NewMaintenanceInput`. */
export class CreateMaintenanceRequestDto {
  @ApiProperty({ enum: MAINTENANCE_CATEGORIES, example: 'Plumbing' })
  @IsString()
  @IsIn(MAINTENANCE_CATEGORIES)
  category: string;

  @ApiProperty({ enum: Priority, example: Priority.High })
  @IsEnum(Priority)
  priority: Priority;

  @ApiProperty({ example: 'Leaking kitchen sink' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Water pools under the sink cabinet whenever the tap is used.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ example: 'U-101' })
  @IsString()
  @IsNotEmpty()
  unitId: string;

  @ApiPropertyOptional({ example: 'Weekday mornings', description: 'Defaults to "Any time" if omitted' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  preferred?: string;
}

export class AssignMaintenanceDto {
  @ApiProperty({ example: 'TECH-01' })
  @IsString()
  @IsNotEmpty()
  technicianId: string;
}

export class CompleteMaintenanceDto {
  @ApiProperty({ example: 180000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost: number;
}
