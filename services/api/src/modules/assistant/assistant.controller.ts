import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('messages')
  @UseGuards(AccessTokenGuard)
  async handleMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Body('message') message: string,
    @Body('history') history: any[],
    @Body('locale') locale: string,
  ) {
    const text = await this.assistantService.getAIResponse(user.id, message, history, locale);
    return { text };
  }
}
