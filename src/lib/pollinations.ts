/**
 * Pollinations API Client
 *
 * All communication with gen.pollinations.ai happens through this module.
 * Endpoints reference: https://github.com/pollinations/pollinations/blob/main/APIDOCS.md
 */

import type {
  PollinationsModel,
  ModelCapabilities,
  ModelPricing,
  AccountBalance,
  AccountProfile,
  ApiKeyInfo,
  UsageRecord,
  StreamDelta,
} from '../types';

const BASE = 'https://gen.pollinations.ai';

// ─── Helpers ─────────────────────────────────────────────────────

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

async function safeFetch(url: string, init?: RequestInit) {
  try {
    return await fetch(url, init);
  } catch (err) {
    // Network errors (offline, DNS, CORS)
    if (err instanceof TypeError) {
      throw new PollinationsError(
        'Unable to connect to the server. Please check your internet connection and try again.',
        0,
        'network_error',
      );
    }
    throw err;
  }
}

// ─── API Key Validation ──────────────────────────────────────────

/**
 * Validate an API key without making an expensive generation request.
 * Uses GET /account/key which returns key info + validity.
 */
export async function validateApiKey(apiKey: string): Promise<ApiKeyInfo> {
  const res = await safeFetch(`${BASE}/account/key`, {
    headers: headers(apiKey),
  });
  if (!res.ok) {
    if (res.status === 401) throw new PollinationsError('Invalid or expired API key. Please sign in again.', 401, 'invalid_key');
    throw new PollinationsError('Unable to validate your API key. Please try again later.', res.status, 'validation_failed');
  }
  return res.json();
}

// ─── Account ─────────────────────────────────────────────────────

export async function getBalance(apiKey: string): Promise<AccountBalance> {
  const res = await safeFetch(`${BASE}/account/balance`, {
    headers: headers(apiKey),
  });
  if (!res.ok) throw new PollinationsError('Unable to fetch your balance. Please try again later.', res.status, 'balance_failed');
  return res.json();
}

export async function getProfile(apiKey: string): Promise<AccountProfile> {
  const res = await safeFetch(`${BASE}/account/profile`, {
    headers: headers(apiKey),
  });
  if (!res.ok) throw new PollinationsError('Unable to fetch your profile. Please try again later.', res.status, 'profile_failed');
  return res.json();
}

export async function getUsage(
  apiKey: string,
): Promise<{ usage: UsageRecord[]; count: number }> {
  const res = await safeFetch(`${BASE}/account/usage`, {
    headers: headers(apiKey),
  });
  if (!res.ok) throw new PollinationsError('Unable to fetch usage data. Please try again later.', res.status, 'usage_failed');
  return res.json();
}

// ─── Smoke Tests ─────────────────────────────────────────────────

/**
 * Minimal smoke test: sends a tiny chat completion request to verify
 * the key works with a given model.  Returns { ok, status, userTier }.
 */
