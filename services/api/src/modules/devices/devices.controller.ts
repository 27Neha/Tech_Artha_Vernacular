import { Controller, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @UseGuards(AccessTokenGuard)
  @Post('register-push-token')
  async registerPushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body('expoPushToken') expoPushToken: string,
    @Body('deviceId') deviceId: string,
  ) {
    return this.devicesService.registerToken(user.id, deviceId, expoPushToken);
  }

  @UseGuards(AccessTokenGuard)
  @Delete('push-token/:deviceId')
  async unregisterPushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Param('deviceId') deviceId: string,
  ) {
    return this.devicesService.unregisterToken(user.id, deviceId);
  }
}
