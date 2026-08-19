# แปลถิ่น (Thai Regional Dialect Translator)

โปรเจกต์แปลภาษาไทยถิ่น (ใต้/เหนือ/อีสาน) เป็นภาษาไทยกลางมาตรฐานและกลับกัน ด้วย Node.js + TypeScript + Google Gemini API

## 1. วิธีรันแบบ Local

```bash
npm install
cp .env.example .env
# แก้ไข AI_API_KEY ในไฟล์ .env ให้เป็น Gemini API Key ของคุณ
npm run dev
```

เปิด [http://localhost:8000](http://localhost:8000)

## 2. Environment Variables (.env)

```env
AI_API_KEY=YOUR_GEMINI_API_KEY
AI_API_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
AI_MODEL=gemini-3.6-flash
PORT=8000
```

## 3. Deploy บน Vercel

1. Push repository ขึ้น GitHub: `git push origin main`
2. เข้าใช้งาน [Vercel Dashboard](https://vercel.com/new) -> Import repository `hello_PSU`
3. ใน **Project Settings -> Environment Variables**, เพิ่มค่าดังนี้:
   - `AI_API_KEY` = `YOUR_GEMINI_API_KEY`
   - `AI_API_URL` = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
   - `AI_MODEL` = `gemini-3.6-flash`
4. กด **Deploy**
