import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({ origin: !corsOrigin || corsOrigin === '*' ? true : corsOrigin.split(',') });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  Logger.log(`TechArtha API listening on ${await app.getUrl()}`, 'Bootstrap');
}
bootstrap();
