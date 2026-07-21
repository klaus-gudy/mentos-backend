import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermGroup } from '../common/rbac/perm-catalog';
import { CreateRoleDto, RoleResponseDto, SetRolePermsDto, UpdateRoleDto } from './dto/role.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get('permissions/catalog')
  @Permissions('role.read')
  @ApiOperation({
    summary: 'Permission catalog',
    description: 'Every `<resource>.<action>` key, grouped for the role editor UI.',
  })
  catalog(): PermGroup[] {
    return this.roles.catalog();
  }

  @Get()
  @Permissions('role.read')
  @ApiOperation({ summary: 'List roles' })
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  findAll(): Promise<RoleResponseDto[]> {
    return this.roles.findAll();
  }

  @Get(':code')
  @Permissions('role.read')
  @ApiOperation({ summary: 'Get one role' })
  findOne(@Param('code') code: string): Promise<RoleResponseDto> {
    return this.roles.findOne(code);
  }

  @Post()
  @Permissions('role.create')
  @ApiOperation({ summary: 'Create a custom role' })
  @ApiResponse({ status: 201, type: RoleResponseDto })
  create(@Body() dto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.roles.create(dto);
  }

  @Patch(':code')
  @Permissions('role.update')
  @ApiOperation({ summary: 'Rename a role or edit its description' })
  update(@Param('code') code: string, @Body() dto: UpdateRoleDto): Promise<RoleResponseDto> {
    return this.roles.update(code, dto);
  }

  @Put(':code/permissions')
  @Permissions('role.update')
  @ApiOperation({
    summary: 'Replace a role permission set',
    description: 'Sends the full set — omitted keys are revoked.',
  })
  setPerms(@Param('code') code: string, @Body() dto: SetRolePermsDto): Promise<RoleResponseDto> {
    return this.roles.setPerms(code, dto.perms);
  }

  @Delete(':code')
  @Permissions('role.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a custom role',
    description: 'Refused for built-in roles and for roles that still have users.',
  })
  remove(@Param('code') code: string): Promise<void> {
    return this.roles.remove(code);
  }
}
