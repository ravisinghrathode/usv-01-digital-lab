import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import type { WebSocket, WebSocketServer } from 'ws';

let cachedAiClient: GoogleGenAI | null = null;

/**
 * Returns the singleton server-side GoogleGenAI client initialized with process.env.GEMINI_API_KEY
 * and the mandatory 'User-Agent': 'aistudio-build' telemetry header.
 */
export function getGeminiClient(): GoogleGenAI | null {
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

export function isGeminiAvailable(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return !!apiKey && apiKey.trim().length > 0;
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
  if (options.responseMimeType) {
    config.responseMimeType = options.responseMimeType;
  }
  if (options.responseSchema) {
    config.responseSchema = options.responseSchema;
  }

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
}

/**
 * Sets up WebSocket relay for Gemini Live API (gemini-3.8-live) on the Node server.
 * Streams real-time audio and text bidirectional turns.
 */
export function setupLiveApiWebSocket(wss: WebSocketServer) {
  wss.on('connection', async (clientWs: WebSocket, req: any) => {
    const ai = getGeminiClient();

    if (!ai) {
      // Offline fallback: inform client gracefully without disconnecting
      clientWs.send(
        JSON.stringify({
          type: 'status',
          connected: false,
          model: 'offline-deterministic-sim',
          message: 'Gemini Live API: Running in server offline simulation mode (GEMINI_API_KEY not configured).'
        })
      );

      clientWs.on('message', (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.text) {
            clientWs.send(
              JSON.stringify({
                type: 'transcript',
                text: `[USV-01 Tactical Audio Sim] Received telemetry command: "${parsed.text}". Real-time Live API voice synthesis activates when GEMINI_API_KEY is configured.`
              })
            );
          }
        } catch {}
      });
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
        } catch (err: any) {
          console.warn('[Gemini Live WS Input Error]', err.message);
        }
      });

      clientWs.on('close', () => {
        try {
          session.close();
        } catch {}
      });
    } catch (err: any) {
      console.warn('[Gemini Live WS Connect Error]', err.message);
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message: `Failed to initialize Gemini Live session: ${err.message}`
        })
      );
    }
  });
}
