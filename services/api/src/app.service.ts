import { Injectable } from '@nestjs/common';
import { ApiHealthService } from './modules/api-health/api-health.service';

@Injectable()
export class AppService {
  constructor(private readonly health: ApiHealthService) {}

  getHealth() {
    return this.health.service();
  }
}
