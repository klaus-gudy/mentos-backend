import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermGroup, permCatalog, unknownPermKeys } from '../common/rbac/perm-catalog';
import { BUILT_IN_ROLES } from './built-in-roles';
import { CreateRoleDto, RoleResponseDto, UpdateRoleDto } from './dto/role.dto';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roles: Repository<Role>,
  ) {}

  /** The permission catalog that drives the frontend's role editor. */
  catalog(): PermGroup[] {
    return permCatalog;
  }

  async findAll(): Promise<RoleResponseDto[]> {
    const roles = await this.roles.find({ order: { createdAt: 'ASC' } });
    const counts = await this.userCounts();
    return roles.map((r) => RoleResponseDto.from(r, counts.get(r.id) ?? 0));
  }

  async findByCodeOrFail(code: string): Promise<Role> {
    const role = await this.roles.findOne({ where: { code } });
    if (!role) {
      throw new NotFoundException(`Role "${code}" not found`);
    }
    return role;
  }

  async findOne(code: string): Promise<RoleResponseDto> {
    const role = await this.findByCodeOrFail(code);
    const counts = await this.userCounts();
    return RoleResponseDto.from(role, counts.get(role.id) ?? 0);
  }

  async create(dto: CreateRoleDto): Promise<RoleResponseDto> {
    const code = RolesService.slugify(dto.name);

    if (await this.roles.exists({ where: [{ code }, { name: dto.name }] })) {
      throw new ConflictException(`A role named "${dto.name}" already exists`);
    }

    const perms = dto.perms ?? [];
    RolesService.assertKnownPerms(perms);

    const role = await this.roles.save(
      this.roles.create({
        code,
        name: dto.name,
        description: dto.description ?? 'Custom role — configure module permissions below.',
        perms,
        isSystem: false,
      }),
    );

    return RoleResponseDto.from(role, 0);
  }

  async update(code: string, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    const role = await this.findByCodeOrFail(code);

    if (dto.name && dto.name !== role.name) {
      if (role.isSystem) {
        throw new BadRequestException('Built-in roles cannot be renamed');
      }
      if (await this.roles.exists({ where: { name: dto.name } })) {
        throw new ConflictException(`A role named "${dto.name}" already exists`);
      }
      role.name = dto.name;
    }

    if (dto.description !== undefined) {
      role.description = dto.description;
    }

    await this.roles.save(role);
    return this.findOne(role.code);
  }

  /** Full replacement of the permission set (the frontend's `setRolePerms`). */
  async setPerms(code: string, perms: string[]): Promise<RoleResponseDto> {
    const role = await this.findByCodeOrFail(code);
    RolesService.assertKnownPerms(perms);

    role.perms = [...new Set(perms)];
    await this.roles.save(role);
    return this.findOne(role.code);
  }

  async remove(code: string): Promise<void> {
    const role = await this.findByCodeOrFail(code);

    if (role.isSystem) {
      throw new BadRequestException('Built-in roles cannot be deleted');
    }

    const counts = await this.userCounts();
    const assigned = counts.get(role.id) ?? 0;
    if (assigned > 0) {
      throw new ConflictException(
        `Cannot delete "${role.name}" — ${assigned} user(s) still hold it. Reassign them first.`,
      );
    }

    await this.roles.remove(role);
  }

  /**
   * Upserts the built-in roles, refreshing their permission sets so a new key
   * added to the catalog reaches existing installs. Custom roles are untouched.
   *
   * Used by the seeder and by bootstrap registration.
   */
  async ensureBuiltInRoles(): Promise<void> {
    for (const data of BUILT_IN_ROLES) {
      const existing = await this.roles.findOne({ where: { code: data.code } });
      if (existing) {
        existing.name = data.name;
        existing.description = data.description;
        existing.perms = data.perms;
        existing.isSystem = true;
        await this.roles.save(existing);
      } else {
        await this.roles.save(this.roles.create({ ...data, isSystem: true }));
      }
    }
  }

  /** roleId → number of users, in one grouped query rather than N counts. */
  private async userCounts(): Promise<Map<string, number>> {
    const rows = await this.roles
      .createQueryBuilder('role')
      .leftJoin('role.users', 'user')
      .select('role.id', 'roleId')
      .addSelect('COUNT(user.id)', 'count')
      .groupBy('role.id')
      .getRawMany<{ roleId: string; count: string }>();

    return new Map(rows.map((r) => [r.roleId, parseInt(r.count, 10)]));
  }

  private static assertKnownPerms(perms: string[]): void {
    const unknown = unknownPermKeys(perms);
    if (unknown.length > 0) {
      throw new BadRequestException(`Unknown permission key(s): ${unknown.join(', ')}`);
    }
  }

  /** "Regional Supervisor" → "role-regional-supervisor", matching the frontend. */
  private static slugify(name: string): string {
    return (
      'role-' +
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    );
  }
}
