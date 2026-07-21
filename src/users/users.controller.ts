import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';
import { InviteResult, UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Permissions('user.read')
  @ApiOperation({ summary: 'List users' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  findAll(): Promise<UserResponseDto[]> {
    return this.users.findAll();
  }

  @Get(':code')
  @Permissions('user.read')
  @ApiOperation({ summary: 'Get one user' })
  findOne(@Param('code') code: string): Promise<UserResponseDto> {
    return this.users.findOne(code);
  }

  @Post()
  @Permissions('user.create')
  @ApiOperation({
    summary: 'Invite a user',
    description:
      'Creates an `invited` account with no password and emails an activation link. ' +
      'In development the token is returned as `devToken` so the flow can be completed from Swagger.',
  })
  invite(@Body() dto: CreateUserDto): Promise<InviteResult> {
    return this.users.invite(dto);
  }

  @Post(':code/resend-invite')
  @Permissions('user.create')
  @ApiOperation({ summary: 'Re-send an invite', description: 'Retires the previous link.' })
  resendInvite(@Param('code') code: string): Promise<InviteResult> {
    return this.users.resendInvite(code);
  }

  @Patch(':code')
  @Permissions('user.update')
  @ApiOperation({ summary: 'Edit a user’s name, role, status or MFA flag' })
  update(
    @Param('code') code: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: User,
  ): Promise<UserResponseDto> {
    return this.users.update(code, dto, actor.id);
  }

  @Post(':code/toggle-status')
  @Permissions('user.update')
  @ApiOperation({
    summary: 'Suspend or reactivate a user',
    description: 'Suspending revokes every session immediately.',
  })
  toggleStatus(@Param('code') code: string, @CurrentUser() actor: User): Promise<UserResponseDto> {
    return this.users.toggleStatus(code, actor.id);
  }
}
