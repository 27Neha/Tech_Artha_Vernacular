import { Module } from '@nestjs/common';
import { PostbackController } from './postback.controller';

@Module({ controllers: [PostbackController] })
export class PostbackModule {}
