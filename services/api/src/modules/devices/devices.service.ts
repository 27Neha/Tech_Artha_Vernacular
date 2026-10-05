import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async registerToken(userId: string, deviceId: string, expoPushToken: string) {
    if (!deviceId) return { success: false, error: 'Device ID required' };
    
    // Upsert the device using deviceId as unique identifier
    const device = await this.prisma.device.upsert({
      where: { deviceId },
      update: {
        userId,
        expoPushToken,
        lastActiveAt: new Date(),
      },
      create: {
        deviceId,
        userId,
        expoPushToken,
        deviceType: 'mobile',
      },
    });

    return { success: true, deviceId: device.deviceId };
  }

  async unregisterToken(userId: string, deviceId: string) {
    if (!deviceId) return { success: false, error: 'Device ID required' };

    try {
      await this.prisma.device.delete({
        where: { deviceId },
      });
    } catch (e) {
      // Ignored if not found
    }

    return { success: true };
  }
}
