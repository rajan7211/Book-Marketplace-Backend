import { registerAs } from '@nestjs/config';

/**
 * OpenAI configuration.
 *
 * All values are read from environment variables and are OPTIONAL at boot so
 * the application still starts without an API key. The `OpenAiService` throws a
 * clean, user-facing error at request time when the key is missing.
 *
 * Never hardcode secrets here — they live only in environment / `.env`
 * (which is gitignored). See `.env.example` for documentation.
 */
export default registerAs('openai', () => ({
  /** Required for the assistant to actually answer. */
  apiKey: process.env.OPENAI_API_KEY ?? '',
  /** Default model. Override per-environment with OPENAI_MODEL. */
  model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  /**
   * Optional base URL — useful for Azure OpenAI, OpenRouter, or proxies.
   * Left undefined to use the official OpenAI endpoint.
   */
  baseURL: process.env.OPENAI_BASE_URL || undefined,
  /** Sampling temperature — lower = more deterministic / grounded. */
  temperature: Number(process.env.OPENAI_TEMPERATURE ?? '0.3'),
  /** Hard cap on tokens in a single assistant reply. */
  maxTokens: Number(process.env.OPENAI_MAX_TOKENS ?? '700'),
}));