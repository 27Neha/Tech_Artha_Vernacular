import { Injectable, Logger } from '@nestjs/common';
import { AIProvider } from './ai.provider';

@Injectable()
export class OllamaProvider extends AIProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly OLLAMA_URL = 'http://127.0.0.1:11434/api/generate';
  private readonly MODEL = 'llama3';

  async chat(prompt: string, context: any, locale: string): Promise<string> {
    const systemPrompt = `You are the TechArtha AI Support Assistant. 
You answer strictly using the provided context. 
Topics allowed: KYC, SIP, Mutual Funds, NAV, Risk Profiling, Investment Buckets, Portfolio, Transactions, Expenses, Goals, Market Risk Disclosures.
Do not allow the user to execute investments or modify financial data. If they ask to do so, politely tell them to use the app interface for security reasons.
Your output MUST be in this language code: ${locale} (en=English, hi=Hindi, mr=Marathi).
Keep answers short and professional.

Backend Context Data (Use this to answer queries about their specific portfolio or expenses):
${JSON.stringify(context, null, 2)}
`;

    try {
      const response = await fetch(this.OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.MODEL,
          prompt: prompt,
          system: systemPrompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP error: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error: any) {
      this.logger.warn(`Ollama connection failed, falling back to rule-based: ${error.message}`);
      throw error;
    }
  }
}
