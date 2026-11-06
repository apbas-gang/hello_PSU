type VercelRequest = { method?: string; body?: unknown };
type VercelResponse = { status(code: number): VercelResponse; json(body: object): void };
type AudioContent = { type?: string; data?: string; mime_type?: string };
type TtsResponse = { output_audio?: AudioContent; steps?: Array<{ content?: AudioContent[] }>; error?: { message?: string } };

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  if (request.method === "OPTIONS") return response.status(200).json({ status: "ok" });
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed. Use POST /api/speech." });
  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) as { text?: unknown } : request.body as { text?: unknown };
    if (!body || typeof body.text !== "string" || !body.text.trim()) return response.status(400).json({ error: "กรุณาระบุข้อความที่ต้องการฟัง" });
    if (body.text.length > 1000) return response.status(400).json({ error: "ข้อความต้องไม่เกิน 1,000 ตัวอักษร" });
    const apiKey = process.env.AI_API_KEY?.trim();
    if (!apiKey) return response.status(500).json({ error: "ยังไม่ได้ตั้งค่า AI_API_KEY บนเซิร์ฟเวอร์" });
    const result = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ model: process.env.AI_TTS_MODEL ?? "gemini-3.8-flash-tts", input: [{ type: "user_input", content: [{ type: "text", text: body.text.trim() }] }], response_format: { type: "audio", mime_type: "audio/wav" }, generation_config: { speech_config: [{ voice: "Kore" }] } }),
    });
    const data = await result.json().catch(() => ({})) as TtsResponse;
    if (!result.ok) return response.status(result.status >= 500 || result.status === 429 ? 503 : result.status).json({ error: data.error?.message ?? "ไม่สามารถสร้างเสียงได้ในขณะนี้" });
    const audioContent = data.output_audio?.data ? data.output_audio : data.steps?.flatMap((step) => step.content ?? []).find((content) => content.type === "audio" && content.data);
    if (!audioContent?.data) return response.status(502).json({ error: "บริการเสียงไม่ได้ส่งไฟล์เสียงกลับมา" });
    return response.status(200).json({ audio: audioContent.data, mimeType: audioContent.mime_type ?? "audio/wav" });
  } catch (error) { return response.status(500).json({ error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ" }); }
}