export async function smokeTest(
  apiKey: string,
  modelName: string,
  prompt = 'hi',
): Promise<{ ok: boolean; status: number; userTier?: string; error?: string }> {
  try {
    const res = await safeFetch(`${BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4,
        stream: false,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return {
        ok: false,
        status: res.status,
        error: body?.error?.message ?? `HTTP ${res.status}`,
      };
    }
    const body = await res.json();
    return {
      ok: true,
      status: res.status,
      userTier: body.user_tier,
    };
  } catch (err) {
    return { ok: false, status: 0, error: String(err) };
  }
}

// ─── Model Discovery ─────────────────────────────────────────────

interface RawTextModel {
  name: string;
  aliases?: string[];
  pricing?: ModelPricing;
  description?: string;
  input_modalities?: string[];
  output_modalities?: string[];
  paid_only?: boolean;
  context_length?: number;
  max_input_tokens?: number;
  max_output_tokens?: number;
  // capabilities
  vision?: boolean;
  audio?: boolean;
  web_search?: boolean;
  deep_think?: boolean;
  code_execution?: boolean;
  // extra fields from API
  tools?: boolean;
  reasoning?: boolean;
  voices?: string[];
  is_specialized?: boolean;
}

interface RawImageModel {
  name: string;
  aliases?: string[];
  pricing?: ModelPricing;
  description?: string;
  input_modalities?: string[];
  output_modalities?: string[];
  paid_only?: boolean;
}

interface RawAudioModel {
  name: string;
  aliases?: string[];
  pricing?: ModelPricing;
  description?: string;
  input_modalities?: string[];
  output_modalities?: string[];
  paid_only?: boolean;
  voices?: string[];
}

function inferCapabilities(m: RawTextModel): ModelCapabilities {
  const inputs = m.input_modalities ?? [];
  const name = m.name.toLowerCase();
  return {
    vision: inputs.includes('image') || !!m.vision,
    audio:
      inputs.includes('audio') ||
      !!m.audio ||
      name.includes('audio'),
    streaming: true, // all text models support streaming via /v1/chat/completions
    webSearch:
      !!m.web_search ||
      name.includes('search') ||
      name.includes('perplexity'),
    deepThink:
      !!m.deep_think ||
      name.includes('deepseek') ||
      name.includes('reasoning'),
    codeExecution: !!m.code_execution || name.includes('coder'),
  };
}

/** Default token limits when metadata doesn't specify them */
function defaultTokenLimits(name: string): {
  maxInput: number;
  maxOutput: number;
} {
  const n = name.toLowerCase();
  if (n.includes('large')) return { maxInput: 128000, maxOutput: 8192 };
  if (n.includes('fast') || n.includes('mini'))
    return { maxInput: 32000, maxOutput: 4096 };
  return { maxInput: 64000, maxOutput: 4096 };
}

export async function getTextModels(apiKey?: string): Promise<PollinationsModel[]> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) h.Authorization = `Bearer ${apiKey}`;

  const res = await safeFetch(`${BASE}/text/models`, { headers: h });
  if (!res.ok) throw new Error(`Failed to fetch text models: ${res.status}`);
  const raw: RawTextModel[] = await res.json();

  return raw.map((m) => {
    const limits = defaultTokenLimits(m.name);
    const maxInput = m.max_input_tokens ?? m.context_length ?? limits.maxInput;
    const maxOutput = m.max_output_tokens ?? limits.maxOutput;

    // Detect audio models based on output modalities or capabilities
    const outputs = m.output_modalities ?? ['text'];
    const isAudio = outputs.includes('audio') || !!m.audio || m.name.toLowerCase().includes('audio');

    return {
      id: m.name,
      name: m.name,
      description: m.description ?? '',
      type: isAudio ? ('audio' as const) : ('text' as const),
      inputModalities: m.input_modalities ?? ['text'],
      outputModalities: m.output_modalities ?? ['text'],
      paidOnly: m.paid_only ?? false,
      pricing: m.pricing ?? { currency: 'pollen' },
      capabilities: inferCapabilities(m),
      maxInputTokens: maxInput,
      maxOutputTokens: maxOutput,
      contextLength: maxInput + maxOutput,
      aliases: m.aliases ?? [],
    };
  });
}

export async function getImageModels(apiKey?: string): Promise<PollinationsModel[]> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) h.Authorization = `Bearer ${apiKey}`;

  const res = await safeFetch(`${BASE}/image/models`, { headers: h });
  if (!res.ok) throw new Error(`Failed to fetch image models: ${res.status}`);
  const raw: RawImageModel[] = await res.json();

  return raw.map((m) => {
    const outputs = m.output_modalities ?? ['image'];
    const isVideo = outputs.includes('video');
    return {
      id: m.name,
      name: m.name,
      description: m.description ?? '',
      type: isVideo ? ('video' as const) : ('image' as const),
      inputModalities: m.input_modalities ?? ['text'],
      outputModalities: outputs,
      paidOnly: m.paid_only ?? false,
      pricing: m.pricing ?? { currency: 'pollen' },
      capabilities: {
        vision: (m.input_modalities ?? []).includes('image'),
        audio: false,
        streaming: false,
        webSearch: false,
        deepThink: false,
        codeExecution: false,
      },
      maxInputTokens: 4096,
      maxOutputTokens: 1, // 1 image/video
      contextLength: 4097,
      aliases: m.aliases ?? [],
    };
  });
}

export async function getAudioModels(apiKey?: string): Promise<PollinationsModel[]> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) h.Authorization = `Bearer ${apiKey}`;

  const res = await safeFetch(`${BASE}/audio/models`, { headers: h });
  if (!res.ok) throw new Error(`Failed to fetch audio models: ${res.status}`);
  const raw: RawAudioModel[] = await res.json();

  return raw.map((m) => {
    return {
      id: m.name,
      name: m.name,
      description: m.description ?? '',
      type: 'audio' as const,
      inputModalities: m.input_modalities ?? ['text'],
      outputModalities: m.output_modalities ?? ['audio'],
      paidOnly: m.paid_only ?? false,
      pricing: m.pricing ?? { currency: 'pollen' },
      capabilities: {
        vision: false,
        audio: true,
        streaming: false,
        webSearch: false,
        deepThink: false,
        codeExecution: false,
      },
      maxInputTokens: 4096,
      maxOutputTokens: 1,
      contextLength: 4097,
      aliases: m.aliases ?? [],
    };
  });
}

/**
 * Fetch all models (text + image/video + audio) and return combined list.
 */
export async function getAllModels(apiKey?: string): Promise<PollinationsModel[]> {
  const [text, image] = await Promise.all([
    getTextModels(apiKey),
    getImageModels(apiKey),
  ]);
  // Filter out audio-type models
  const filtered = text.filter((m) => m.type !== 'audio');
  return [...filtered, ...image];
}

// ─── Streaming Generation ────────────────────────────────────────

export interface ChatCompletionPayload {
  model: string;
  messages: Array<{
    role: string;
    content: string | Array<{ type: string; [k: string]: unknown }>;
  }>;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  stream_options?: { include_usage: boolean };
}

/**
 * Stream a chat completion from the Pollinations API.
 * Uses fetch + ReadableStream to parse SSE chunks.
 *
 * @param apiKey   - user's API key
 * @param payload  - OpenAI-compatible chat completions payload
 * @param onChunk  - called with each text delta as it arrives
 * @param onDone   - called when stream ends, with final usage data
 * @param signal   - optional AbortSignal to cancel the stream
 */
export async function streamGeneration(
  apiKey: string,
  payload: ChatCompletionPayload,
  onChunk: (text: string) => void,
  onDone: (usage?: StreamDelta['usage'], userTier?: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const body = {
    ...payload,
    stream: true,
    stream_options: { include_usage: true },
  };

  const res = await fetch(`${BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    const code = errBody?.error?.code ?? '';
    const msg = errBody?.error?.message ?? `HTTP ${res.status}`;
    throw new PollinationsError(msg, res.status, code);
  }

  // Validate that we got a streaming response, not a JSON error with 200
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json') && !contentType.includes('stream')) {
    const errBody = await res.json().catch(() => null);
    const msg = errBody?.error?.message ?? 'Model does not support text streaming';
    throw new PollinationsError(msg, 200, errBody?.error?.code ?? 'unsupported_model');
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new PollinationsError('The server returned an empty response. Please try again.', 0, 'empty_body');
  }
  const decoder = new TextDecoder();
  let buffer = '';
  let lastUsage: StreamDelta['usage'] | undefined;
  let lastTier: string | undefined;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === ':') continue;
      if (trimmed === 'data: [DONE]') {
        onDone(lastUsage, lastTier);
        return;
      }
      if (trimmed.startsWith('data: ')) {
        try {
          const json: StreamDelta = JSON.parse(trimmed.slice(6));
          if (json.usage) lastUsage = json.usage;
          if (json.user_tier) lastTier = json.user_tier;
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) onChunk(delta);
        } catch {
          // skip malformed chunks
        }
      }
    }
  }

  // If we exit without [DONE], still call onDone
  onDone(lastUsage, lastTier);
}

