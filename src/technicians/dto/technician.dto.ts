import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsEmail, IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { MAINTENANCE_CATEGORIES } from '../../common/maintenance-categories';
import { Technician, TechnicianStatus } from '../entities/technician.entity';

/** Frontend-facing technician shape — mirrors mentos-frontend's `Technician` exactly. */
export class TechnicianResponseDto {
  @ApiProperty({ example: 'TECH-01', description: 'Business code, used as id by frontend' })
  id: string;

  @ApiProperty({ example: 'Hamisi Kibo' })
  name: string;

  @ApiProperty({ example: '+255 713 447 218' })
  phone: string;

  @ApiProperty({ example: 'hamisi.kibo@fixit.co.tz' })
  email: string;

  @ApiProperty({ type: [String], example: ['Electrical'], description: 'Maintenance categories covered' })
  skills: string[];

  @ApiProperty({ enum: TechnicianStatus, example: TechnicianStatus.Active })
  status: TechnicianStatus;

  @ApiProperty({ example: false, description: 'True for a company/vendor rather than an individual' })
  company: boolean;

  @ApiProperty({ example: '2024-02-01', description: 'ISO date' })
  since: string;

  static from(technician: Technician): TechnicianResponseDto {
    return {
      id: technician.code,
      name: technician.name,
      phone: technician.phone,
      email: technician.email,
      skills: technician.skills,
      status: technician.status,
      company: technician.company,
      since: technician.since,
    };
  }

  static fromMany(technicians: Technician[]): TechnicianResponseDto[] {
    return technicians.map((t) => TechnicianResponseDto.from(t));
  }
}

/** Mirrors mentos-frontend's `NewTechnicianInput`. No update endpoint exists — the frontend never edits a technician after creation, only lists/filters them. */
export class CreateTechnicianDto {
  @ApiProperty({ example: 'Hamisi Kibo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @ApiProperty({ example: '+255 713 447 218' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone: string;

  @ApiProperty({ example: 'hamisi.kibo@fixit.co.tz' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    type: [String],
    example: ['Electrical'],
    enum: MAINTENANCE_CATEGORIES,
    isArray: true,
    description: 'At least one maintenance category',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(MAINTENANCE_CATEGORIES, { each: true })
  skills: string[];

  @ApiProperty({ example: false })
  @IsBoolean()
  company: boolean;
}
