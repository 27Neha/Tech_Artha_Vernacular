import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { SupportService } from './support.service';
import { CreateSupportQueryDto, SupportQueryResponseDto } from './support.dto';

@Controller(['support', 'api/v1/support'])
@UseGuards(AccessTokenGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('queries')
  @HttpCode(HttpStatus.CREATED)
  async submitQuery(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupportQueryDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-idempotency-key') xIdempotencyKey?: string,
  ): Promise<SupportQueryResponseDto> {
    const effectiveKey = idempotencyKey || xIdempotencyKey || dto.idempotencyKey;
    return this.supportService.createQuery(user.id, {
      ...dto,
      idempotencyKey: effectiveKey,
    });
  }

  @Get('queries')
  async listQueries(@CurrentUser() user: AuthenticatedUser): Promise<SupportQueryResponseDto[]> {
    return this.supportService.getUserQueries(user.id);
  }

  @Get('queries/:id')
  async getQuery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<SupportQueryResponseDto> {
    return this.supportService.getQueryById(user.id, id);
  }
}
