import { Controller, Get } from '@nestjs/common';
import { ApiHealthService } from './api-health.service';

@Controller('health')
export class ApiHealthController {
  constructor(private readonly health: ApiHealthService) {}

  @Get()
  service() { return this.health.service(); }

  @Get('database')
  database() { return this.health.database(); }

  @Get('redis')
  redis() { return { status: process.env.REDIS_URL ? 'NOT_IMPLEMENTED' : 'NOT_CONFIGURED' }; }

  @Get('providers')
  providers() { return this.health.providers(); }
}
