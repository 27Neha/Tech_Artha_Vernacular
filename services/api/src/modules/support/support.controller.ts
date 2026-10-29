import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { SupportService } from './support.service';
import { CreateSupportQueryDto, SupportQueryResponseDto } from './support.dto';
import { JwtService } from '@nestjs/jwt';

@Controller(['support', 'api/v1/support'])
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly jwt: JwtService,
  ) {}

  @Post('queries')
  @HttpCode(HttpStatus.CREATED)
  async submitQuery(
    @Req() req: any,
    @Body() dto: CreateSupportQueryDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-idempotency-key') xIdempotencyKey?: string,
  ): Promise<SupportQueryResponseDto> {
    const effectiveKey = idempotencyKey || xIdempotencyKey || dto.idempotencyKey;

    let resolvedUserId: string | null = req?.user?.id || req?.id || null;
    const authHeader = req?.headers?.authorization;
    if (!resolvedUserId && authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      try {
        const payload = await this.jwt?.verifyAsync<{ sub: string }>(authHeader.slice(7));
        resolvedUserId = payload?.sub || null;
      } catch {
        // Allow query to be created even if token has expired or is invalid
      }
    }

    return this.supportService.createQuery(resolvedUserId, {
      ...dto,
      idempotencyKey: effectiveKey,
    });
  }

  @Get('queries')
  @UseGuards(AccessTokenGuard)
  async listQueries(@CurrentUser() user: AuthenticatedUser): Promise<SupportQueryResponseDto[]> {
    return this.supportService.getUserQueries(user.id);
  }

  @Get('queries/:id')
  @UseGuards(AccessTokenGuard)
  async getQuery(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<SupportQueryResponseDto> {
    return this.supportService.getQueryById(user.id, id);
  }
}
