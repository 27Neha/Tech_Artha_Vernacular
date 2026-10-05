import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AssistantService {
  private readonly apiKey = process.env.OPENAI_API_KEY;
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(private readonly prisma: PrismaService) {}

  private readonly systemPrompt = `You are the TechArtha Support Assistant. 
TechArtha is a WealthTech and investment platform specifically designed for first-time investors. 

Your guidelines:
1. Explain financial concepts simply and clearly for beginners.
2. Answer questions about TechArtha features, onboarding, KYC, investments, SIPs (Systematic Investment Plans), goals, risk assessment, and portfolio tracking.
3. NEVER provide personalized financial advice, recommend specific stocks/funds, or make investment decisions for the user.
4. DO NOT invent or hallucinate TechArtha policies, fees, investment facts, transaction status, or account information. If you do not know, clearly state that you do not have enough information and advise the user to contact the support team.
5. NEVER ask the user for passwords, OTPs, API keys, or any other sensitive credentials.
6. Keep your responses concise, helpful, and friendly.
7. Be encouraging to first-time investors to help them feel confident.

Always respond in the user's preferred language if possible.`;

  async getAIResponse(userId: string, message: string, history: any[] = [], locale: string = 'en'): Promise<string> {
    if (!this.apiKey) {
      console.error('OPENAI_API_KEY is not configured in environment variables.');
      throw new InternalServerErrorException('AI provider is not configured on the server.');
    }

    try {
      // Get user's risk profile to provide contextual answers
      const profile = await this.prisma.riskProfile.findUnique({ where: { userId } });
      let contextPrompt = this.systemPrompt;
      
      if (profile && profile.category) {
        contextPrompt += `\n\nUSER CONTEXT:\nThe user has completed their risk assessment and their risk profile is "${profile.category}". You can use this context to explain how it relates to general investment concepts, but do not provide personalized financial advice based on it.`;
      }

      const messages = [
        { role: 'system', content: contextPrompt },
        ...history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        { role: 'user', content: message }
      ];

      const response = await axios.post(
        this.apiUrl,
        {
          model: 'gpt-3.5-turbo',
          messages,
          temperature: 0.3,
          max_tokens: 500
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        },
      );

      return response.data.choices[0].message.content.trim();
    } catch (error: any) {
      console.error('Error communicating with OpenAI:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to get response from AI assistant');
    }
  }
}
