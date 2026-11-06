import { readFileSync } from "node:fs";
import { AppError } from "./translation-service.js";

type AudioContent = { type?: string; data?: string; mime_type?: string };
type TtsResponse = { output_audio?: AudioContent; steps?: Array<{ content?: AudioContent[] }>; error?: { message?: string } };

function findAudio(value: unknown): AudioContent | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Record<string, unknown>;
  if (typeof item.data === "string" && (item.type === "audio" || typeof item.mime_type === "string" || typeof item.mimeType === "string")) return { data: item.data, mime_type: typeof item.mime_type === "string" ? item.mime_type : typeof item.mimeType === "string" ? item.mimeType : undefined };
  for (const child of Object.values(item)) { const found = Array.isArray(child) ? child.map(findAudio).find(Boolean) : findAudio(child); if (found) return found; }
  return undefined;
}

function readApiKey(): string | undefined {
  const keyFile = process.env.AI_API_KEY_FILE?.trim();
  if (keyFile) {
    try { return readFileSync(keyFile, "utf8").trim().match(/Bearer\s+([^\s"'\\]+)/i)?.[1]; } catch { /* Use the environment value below. */ }
  }
  return process.env.AI_API_KEY?.trim();
}

/** Generates a WAV clip with Gemini TTS, which supports both Thai and Lao. */
export async function synthesizeSpeech(text: string): Promise<{ audio: string; mimeType: string }> {
  const apiKey = readApiKey();
  if (!apiKey) throw new AppError("ยังไม่ได้ตั้งค่า AI_API_KEY บนเซิร์ฟเวอร์");
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      model: process.env.AI_TTS_MODEL ?? "gemini-3.8-flash-tts",
      input: [{ type: "user_input", content: [{ type: "text", text }] }],
      response_format: { type: "audio", mime_type: "audio/wav" },
      generation_config: { speech_config: [{ voice: "Kore" }] },
    }),
  });
  const data = await response.json().catch(() => ({})) as TtsResponse;
  if (!response.ok) throw new AppError(data.error?.message ?? "ไม่สามารถสร้างเสียงได้ในขณะนี้", response.status >= 500 || response.status === 429 ? 503 : response.status);
  const audioContent = findAudio(data);
  const audio = audioContent?.data;
  if (!audio) throw new AppError("บริการเสียงไม่ได้ส่งไฟล์เสียงกลับมา", 502);
  return { audio, mimeType: audioContent?.mime_type ?? "audio/wav" };
}