// ─── Image Generation ────────────────────────────────────────────

export async function generateImage(
  apiKey: string,
  prompt: string,
  model = 'flux',
  options: Record<string, string | number | boolean> = {},
): Promise<Blob> {
  const params = new URLSearchParams({
    model,
    ...Object.fromEntries(
      Object.entries(options).map(([k, v]) => [k, String(v)]),
    ),
  });
  const url = `${BASE}/image/${encodeURIComponent(prompt)}?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    // Try to extract a JSON error message
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      const errBody = await res.json().catch(() => null);
      const msg = parseApiError(errBody, `Image generation failed: ${res.status}`);
      throw new PollinationsError(msg, res.status, typeof errBody?.error === 'object' ? errBody?.error?.code ?? '' : '');
    }
    throw new PollinationsError(`Image generation failed: ${res.status}`, res.status, '');
  }
  // Validate the response is actually binary media, not a JSON error with 200 status
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const errBody = await res.json().catch(() => null);
    const msg = parseApiError(errBody, 'Unexpected JSON response from image endpoint');
    throw new PollinationsError(msg, 200, typeof errBody?.error === 'object' ? errBody?.error?.code ?? '' : 'unexpected_json');
  }
  const blob = await res.blob();
  // Some APIs return JSON errors with wrong content-type — check small blobs
  if (blob.size < 10_000 && !blob.type.startsWith('image/')) {
    try {
      const text = await blob.text();
      const parsed = JSON.parse(text);
      if (parsed.error || parsed.message) {
        const msg = parseApiError(parsed, 'Image generation failed');
        throw new PollinationsError(msg, parsed.error === 'Bad Request' ? 400 : 500, '');
      }
    } catch (e) {
      if (e instanceof PollinationsError) throw e;
      // Not JSON — return the blob as-is
    }
  }
  return blob;
}

// ─── Video Generation ──────────────────────────────────────────

export async function generateVideo(
  apiKey: string,
  prompt: string,
  model = 'veo',
  options: Record<string, string | number | boolean> = {},
): Promise<Blob> {
  const params = new URLSearchParams({
    model,
    ...Object.fromEntries(
      Object.entries(options).map(([k, v]) => [k, String(v)]),
    ),
  });
  // Video models use the same /image/ endpoint on Pollinations
  const url = `${BASE}/image/${encodeURIComponent(prompt)}?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      const errBody = await res.json().catch(() => null);
      const msg = parseApiError(errBody, `Video generation failed: ${res.status}`);
      throw new PollinationsError(msg, res.status, typeof errBody?.error === 'object' ? errBody?.error?.code ?? '' : '');
    }
    throw new PollinationsError(`Video generation failed: ${res.status}`, res.status, '');
  }
  // Validate the response is actually binary media
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const errBody = await res.json().catch(() => null);
    const msg = parseApiError(errBody, 'Unexpected JSON response from video endpoint');
    throw new PollinationsError(msg, 200, typeof errBody?.error === 'object' ? errBody?.error?.code ?? '' : 'unexpected_json');
  }
  const blob = await res.blob();
  // Some APIs return JSON errors with wrong content-type — check small blobs
  if (blob.size < 10_000 && !blob.type.startsWith('video/')) {
    try {
      const text = await blob.text();
      const parsed = JSON.parse(text);
      if (parsed.error || parsed.message) {
        const msg = parseApiError(parsed, 'Video generation failed');
        throw new PollinationsError(msg, parsed.error === 'Bad Request' ? 400 : 500, '');
      }
    } catch (e) {
      if (e instanceof PollinationsError) throw e;
    }
  }
  return blob;
}

