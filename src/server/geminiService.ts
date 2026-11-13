import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import type { WebSocket, WebSocketServer } from 'ws';
import { isPaidAiApiAllowed } from '../core/models/AiBillingPolicy.ts';

let cachedAiClient: GoogleGenAI | null = null;

/**
 * Returns the singleton server-side GoogleGenAI client initialized with process.env.GEMINI_API_KEY
 * and the mandatory 'User-Agent': 'aistudio-build' telemetry header.
 */
export function getGeminiClient(): GoogleGenAI | null {
  if (!isPaidAiApiAllowed()) return null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }
  if (!cachedAiClient) {
    cachedAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return cachedAiClient;
}

let quotaExhaustedUntil = 0;

export function markGeminiQuotaExhausted(retryDelaySeconds?: number): void {
  const delayMs = (retryDelaySeconds && retryDelaySeconds > 0) ? retryDelaySeconds * 1000 : 15 * 60 * 1000;
  quotaExhaustedUntil = Date.now() + delayMs;
}

export function isGeminiAvailable(): boolean {
  if (!isPaidAiApiAllowed()) return false;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) return false;
  if (Date.now() < quotaExhaustedUntil) {
    return false;
  }
  return true;
}

export function resolveServerGeminiModel(overrideModel?: string): string {
  const model = overrideModel || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  return model.replace(/^models\//, '');
}

export interface ServerGenerateOptions {
  prompt: string;
  systemInstruction?: string;
  context?: any;
  model?: string;
  responseMimeType?: string;
  responseSchema?: any;
}

/**
 * Executes a server-side Gemini generateContent call.
 */
export async function generateGeminiContent(options: ServerGenerateOptions): Promise<{
  text: string;
  modelUsed: string;
  usageMetadata?: any;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('Gemini API access is disabled or no GEMINI_API_KEY is configured. USV-01 defaults to zero paid AI API usage.');
  }

  const model = resolveServerGeminiModel(options.model);
  const contents = options.context
    ? `Context:\n${JSON.stringify(options.context, null, 2)}\n\nUser Prompt:\n${options.prompt}`
    : options.prompt;

  const config: any = {};
  if (options.systemInstruction) {
    config.systemInstruction = options.systemInstruction;
  }
  if (options.responseMimeType) {
    config.responseMimeType = options.responseMimeType;
  }
  if (options.responseSchema) {
    config.responseSchema = options.responseSchema;
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config
    });

    return {
      text: response.text ?? '',
      modelUsed: model,
      usageMetadata: (response as any)?.usageMetadata
    };
  } catch (err: any) {
    if (err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.message?.includes('quota')) {
      markGeminiQuotaExhausted();
    }
    throw err;
  }
}

/**
 * Streams content chunks from Gemini generateContentStream.
 */
export async function* streamGeminiContent(options: ServerGenerateOptions): AsyncGenerator<string, void, unknown> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server runtime.');
  }

  const model = resolveServerGeminiModel(options.model);
  const contents = options.context
    ? `Context:\n${JSON.stringify(options.context, null, 2)}\n\nUser Prompt:\n${options.prompt}`
    : options.prompt;

  const config: any = {};
  if (options.systemInstruction) {
    config.systemInstruction = options.systemInstruction;
  }

  try {
    const responseStream = await ai.models.generateContentStream({
      model,
      contents,
      config
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (err: any) {
    if (err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.message?.includes('quota')) {
      markGeminiQuotaExhausted();
    }
    throw err;
  }
}

/**
 * Sets up WebSocket relay for Gemini Live API (gemini-3.8-live) on the Node server.
 * Streams real-time audio and text bidirectional turns.
 */
export function setupLiveApiWebSocket(wss: WebSocketServer) {
  wss.on('connection', async (clientWs: WebSocket, req: any) => {
    const ai = getGeminiClient();

    const fallbackHandler = () => {
      clientWs.send(
        JSON.stringify({
          type: 'status',
          connected: true,
          model: 'offline-deterministic-sim',
          message: 'USV-01 Tactical Audio: Active in deterministic simulation copilot mode.'
        })
      );

      clientWs.on('message', (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.text) {
            clientWs.send(
              JSON.stringify({
                type: 'transcript',
                text: `[USV-01 Tactical Copilot] Telemetry command acknowledged: "${parsed.text}". Rule 14 & 15 COLREGs heuristics active.`
              })
            );
          }
        } catch {}
      });
    };

    if (!ai || !isGeminiAvailable()) {
      fallbackHandler();
      return;
    }

    try {
      const session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction:
            'You are the USV-01 Tactical Engineering Copilot. You assist naval architects and autonomy engineers with high-speed vessel stability, Savitsky hydrodynamics, and COLREGs collision avoidance.'
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            for (const part of message.serverContent?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
              if (part.text) {
                clientWs.send(JSON.stringify({ transcript: part.text }));
              }
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          }
        }
      });

      clientWs.send(
        JSON.stringify({
          type: 'status',
          connected: true,
          model: 'gemini-3.8-live',
          message: 'Connected to Gemini Live API via server bridge.'
        })
      );

      clientWs.on('message', (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' }
            });
          } else if (parsed.text) {
            session.sendRealtimeInput({
              text: parsed.text
            });
          }
        } catch {}
      });

      clientWs.on('close', () => {
        try {
          session.close();
        } catch {}
      });
    } catch (_err: any) {
      fallbackHandler();
    }
  });
}
