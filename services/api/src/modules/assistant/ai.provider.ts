export abstract class AIProvider {
  abstract chat(prompt: string, context: any, locale: string): Promise<string>;
}
