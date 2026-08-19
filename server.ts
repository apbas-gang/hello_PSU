/** Node.js TypeScript entry point: serves static files and exposes the translation API. */
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AppError, translateText } from "./src/translation-service.js";

type TranslationPayload = { text?: unknown; dialectToCentral?: unknown; targetDialect?: unknown };
const port = Number(process.env.PORT ?? 8000);
const publicDirectory = fileURLToPath(new URL(".", import.meta.url));
const mimeTypes: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8" };

/** Loads local development values from .env without requiring an extra package. */
function loadEnvFile(): void {
  try {
    const envFile = readFileSync(resolve(publicDirectory, ".env"), "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match) continue;
      const [, name, rawValue] = match;
      const value = rawValue.replace(/^(["'])(.*)\1$/, "$2");
      process.env[name] ??= value;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

loadEnvFile();

function sendJson(response: ServerResponse, status: number, data: object): void {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff" });
  response.end(JSON.stringify(data));
}
function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let body = "";
    request.on("data", (chunk: Buffer) => { body += chunk.toString(); if (body.length > 25_000) reject(new Error("Request too large")); });
    request.on("end", () => resolveBody(body)); request.on("error", reject);
  });
}
async function handleTranslation(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    const { text, dialectToCentral, targetDialect } = JSON.parse(await readRequestBody(request)) as TranslationPayload;
    if (typeof text !== "string" || !text.trim()) return sendJson(response, 400, { error: "กรุณาระบุข้อความที่ต้องการแปล" });
    if (text.length > 1000) return sendJson(response, 400, { error: "ข้อความต้องไม่เกิน 1,000 ตัวอักษร" });
    sendJson(response, 200, { translation: await translateText(text.trim(), Boolean(dialectToCentral), typeof targetDialect === "string" ? targetDialect : "auto") });
  } catch (error) {
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
    const status = error instanceof AppError ? error.statusCode : 500;
    sendJson(response, status, { error: message === "fetch failed" ? "เชื่อมต่อ AI API ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตและ URL" : message });
  }
}
async function serveStaticFile(url: string | undefined, response: ServerResponse): Promise<void> {
  const requestPath = url === "/" ? "/index.html" : (url ?? "/index.html").split("?")[0];
  const filePath = resolve(publicDirectory, `.${requestPath}`);
  if (!filePath.startsWith(publicDirectory)) return sendJson(response, 403, { error: "Forbidden" });
  try {
    const content = await readFile(filePath);
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream", "X-Content-Type-Options": "nosniff" }); response.end(content);
  } catch { sendJson(response, 404, { error: "Not found" }); }
}

const server = createServer(async (request, response) => {
  const pathname = (request.url ?? "/").split("?")[0].replace(/\/+$/, "") || "/";
  if (request.method === "POST" && pathname === "/api/translate") return handleTranslation(request, response);
  if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed" });
  return serveStaticFile(request.url, response);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`พอร์ต ${port} ถูกใช้งานอยู่แล้ว — ปิดโปรเซสเดิม หรือรันด้วย PORT=8001 npm run dev`);
    process.exitCode = 1;
    return;
  }
  console.error("ไม่สามารถเปิดเซิร์ฟเวอร์ได้:", error.message);
  process.exitCode = 1;
});
server.listen(port, () => console.log(`แปลถิ่น พร้อมใช้งานที่ http://localhost:${port}`));
