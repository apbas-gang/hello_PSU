import type { IncomingMessage } from "node:http";
import { AppError, translateText } from "../src/translation-service.js";

type RequestBody = { text?: unknown; dialectToCentral?: unknown; targetDialect?: unknown };
type VercelRequest = IncomingMessage & { body?: unknown };
type VercelResponse = { status(code: number): VercelResponse; json(body: object): void };

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) as RequestBody : request.body as RequestBody;
    if (!body || typeof body.text !== "string" || !body.text.trim()) return response.status(400).json({ error: "กรุณาระบุข้อความที่ต้องการแปล" });
    if (body.text.length > 1000) return response.status(400).json({ error: "ข้อความต้องไม่เกิน 1,000 ตัวอักษร" });
    return response.status(200).json({ translation: await translateText(body.text.trim(), Boolean(body.dialectToCentral), typeof body.targetDialect === "string" ? body.targetDialect : "auto") });
  } catch (error) {
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
    const status = error instanceof AppError ? error.statusCode : 500;
    return response.status(status).json({ error: message === "fetch failed" ? "เชื่อมต่อ AI API ไม่ได้ กรุณาตรวจสอบ URL และ Environment Variables" : message });
  }
}