// ─── Audio Generation ────────────────────────────────────────────

export async function generateAudio(
  apiKey: string,
  text: string,
  voice = 'alloy',
  model = 'openai-audio',
): Promise<Blob> {
  const res = await fetch(`${BASE}/v1/audio/speech`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({
      input: text,
      voice,
      model,
      response_format: 'mp3',
    }),
  });
  if (!res.ok) {
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const errBody = await res.json().catch(() => null);
      const msg = errBody?.error?.message ?? errBody?.message ?? `Audio generation failed: ${res.status}`;
      throw new PollinationsError(msg, res.status, errBody?.error?.code ?? '');
    }
    throw new PollinationsError(`Audio generation failed: ${res.status}`, res.status, '');
  }
  return res.blob();
}

// ─── Parse API errors (handles both {error:{message}} and {error:string, message:string}) ──

function parseApiError(body: any, fallback: string): string {
  if (!body) return fallback;
  // Standard OpenAI-style: { error: { message: "..." } }
  if (typeof body.error === 'object' && body.error?.message) {
    return stripHtml(body.error.message);
  }
  // Pollinations-style: { error: "Internal Server Error", message: "..." }
  if (body.message && typeof body.message === 'string') {
    return stripHtml(body.message);
  }
  if (typeof body.error === 'string') {
    return stripHtml(body.error);
  }
  return fallback;
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '').replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

// ─── Custom error class ──────────────────────────────────────────

export class PollinationsError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'PollinationsError';
    this.status = status;
    this.code = code;
  }
}
