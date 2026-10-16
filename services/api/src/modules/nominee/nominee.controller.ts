import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { NomineeService } from './nominee.service';
import { UpsertNomineeDto } from './nominee.dto';

@Controller('nominees')
@UseGuards(AccessTokenGuard)
export class NomineeController {
  constructor(private readonly nominees: NomineeService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.nominees.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertNomineeDto) {
    return this.nominees.create(user.id, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpsertNomineeDto,
  ) {
    return this.nominees.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.nominees.remove(user.id, id);
  }
}
